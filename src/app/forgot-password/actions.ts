'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function forgotPassword(formData: FormData) {
    const supabase = await createClient()
    const email = formData.get('email') as string

    if (!email) {
        redirect('/forgot-password?error=Email is required')
    }

    const host = (await headers()).get('host')
    const protocol = host?.includes('localhost') ? 'http' : 'https'
    const redirectTo = `${protocol}://${host}/auth/callback?next=/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
    })

    if (error) {
        console.error('Password reset error:', error)
        redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`)
    }

    redirect('/forgot-password?success=Check your email for the password reset link.')
}

export async function resetPassword(formData: FormData) {
    const supabase = await createClient()
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!password || password !== confirmPassword) {
        redirect('/reset-password?error=Passwords do not match')
    }

    const { error } = await supabase.auth.updateUser({
        password,
    })

    if (error) {
        console.error('Update user error:', error)
        redirect(`/reset-password?error=${encodeURIComponent(error.message)}`)
    }

    redirect('/login?success=Password updated successfully. Please log in.')
}
