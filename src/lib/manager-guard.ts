import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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

    // Fetch courses assigned to this user (courses.assigned_manager_id → users.id)
    const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .eq('assigned_manager_id', user.id)

    const assignedCourses = coursesData || []

    return { user, managerId: managerData.id, assignedCourses }
}
