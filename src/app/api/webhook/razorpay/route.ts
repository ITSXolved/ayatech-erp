import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
// Service Role client — bypasses RLS for webhook-triggered system updates
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
    try {
        const bodyText = await req.text()
        const signature = req.headers.get('x-razorpay-signature')

        if (!signature) {
            return NextResponse.json({ error: 'Missing Signature' }, { status: 400 })
        }

        // Verify Signature
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
            .update(bodyText)
            .digest('hex')

        if (expectedSignature !== signature) {
            return NextResponse.json({ error: 'Invalid Signature' }, { status: 400 })
        }

        const event = JSON.parse(bodyText)

        // Handle payment.captured event
        if (event.event === 'payment.captured' || event.event === 'order.paid') {
            const paymentEntity = event.payload.payment.entity
            const orderId = paymentEntity.order_id
            const paymentId = paymentEntity.id
            const amount = paymentEntity.amount / 100 // paise → INR
            const applicationId = paymentEntity.notes.application_id

            if (!applicationId) {
                return NextResponse.json({ error: 'No Application ID in notes' }, { status: 400 })
            }

            // Idempotent Check
            const { data: existingPayment } = await supabaseAdmin
                .from('payments')
                .select('id')
                .eq('razorpay_payment_id', paymentId)
                .single()

            if (existingPayment) {
                return NextResponse.json({ received: true, status: 'already_processed' })
            }

            // 1. Insert Payment Record
            const { error: paymentError } = await supabaseAdmin
                .from('payments')
                .insert([{
                    application_id: applicationId,
                    razorpay_order_id: orderId,
                    razorpay_payment_id: paymentId,
                    amount: amount,
                    status: 'Successful'
                }])
                .select('id')
                .single()

            if (paymentError) {
                console.error('Webhook Payment Insert Error:', paymentError)
                return NextResponse.json({ error: 'Internal DB Error' }, { status: 500 })
            }

            // 2. Update Application Status to 'Enrolled'
            const { error: appUpdateError } = await supabaseAdmin
                .from('applications')
                .update({ status: 'Enrolled' })
                .eq('id', applicationId)

            if (appUpdateError) {
                console.error('Webhook App Update Error:', appUpdateError)
                return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
            }

            // --- CANVAS LMS AUTOMATION & EMAIL ---
            const { processApplicationAutomation } = await import('@/lib/automation')
            await processApplicationAutomation(applicationId)

            return NextResponse.json({ received: true, status: 'success' })
        }

        return NextResponse.json({ received: true })

    } catch (error) {
        console.error('Webhook Error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
