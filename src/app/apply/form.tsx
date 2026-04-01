'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createRazorpayOrder } from './razorpay-actions'
import { saveApplicationDraft, lookupReferrer } from './actions'
import { useDebounce } from '../../hooks/use-debounce'
import { Loader2 } from 'lucide-react'

interface Course {
    id: string
    name: string
    fee: number
    course_groups?: {
        classes: string[]
    }[]
}

interface ApplicationFormProps {
    courses: Course[]
    initialData?: any
    initialId?: string
    initialCourseName?: string
}

export default function ApplicationForm({ courses, initialData, initialId, initialCourseName }: ApplicationFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [mentorLoading, setMentorLoading] = useState(false)
    const [referrer, setReferrer] = useState<{ name: string; type: 'mentor' | 'course_manager' } | null>(null)
    const [mentorError, setMentorError] = useState<string | null>(null)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [applicationId, setApplicationId] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        student_name: initialData?.student_name || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        class: initialData?.class || '',
        course_id: initialData?.course_id || courses.find(c => c.name === initialCourseName)?.id || '',
        mentor_code: initialData?.mentors?.mentor_code || initialData?.course_managers?.mentor_code || ''
    })

    useEffect(() => {
        if (initialId) setApplicationId(initialId)
    }, [initialId])

    const debouncedFormData = useDebounce(formData, 1000)
    useEffect(() => {
        if (debouncedFormData.student_name || debouncedFormData.email || debouncedFormData.course_id) {
            handleSaveDraft()
        }
    }, [debouncedFormData])

    const handleSaveDraft = async () => {
        setSaveStatus('saving')
        try {
            const result = await saveApplicationDraft(applicationId, {
                ...formData,
                state: '' // Add default or dynamic state if needed
            })
            if (result.success && result.id) {
                setApplicationId(result.id)
                setSaveStatus('saved')
            } else {
                setSaveStatus('error')
            }
        } catch (error) {
            setSaveStatus('error')
        }
    }

    const checkMentor = async (code: string) => {
        if (!code) return
        setMentorLoading(true)
        try {
            const data = await lookupReferrer(code)
            if (data) setReferrer(data as any)
            else setMentorError('Invalid code')
        } catch (err) {
            setReferrer(null)
        } finally { setMentorLoading(false) }
    }

    const debouncedMentorCode = useDebounce(formData.mentor_code, 500)
    useEffect(() => { if (debouncedMentorCode) checkMentor(debouncedMentorCode) }, [debouncedMentorCode])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMessage(null)

        if (!formData.student_name || !formData.email || !formData.course_id) {
            setErrorMessage("Fill all fields.")
            return
        }

        setIsSubmitting(true)
        try {
            const selectedCourse = courses.find(c => c.id === formData.course_id)
            if (!selectedCourse) return

            // 1. Create Application and Order
            const draftResult = await saveApplicationDraft(applicationId, {
                ...formData,
                state: ''
            })
            const appId = (draftResult as any)?.id
            if (!appId) throw new Error("Failed to save draft.")
            setApplicationId(appId)
            
            const orderResult = await createRazorpayOrder(appId)

            if (orderResult.error) throw new Error(orderResult.error)

            // Redirect to Razorpay's hosted payment page (no domain whitelist issues)
            if (orderResult.payment_link) {
                window.location.href = orderResult.payment_link
            } else {
                throw new Error('Payment link not generated.')
            }
        } catch (err: any) {
            console.error(err)
            setErrorMessage(err.message || "Initialization failed.")
            setIsSubmitting(false)
        }
    }

    return (
        <div className="w-full max-w-2xl mx-auto p-4">
            <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] p-10 border border-gray-100 overflow-hidden relative">
                {/* Decorative element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#c2a055]/5 rounded-bl-full -mr-16 -mt-16 pointer-events-none" />
                
                <h2 className="text-3xl font-black mb-2" style={{ color: '#111827', letterSpacing: '-0.02em' }}>Technical School Enrollment</h2>
                <p className="font-medium mb-10" style={{ color: '#c2a055' }}>
                    <span className="inline-block w-2 h-2 rounded-full bg-[#c2a055] mr-2 mb-0.5" />
                    Secure ₹1 Trial Enrollment
                </p>

                {errorMessage && (
                    <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl mb-8 flex items-center gap-3 animate-shake font-medium">
                        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        {errorMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Full Name</label>
                            <input required placeholder="eg. John Doe" value={formData.student_name} onChange={e => setFormData({ ...formData, student_name: e.target.value })} className="w-full bg-gray-50 text-gray-900 px-4 py-3.5 rounded-2xl border border-gray-200 outline-none focus:border-[#c2a055] focus:ring-4 focus:ring-[#c2a055]/5 transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Email Address</label>
                            <input required type="email" placeholder="john@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-gray-50 text-gray-900 px-4 py-3.5 rounded-2xl border border-gray-200 outline-none focus:border-[#c2a055] focus:ring-4 focus:ring-[#c2a055]/5 transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Phone Number</label>
                            <input required type="tel" placeholder="+91 98765 43210" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-gray-50 text-gray-900 px-4 py-3.5 rounded-2xl border border-gray-200 outline-none focus:border-[#c2a055] focus:ring-4 focus:ring-[#c2a055]/5 transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Student Class</label>
                            <select 
                                required 
                                value={formData.class} 
                                onChange={e => setFormData({ ...formData, class: e.target.value })} 
                                disabled={!formData.course_id}
                                className="w-full bg-gray-50 text-gray-900 px-4 py-3.5 rounded-2xl border border-gray-200 outline-none focus:border-[#c2a055] focus:ring-4 focus:ring-[#c2a055]/5 transition-all cursor-pointer disabled:opacity-50"
                            >
                                <option value="">{formData.course_id ? 'Select Class' : 'Choose Course First'}</option>
                                {formData.course_id && (
                                    [...new Set(courses.find(c => c.id === formData.course_id)?.course_groups?.flatMap(g => g.classes) || [])].map(cls => (
                                        <option key={cls} value={cls}>{cls}</option>
                                    ))
                                )}
                            </select>
                        </div>

                    </div>

                    <div className="space-y-4">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Choose Your Program</label>
                        <div className="grid grid-cols-1 gap-3">
                            {courses.map(course => (
                                <div 
                                    key={course.id} 
                                    onClick={() => setFormData({ ...formData, course_id: course.id })} 
                                    className={`p-5 rounded-2xl border-2 cursor-pointer flex justify-between items-center transition-all group ${
                                        formData.course_id === course.id 
                                        ? 'border-[#c2a055] bg-[#c2a055]/5 shadow-sm' 
                                        : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                            formData.course_id === course.id ? 'border-[#c2a055] bg-[#c2a055]' : 'border-gray-200'
                                        }`}>
                                            {formData.course_id === course.id && <div className="w-2 h-2 rounded-full bg-white" />}
                                        </div>
                                        <span className={`font-bold transition-colors ${formData.course_id === course.id ? 'text-gray-900' : 'text-gray-600'}`}>{course.name}</span>
                                    </div>
                                    <span className="font-extrabold text-lg" style={{ color: formData.course_id === course.id ? '#c2a055' : '#9ca3af' }}>₹{course.fee}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button 
                        disabled={isSubmitting} 
                        type="submit" 
                        className="w-full py-5 text-white font-extrabold rounded-2xl transition-all shadow-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-3"
                        style={{ 
                            backgroundColor: '#c2a055', 
                            boxShadow: '0 10px 25px rgba(194,160,85,0.35)',
                            fontSize: '1.1rem'
                        }}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span>Contacting Gateway...</span>
                            </>
                        ) : (
                            <span>Confirm & Proceed to Payment</span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
