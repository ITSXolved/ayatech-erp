import { enforceMentorGuard } from '@/lib/mentor-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { StudentRecordsClient } from './records-client'

export default async function StudentRecordsPage({
    searchParams
}: {
    searchParams: Promise<{ from?: string; to?: string; course?: string; student?: string }>
}) {
    const { mentor } = await enforceMentorGuard()
    const adminDb = createAdminClient()
    const params = await searchParams

    // Date range default to today
    const now = new Date()
    const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
    const todayStr = istNow.toISOString().split('T')[0]

    const fromDate = params.from || todayStr
    const toDate = params.to || todayStr
    const courseFilter = params.course || 'all'
    const studentFilter = params.student || ''

    // Get the mentor's schedule IDs to fetch relevant student attendance
    const { data: mentorSchedules } = await adminDb
        .from('class_schedules')
        .select('id, courses(name)')
        .eq('mentor_id', mentor.id)

    const scheduleIds = (mentorSchedules || []).map(s => s.id)

    // Student Attendance History
    const { data: studentHistory } = await adminDb
        .from('student_attendance')
        .select(`
            id,
            class_date,
            status,
            applications!application_id (
                student_name,
                courses!course_id ( name )
            )
        `)
        .in('schedule_id', scheduleIds.length > 0 ? scheduleIds : [''])
        .gte('class_date', fromDate)
        .lte('class_date', toDate)
        .order('class_date', { ascending: false })

    const uniqueCourses = new Set<string>()

    let studentAttendanceHistory = (studentHistory || []).map(h => {
        const app = h.applications as { student_name?: string, courses?: { name?: string } } | null | undefined | unknown[]
        // @ts-expect-error - Handling Supabase types
        const studentName = Array.isArray(app) ? app[0]?.student_name : app?.student_name
        // @ts-expect-error - Course typing from relationship array is complex
        const courseName = Array.isArray(app) ? app[0]?.courses?.name : app?.courses?.name

        if (courseName) uniqueCourses.add(courseName)

        return {
            id: h.id,
            date: h.class_date,
            studentName: studentName || 'Unknown',
            courseName: courseName || 'Unknown',
            status: h.status as 'present' | 'absent' | 'leave'
        }
    })

    if (courseFilter !== 'all') {
        studentAttendanceHistory = studentAttendanceHistory.filter(h => h.courseName === courseFilter)
    }

    if (studentFilter.trim() !== '') {
        const search = studentFilter.toLowerCase().trim()
        studentAttendanceHistory = studentAttendanceHistory.filter(h =>
            h.studentName.toLowerCase().includes(search)
        )
    }

    return (
        <StudentRecordsClient
            studentAttendanceHistory={studentAttendanceHistory}
            filters={{ from: fromDate, to: toDate, course: courseFilter, student: studentFilter }}
            availableCourses={Array.from(uniqueCourses).sort()}
        />
    )
}
