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

    try {
        const { error } = await supabase.from('courses').insert([{
            name,
            category,
            fee,
            promoter_commission_rate,
            canvas_course_id: canvas_course_id || null,
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
    const assigned_manager_id = formData.get('assigned_manager_id') as string || null
    const assigned_mentor_id = formData.get('assigned_mentor_id') as string || null
    const canvas_course_id = formData.get('canvas_course_id') as string

    try {
        const { error } = await supabase.from('courses')
            .update({
                name,
                category,
                fee,
                promoter_commission_rate,
                assigned_manager_id: assigned_manager_id || null,
                assigned_mentor_id: assigned_mentor_id || null,
                canvas_course_id: canvas_course_id || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', courseId)

        if (error) {
            console.error('Database error updating course:', error)
        }
    } catch (err) {
        console.error('Exception updating course:', err)
    }

    revalidatePath('/admin/courses')
}
