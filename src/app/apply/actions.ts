'use server'

import { createClient } from '@/lib/supabase/server'

export async function getActiveCourses() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('courses')
        .select('id, name, fee, category, course_groups')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name')


    if (error) {
        console.error('Error fetching courses:', error)
        return []
    }
    return data || []
}

export async function lookupReferrer(code: string) {
    if (!code || code.length !== 4) return null

    try {
        const supabase = await createClient()

        // 1. Check Mentors first
        const { data: mentorData } = await supabase
            .from('mentors')
            .select(`id, users:user_id ( full_name )`)
            .eq('mentor_code', code)
            .single()

        if (mentorData) {
            const user = Array.isArray(mentorData.users) ? mentorData.users[0] : mentorData.users
            return {
                id: mentorData.id,
                name: user?.full_name || 'Unknown Mentor',
                type: 'mentor' as const
            }
        }

        // 2. Check Course Managers
        const { data: managerData } = await supabase
            .from('course_managers')
            .select(`id, users:user_id ( full_name )`)
            .eq('mentor_code', code)
            .single()

        if (managerData) {
            const user = Array.isArray(managerData.users) ? managerData.users[0] : managerData.users
            return {
                id: managerData.id,
                name: user?.full_name || 'Unknown Manager',
                type: 'manager' as const
            }
        }

        return null
    } catch (err) {
        console.error('Exception during referrer lookup:', err)
        return null
    }
}

export async function getApplication(id: string) {
    if (!id) return null

    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('applications')
            .select(`
                *,
                mentors:mentor_id ( mentor_code, users:user_id ( full_name ) ),
                course_managers:course_manager_id ( mentor_code, users:user_id ( full_name ) )
            `)
            .eq('id', id)
            .single()

        if (error) {
            console.error('Error fetching application:', error)
            return null
        }

        return data
    } catch (err) {
        console.error('Exception during getApplication:', err)
        return null
    }
}

export async function saveApplicationDraft(
    applicationId: string | null,
    formData: {
        student_name: string
        email: string
        phone: string
        state: string
        course_id: string
        class?: string
        mentor_id?: string
        course_manager_id?: string
    }
) {
    try {
        const supabase = await createClient()

        // 1. Check for duplicate completed submissions first
        if (formData.email) {
            const { data: existing, error: existErr } = await supabase
                .from('applications')
                .select('id, status')
                .eq('email', formData.email)
                .neq('status', 'Draft')
                .limit(1)

            if (existErr) console.error('Error checking existing drafts:', existErr)
            if (existing && existing.length > 0) {
                return { error: 'An application with this email already exists.' }
            }
        }

        // 2. Prepare payload
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload: any = {
            student_name: formData.student_name || '',
            email: formData.email || '',
            phone: formData.phone || '',
            state: formData.state || '',
            class: formData.class || '',
            status: 'Draft'
        }
        if (formData.course_id) payload.course_id = formData.course_id
        if (formData.mentor_id) payload.mentor_id = formData.mentor_id
        if (formData.course_manager_id) payload.course_manager_id = formData.course_manager_id

        // 3. Update or Insert
        if (applicationId) {
            const { error } = await supabase
                .from('applications')
                .update(payload)
                .eq('id', applicationId)

            if (error) {
                console.error('Update Draft Error:', error)
                return { error: 'Failed to update draft due to a database error.' }
            }
            return { success: true, id: applicationId }
        } else {
            // Insert new Draft
            const { data, error } = await supabase
                .from('applications')
                .insert([payload])
                .select('id')
                .single()

            if (error) {
                console.error('Insert Draft Error:', error)
                return { error: 'Failed to create draft due to a database error.' }
            }
            return { success: true, id: data.id }
        }
    } catch (err) {
        console.error('Exception during saveApplicationDraft:', err)
        return { error: 'An unexpected application exception occurred.' }
    }
}
