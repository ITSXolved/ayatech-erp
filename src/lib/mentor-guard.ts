import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface Course {
    id: string;
    name: string;
    [key: string]: any;
}

/**
 * Validates if the current user is a Mentor.
 * Redirects to /dashboard if unauthorized.
 * Returns the mentor user object and profile data if valid.
 */
export async function enforceMentorGuard() {
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

    if (roleNode?.name !== 'mentor') {
        redirect('/dashboard?error=Unauthorized')
    }

    // Check for profile in `mentors` table
    const { data: mentorData } = await supabase
        .from('mentors')
        .select('*')
        .eq('user_id', user.id)
        .single()

    if (!mentorData) {
        redirect('/dashboard?error=MentorProfileMissing')
    }

    // Fetch courses where this mentor is assigned via junction table
    const { data: assignments } = await supabase
        .from('course_staff')
        .select(`
            course_id,
            courses (*)
        `)
        .eq('user_id', user.id)
        .eq('role', 'mentor')

    const assignedCourses = (assignments?.map(a => Array.isArray(a.courses) ? a.courses[0] : a.courses).filter(Boolean) || []) as Course[]

    return { user, mentor: mentorData, assignedCourses }
}
