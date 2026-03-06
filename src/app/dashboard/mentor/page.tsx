import { enforceMentorGuard } from '@/lib/mentor-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { MentorDashboardClient } from './mentor-client'

export default async function MentorDashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ from?: string; to?: string }>
}) {
    const { user, mentor, assignedCourses } = await enforceMentorGuard()
    const adminDb = createAdminClient()
    const params = await searchParams

    // Date range for summary table
    const now = new Date()
    const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
    const todayStr = istNow.toISOString().split('T')[0]

    const defaultFrom = new Date(istNow.getFullYear(), istNow.getMonth(), 1).toISOString().split('T')[0]
    const defaultTo = istNow.toISOString().split('T')[0]
    const fromDate = params.from || defaultFrom
    const toDate = params.to || defaultTo

    // 1. Fetch Commissions
    const { data: commissions } = await adminDb
        .from('commissions')
        .select(`
            amount, 
            created_at,
            status,
            payment:payments!payment_id (
                application:applications!application_id ( 
                    course_id,
                    courses ( name )
                )
            )
        `)
        .eq('beneficiary_id', user.id)

    // Filter out rows where schedule is null (because of .eq on join which might not work as expected in Supabase client if not filtered properly)
    // Actually, Better to query schedules first if filtering by mentor_id.
    const { data: mentorSchedules } = await adminDb
        .from('class_schedules')
        .select('id, hourly_rate, duration_minutes, course:courses!course_id(id, name)')
        .eq('mentor_id', mentor.id)

    const scheduleIds = (mentorSchedules || []).map(s => s.id)

    const { data: mentorAttendance } = scheduleIds.length > 0
        ? await adminDb
            .from('class_attendance')
            .select(`id, class_date, status, schedule_id`)
            .in('schedule_id', scheduleIds)
        : { data: [] }

    const scheduleMap = new Map((mentorSchedules || []).map(s => [s.id, s]))

    // 3. Today's Classes
    const { data: todaysClassesRaw } = await adminDb
        .from('class_schedules')
        .select('*, course:courses!course_id(name)')
        .eq('mentor_id', mentor.id)
        .lte('start_date', todayStr)
        .gte('end_date', todayStr)

    const todaysClasses = (todaysClassesRaw || []).filter(sch => {
        const isExcluded = sch.excluded_dates?.includes(todayStr)
        return !isExcluded
    })

    // 4. Calculate Stats
    const totalCommissions = (commissions || []).reduce((sum, c) => sum + Number(c.amount || 0), 0)

    let totalMentoringCharge = 0
    const attendanceDetails: {
        date: string
        courseName: string
        status: 'present' | 'absent' | 'pending'
        hours: number
        rate: number
        earned: number
    }[] = []

    for (const att of (mentorAttendance || [])) {
        const sch = scheduleMap.get(att.schedule_id) as {
            hourly_rate: number,
            duration_minutes: number,
            course: { id: string, name: string }
        } | undefined
        if (!sch) continue

        const rate = Number(sch.hourly_rate || 0)
        const hours = (sch.duration_minutes || 60) / 60
        const earned = att.status === 'present' ? rate * hours : 0

        if (att.status === 'present') {
            totalMentoringCharge += earned
        }

        if (att.class_date <= todayStr && att.class_date >= fromDate && att.class_date <= toDate) {
            attendanceDetails.push({
                date: att.class_date,
                courseName: sch.course?.name || 'Unknown',
                status: att.status as 'present' | 'absent' | 'pending',
                hours,
                rate,
                earned
            })
        }
    }

    const totalCourses = assignedCourses.length
    const totalEarnings = totalMentoringCharge + totalCommissions

    // 5. Income Summary Table (grouped by course)
    const incomeMap: Map<string, { courseName: string, mentoringCharge: number, commission: number }> = new Map()

    // Add mentoring charges
    for (const att of (mentorAttendance || [])) {
        // Filter by date range for the summary table
        if (att.class_date < fromDate || att.class_date > toDate) continue
        if (att.status !== 'present') continue

        const sch = scheduleMap.get(att.schedule_id) as {
            hourly_rate: number,
            duration_minutes: number,
            course: { id: string, name: string }
        } | undefined
        if (!sch) continue

        const courseId = sch.course.id
        const earned = (Number(sch.hourly_rate || 0) * (sch.duration_minutes || 60)) / 60

        if (!incomeMap.has(courseId)) {
            incomeMap.set(courseId, { courseName: sch.course.name, mentoringCharge: 0, commission: 0 })
        }
        incomeMap.get(courseId)!.mentoringCharge += earned
    }

    // Add commissions
    for (const comm of (commissions || [])) {
        const createdAtDate = new Date(comm.created_at).toISOString().split('T')[0]
        if (createdAtDate < fromDate || createdAtDate > toDate) continue

        const payment = (Array.isArray(comm.payment) ? comm.payment[0] : comm.payment) as {
            application: {
                course_id: string,
                courses: { name: string } | { name: string }[]
            } | {
                course_id: string,
                courses: { name: string } | { name: string }[]
            }[]
        } | null

        if (!payment || !payment.application) continue

        type AppInfo = { course_id: string; courses: { name: string } | { name: string }[] }
        const app = (Array.isArray(payment.application) ? payment.application[0] : payment.application) as AppInfo

        const courseId = app.course_id
        const courseData = Array.isArray(app.courses) ? app.courses[0] : app.courses
        const courseName = courseData ? (courseData as { name: string }).name : 'Unknown'

        if (!incomeMap.has(courseId)) {
            incomeMap.set(courseId, { courseName, mentoringCharge: 0, commission: 0 })
        }
        incomeMap.get(courseId)!.commission += Number(comm.amount || 0)
    }

    const incomeSummary = [...incomeMap.values()]

    // 6. Today's Absentees
    const { data: absentees } = await adminDb
        .from('student_attendance')
        .select(`
            id,
            class_date,
            status,
            applications!application_id (
                student_name,
                full_name:student_name,
                courses!course_id ( name )
            )
        `)
        .in('schedule_id', scheduleIds)
        .eq('class_date', todayStr)
        .eq('status', 'absent')

    const todayAbsentees = (absentees || []).map(a => {
        const app = a.applications as { student_name?: string, courses?: { name?: string } } | null | undefined | unknown[]
        // @ts-expect-error - Handle Supabase typing complexities
        const studentName = Array.isArray(app) ? app[0]?.student_name : app?.student_name
        // @ts-expect-error - App courses typing is complex
        const courseName = Array.isArray(app) ? app[0]?.courses?.name : app?.courses?.name

        return {
            date: a.class_date,
            studentName: studentName || 'Unknown',
            courseName: courseName || 'Unknown',
            status: a.status as 'absent'
        }
    })

    return (
        <MentorDashboardClient
            user={user}
            stats={{
                totalEarnings,
                totalMentoringCharge,
                totalCommissions,
                totalCourses
            }}
            todaysClasses={todaysClasses}
            attendanceDetails={attendanceDetails.sort((a, b) => b.date.localeCompare(a.date))}
            incomeSummary={incomeSummary}
            todayAbsentees={todayAbsentees}
            filters={{
                fromDate,
                toDate
            }}
        />
    )
}
