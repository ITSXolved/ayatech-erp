import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

// Allow this route to run up to 60 seconds on Vercel to handle LMS provisioning and emails
export const maxDuration = 60;

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
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'ayatech_tech_5001';
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(bodyText)
            .digest('hex')

        if (expectedSignature !== signature) {
            return NextResponse.json({ error: 'Invalid Signature' }, { status: 400 })
        }

        const event = JSON.parse(bodyText)
        console.log(`[Webhook] Received event: ${event.event}`)

        // Handle payment.captured event (standard checkout)
        if (event.event === 'payment.captured' || event.event === 'order.paid') {
            const paymentEntity = event.payload.payment.entity
            const orderId = paymentEntity.order_id
            const paymentId = paymentEntity.id
            const amount = paymentEntity.amount / 100 // paise → INR
            const applicationId = paymentEntity.notes?.application_id

            if (!applicationId) {
                console.error('[Webhook] No Application ID in payment notes')
                return NextResponse.json({ error: 'No Application ID in notes' }, { status: 400 })
            }

            return await processWebhookPayment(applicationId, paymentId, orderId, amount)
        }

        // Handle payment_link.paid event (Payment Link flow)
        if (event.event === 'payment_link.paid') {
            const paymentLinkEntity = event.payload.payment_link.entity
            const paymentEntity = event.payload.payment?.entity
            const applicationId = paymentLinkEntity.reference_id || paymentLinkEntity.notes?.application_id

            if (!applicationId) {
                console.error('[Webhook] No Application ID in payment link')
                return NextResponse.json({ error: 'No Application ID' }, { status: 400 })
            }

            const paymentId = paymentEntity?.id || paymentLinkEntity.id
            const orderId = paymentEntity?.order_id || paymentLinkEntity.id
            const amount = (paymentEntity?.amount || paymentLinkEntity.amount) / 100

            return await processWebhookPayment(applicationId, paymentId, orderId, amount)
        }

        return NextResponse.json({ received: true })

    } catch (error) {
        console.error('Webhook Error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

async function processWebhookPayment(
    applicationId: string,
    paymentId: string,
    orderId: string,
    amount: number
) {
    // Idempotent Check
    const { data: existingPayment } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('razorpay_payment_id', paymentId)
        .maybeSingle()

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

    if (paymentError) {
        console.error('[Webhook] Payment Insert Error:', paymentError)
        return NextResponse.json({ error: 'Internal DB Error' }, { status: 500 })
    }

    // 2. Update Application Status to 'Enrolled'
    const { error: appUpdateError } = await supabaseAdmin
        .from('applications')
        .update({ status: 'Enrolled' })
        .eq('id', applicationId)

    if (appUpdateError) {
        console.error('[Webhook] App Update Error:', appUpdateError)
        return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
    }

    // 3. CANVAS LMS AUTOMATION & EMAIL
    try {
        const { processApplicationAutomation } = await import('@/lib/automation')
        await processApplicationAutomation(applicationId)
        console.log(`[Webhook] Automation completed for application ${applicationId}`)
    } catch (automationError) {
        console.error('[Webhook] Automation Error (non-fatal):', automationError)
        // Don't fail the webhook — payment is already recorded
    }

    return NextResponse.json({ received: true, status: 'success' })
}
