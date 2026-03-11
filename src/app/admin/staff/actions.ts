'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { enforceAdminGuard } from '@/lib/guards'
import { sendStaffCredentialsEmail, sendStaffApprovalEmail } from '@/lib/email'

function generatePassword(length = 12): string {
    const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$'
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
        // 0. Get user details for email
        const { data: userData, error: userDetailsError } = await supabase
            .from('users')
            .select('email, full_name')
            .eq('id', userId)
            .single()

        if (userDetailsError || !userData) {
            console.error('User not found for approval email:', userDetailsError)
            return
        }

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
        let referralCode: string | undefined
        if (roleName === 'course_manager') {
            // Generate a 4-digit code for managers too
            referralCode = Math.floor(1000 + Math.random() * 9000).toString()
            const { error: cmError } = await supabase.from('course_managers').insert([{ user_id: userId, mentor_code: referralCode }])
            if (cmError) console.error('Failed to insert course_manager', cmError)
        } else if (roleName === 'promoter') {
            const { error: pError } = await supabase.from('promoters').insert([{ user_id: userId }])
            if (pError) console.error('Failed to insert promoter', pError)
        } else if (roleName === 'mentor') {
            // Generate a secure 4-digit code for the mentor
            referralCode = Math.floor(1000 + Math.random() * 9000).toString()
            const { error: mError } = await supabase.from('mentors').insert([{ user_id: userId, mentor_code: referralCode }])
            if (mError) console.error('Failed to insert mentor', mError)
        }

        // 4. Generate and Send Approval Email with System-Generated Password
        // 4. Generate and Send Approval Email with System-Generated Password
        try {
            const { createAdminClient } = await import('@/lib/supabase/admin')
            const supabaseAdmin = createAdminClient()
            const systemPassword = generatePassword()

            // Update user's password in Supabase Auth
            const { error: pwdError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                password: systemPassword
            })

            if (pwdError) {
                console.error('Failed to set system password:', pwdError)
                throw new Error(`Failed to set password: ${pwdError.message}`)
            }

            await sendStaffApprovalEmail(userData.email, userData.full_name || 'Staff Member', roleName, systemPassword, referralCode)
        } catch (err: any) {
            console.error('Failed in generating password or sending email:', err)
            throw err
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
    const dateOfBirth = formData.get('dateOfBirth') as string
    const qualification = formData.get('qualification') as string
    const roleName = formData.get('role') as 'course_manager' | 'promoter' | 'mentor'

    if (!fullName || !email || !phone || !roleName || !dateOfBirth || !qualification) {
        return { error: 'All fields (Full Name, Email, Phone, Role, DOB, Qualification) are required.' }
    }

    const password = generatePassword()

    // Use the admin client (service role) to create auth user
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabaseAdmin = createAdminClient()

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
            date_of_birth: dateOfBirth || null,
            qualification: qualification || null,
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

    if (!fullName || !email || !phone || !dateOfBirth || !qualification) {
        return { error: 'Full Name, Email, Phone, DOB, and Qualification are required.' }
    }

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

        // 2. Handle role change and entity existence
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
        }

        // 3. Ensure role-specific entity exists and update code if provided
        if (newRole === 'course_manager' || newRole === 'mentor') {
            const table = newRole === 'mentor' ? 'mentors' : 'course_managers'

            // Try to find existing
            const { data: existing } = await supabase.from(table).select('id').eq('user_id', userId).single()

            if (existing) {
                // Update code if provided
                if (referralCode) {
                    await supabase.from(table).update({ mentor_code: referralCode }).eq('user_id', userId)
                }
            } else {
                // Create new with provided or generated code
                const code = referralCode || Math.floor(1000 + Math.random() * 9000).toString()
                await supabase.from(table).insert([{ user_id: userId, mentor_code: code }])
            }
        } else if (newRole === 'promoter') {
            const { data: existing } = await supabase.from('promoters').select('id').eq('user_id', userId).single()
            if (!existing) {
                await supabase.from('promoters').insert([{ user_id: userId }])
            }
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
            // 1. Delete existing associations for this user in this role
            await supabase
                .from('course_staff')
                .delete()
                .eq('user_id', userId)
                .eq('role', roleName)

            // 2. Assign selected courses in junction table
            if (assignedCourseIds.length > 0) {
                const multiInserts = assignedCourseIds.map(courseId => ({
                    course_id: courseId,
                    user_id: userId,
                    role: roleName
                }))
                await supabase.from('course_staff').insert(multiInserts)
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

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabaseAdmin = createAdminClient()

    try {
        // 1. Un-assign from courses in junction table
        await supabaseAdmin.from('course_staff').delete().eq('user_id', userId)

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
