import { forgotPassword } from './actions'

export default async function ForgotPasswordPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string; success?: string }>
}) {
    const { error, success } = await searchParams

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
                        <h1 style={{ color: '#e6f1ff', fontSize: '24px', fontWeight: 800 }}>Reset Password</h1>
                        <p style={{ color: '#8892b0', fontSize: '14px', marginTop: '6px' }}>
                            We&apos;ll email you a link to reset your password.
                        </p>
                    </div>

                    {/* Card */}
                    <div style={{ backgroundColor: '#112240', borderRadius: '16px', border: '1px solid #233554', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                        <div style={{ padding: '28px' }}>
                            <form className="space-y-5" action={forgotPassword}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#ccd6f6', marginBottom: '6px' }}>
                                        Email Address
                                    </label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        required
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

                                {success && (
                                    <div style={{
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        backgroundColor: 'rgba(107, 255, 193, 0.1)',
                                        borderWidth: '1px',
                                        borderStyle: 'solid',
                                        borderColor: 'rgba(107, 255, 193, 0.2)',
                                        color: '#64ffda',
                                    }}>
                                        {success}
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
                                    Send reset link
                                </button>
                            </form>

                            <div className="text-center mt-6">
                                <a href="/login" style={{ color: '#8892b0', fontSize: '13px', textDecoration: 'none', fontWeight: 500 }}>
                                    Back to sign in
                                </a>
                            </div>
                        </div>
                    </div>
                    <div className="text-center mt-6" style={{ color: '#8892b0', fontSize: '12px' }}>
                        <p className="mb-1"><strong>AYADI CLOUDVERSITY LLP</strong></p>
                        <p className="mb-1">Door No. 63/2243-L, Orbitz Complex, Jafarkhan Colony Road, Mavoor Road, Calicut Beach, Kozhikode, Kerala, India - 673032</p>
                        <p className="mb-2">Email: ayatectechnicalschool@gmail.com | Phone: 090379 85004</p>
                        <div className="flex justify-center gap-3 mb-2">
                            <a href="https://ayatech.org/privacy-policy" target="_blank" className="hover:text-white transition-colors">Privacy Policy</a>
                            <a href="https://ayatech.org/terms-and-conditions" target="_blank" className="hover:text-white transition-colors">Terms of Use</a>
                            <a href="https://ayatech.org/refund-policy" target="_blank" className="hover:text-white transition-colors">Refund Policy</a>
                            <a href="https://ayatech.org/shipping-policy" target="_blank" className="hover:text-white transition-colors">Shipping Policy</a>
                        </div>
                        <p style={{ color: '#4a5568' }}>© {new Date().getFullYear()} Ayatech. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
