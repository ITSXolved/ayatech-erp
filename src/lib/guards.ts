import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Validates if the current user is an Admin.
 * Redirects to /dashboard if unauthorized.
 * Returns the admin user object if valid.
 */
export async function enforceAdminGuard() {
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

    if (roleNode?.name !== 'admin') {
        redirect('/dashboard?error=Unauthorized')
    }

    return user
}
