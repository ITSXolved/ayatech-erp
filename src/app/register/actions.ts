'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function registerStaff(formData: FormData) {
    const supabase = await createClient()

    const fullName = formData.get('fullName') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const address = formData.get('address') as string
    const dateOfBirth = formData.get('dateOfBirth') as string
    const qualification = formData.get('qualification') as string
    if (!fullName || !email || !phone || !dateOfBirth || !qualification) {
        redirect(`/register?error=${encodeURIComponent('All required fields (Full Name, Email, Phone, DOB, Qualification) must be filled.')}`)
    }

    // Generate a random placeholder password for self-registration.
    // This will be replaced by a real system-generated password upon approval.
    const placeholderPassword = Math.random().toString(36).slice(-12) + '!'

    // 1. Check if user already exists in public.users to give better feedback
    const adminSupabase = createAdminClient()
    const { data: existingProfile } = await adminSupabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single()

    if (existingProfile) {
        // Check if the user is soft-deleted
        const { data: deletedProfile } = await adminSupabase
            .from('users')
            .select('deleted_at')
            .eq('id', existingProfile.id)
            .single()

        if (deletedProfile?.deleted_at) {
            // REACTIVATION FLOW
            // 1. Unban user in Auth
            const { error: unbanError } = await adminSupabase.auth.admin.updateUserById(existingProfile.id, {
                ban_duration: 'none',
                password: placeholderPassword
            })
            if (unbanError) {
                console.error('Failed to unban user:', unbanError)
                redirect(`/register?error=${encodeURIComponent('Failed to reactivate account. Please contact admin.')}`)
            }

            // 2. Get default "user" role
            const { data: userRole } = await adminSupabase
                .from('roles')
                .select('id')
                .eq('name', 'user')
                .single()

            // 3. Restore and update profile
            const { error: reactivateError } = await adminSupabase
                .from('users')
                .update({
                    deleted_at: null,
                    full_name: fullName,
                    phone: phone || null,
                    address: address || null,
                    date_of_birth: dateOfBirth || null,
                    qualification: qualification || null,
                    role_id: userRole?.id || null,
                })
                .eq('id', existingProfile.id)

            if (reactivateError) {
                console.error('Failed to restore profile:', reactivateError)
                redirect(`/register?error=${encodeURIComponent('Failed to restore profile. Please contact admin.')}`)
            }

            redirect('/register?success=true')
        }

        redirect(`/register?error=${encodeURIComponent('This email is already registered. Please log in or contact admin if you need help.')}`)
    }

    // 1.5 Check if user exists in auth.users but lacks a profile
    const { data: { users: authUsers }, error: listError } = await adminSupabase.auth.admin.listUsers()
    const existingAuthUser = authUsers?.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (existingAuthUser) {
        // User exists in Auth but not in public.users
        // This can happen if they were hard-deleted from public.users but not Auth

        // 1. Unban and set password
        const { error: updateAuthError } = await adminSupabase.auth.admin.updateUserById(existingAuthUser.id, {
            ban_duration: 'none',
            password: placeholderPassword
        })
        if (updateAuthError) {
            console.error('Failed to update existing auth user:', updateAuthError)
            redirect(`/register?error=${encodeURIComponent('Failed to update account. Please contact admin.')}`)
        }

        // 2. Get default "user" role
        const { data: userRole } = await adminSupabase.from('roles').select('id').eq('name', 'user').single()

        // 3. Create profile
        const { error: createProfileError } = await adminSupabase.from('users').insert([{
            id: existingAuthUser.id,
            email,
            full_name: fullName,
            phone: phone || null,
            address: address || null,
            date_of_birth: dateOfBirth || null,
            qualification: qualification || null,
            role_id: userRole?.id || null,
        }])

        if (createProfileError) {
            console.error('Failed to create profile for existing auth user:', createProfileError)
            redirect(`/register?error=${encodeURIComponent('Failed to setup profile. Please contact admin.')}`)
        }

        redirect('/register?success=true')
    }

    // 2. Sign up via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: placeholderPassword,
        options: {
            data: {
                full_name: fullName,
            },
        },
    })

    if (authError || !authData.user) {
        const msg = authError?.message || 'Registration failed'
        redirect(`/register?error=${encodeURIComponent(msg)}`)
    }

    // 3. Get default "user" role
    const { data: userRole } = await adminSupabase
        .from('roles')
        .select('id')
        .eq('name', 'user')
        .single()

    // 4. Insert into users table using admin client to bypass RLS
    const { error: insertError } = await adminSupabase.from('users').insert([{
        id: authData.user.id,
        email,
        full_name: fullName,
        phone: phone || null,
        address: address || null,
        date_of_birth: dateOfBirth || null,
        qualification: qualification || null,
        role_id: userRole?.id || null,
    }])

    if (insertError) {
        console.error('Failed to insert user record:', insertError)

        // Handle Foreign Key violation (Code 23503)
        // This often happens if signUp returned a fake ID due to Account Enumeration Protection
        if (insertError.code === '23503') {
            redirect(`/register?error=${encodeURIComponent('This email is already registered. Please log in with your existing password.')}`)
        }

        redirect(`/register?error=${encodeURIComponent('User created but profile setup failed. Please contact admin.')}`)
    }

    redirect('/register?success=true')
}
