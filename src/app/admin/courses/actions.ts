'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { enforceAdminGuard } from '@/lib/guards'
export async function getCourseCategories() {
    await enforceAdminGuard()
    const supabase = await createClient()

    // Group by category to get distinct values securely
    const { data } = await supabase.from('courses').select('category').is('deleted_at', null).order('category')

    if (!data) return []
    // Extract unique categories
    const categories = Array.from(new Set(data.map(d => d.category))).filter(Boolean)
    return categories as string[]
}

export async function addCourse(formData: FormData) {
    await enforceAdminGuard()
    const supabase = await createClient()

    const name = formData.get('name') as string
    const category = formData.get('category') as string
    const fee = parseFloat(formData.get('fee') as string)
    const promoter_commission_rate = parseFloat(formData.get('promoter_commission_rate') as string)
    const canvas_course_id = formData.get('canvas_course_id') as string
    const course_groups_raw = formData.get('course_groups') as string
    const course_groups = course_groups_raw ? JSON.parse(course_groups_raw) : []

    try {
        const { error } = await supabase.from('courses').insert([{
            name,
            category,
            fee,
            promoter_commission_rate,
            canvas_course_id: canvas_course_id || null,
            course_groups,
            is_active: true
        }])

        if (error) {
            console.error('Database error adding course:', error)
            return
        }
    } catch (err) {
        console.error('Exception adding course:', err)
        return
    }

    revalidatePath('/admin/courses')
}

export async function toggleCourseStatus(courseId: string, currentStatus: boolean) {
    await enforceAdminGuard()
    const supabase = await createClient()

    try {
        const { error } = await supabase.from('courses')
            .update({ is_active: !currentStatus })
            .eq('id', courseId)

        if (error) {
            console.error('Database error toggling course:', error)
            return
        }
    } catch (err) {
        console.error('Exception toggling course:', err)
        return
    }

    revalidatePath('/admin/courses')
}

export async function updateCourse(formData: FormData) {
    await enforceAdminGuard()
    const supabase = await createClient()

    const courseId = formData.get('courseId') as string
    const name = formData.get('name') as string
    const category = formData.get('category') as string
    const fee = parseFloat(formData.get('fee') as string)
    const promoter_commission_rate = parseFloat(formData.get('promoter_commission_rate') as string)
    const assigned_manager_ids = formData.getAll('assigned_manager_ids') as string[]
    const assigned_mentor_ids = formData.getAll('assigned_mentor_ids') as string[]
    const canvas_course_id = formData.get('canvas_course_id') as string
    const course_groups_raw = formData.get('course_groups') as string
    const course_groups = course_groups_raw ? JSON.parse(course_groups_raw) : []

    try {
        // 1. Update basic course info (Removing single assignment columns)
        const { error } = await supabase.from('courses')
            .update({
                name,
                category,
                fee,
                promoter_commission_rate,
                canvas_course_id: canvas_course_id || null,
                course_groups,
                updated_at: new Date().toISOString(),
            })
            .eq('id', courseId)

        if (error) throw error

        // 2. Update staff assignments in junction table
        // Delete existing assignments for this course
        await supabase.from('course_staff').delete().eq('course_id', courseId)

        // Insert new manager assignments
        if (assigned_manager_ids.length > 0) {
            const managerInserts = assigned_manager_ids.map(id => ({
                course_id: courseId,
                user_id: id,
                role: 'course_manager'
            }))
            await supabase.from('course_staff').insert(managerInserts)
        }

        // Insert new mentor assignments
        if (assigned_mentor_ids.length > 0) {
            const mentorInserts = assigned_mentor_ids.map(id => ({
                course_id: courseId,
                user_id: id,
                role: 'mentor'
            }))
            await supabase.from('course_staff').insert(mentorInserts)
        }

    } catch (err) {
        console.error('Exception updating course:', err)
    }

    revalidatePath('/admin/courses')
}
