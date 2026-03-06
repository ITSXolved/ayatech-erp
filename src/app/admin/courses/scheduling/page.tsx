import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { AdminSchedulingClient } from './admin-scheduling-client'

export default async function AdminSchedulingPage() {
    const adminDb = createAdminClient()
    const supabase = await createClient()

    // Admin sees ALL courses
    const { data: allCourses } = await adminDb.from('courses').select('id, name').eq('is_active', true)
    const courses = (allCourses || []).map(c => ({ id: c.id, name: c.name }))
    const courseIds = courses.map(c => c.id)

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

    // Today's classes
    const now = new Date()
    const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
    const todayStr = istNow.toISOString().split('T')[0]

    const todaySchedules = (schedules || []).filter(s => {
        if (s.start_date > todayStr || s.end_date < todayStr) return false
        const excluded = Array.isArray(s.excluded_dates) ? s.excluded_dates : []
        return !excluded.includes(todayStr)
    })

    const scheduleIds = todaySchedules.map(s => s.id)
    const { data: attendanceRows } = scheduleIds.length > 0
        ? await supabase.from('class_attendance').select('schedule_id, status').in('schedule_id', scheduleIds).eq('class_date', todayStr)
        : { data: [] }

    const attendanceMap = new Map((attendanceRows || []).map(a => [a.schedule_id, a.status]))

    const todayClasses = todaySchedules.map(s => ({
        scheduleId: s.id,
        courseName: courseNameMap[s.course_id] || 'Unknown',
        mentorName: mentorNameMap[s.mentor_id] || 'Unknown',
        classTime: s.class_time,
        duration: s.duration_minutes,
        hourlyRate: s.hourly_rate || 0,
        attendance: (attendanceMap.get(s.id) as 'pending' | 'present' | 'absent') || null,
    }))

    return (
        <AdminSchedulingClient
            schedules={schedules || []}
            courses={courses}
            mentors={mentors}
            courseNameMap={courseNameMap}
            mentorNameMap={mentorNameMap}
            todayClasses={todayClasses}
            todayStr={todayStr}
        />
    )
}
