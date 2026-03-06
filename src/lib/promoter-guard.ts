import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Validates if the current user is a Promoter.
 * Redirects to /dashboard if unauthorized.
 * Returns the promoter user object if valid.
 */
export async function enforcePromoterGuard() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check role securely from DB
    const { data: userData } = await supabase
        .from('users')
        .select('roles(name)')
        .eq('id', user.id)
        .single()

    const roleNode = Array.isArray(userData?.roles) ? userData?.roles[0] : userData?.roles

    if (roleNode?.name !== 'promoter') {
        redirect('/dashboard?error=Unauthorized')
    }

    // Double check that they exist in `promoters` table
    const { data: promoterData } = await supabase
        .from('promoters')
        .select('id')
        .eq('user_id', user.id)
        .single()

    if (!promoterData) {
        redirect('/dashboard?error=PromoterProfileMissing')
    }

    return { user, promoterId: promoterData.id }
}
