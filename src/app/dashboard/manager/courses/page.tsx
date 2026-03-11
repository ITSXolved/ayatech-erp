import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceManagerGuard } from '@/lib/manager-guard'
import { CourseManagementClient } from './course-management-client'
import { TodaysClasses } from './todays-classes'

export default async function CourseManagementPage() {
    const { assignedCourses } = await enforceManagerGuard()
    const supabase = await createClient()
    const adminDb = createAdminClient()

    const courseIds = assignedCourses.map(c => c.id)

    // Fetch existing schedules
    const { data: schedules } = await supabase
        .from('class_schedules')
        .select('*')
        .in('course_id', courseIds)
        .order('start_date', { ascending: true })

    // Build course name map
    const courseNameMap: Record<string, string> = {}
    assignedCourses.forEach(c => { courseNameMap[c.id] = c.name })

    // Fetch mentor data using admin client
    const { data: rawMentors } = await adminDb.from('mentors').select('id, user_id')
    const mentorUserIds = (rawMentors || []).map(m => m.user_id).filter(Boolean)
    const { data: mentorUsers } = mentorUserIds.length > 0
        ? await adminDb.from('users').select('id, full_name').in('id', mentorUserIds)
        : { data: [] }

    const userNameMap = new Map((mentorUsers || []).map(u => [u.id, u.full_name]))

    const mentorNameMap: Record<string, string> = {}
        ; (rawMentors || []).forEach(m => { mentorNameMap[m.id] = userNameMap.get(m.user_id) || 'Unknown' })

    const mentors = (rawMentors || []).map(m => ({
        id: m.id,
        name: userNameMap.get(m.user_id) || 'Unknown',
    }))

    const courses = assignedCourses.map(c => ({
        id: c.id,
        name: c.name,
    }))

    // --- Today's Classes ---
    // Get today's date in IST
    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000
    const istNow = new Date(now.getTime() + istOffset)
    const todayStr = istNow.toISOString().split('T')[0]

    // Filter schedules active today
    const todaySchedules = (schedules || []).filter(s => {
        if (s.start_date > todayStr || s.end_date < todayStr) return false
        const excluded = Array.isArray(s.excluded_dates) ? s.excluded_dates : []
        return !excluded.includes(todayStr)
    })

    // Fetch attendance for today's classes
    const scheduleIds = todaySchedules.map(s => s.id)
    const { data: attendanceRows } = scheduleIds.length > 0
        ? await supabase
            .from('class_attendance')
            .select('schedule_id, status')
            .in('schedule_id', scheduleIds)
            .eq('class_date', todayStr)
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
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: '#0a192f' }}>Course Management</h2>
            <CourseManagementClient
                schedules={schedules || []}
                courses={courses}
                mentors={mentors}
                courseNameMap={courseNameMap}
                mentorNameMap={mentorNameMap}
            />
            <TodaysClasses classes={todayClasses} todayStr={todayStr} />
        </div>
    )
}
