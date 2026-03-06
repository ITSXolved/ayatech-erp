'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function registerStaff(formData: FormData) {
    const supabase = await createClient()

    const fullName = formData.get('fullName') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const address = formData.get('address') as string
    const dateOfBirth = formData.get('dateOfBirth') as string
    const qualification = formData.get('qualification') as string
    const password = formData.get('password') as string

    // 1. Sign up via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
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

    // 2. Get default "user" role
    const { data: userRole } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'user')
        .single()

    // 3. Insert into users table
    const { error: insertError } = await supabase.from('users').insert([{
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
        // Auth user was created but profile insert failed — still redirect to success
    }

    redirect('/register?success=true')
}
