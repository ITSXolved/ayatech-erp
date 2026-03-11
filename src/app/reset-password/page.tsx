import { resetPassword } from '../forgot-password/actions'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ResetPasswordPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>
}) {
    const { error } = await searchParams
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user && !error) {
        // If there's no user and no explicit error, the session might have failed to establish
        redirect('/forgot-password?error=Your session expired or the link is invalid. Please request a new reset link.')
    }

    return (
        <div className="flex min-h-screen" style={{ background: 'linear-gradient(135deg, #0a192f 0%, #112240 50%, #0a192f 100%)' }}>
            <div className="flex-1 flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-sm">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="h-12 w-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h1 style={{ color: '#e6f1ff', fontSize: '24px', fontWeight: 800 }}>Create New Password</h1>
                        <p style={{ color: '#8892b0', fontSize: '14px', marginTop: '6px' }}>
                            Choose a strong password for your account.
                        </p>
                    </div>

                    {/* Card */}
                    <div style={{ backgroundColor: '#112240', borderRadius: '16px', border: '1px solid #233554', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                        <div style={{ padding: '28px' }}>
                            <form className="space-y-5" action={resetPassword}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#ccd6f6', marginBottom: '6px' }}>
                                        New Password
                                    </label>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="••••••••"
                                        required
                                        minLength={8}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            fontSize: '14px',
                                            borderRadius: '8px',
                                            borderWidth: '1.5px',
                                            borderStyle: 'solid',
                                            borderColor: '#233554',
                                            backgroundColor: '#0a192f',
                                            color: '#ccd6f6',
                                            outline: 'none',
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#ccd6f6', marginBottom: '6px' }}>
                                        Confirm Password
                                    </label>
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        required
                                        minLength={8}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            fontSize: '14px',
                                            borderRadius: '8px',
                                            borderWidth: '1.5px',
                                            borderStyle: 'solid',
                                            borderColor: '#233554',
                                            backgroundColor: '#0a192f',
                                            color: '#ccd6f6',
                                            outline: 'none',
                                        }}
                                    />
                                </div>

                                {error && (
                                    <div style={{
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        backgroundColor: 'rgba(255, 107, 107, 0.1)',
                                        borderWidth: '1px',
                                        borderStyle: 'solid',
                                        borderColor: 'rgba(255, 107, 107, 0.2)',
                                        color: '#ff6b6b',
                                    }}>
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        fontSize: '15px',
                                        fontWeight: 700,
                                        borderRadius: '10px',
                                        borderWidth: '0px',
                                        borderStyle: 'none',
                                        cursor: 'pointer',
                                        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                        color: '#ffffff',
                                        boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
                                        letterSpacing: '0.02em',
                                    }}
                                >
                                    Update password
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
