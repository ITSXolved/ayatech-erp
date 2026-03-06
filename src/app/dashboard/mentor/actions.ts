'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceMentorGuard } from '@/lib/mentor-guard'
import { revalidatePath } from 'next/cache'

export async function markStudentAttendance(
    scheduleId: string,
    classDate: string,
    attendanceData: { application_id: string; status: 'present' | 'absent' | 'leave' }[]
) {
    await enforceMentorGuard()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const rows = attendanceData.map(item => ({
        schedule_id: scheduleId,
        class_date: classDate,
        application_id: item.application_id,
        status: item.status,
        marked_by: user.id,
        marked_at: new Date().toISOString(),
    }))

    const { error } = await supabase
        .from('student_attendance')
        .upsert(rows, { onConflict: 'schedule_id,class_date,application_id' })

    if (error) {
        console.error('Error marking student attendance:', error)
        throw new Error('Failed to mark student attendance.')
    }

    revalidatePath('/dashboard/mentor')
}

export async function getSessionAttendance(scheduleId: string, classDate: string) {
    await enforceMentorGuard()
    const supabase = createAdminClient()

    // 1. Get schedule details (to find course_id)
    const { data: schedule } = await supabase
        .from('class_schedules')
        .select('course_id')
        .eq('id', scheduleId)
        .single()

    if (!schedule) return []

    // 2. Get students enrolled in this course
    const { data: students } = await supabase
        .from('applications')
        .select('id, student_name, email')
        .eq('course_id', schedule.course_id)
        .eq('status', 'Enrolled')

    if (!students || students.length === 0) return []

    // 3. Get existing attendance records
    const { data: attendance } = await supabase
        .from('student_attendance')
        .select('application_id, status')
        .eq('schedule_id', scheduleId)
        .eq('class_date', classDate)

    const attendanceData = (attendance || []) as { application_id: string, status: string }[]
    const attendanceMap = new Map(attendanceData.map(a => [a.application_id, a.status]))

    // 4. Return combined data (default to 'present' if no record exists)
    const studentsData = students as { id: string, student_name: string, email: string }[]
    return studentsData.map(student => ({
        application_id: student.id,
        status: attendanceMap.get(student.id) || 'present',
        applications: {
            student_name: student.student_name,
            email: student.email
        }
    }))
}
