'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createRazorpayOrder } from './razorpay-actions'
import { saveApplicationDraft, getMentorReferrer } from './actions'
import { useDebounce } from '@/hooks/use-debounce'
import { Loader2 } from 'lucide-react'

interface Course {
    id: string
    name: string
    fee: number
    duration_weeks: number
    course_groups?: {
        classes: string[]
    }[]
}

interface ApplicationFormProps {
    courses: Course[]
}

export default function ApplicationForm({ courses }: ApplicationFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [mentorLoading, setMentorLoading] = useState(false)
    const [referrer, setReferrer] = useState<{ name: string; type: 'mentor' | 'course_manager' } | null>(null)
    const [mentorError, setMentorError] = useState<string | null>(null)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        student_name: '',
        email: '',
        phone: '',
        class: '',
        course_id: '',
        mentor_code: ''
    })

    const debouncedFormData = useDebounce(formData, 1000)
    useEffect(() => {
        if (debouncedFormData.student_name || debouncedFormData.email || debouncedFormData.course_id) {
            handleSaveDraft()
        }
    }, [debouncedFormData])

    const handleSaveDraft = async () => {
        setSaveStatus('saving')
        try {
            await saveApplicationDraft(formData)
            setSaveStatus('saved')
        } catch (error) {
            setSaveStatus('error')
        }
    }

    const checkMentor = async (code: string) => {
        if (!code) return
        setMentorLoading(true)
        try {
            const data = await getMentorReferrer(code)
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
            const draftResult = await saveApplicationDraft(formData)
            const appId = (draftResult as any)?.id
            const orderResult = await createRazorpayOrder(appId)

            if (orderResult.error || !orderResult.orderId) throw new Error(orderResult.error)

            // 2. THE BRIDGE: Jump to the whitelisted main domain
            const bridgeUrl = new URL('https://ayatech.org/checkout')
            bridgeUrl.searchParams.set('order_id', orderResult.orderId)
            bridgeUrl.searchParams.set('amount', (orderResult.amount / 100).toString())
            bridgeUrl.searchParams.set('application_id', appId)
            bridgeUrl.searchParams.set('name', formData.student_name)
            bridgeUrl.searchParams.set('email', formData.email)
            bridgeUrl.searchParams.set('phone', formData.phone)
            bridgeUrl.searchParams.set('course_name', selectedCourse.name)

            window.location.href = bridgeUrl.toString()
        } catch (err: any) {
            console.error(err)
            setErrorMessage(err.message || "Initialization failed.")
            setIsSubmitting(false)
        }
    }

    return (
        <div className="w-full max-w-2xl mx-auto p-4">
            <div className="bg-[#0b192e] rounded-2xl shadow-2xl p-8 border border-white/5">
                <h2 className="text-2xl font-bold text-white mb-2">Technical School Enrollment</h2>
                <p className="text-gray-400 mb-8">Secure ₹1 Trial Enrollment</p>

                {errorMessage && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg mb-6">{errorMessage}</div>}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input required placeholder="Full Name" value={formData.student_name} onChange={e => setFormData({ ...formData, student_name: e.target.value })} className="w-full bg-[#112240] text-white p-3 rounded-xl border border-white/10 outline-none focus:border-indigo-500" />
                        <input required type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-[#112240] text-white p-3 rounded-xl border border-white/10 outline-none" />
                        <input required type="tel" placeholder="Phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-[#112240] text-white p-3 rounded-xl border border-white/10 outline-none" />
                        <select required value={formData.class} onChange={e => setFormData({ ...formData, class: e.target.value, course_id: '' })} className="w-full bg-[#112240] text-white p-3 rounded-xl border border-white/10 outline-none">
                            <option value="">Select Class</option>
                            <option value="Graduate">Graduate</option>
                            <option value="Engineer">Engineer</option>
                        </select>
                    </div>

                    <div className="space-y-3">
                        {courses.map(course => (
                            <div key={course.id} onClick={() => setFormData({ ...formData, course_id: course.id })} className={`p-4 rounded-xl border cursor-pointer flex justify-between items-center transition-all ${formData.course_id === course.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/5 bg-[#112240]'}`}>
                                <span className="text-white font-medium">{course.name}</span>
                                <span className="text-indigo-400 font-bold">₹{course.fee}</span>
                            </div>
                        ))}
                    </div>

                    <button disabled={isSubmitting} type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20">
                        {isSubmitting ? 'Contacting Bank...' : 'Confirm & Proceed to Payment'}
                    </button>
                </form>
            </div>
        </div>
    )
}
