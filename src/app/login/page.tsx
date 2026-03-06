import { login } from './actions'

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>
}) {
    const { error } = await searchParams
    return (
        <div className="flex min-h-screen" style={{ background: 'linear-gradient(135deg, #0a192f 0%, #112240 50%, #0a192f 100%)' }}>
            {/* Left decorative panel */}
            <div className="hidden lg:flex lg:flex-1 flex-col justify-center items-center px-12" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="max-w-md text-center">
                    <div className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-8" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                        <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <h1 style={{ color: '#e6f1ff', fontSize: '36px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                        Ayatech ERP
                    </h1>
                    <p style={{ color: '#8892b0', fontSize: '16px', marginTop: '16px', lineHeight: 1.7 }}>
                        Manage courses, track applications, and grow your learning platform — all in one place.
                    </p>
                </div>
            </div>

            {/* Right login form */}
            <div className="flex-1 flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-sm">
                    {/* Mobile logo */}
                    <div className="lg:hidden text-center mb-10">
                        <div className="h-12 w-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <h1 style={{ color: '#e6f1ff', fontSize: '24px', fontWeight: 800 }}>Ayatech ERP</h1>
                    </div>

                    {/* Card */}
                    <div style={{ backgroundColor: '#112240', borderRadius: '16px', border: '1px solid #233554', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                        {/* Card Header */}
                        <div style={{ padding: '28px 28px 0', borderBottom: 'none' }}>
                            <h2 style={{ color: '#e6f1ff', fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
                                Sign in
                            </h2>
                            <p style={{ color: '#8892b0', fontSize: '14px', marginTop: '6px' }}>
                                Enter your credentials to access your account.
                            </p>
                        </div>

                        {/* Card Body */}
                        <div style={{ padding: '24px 28px 28px' }}>
                            <form className="space-y-5" action={login}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#ccd6f6', marginBottom: '6px' }}>
                                        Email
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
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#ccd6f6', marginBottom: '6px' }}>
                                        Password
                                    </label>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
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
                                    Sign in
                                </button>
                            </form>

                            <p className="text-center mt-5" style={{ fontSize: '13px', color: '#8892b0' }}>
                                Don&apos;t have an account?{' '}
                                <a href="/register" style={{ color: '#64ffda', textDecoration: 'none', fontWeight: 600 }}>
                                    Create an account
                                </a>
                            </p>
                        </div>
                    </div>

                    <p className="text-center mt-6" style={{ color: '#4a5568', fontSize: '12px' }}>
                        © {new Date().getFullYear()} Ayatech. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    )
}
