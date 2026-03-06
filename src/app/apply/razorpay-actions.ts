'use server'

import Razorpay from 'razorpay'
import { createClient } from '@/lib/supabase/server'

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!
})

export async function createRazorpayOrder(applicationId: string) {
    const supabase = await createClient()

    // 1. Fetch application and related course fee
    const { data: application, error: appError } = await supabase
        .from('applications')
        .select(`
      id,
      course_id,
      courses ( fee )
    `)
        .eq('id', applicationId)
        .single()

    if (appError || !application) {
        console.error('Fetch App Error:', appError)
        return { error: 'Application not found or invalid.' }
    }

    // Next.js array normalization for joins
    const course = Array.isArray(application.courses) ? application.courses[0] : application.courses
    const amountToCharge = course?.fee

    if (!amountToCharge) {
        return { error: 'Invalid course fee.' }
    }

    try {
        // 2. Generate Razorpay Order
        // Amount is in smallest currency unit (paise for INR, cents for USD)
        // Assuming INR for Razorpay default
        const options = {
            amount: Math.round(Number(amountToCharge) * 100),
            currency: 'INR',
            receipt: `app_${applicationId.replace(/-/g, '').substring(0, 30)}`,
            notes: {
                application_id: applicationId
            }
        }

        const order = await razorpay.orders.create(options)

        return {
            success: true,
            orderId: order.id,
            amount: options.amount,
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID // Send publishable key to client
        }
    } catch (err: unknown) {
        console.error('Razorpay Error:', err)
        return { error: 'Could not initialize payment gateway.' }
    }
}

import crypto from 'crypto'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service Role client for bypass RLS
function getAdminClient() {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function verifyRazorpayPayment(
    paymentId: string,
    orderId: string,
    signature: string,
    applicationId: string,
    amount: number
) {
    try {
        const body = orderId + "|" + paymentId;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(body)
            .digest('hex');

        if (expectedSignature !== signature) {
            return { error: 'Invalid Payment Signature' }
        }

        const supabaseAdmin = getAdminClient()

        // Idempotent Check
        const { data: existingPayment } = await supabaseAdmin
            .from('payments')
            .select('id')
            .eq('razorpay_payment_id', paymentId)
            .single()

        if (existingPayment) {
            return { success: true, status: 'already_processed' }
        }

        // 1. Insert Payment Record
        const { error: paymentError } = await supabaseAdmin
            .from('payments')
            .insert([{
                application_id: applicationId,
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                amount: amount / 100, // stored in INR, option amount is in paise
                status: 'Successful'
            }])

        if (paymentError) {
            console.error('Verify Payment Insert Error:', paymentError)
            return { error: 'Failed to record payment.' }
        }

        // 2. Update Application Status to 'Enrolled'
        const { error: appUpdateError } = await supabaseAdmin
            .from('applications')
            .update({ status: 'Enrolled' })
            .eq('id', applicationId)

        if (appUpdateError) {
            console.error('Verify App Update Error:', appUpdateError)
            return { error: 'Failed to update application status.' }
        }

        // 3. Automation (Canvas LMS & Emails)
        const { processApplicationAutomation } = await import('@/lib/automation')
        await processApplicationAutomation(applicationId)

        return { success: true }
    } catch (error) {
        console.error('Verify Payment Error:', error)
        return { error: 'Server error during verification.' }
    }
}
