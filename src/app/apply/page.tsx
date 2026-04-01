import ApplicationForm from './form'
import { createClient } from '@/lib/supabase/server'
import { getApplication } from './actions'

async function getActiveCourses() {
    const supabase = await createClient()
    const { data } = await supabase
        .from('courses')
        .select('id, name, fee, course_groups')
        .eq('is_active', true)
        .is('deleted_at', null)
    return data || []
}

export default async function ApplicationContainer({
    searchParams
}: {
    searchParams: { id?: string; course?: string }
}) {
    const params = await searchParams
    const initialId = params.id
    const initialCourseName = params.course
    const rawCourses = await getActiveCourses()


    let initialData = null
    if (initialId) {
        initialData = await getApplication(initialId)
    }

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#ffffff', backgroundImage: 'radial-gradient(circle at 0px 0px, rgba(194,160,85,0.03) 0%, transparent 40%), radial-gradient(circle at 100% 100%, rgba(194,160,85,0.03) 0%, transparent 40%)' }}>
            {/* Header Bar */}
            <div className="w-full py-4 px-6" style={{ backgroundColor: '#ffffff', borderBottom: '1px solid rgba(0,0,0,0.05)', backdropFilter: 'blur(10px)' }}>
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#0056D2] flex items-center justify-center shadow-lg" style={{ boxShadow: "0 8px 16px -4px rgba(0, 86, 210, 0.3)" }}>
                            <span className="font-bold text-white text-xl">A</span>
                        </div>
                        <div>
                            <div className="font-bold text-lg leading-none tracking-tight" style={{ color: "#1F2432" }}>AyaTech</div>
                            <div className="text-[9px] font-bold uppercase tracking-widest mt-1" style={{ color: "#c2a055" }}>Global Academy</div>
                        </div>
                    </div>

                    <div className="hidden sm:block">
                        <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Student Enrollment 2025-26</span>
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
                <div className="mb-12 text-center">
                    <div style={{ background: 'rgba(194,160,85,0.1)', color: '#c2a055', padding: '0.4rem 1rem', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 700, display: 'inline-block', marginBottom: '1.5rem' }}>
                        ADMISSIONS OPEN
                    </div>
                    <h1 className="text-4xl sm:text-6xl font-black tracking-tight" style={{ color: '#111827', lineHeight: 1.1, marginBottom: '1.5rem' }}>
                        Start Your <span style={{ color: '#c2a055' }}>Journey</span>
                    </h1>
                    <p className="mt-4 max-w-xl mx-auto text-lg md:text-xl font-medium" style={{ color: '#6b7280', lineHeight: 1.6 }}>
                        Join thousands of students in our transformative learning programs. Secure your future in minutes.
                    </p>
                </div>

                <ApplicationForm
                    courses={rawCourses}
                    initialData={initialData}
                    initialId={initialId}
                    initialCourseName={initialCourseName}
                />

                <div className="mt-16 text-center max-w-3xl border-t border-gray-100 pt-10" style={{ color: '#9ca3af', fontSize: '13px' }}>
                    <p className="mb-3" style={{ color: '#4b5563', fontWeight: 700, fontSize: '15px' }}>AYADI CLOUDVERSITY LLP</p>
                    <p className="mb-2" style={{ lineHeight: 1.6 }}>Door No. 63/2243-L, Orbitz Complex, Jafarkhan Colony Road, Mavoor Road, Calicut Beach,<br />Kozhikode, Kerala, India - 673032</p>
                    <p className="mb-6">Email: ayatectechnicalschool@gmail.com | Phone: 090379 85004</p>
                    
                    <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-xs font-semibold mb-8">
                        <a href="https://ayatech.org/privacy-policy" target="_blank" className="hover:text-[#c2a055] transition-colors" style={{ color: '#6b7280' }}>Privacy Policy</a>
                        <a href="https://ayatech.org/terms-and-conditions" target="_blank" className="hover:text-[#c2a055] transition-colors" style={{ color: '#6b7280' }}>Terms of Use</a>
                        <a href="https://ayatech.org/refund-policy" target="_blank" className="hover:text-[#c2a055] transition-colors" style={{ color: '#6b7280' }}>Refund Policy</a>
                        <a href="https://ayatech.org/shipping-policy" target="_blank" className="hover:text-[#c2a055] transition-colors" style={{ color: '#6b7280' }}>Shipping Policy</a>
                    </div>
                    
                    <p className="text-xs" style={{ color: '#d1d5db' }}>
                        © {new Date().getFullYear()} AyaTech Global Academy. All rights reserved. Professional Enrollment Portal.
                    </p>
                </div>
            </div>
        </div>
    )
}
