'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { enforceAdminGuard } from '@/lib/guards'
import { sendStaffCredentialsEmail } from '@/lib/email'

function generatePassword(length = 12): string {
    const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%'
    let password = ''
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
}

export async function approveUserRole(userId: string, roleName: 'course_manager' | 'promoter' | 'mentor') {
    await enforceAdminGuard()
    const supabase = await createClient()

    try {
        // 1. Get role ID
        const { data: role, error: roleError } = await supabase.from('roles').select('id').eq('name', roleName).single()
        if (roleError || !role) {
            console.error('Role not found or query failed:', roleError)
            return
        }

        // 2. Update user's role_id
        const { error: userError } = await supabase.from('users').update({ role_id: role.id }).eq('id', userId)
        if (userError) {
            console.error('Failed to update user role', userError)
            return
        }

        // 3. Create role-specific entity
        if (roleName === 'course_manager') {
            // Generate a 4-digit code for managers too
            const code = Math.floor(1000 + Math.random() * 9000).toString()
            const { error: cmError } = await supabase.from('course_managers').insert([{ user_id: userId, mentor_code: code }])
            if (cmError) console.error('Failed to insert course_manager', cmError)
        } else if (roleName === 'promoter') {
            const { error: pError } = await supabase.from('promoters').insert([{ user_id: userId }])
            if (pError) console.error('Failed to insert promoter', pError)
        } else if (roleName === 'mentor') {
            // Generate a secure 4-digit code for the mentor
            const code = Math.floor(1000 + Math.random() * 9000).toString()
            const { error: mError } = await supabase.from('mentors').insert([{ user_id: userId, mentor_code: code }])
            if (mError) console.error('Failed to insert mentor', mError)
        }
    } catch (err) {
        console.error('Unexpected exception during role approval:', err)
        return
    }

    revalidatePath('/admin/staff')
}

export async function createStaffUser(formData: FormData) {
    await enforceAdminGuard()

    const fullName = formData.get('fullName') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const address = formData.get('address') as string
    const roleName = formData.get('role') as 'course_manager' | 'promoter' | 'mentor'

    if (!fullName || !email || !roleName) {
        return { error: 'All fields are required.' }
    }

    const password = generatePassword()

    // Use the admin client (service role) to create auth user
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        // 1. Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // auto-confirm so they can log in immediately
        })

        if (authError || !authData.user) {
            console.error('Failed to create auth user:', authError)
            if (authError?.code === 'email_exists') {
                return { error: 'A user with this email already exists. Please use a different email.' }
            }
            return { error: authError?.message || 'Failed to create user.' }
        }

        const userId = authData.user.id

        // 2. Get the role ID
        const { data: role, error: roleError } = await supabaseAdmin.from('roles').select('id').eq('name', roleName).single()
        if (roleError || !role) {
            console.error('Role not found:', roleError)
            return { error: 'Invalid role specified.' }
        }

        // 3. Insert into users table
        const { error: usersError } = await supabaseAdmin.from('users').insert([{
            id: userId,
            full_name: fullName,
            email,
            phone: phone || null,
            address: address || null,
            role_id: role.id,
        }])

        if (usersError) {
            console.error('Failed to insert user record:', usersError)
            return { error: 'Failed to create user profile.' }
        }

        // 4. Create role-specific entity
        let referralCode: string | undefined
        if (roleName === 'course_manager') {
            referralCode = Math.floor(1000 + Math.random() * 9000).toString()
            await supabaseAdmin.from('course_managers').insert([{ user_id: userId, mentor_code: referralCode }])
        } else if (roleName === 'promoter') {
            await supabaseAdmin.from('promoters').insert([{ user_id: userId }])
        } else if (roleName === 'mentor') {
            referralCode = Math.floor(1000 + Math.random() * 9000).toString()
            await supabaseAdmin.from('mentors').insert([{ user_id: userId, mentor_code: referralCode }])
        }

        // 5. Email credentials to the new staff member
        try {
            await sendStaffCredentialsEmail(email, fullName, password, roleName, referralCode)
        } catch (emailErr) {
            console.error('Failed to send credentials email:', emailErr)
            revalidatePath('/admin/staff')
            return {
                success: true,
                warning: `Staff created but email failed to send. Please share the credentials manually — Password: ${password}`
            }
        }

    } catch (err) {
        console.error('Unexpected exception during staff creation:', err)
        return { error: 'An unexpected error occurred.' }
    }

    revalidatePath('/admin/staff')
    return { success: true }
}

export async function updateStaff(formData: FormData) {
    await enforceAdminGuard()
    const supabase = await createClient()

    const userId = formData.get('userId') as string
    const fullName = formData.get('fullName') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const address = formData.get('address') as string
    const dateOfBirth = formData.get('dateOfBirth') as string
    const qualification = formData.get('qualification') as string
    const newRole = formData.get('role') as string
    const referralCode = formData.get('referralCode') as string

    try {
        // 1. Update user profile
        const { error: updateError } = await supabase
            .from('users')
            .update({
                full_name: fullName,
                email,
                phone: phone || null,
                address: address || null,
                date_of_birth: dateOfBirth || null,
                qualification: qualification || null,
            })
            .eq('id', userId)

        if (updateError) {
            console.error('Failed to update user profile:', updateError)
            return { error: 'Failed to update profile.' }
        }

        // 2. Handle role change
        const { data: userData } = await supabase
            .from('users')
            .select('role_id, roles ( name )')
            .eq('id', userId)
            .single()

        const currentRoleNode = Array.isArray(userData?.roles) ? userData?.roles[0] : userData?.roles
        const currentRole = (currentRoleNode as { name: string } | null)?.name

        if (currentRole !== newRole) {
            const { data: roleData, error: roleError } = await supabase
                .from('roles')
                .select('id')
                .eq('name', newRole)
                .single()

            if (roleError || !roleData) {
                console.error('New role not found:', roleError)
                return { error: 'Invalid role specified.' }
            }

            await supabase.from('users').update({ role_id: roleData.id }).eq('id', userId)

            // Create role-specific entity if it doesn't exist
            if (newRole === 'course_manager') {
                const { data: existing } = await supabase.from('course_managers').select('id').eq('user_id', userId).single()
                if (!existing) {
                    const code = Math.floor(1000 + Math.random() * 9000).toString()
                    await supabase.from('course_managers').insert([{ user_id: userId, mentor_code: code }])
                }
            } else if (newRole === 'promoter') {
                const { data: existing } = await supabase.from('promoters').select('id').eq('user_id', userId).single()
                if (!existing) await supabase.from('promoters').insert([{ user_id: userId }])
            } else if (newRole === 'mentor') {
                const { data: existing } = await supabase.from('mentors').select('id').eq('user_id', userId).single()
                if (!existing) {
                    const code = Math.floor(1000 + Math.random() * 9000).toString()
                    await supabase.from('mentors').insert([{ user_id: userId, mentor_code: code }])
                }
            }
        }

        // 3. Update referral code if applicable
        if (referralCode && (newRole === 'mentor' || newRole === 'course_manager')) {
            const table = newRole === 'mentor' ? 'mentors' : 'course_managers'
            await supabase
                .from(table)
                .update({ mentor_code: referralCode })
                .eq('user_id', userId)
        }

        // 4. Handle course assignments
        const assignedCourseIds = formData.getAll('assignedCourses') as string[]

        // Get user role to know which column to update
        const { data: userWithRole } = await supabase
            .from('users')
            .select('roles(name)')
            .eq('id', userId)
            .single()

        const roleNode = Array.isArray(userWithRole?.roles) ? userWithRole?.roles[0] : userWithRole?.roles
        const roleName = (roleNode as { name: string } | null)?.name

        if (roleName === 'course_manager' || roleName === 'mentor') {
            const assignmentColumn = roleName === 'course_manager' ? 'assigned_manager_id' : 'assigned_mentor_id'

            // Un-assign all courses currently assigned to this user in their specific role
            await supabase
                .from('courses')
                .update({ [assignmentColumn]: null })
                .eq(assignmentColumn, userId)

            // Assign selected courses
            if (assignedCourseIds.length > 0) {
                for (const courseId of assignedCourseIds) {
                    await supabase
                        .from('courses')
                        .update({ [assignmentColumn]: userId })
                        .eq('id', courseId)
                }
            }
        }
    } catch (err) {
        console.error('Exception updating staff:', err)
        return { error: 'An unexpected error occurred.' }
    }

    revalidatePath('/admin/staff')
    revalidatePath('/admin/courses')
    return { success: true }
}

export async function deleteStaff(userId: string) {
    await enforceAdminGuard()

    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        // 1. Un-assign from courses (we still want to remove them from active courses)
        await supabaseAdmin.from('courses').update({ assigned_manager_id: null }).eq('assigned_manager_id', userId)
        await supabaseAdmin.from('courses').update({ assigned_mentor_id: null }).eq('assigned_mentor_id', userId)

        // 2. We DO NOT delete role-specific records/FKs so history is preserved
        // Instead, we mark the public.users record as deleted
        const now = new Date().toISOString()
        const { error: userError } = await supabaseAdmin.from('users').update({ deleted_at: now }).eq('id', userId)
        if (userError) {
            console.error('Failed to soft delete user record:', userError)
            return { error: 'Failed to delete user profile.' }
        }

        // 3. Suspend auth user using admin API (Ban them so they cannot log in)
        const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            ban_duration: '876000h' // 100 years
        })
        if (banError) {
            console.error('Failed to ban auth user:', banError)
            // Even if banning fails, the UI will hide them because of deleted_at
        }
    } catch (err) {
        console.error('Exception deleting staff:', err)
        return { error: 'Failed to delete staff member.' }
    }

    revalidatePath('/admin/staff')
    revalidatePath('/admin/courses')
    return { success: true }
}
