import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

interface Course {
    id: string;
    name: string;
    [key: string]: any;
}

/**
 * Validates if the current user is a Course Manager.
 * Redirects to /dashboard if unauthorized.
 * Returns the manager user object if valid.
 */
export async function enforceManagerGuard() {
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

    if (roleNode?.name !== 'course_manager') {
        redirect('/dashboard?error=Unauthorized')
    }

    // Double check that they exist in `course_managers` table
    const { data: managerData } = await supabase
        .from('course_managers')
        .select('id')
        .eq('user_id', user.id)
        .single()

    if (!managerData) {
        redirect('/dashboard?error=ManagerProfileMissing')
    }

    // Fetch courses assigned to this user via junction table (admin client to bypass RLS)
    const adminDb = createAdminClient()
    const { data: assignments, error: assignErr } = await adminDb
        .from('course_staff')
        .select(`
            course_id,
            courses (*)
        `)
        .eq('user_id', user.id)
        .eq('role', 'course_manager')

    if (assignErr) {
        console.error('[ManagerGuard] Error fetching course_staff:', assignErr)
    }

    const assignedCourses = (assignments?.map(a => Array.isArray(a.courses) ? a.courses[0] : a.courses).filter(Boolean) || []) as Course[]

    return { user, managerId: managerData.id, assignedCourses }
}
