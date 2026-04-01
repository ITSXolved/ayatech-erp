'use server'

import Razorpay from 'razorpay'
import { createClient } from '@/lib/supabase/server'

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_SQdSBMmgL1mZZa',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'Sew2homjpULowkPhqxOsSS47'
})

export async function createRazorpayOrder(applicationId: string) {
    const supabase = await createClient()

    // 1. Fetch application and related course fee + student info
    const { data: application, error: appError } = await supabase
        .from('applications')
        .select(`
      id,
      course_id,
      student_name,
      email,
      phone,
      courses ( fee, name )
    `)
        .eq('id', applicationId)
        .single()

    if (appError || !application) {
        console.error('Fetch App Error:', appError)
        return { error: 'Application not found or invalid.' }
    }

    // Next.js array normalization for joins
    const course = Array.isArray(application.courses) ? application.courses[0] : application.courses
    const amountToCharge = (course as { fee?: number; name?: string } | null)?.fee
    const courseName = (course as { fee?: number; name?: string } | null)?.name

    if (!amountToCharge) {
        return { error: 'Invalid course fee.' }
    }

    try {
        // 2. Create Razorpay Payment Link (hosted on Razorpay's domain — NO whitelist issues)
        const paymentLinkOptions = {
            amount: Math.round(Number(amountToCharge) * 100),
            currency: 'INR',
            accept_partial: false,
            reference_id: applicationId,
            description: `Course Enrollment: ${courseName || 'Course'}`,
            customer: {
                name: application.student_name || 'Student',
                email: application.email || 'support@ayatech.org',
                contact: application.phone || '0000000000'
            },
            notify: {
                sms: true,
                email: true
            },
            reminder_enable: true,
            notes: {
                application_id: applicationId
            },
            callback_url: `https://ayatech.org/payment-success?application_id=${applicationId}`,
            callback_method: 'get'

        }

        const paymentLink = await (razorpay as any).paymentLink.create(paymentLinkOptions)

        return {
            success: true,
            payment_link: paymentLink.short_url,
            orderId: paymentLink.id,
            amount: paymentLinkOptions.amount
        }
    } catch (err: unknown) {
        console.error('Razorpay Error:', err)
        return { error: 'Could not initialize payment gateway.' }
    }
}

// ⚠️ TEST-ONLY: Bypasses payment, directly marks as enrolled & triggers automation
export async function bypassPaymentForTest(applicationId: string) {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    try {
        const mockPaymentId = `test_pay_${Date.now()}`
        const mockOrderId = `test_order_${Date.now()}`

        await supabaseAdmin.from('payments').insert([{
            application_id: applicationId,
            razorpay_order_id: mockOrderId,
            razorpay_payment_id: mockPaymentId,
            amount: 1, // ₹1 dummy amount
            status: 'Successful'
        }])

        await supabaseAdmin.from('applications')
            .update({ status: 'Enrolled' })
            .eq('id', applicationId)

        const { processApplicationAutomation } = await import('@/lib/automation')
        await processApplicationAutomation(applicationId)

        return { success: true }
    } catch (err) {
        console.error('Test bypass error:', err)
        return { error: 'Test bypass failed' }
    }
}

import crypto from 'crypto'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service Role client for bypass RLS
function getAdminClient() {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tfmehkiouuzwiigdctgt.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmbWVoa2lvdXV6d2lpZ2RjdGd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyNjQ2NSwiZXhwIjoyMDgyMzAyNDY1fQ.u5Gb8f5Io9JfS0qbh_Gs3p73_rupKOKho43QUPVE2yk'
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
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'Sew2homjpULowkPhqxOsSS47')
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
            .maybeSingle()

        if (existingPayment) {
            return { success: true, status: 'already_processed' }
        }

        // 1. Upsert Payment Record (handles pre-created Pending records)
        const { error: paymentError } = await supabaseAdmin
            .from('payments')
            .upsert({
                application_id: applicationId,
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                amount: amount / 100,
                status: 'Successful'
            }, { onConflict: 'razorpay_order_id' })

        if (paymentError) {
            console.error('Verify Payment Upsert Error:', paymentError)
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
