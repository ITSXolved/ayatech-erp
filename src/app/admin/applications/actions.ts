'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { enforceAdminGuard } from '@/lib/guards'

export async function updateApplicationStatus(applicationId: string, newStatus: string) {
    await enforceAdminGuard()
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('applications')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', applicationId)

        if (error) {
            console.error('Error updating application status:', error)
        } else if (newStatus === 'Enrolled') {
            // Trigger LMS & Email Automations if manually marked Enrolled
            const { processApplicationAutomation } = await import('@/lib/automation')
            await processApplicationAutomation(applicationId)
        }
    } catch (err) {
        console.error('Exception updating application status:', err)
    }

    revalidatePath('/admin/applications')
}

export async function deleteApplication(applicationId: string) {
    await enforceAdminGuard()
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('applications')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', applicationId)

        if (error) {
            console.error('Error deleting application:', error)
        }
    } catch (err) {
        console.error('Exception deleting application:', err)
    }

    revalidatePath('/admin/applications')
}

import Razorpay from 'razorpay'
import crypto from 'crypto'
import { verifyRazorpayPayment } from '@/app/apply/razorpay-actions'

export async function adminSyncApplicationPayment(applicationId: string) {
    await enforceAdminGuard()

    try {
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!
        })

        const receiptId = `app_${applicationId.replace(/-/g, '').substring(0, 30)}`

        // Fetch all orders with this receipt (usually just 1 or 2 if they retried)
        const orders = await razorpay.orders.all({ receipt: receiptId })

        if (!orders || !orders.items || orders.items.length === 0) {
            console.error('No Razorpay orders found for this application.')
            return
        }

        // Look through orders for a captured payment
        for (const order of orders.items) {
            const payments = await razorpay.orders.fetchPayments(order.id)
            if (payments && payments.items) {
                const capturedPayment = payments.items.find((p: { status: string; id: string; amount: number | string }) => p.status === 'captured')
                if (capturedPayment) {
                    // Generate valid signature to reuse the checkout verification logic
                    const body = order.id + "|" + capturedPayment.id;
                    const signature = crypto
                        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
                        .update(body)
                        .digest('hex');

                    const amount = Number(capturedPayment.amount); // amount in paise

                    const result = await verifyRazorpayPayment(capturedPayment.id, order.id, signature, applicationId, amount)

                    if (result.error) {
                        console.error(result.error)
                        return
                    }

                    revalidatePath('/admin/applications')
                    return
                }
            }
        }

        console.error('No successful payment found in Razorpay.')

    } catch (err: unknown) {
        console.error('Exception syncing application payment:', err)
    }
}

export async function updateSecretKeywords(applicationId: string, keywords: string) {
    await enforceAdminGuard()
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('applications')
            .update({ secret_keywords: keywords.trim() || null })
            .eq('id', applicationId)

        if (error) {
            console.error('Error updating secret keywords:', error)
        }
    } catch (err) {
        console.error('Exception updating secret keywords:', err)
    }

    revalidatePath('/admin/applications')
}
