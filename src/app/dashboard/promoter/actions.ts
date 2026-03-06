'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { enforcePromoterGuard } from '@/lib/promoter-guard'

export async function markLeadFollowedUp(applicationId: string) {
    const { promoterId } = await enforcePromoterGuard()
    const supabase = await createClient()

    // Verify the application belongs to this promoter
    const { data: assignment } = await supabase
        .from('lead_assignments')
        .select('id')
        .eq('application_id', applicationId)
        .eq('promoter_id', promoterId)
        .single()

    if (!assignment) {
        console.error('Unauthorized to modify this lead')
        return
    }

    // Update Status
    const { error } = await supabase
        .from('applications')
        .update({ status: 'Followed Up' })
        .eq('id', applicationId)

    if (error) {
        console.error('Follow up error:', error)
        return
    }

    revalidatePath('/dashboard/promoter')
}

export async function markLeadConverted(applicationId: string) {
    const { promoterId } = await enforcePromoterGuard()
    const supabase = await createClient()

    // Verify the application belongs to this promoter
    const { data: assignment } = await supabase
        .from('lead_assignments')
        .select('id')
        .eq('application_id', applicationId)
        .eq('promoter_id', promoterId)
        .single()

    if (!assignment) {
        console.error('Unauthorized to modify this lead')
        return
    }

    // Update Status - Note: in a real system this usually happens via Payment Webhook,
    // but if manual overrides are allowed:
    const { error } = await supabase
        .from('applications')
        .update({ status: 'Joined' })
        .eq('id', applicationId)

    if (error) {
        console.error('Convert lead error:', error)
        return
    }

    revalidatePath('/dashboard/promoter')
}
