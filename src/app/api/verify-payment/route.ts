import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Razorpay from 'razorpay'

// Allow this route to run up to 60 seconds on Vercel to handle LMS provisioning and emails
export const maxDuration = 60;

function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

/**
 * GET /api/verify-payment?application_id=xxx&razorpay_payment_id=yyy&razorpay_payment_link_id=zzz
 *
 * Called by the payment-success page on load. Verifies payment with Razorpay
 * and triggers the full automation pipeline (Canvas LMS, enrollment, email).
 * 
 * Works as a fallback when the Razorpay webhook doesn't fire.
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const applicationId = searchParams.get('application_id')
    const razorpayPaymentId = searchParams.get('razorpay_payment_id')
    const razorpayPaymentLinkId = searchParams.get('razorpay_payment_link_id')

    if (!applicationId) {
        return NextResponse.json({ error: 'Missing application_id' }, { status: 400 })
    }

    const supabaseAdmin = getAdminClient()

    try {
        // 1. Idempotency: Check if already provisioned in Canvas
        const { data: existingMapping } = await supabaseAdmin
            .from('lms_mappings')
            .select('id')
            .eq('application_id', applicationId)
            .maybeSingle()

        if (existingMapping) {
            return NextResponse.json({ success: true, status: 'already_provisioned' })
        }

        // 2. Check if payment is already recorded in DB
        const { data: existingPayment } = await supabaseAdmin
            .from('payments')
            .select('id, status')
            .eq('application_id', applicationId)
            .eq('status', 'Successful')
            .maybeSingle()

        if (existingPayment) {
            // Payment recorded but automation didn't run — trigger it
            console.log(`[verify-payment] Payment exists in DB, triggering automation for ${applicationId}`)
            await supabaseAdmin.from('applications').update({ status: 'Enrolled' }).eq('id', applicationId)
            const { processApplicationAutomation } = await import('@/lib/automation')
            const result = await processApplicationAutomation(applicationId)
            return NextResponse.json({ success: true, status: 'automation_triggered', result })
        }

        const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_SQdSBMmgL1mZZa';
        const keySecret = process.env.RAZORPAY_KEY_SECRET || 'Sew2homjpULowkPhqxOsSS47';

        // 3. Try to verify via razorpay_payment_id (if provided by callback)
        const razorpay = new Razorpay({
            key_id: keyId,
            key_secret: keySecret
        })

        if (razorpayPaymentId) {
            try {
                const payment = await razorpay.payments.fetch(razorpayPaymentId)
                if (payment.status === 'captured') {
                    return await recordAndProvision(supabaseAdmin, applicationId, payment.id, payment.order_id || razorpayPaymentLinkId || 'link', Number(payment.amount) / 100)
                }
            } catch (err) {
                console.error('[verify-payment] Razorpay payment fetch error:', err)
            }
        }

        // 4. Fallback: Look up payment link by reference_id (applicationId) from Razorpay
        console.log(`[verify-payment] Looking up payment link by reference_id: ${applicationId}`)
        try {
            const linksRes = await fetch(
                `https://api.razorpay.com/v1/payment_links?reference_id=${applicationId}`,
                {
                    headers: {
                        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`
                    }
                }
            )
            const linksData = await linksRes.json()
            const paidLink = linksData.payment_links?.find((l: { status: string }) => l.status === 'paid')

            if (paidLink) {
                // Fetch payments for the order linked to this payment link
                const payments = await razorpay.orders.fetchPayments(paidLink.order_id)
                const capturedPayment = payments.items?.find((p: { status: string }) => p.status === 'captured')

                if (capturedPayment) {
                    return await recordAndProvision(supabaseAdmin, applicationId, capturedPayment.id, paidLink.order_id, Number(capturedPayment.amount) / 100)
                }
            }
        } catch (linkErr) {
            console.error('[verify-payment] Payment link lookup error:', linkErr)
        }

        // 5. If we have a payment_link_id, try that directly
        if (razorpayPaymentLinkId) {
            try {
                const linkRes = await fetch(
                    `https://api.razorpay.com/v1/payment_links/${razorpayPaymentLinkId}`,
                    {
                        headers: {
                            Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`
                        }
                    }
                )
                const linkData = await linkRes.json()

                if (linkData.status === 'paid' && linkData.order_id) {
                    const payments = await razorpay.orders.fetchPayments(linkData.order_id)
                    const capturedPayment = payments.items?.find((p: { status: string }) => p.status === 'captured')

                    if (capturedPayment) {
                        return await recordAndProvision(supabaseAdmin, applicationId, capturedPayment.id, linkData.order_id, Number(capturedPayment.amount) / 100)
                    }
                }
            } catch (e) {
                console.error('[verify-payment] Direct link fetch error:', e)
            }
        }

        return NextResponse.json({ success: false, status: 'payment_not_found' })

    } catch (error) {
        console.error('[verify-payment] Error:', error)
        return NextResponse.json({ error: 'Server error during verification' }, { status: 500 })
    }
}

async function recordAndProvision(
    supabaseAdmin: any,
    applicationId: string,
    paymentId: string,
    orderId: string,
    amount: number
) {
    // Record payment
    await supabaseAdmin.from('payments').insert([{
        application_id: applicationId,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        amount,
        status: 'Successful'
    }])

    // Update application status
    await supabaseAdmin
        .from('applications')
        .update({ status: 'Enrolled' })
        .eq('id', applicationId)

    // Trigger full automation (Canvas LMS + Email)
    console.log(`[verify-payment] Payment verified (${paymentId}), triggering automation for ${applicationId}`)
    const { processApplicationAutomation } = await import('@/lib/automation')
    const result = await processApplicationAutomation(applicationId)

    return NextResponse.json({ success: true, status: 'verified_and_provisioned', result })
}
