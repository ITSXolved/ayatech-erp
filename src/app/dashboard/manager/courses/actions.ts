'use server'

import { createClient } from '@/lib/supabase/server'
import { enforceManagerGuard } from '@/lib/manager-guard'
import { revalidatePath } from 'next/cache'

export async function createClassSchedule(formData: {
    courseId: string
    mentorId: string
    startDate: string
    endDate: string
    classTime: string
    durationMinutes: number
    hourlyRate: number
    excludedDates: string[]
}) {
    const { assignedCourses } = await enforceManagerGuard()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    // Verify manager owns this course
    const courseIds = assignedCourses.map((c: { id: string }) => c.id)
    if (!courseIds.includes(formData.courseId)) {
        throw new Error('You do not manage this course.')
    }

    const { data: inserted, error } = await supabase.from('class_schedules').insert({
        course_id: formData.courseId,
        mentor_id: formData.mentorId,
        start_date: formData.startDate,
        end_date: formData.endDate,
        class_time: formData.classTime,
        duration_minutes: formData.durationMinutes,
        hourly_rate: formData.hourlyRate,
        excluded_dates: formData.excludedDates,
        created_by: user.id,
    }).select('id').single()

    if (error || !inserted) {
        console.error('Error creating class schedule:', error)
        throw new Error('Failed to create class schedule.')
    }

    // Pre-create attendance rows for all active dates
    const excludedSet = new Set(formData.excludedDates)
    const attendanceRows: { schedule_id: string; class_date: string; status: string }[] = []

    // Fetch students enrolled in this course
    const { data: students } = await supabase
        .from('applications')
        .select('id')
        .eq('course_id', formData.courseId)
        .eq('status', 'Enrolled')

    const studentRows: { schedule_id: string; class_date: string; application_id: string; status: string }[] = []

    const current = new Date(formData.startDate + 'T00:00:00')
    const end = new Date(formData.endDate + 'T00:00:00')
    while (current <= end) {
        const dateStr = current.toISOString().split('T')[0]
        if (!excludedSet.has(dateStr)) {
            attendanceRows.push({
                schedule_id: inserted.id,
                class_date: dateStr,
                status: 'pending',
            })

            // Add rows for each student
            if (students) {
                students.forEach(student => {
                    studentRows.push({
                        schedule_id: inserted.id,
                        class_date: dateStr,
                        application_id: student.id,
                        status: 'present'
                    })
                })
            }
        }
        current.setDate(current.getDate() + 1)
    }

    if (attendanceRows.length > 0) {
        await supabase.from('class_attendance').insert(attendanceRows)
    }
    if (studentRows.length > 0) {
        await supabase.from('student_attendance').insert(studentRows)
    }

    revalidatePath('/dashboard/manager/courses')
}

export async function deleteClassSchedule(scheduleId: string) {
    await enforceManagerGuard()
    const supabase = await createClient()

    const { error } = await supabase
        .from('class_schedules')
        .delete()
        .eq('id', scheduleId)

    if (error) {
        console.error('Error deleting class schedule:', error)
        throw new Error('Failed to delete class schedule.')
    }

    revalidatePath('/dashboard/manager/courses')
}

export async function updateClassSchedule(scheduleId: string, formData: {
    courseId: string
    mentorId: string
    startDate: string
    endDate: string
    classTime: string
    durationMinutes: number
    hourlyRate: number
    excludedDates: string[]
}) {
    const { assignedCourses } = await enforceManagerGuard()
    const supabase = await createClient()

    const courseIds = assignedCourses.map((c: { id: string }) => c.id)
    if (!courseIds.includes(formData.courseId)) {
        throw new Error('You do not manage this course.')
    }

    const { error } = await supabase
        .from('class_schedules')
        .update({
            course_id: formData.courseId,
            mentor_id: formData.mentorId,
            start_date: formData.startDate,
            end_date: formData.endDate,
            class_time: formData.classTime,
            duration_minutes: formData.durationMinutes,
            hourly_rate: formData.hourlyRate,
            excluded_dates: formData.excludedDates,
        })
        .eq('id', scheduleId)

    if (error) {
        console.error('Error updating class schedule:', error)
        throw new Error('Failed to update class schedule.')
    }

    revalidatePath('/dashboard/manager/courses')
}

export async function markAttendance(scheduleId: string, classDate: string, status: 'present' | 'absent') {
    await enforceManagerGuard()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase
        .from('class_attendance')
        .upsert({
            schedule_id: scheduleId,
            class_date: classDate,
            status,
            marked_by: user.id,
            marked_at: new Date().toISOString(),
        }, { onConflict: 'schedule_id,class_date' })

    if (error) {
        console.error('Error marking attendance:', error)
        throw new Error('Failed to mark attendance.')
    }

    revalidatePath('/dashboard/manager/courses')
}
