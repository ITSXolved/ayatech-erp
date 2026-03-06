'use server'

import { createClient } from '@/lib/supabase/server'
import { enforceAdminGuard } from '@/lib/guards'
import { revalidatePath } from 'next/cache'

export async function deleteCommission(commissionId: string) {
    await enforceAdminGuard()
    const supabase = await createClient()

    try {
        const { error } = await supabase.from('commissions').delete().eq('id', commissionId)
        if (error) {
            console.error('Failed to delete commission:', error)
            return { error: 'Failed to delete commission record.' }
        }
    } catch (err) {
        console.error('Exception deleting commission:', err)
        return { error: 'An unexpected error occurred.' }
    }

    revalidatePath('/admin/analytics')
    return { success: true }
}
