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
        <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0a192f 0%, #112240 50%, #0a192f 100%)' }}>
            {/* Header Bar */}
            <div className="w-full py-4 px-6" style={{ backgroundColor: '#06101e', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="max-w-4xl mx-auto flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <span className="text-white font-bold text-lg tracking-tight">Ayatech Courses</span>
                </div>
            </div>

            {/* Hero Section */}
            <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="mb-10 text-center">
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white" style={{ textShadow: '0 2px 20px rgba(79, 70, 229, 0.3)' }}>
                        Start Your Journey
                    </h1>
                    <p className="mt-4 max-w-xl mx-auto text-lg" style={{ color: '#8892b0' }}>
                        Join our transformative learning programs today. Secure your spot in minutes.
                    </p>
                </div>

                <ApplicationForm
                    courses={rawCourses}
                    initialData={initialData}
                    initialId={initialId}
                    initialCourseName={initialCourseName}
                />

                <div className="mt-8 text-center" style={{ color: '#8892b0', fontSize: '13px' }}>
                    <p className="mb-2"><strong>AYADI CLOUDVERSITY LLP</strong></p>
                    <p className="mb-1">Door No. 63/2243-L, Orbitz Complex, Jafarkhan Colony Road, Mavoor Road, Calicut Beach, Kozhikode, Kerala, India - 673032</p>
                    <p className="mb-4">Email: ayatectechnicalschool@gmail.com | Phone: 090379 85004</p>
                    <div className="flex justify-center gap-4 text-xs">
                        <a href="https://ayatech.org/privacy-policy" target="_blank" className="hover:text-white transition-colors">Privacy Policy</a>
                        <a href="https://ayatech.org/terms-and-conditions" target="_blank" className="hover:text-white transition-colors">Terms of Use</a>
                        <a href="https://ayatech.org/refund-policy" target="_blank" className="hover:text-white transition-colors">Refund Policy</a>
                        <a href="https://ayatech.org/shipping-policy" target="_blank" className="hover:text-white transition-colors">Shipping Policy</a>
                    </div>
                    <p className="mt-6 text-sm" style={{ color: '#4a5568' }}>
                        © {new Date().getFullYear()} Ayatech. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    )
}
