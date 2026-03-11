import { registerStaff } from './actions'

export default async function RegisterPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string; success?: string }>
}) {
    const { error, success } = await searchParams

    const inputStyle = {
        width: '100%',
        padding: '11px 14px',
        fontSize: '14px',
        borderRadius: '8px',
        borderWidth: '1.5px',
        borderStyle: 'solid' as const,
        borderColor: '#233554',
        backgroundColor: '#0a192f',
        color: '#ccd6f6',
        outline: 'none',
        transition: 'border-color 0.2s',
    }

    const labelStyle = {
        display: 'block' as const,
        fontSize: '13px',
        fontWeight: 600 as const,
        color: '#ccd6f6',
        marginBottom: '6px',
    }

    return (
        <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0a192f 0%, #112240 50%, #0a192f 100%)' }}>

            {/* Top bar */}
            <div style={{ backgroundColor: '#06101e', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 24px' }}>
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <span style={{ color: '#e6f1ff', fontWeight: 700, fontSize: '16px', letterSpacing: '-0.01em' }}>Ayatech</span>
                    </div>
                    <a href="/login" style={{ color: '#64ffda', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
                        Sign in →
                    </a>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-xl">

                    {/* Success state */}
                    {success === 'true' ? (
                        <div style={{ backgroundColor: '#112240', borderRadius: '20px', border: '1px solid #233554', boxShadow: '0 30px 60px -15px rgba(0,0,0,0.5)', padding: '48px 36px', textAlign: 'center' }}>
                            <div className="h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'linear-gradient(135deg, rgba(100,255,218,0.15), rgba(100,255,218,0.05))', border: '2px solid rgba(100,255,218,0.2)' }}>
                                <svg className="h-10 w-10" style={{ color: '#64ffda' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 style={{ color: '#e6f1ff', fontSize: '28px', fontWeight: 800, marginBottom: '12px', letterSpacing: '-0.02em' }}>Registration Successful!</h2>
                            <p style={{ color: '#8892b0', fontSize: '15px', lineHeight: 1.7, marginBottom: '28px', maxWidth: '360px', marginLeft: 'auto', marginRight: 'auto' }}>
                                Your account has been created. An administrator will assign your role shortly.
                            </p>
                            <a
                                href="/login"
                                style={{
                                    display: 'inline-block', padding: '14px 40px', fontSize: '15px', fontWeight: 700,
                                    borderRadius: '10px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                    color: '#ffffff', textDecoration: 'none', boxShadow: '0 4px 14px rgba(79,70,229,0.4)',
                                }}
                            >
                                Go to Login
                            </a>
                        </div>
                    ) : (
                        /* Registration form */
                        <div style={{ backgroundColor: '#112240', borderRadius: '20px', border: '1px solid #233554', boxShadow: '0 30px 60px -15px rgba(0,0,0,0.5)', overflow: 'hidden' }}>

                            {/* Header */}
                            <div style={{ background: 'linear-gradient(135deg, #06101e, #0a192f)', padding: '32px 36px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 4px 12px rgba(79,70,229,0.3)' }}>
                                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 style={{ color: '#e6f1ff', fontSize: '22px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                                            Staff Registration
                                        </h2>
                                        <p style={{ color: '#8892b0', fontSize: '13px', marginTop: '2px' }}>
                                            Create your account to get started
                                        </p>
                                    </div>
                                </div>
                                {/* Steps indicator */}
                                <div className="flex gap-2 mt-5">
                                    {['Personal Info', 'Contact Details', 'Confirmation'].map((step, i) => (
                                        <div key={step} className="flex-1 flex items-center gap-2">
                                            <div className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold" style={{
                                                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                                color: '#fff', fontSize: '11px',
                                            }}>
                                                {i + 1}
                                            </div>
                                            <span style={{ color: '#8892b0', fontSize: '11px', fontWeight: 500 }}>{step}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Body */}
                            <div style={{ padding: '32px 36px' }}>
                                {error && (
                                    <div style={{
                                        marginBottom: '24px', padding: '12px 16px', borderRadius: '10px', fontSize: '14px',
                                        backgroundColor: 'rgba(255, 107, 107, 0.08)', borderWidth: '1px', borderStyle: 'solid',
                                        borderColor: 'rgba(255, 107, 107, 0.15)', color: '#ff6b6b',
                                    }}>
                                        {error}
                                    </div>
                                )}

                                <form className="space-y-6" action={registerStaff}>

                                    {/* Section: Personal Information */}
                                    <div>
                                        <p style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '14px' }}>
                                            Personal Information
                                        </p>
                                        <div className="space-y-4">
                                            <div>
                                                <label style={labelStyle}>Full Name <span style={{ color: '#ff6b6b' }}>*</span></label>
                                                <input name="fullName" type="text" required placeholder="John Doe" style={inputStyle} />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label style={labelStyle}>Date of Birth <span style={{ color: '#ff6b6b' }}>*</span></label>
                                                    <input name="dateOfBirth" type="date" required style={{ ...inputStyle, colorScheme: 'dark' }} />
                                                </div>
                                                <div>
                                                    <label style={labelStyle}>Qualification <span style={{ color: '#ff6b6b' }}>*</span></label>
                                                    <input name="qualification" type="text" required placeholder="e.g. B.Tech, MBA" style={inputStyle} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div style={{ height: '1px', backgroundColor: '#233554' }} />

                                    {/* Section: Contact Details */}
                                    <div>
                                        <p style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '14px' }}>
                                            Contact Details
                                        </p>
                                        <div className="space-y-4">
                                            <div>
                                                <label style={labelStyle}>Email Address <span style={{ color: '#ff6b6b' }}>*</span></label>
                                                <input name="email" type="email" required placeholder="you@example.com" style={inputStyle} />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label style={labelStyle}>Phone Number <span style={{ color: '#ff6b6b' }}>*</span></label>
                                                    <input name="phone" type="tel" required placeholder="+91 98765 43210" style={inputStyle} />
                                                </div>
                                                <div>
                                                    <label style={labelStyle}>Address</label>
                                                    <input name="address" type="text" placeholder="City, State" style={inputStyle} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>


                                    {/* Submit */}
                                    <button
                                        type="submit"
                                        style={{
                                            width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700,
                                            borderRadius: '10px', borderWidth: '0px', borderStyle: 'none', cursor: 'pointer',
                                            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#ffffff',
                                            boxShadow: '0 4px 14px rgba(79,70,229,0.4)', letterSpacing: '0.02em',
                                            transition: 'transform 0.15s, box-shadow 0.15s',
                                        }}
                                    >
                                        Create Account
                                    </button>

                                    <p className="text-center" style={{ fontSize: '13px', color: '#8892b0' }}>
                                        Already have an account?{' '}
                                        <a href="/login" style={{ color: '#64ffda', textDecoration: 'none', fontWeight: 600 }}>
                                            Sign in
                                        </a>
                                    </p>
                                </form>
                            </div>
                        </div>
                    )}

                    <p className="text-center mt-8" style={{ color: '#4a5568', fontSize: '12px' }}>
                        © {new Date().getFullYear()} Ayatech. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    )
}
