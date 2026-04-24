import { createAdminClient } from '@/lib/supabase/admin'
import { AdminSchedulingClient } from './admin-scheduling-client'

export default async function AdminSchedulingPage() {
    const adminDb = createAdminClient()

    // Admin sees ALL courses
    const { data: allCourses } = await adminDb.from('courses').select('id, name').eq('is_active', true)
    const courses = (allCourses || []).map(c => ({ id: c.id, name: c.name }))

    const courseNameMap: Record<string, string> = {}
    courses.forEach(c => { courseNameMap[c.id] = c.name })

    // Fetch all schedules
    const { data: schedules } = await adminDb
        .from('class_schedules')
        .select('*')
        .order('start_date', { ascending: true })

    // Fetch all mentors
    const { data: rawMentors } = await adminDb.from('mentors').select('id, user_id')
    const mentorUserIds = (rawMentors || []).map(m => m.user_id).filter(Boolean)
    const { data: mentorUsers } = mentorUserIds.length > 0
        ? await adminDb.from('users').select('id, full_name').in('id', mentorUserIds)
        : { data: [] }

    const userNameMap = new Map((mentorUsers || []).map(u => [u.id, u.full_name]))
    const mentorNameMap: Record<string, string> = {}
        ; (rawMentors || []).forEach(m => { mentorNameMap[m.id] = userNameMap.get(m.user_id) || 'Unknown' })

    const mentors = (rawMentors || []).map(m => ({ id: m.id, name: userNameMap.get(m.user_id) || 'Unknown' }))

    // Today's date in IST
    const now = new Date()
    const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
    const todayStr = istNow.toISOString().split('T')[0]

    return (
        <AdminSchedulingClient
            schedules={schedules || []}
            courses={courses}
            mentors={mentors}
            courseNameMap={courseNameMap}
            mentorNameMap={mentorNameMap}
            todayStr={todayStr}
        />
    )
}
