'use client'

import React, { useState, useEffect, useRef } from 'react'
import Script from 'next/script'
import { lookupReferrer, saveApplicationDraft } from './actions'
import { createRazorpayOrder, verifyRazorpayPayment, bypassPaymentForTest } from './razorpay-actions'
import { Loader2, CheckCircle2 } from 'lucide-react'

// Simple debounce
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay)
        return () => clearTimeout(timer)
    }, [value, delay])
    return debouncedValue
}

const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    fontSize: '14px',
    borderRadius: '8px',
    borderWidth: '1.5px',
    borderStyle: 'solid' as const,
    borderColor: '#233554',
    backgroundColor: '#0a192f',
    color: '#ccd6f6',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
}

const inputFocusStyle = {
    borderColor: '#4f46e5',
    boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.15)',
}

const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600 as const,
    color: '#ccd6f6',
    marginBottom: '6px',
}

export default function ApplicationForm({
    courses,
    initialData,
    initialId
}: {
    courses: { id: string; name: string; fee: number; course_groups?: { name: string; classes: string[] }[] | null }[];
    initialData?: any;
    initialId?: string;
}) {
    const [formData, setFormData] = useState({
        student_name: initialData?.student_name || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        state: initialData?.state || '',
        course_id: initialData?.course_id || '',
        class: initialData?.class || '',
        mentor_code: initialData?.mentors?.mentor_code || initialData?.course_managers?.mentor_code || ''
    })

    const [referrer, setReferrer] = useState<{ id: string; name: string; type: 'mentor' | 'manager' } | null>(
        initialData?.mentors
            ? { id: initialData.mentor_id, name: initialData.mentors.users?.full_name || 'Mentor', type: 'mentor' }
            : initialData?.course_managers
                ? { id: initialData.course_manager_id, name: initialData.course_managers.users?.full_name || 'Manager', type: 'manager' }
                : null
    )
    const [mentorLoading, setMentorLoading] = useState(false)
    const [mentorError, setMentorError] = useState('')

    const [applicationId, setApplicationId] = useState<string | null>(initialId || null)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState('')

    const [focusedField, setFocusedField] = useState<string | null>(null)

    // Debounce the entire form for saving
    const debouncedForm = useDebounce(formData, 1000)

    // Track if initial load is done to prevent empty autosave
    const isInitialMount = useRef(true)

    // Referrer Lookup Effect
    useEffect(() => {
        async function checkReferrer() {
            if (formData.mentor_code.length === 4) {
                setMentorLoading(true)
                setMentorError('')
                setReferrer(null)
                const result = await lookupReferrer(formData.mentor_code)
                if (result) {
                    setReferrer(result)
                } else {
                    setMentorError('Referrer not found.')
                }
                setMentorLoading(false)
            } else {
                setReferrer(null)
                setMentorError('')
            }
        }
        checkReferrer()
    }, [formData.mentor_code])

    // Autosave Effect
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false
            return
        }

        if (!debouncedForm.email && !debouncedForm.student_name && !debouncedForm.phone) return

        async function triggerSave() {
            setSaveStatus('saving')
            setErrorMessage('')

            const payload = {
                student_name: debouncedForm.student_name,
                email: debouncedForm.email,
                phone: debouncedForm.phone,
                state: debouncedForm.state,
                course_id: debouncedForm.course_id,
                class: debouncedForm.class,
                mentor_id: referrer?.type === 'mentor' ? referrer.id : undefined,
                course_manager_id: referrer?.type === 'manager' ? referrer.id : undefined
            }

            const res = await saveApplicationDraft(applicationId, payload)

            if (res.error) {
                setSaveStatus('error')
                setErrorMessage(res.error)
            } else if (res.success && res.id) {
                if (!applicationId) setApplicationId(res.id)
                setSaveStatus('saved')
            }
        }

        triggerSave()
    }, [debouncedForm, referrer]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
        setSaveStatus('idle')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!applicationId) {
            setErrorMessage("Please wait for your draft to save before proceeding.")
            return
        }

        setSaveStatus('saving')
        setErrorMessage('')

        // ⚠️ TEST MODE: Bypass Razorpay payment for flow testing
        const TEST_MODE = true

        if (TEST_MODE) {
            try {
                const result = await bypassPaymentForTest(applicationId)
                if (result.error) {
                    setErrorMessage(result.error)
                } else {
                    alert('✅ TEST MODE: Payment skipped. Application marked as enrolled!')
                    window.location.href = '/apply?success=true'
                }
            } catch (err) {
                console.error("Test mode error:", err)
                setErrorMessage("Test mode failed. Is the server action working?")
            }
            setSaveStatus('idle')
            return
        }

        const { orderId, amount, key, error } = await createRazorpayOrder(applicationId)

        if (error || !orderId) {
            setErrorMessage(error || 'Failed to initialize payment.')
            setSaveStatus('idle')
            return
        }

        const options = {
            key: key,
            amount: amount,
            currency: "INR",
            name: "Ayatech Courses",
            description: "Course Enrollment Fee",
            order_id: orderId,
            handler: async function (response: { razorpay_payment_id: string, razorpay_order_id: string, razorpay_signature: string }) {
                try {
                    const verification = await verifyRazorpayPayment(
                        response.razorpay_payment_id,
                        response.razorpay_order_id,
                        response.razorpay_signature,
                        applicationId,
                        amount
                    );

                    if (verification.error) {
                        setErrorMessage(verification.error);
                    } else {
                        alert(`Payment successful! Payment ID: ${response.razorpay_payment_id}`);
                        window.location.href = '/dashboard';
                    }
                } catch (err) {
                    console.error("Verification error:", err);
                    setErrorMessage("Payment verification failed. Please contact support.");
                }
            },
            prefill: {
                name: formData.student_name,
                email: formData.email,
                contact: formData.phone
            },
            theme: {
                color: "#4f46e5"
            }
        };

        const rzp = new (window as unknown as { Razorpay: new (opts: typeof options) => { open: () => void; on: (event: string, cb: (r: { error: { description: string } }) => void) => void } }).Razorpay(options);

        rzp.on('payment.failed', function (response: { error: { description: string } }) {
            setErrorMessage(`Payment failed: ${response.error.description}`)
        });

        rzp.open();
        setSaveStatus('idle')
    }

    const filteredCourses = formData.class
        ? courses.filter(c => {
            if (!c.course_groups || c.course_groups.length === 0) return true
            return c.course_groups.some(group => group.classes.includes(formData.class))
        })
        : courses

    const selectedCourse = courses.find(c => c.id === formData.course_id)

    return (
        <>
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

            <div className="w-full max-w-2xl mx-auto" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                {/* Card Header */}
                <div style={{ background: '#06101e', padding: '28px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 style={{ color: '#e6f1ff', fontSize: '24px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                                Course Application
                            </h2>
                            <p style={{ color: '#8892b0', fontSize: '14px', marginTop: '6px' }}>
                                Fill out your details to enroll. Progress saves automatically.
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            {saveStatus === 'saving' && <span className="flex items-center gap-1" style={{ fontSize: '12px', color: '#8892b0' }}><Loader2 className="h-3 w-3 animate-spin" /> Saving...</span>}
                            {saveStatus === 'saved' && <span className="flex items-center gap-1" style={{ fontSize: '12px', color: '#64ffda' }}><CheckCircle2 className="h-3 w-3" /> Saved</span>}
                            {saveStatus === 'error' && <span style={{ fontSize: '12px', color: '#ff6b6b', fontWeight: 600 }}>Save failed</span>}
                        </div>
                    </div>
                </div>

                {/* Card Body */}
                <div style={{ background: '#112240', padding: '32px' }}>
                    {errorMessage && (
                        <div style={{ marginBottom: '24px', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', backgroundColor: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.2)', color: '#ff6b6b' }}>
                            {errorMessage}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Name & Email */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label style={labelStyle}>Full Name <span style={{ color: '#ff6b6b' }}>*</span></label>
                                <input
                                    name="student_name"
                                    value={formData.student_name}
                                    onChange={handleInputChange}
                                    onFocus={() => setFocusedField('student_name')}
                                    onBlur={() => setFocusedField(null)}
                                    required
                                    placeholder="John Doe"
                                    style={{ ...inputStyle, ...(focusedField === 'student_name' ? inputFocusStyle : {}) }}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Email Address <span style={{ color: '#ff6b6b' }}>*</span></label>
                                <input
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                    required
                                    placeholder="john@example.com"
                                    style={{ ...inputStyle, ...(focusedField === 'email' ? inputFocusStyle : {}) }}
                                />
                            </div>
                        </div>

                        {/* Phone & State */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label style={labelStyle}>Phone Number <span style={{ color: '#ff6b6b' }}>*</span></label>
                                <input
                                    name="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    onFocus={() => setFocusedField('phone')}
                                    onBlur={() => setFocusedField(null)}
                                    required
                                    placeholder="+91 98765 43210"
                                    style={{ ...inputStyle, ...(focusedField === 'phone' ? inputFocusStyle : {}) }}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>State / Region</label>
                                <input
                                    name="state"
                                    value={formData.state}
                                    onChange={handleInputChange}
                                    onFocus={() => setFocusedField('state')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="e.g. Karnataka"
                                    style={{ ...inputStyle, ...(focusedField === 'state' ? inputFocusStyle : {}) }}
                                />
                            </div>
                        </div>

                        {/* Course Selection */}
                        <div>
                            <label style={labelStyle}>Desired Course <span style={{ color: '#ff6b6b' }}>*</span></label>
                            <select
                                name="course_id"
                                value={formData.course_id}
                                onChange={handleInputChange}
                                onFocus={() => setFocusedField('course_id')}
                                onBlur={() => setFocusedField(null)}
                                required
                                style={{ ...inputStyle, ...(focusedField === 'course_id' ? inputFocusStyle : {}), cursor: 'pointer', appearance: 'none' as const, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238892b0'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px', paddingRight: '40px' }}
                            >
                                <option value="">Select a course...</option>
                                {filteredCourses.map(course => (
                                    <option key={course.id} value={course.id}>
                                        {course.name} — ₹{course.fee}
                                    </option>
                                ))}
                            </select>
                            {formData.class && filteredCourses.length === 0 && (
                                <p className="mt-2 text-xs text-amber-400">No courses available for your selected class/level yet.</p>
                            )}
                            {selectedCourse && (
                                <div className="mt-2 flex items-center gap-2" style={{ fontSize: '13px', color: '#64ffda' }}>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>Course fee: <strong>₹{selectedCourse.fee}</strong></span>
                                </div>
                            )}
                        </div>

                        {/* Class/Level Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label style={labelStyle}>Current Class/Level <span style={{ color: '#ff6b6b' }}>*</span></label>
                                <select
                                    name="class"
                                    value={formData.class}
                                    onChange={handleInputChange}
                                    onFocus={() => setFocusedField('class')}
                                    onBlur={() => setFocusedField(null)}
                                    required
                                    style={{ ...inputStyle, ...(focusedField === 'class' ? inputFocusStyle : {}), cursor: 'pointer', appearance: 'none' as const, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238892b0'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px', paddingRight: '40px' }}
                                >
                                    <option value="">Select your class...</option>
                                    <option value="1st">1st Standard</option>
                                    <option value="2nd">2nd Standard</option>
                                    <option value="3rd">3rd Standard</option>
                                    <option value="4th">4th Standard</option>
                                    <option value="5th">5th Standard</option>
                                    <option value="6th">6th Standard</option>
                                    <option value="7th">7th Standard</option>
                                    <option value="8th">8th Standard</option>
                                    <option value="9th">9th Standard</option>
                                    <option value="10th">10th Standard</option>
                                    <option value="11th">11th Standard</option>
                                    <option value="12th">12th Standard</option>
                                    <option value="Graduate">Graduate (UG)</option>
                                    <option value="Post Graduate">Post Graduate (PG)</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        {/* Mentor Code */}
                        <div style={{ padding: '20px', borderRadius: '10px', backgroundColor: 'rgba(6, 16, 30, 0.6)', border: '1px solid #233554' }}>
                            <label style={{ ...labelStyle, marginBottom: '4px' }}>Mentor Reference Code (Optional)</label>
                            <p style={{ fontSize: '12px', color: '#8892b0', marginBottom: '14px' }}>
                                If you were referred by a mentor, enter their 4-digit code.
                            </p>
                            <div className="flex gap-4 items-center">
                                <input
                                    name="mentor_code"
                                    maxLength={4}
                                    value={formData.mentor_code}
                                    onChange={handleInputChange}
                                    onFocus={() => setFocusedField('mentor_code')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="0000"
                                    style={{
                                        ...inputStyle,
                                        ...(focusedField === 'mentor_code' ? inputFocusStyle : {}),
                                        width: '120px',
                                        textAlign: 'center' as const,
                                        fontSize: '18px',
                                        letterSpacing: '0.25em',
                                        fontFamily: 'monospace',
                                        fontWeight: 700,
                                    }}
                                />
                                <div className="flex-1">
                                    {mentorLoading && <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#8892b0' }} />}
                                    {referrer && (
                                        <div className="flex items-center gap-2" style={{ fontSize: '14px', fontWeight: 500, color: '#64ffda' }}>
                                            <CheckCircle2 className="w-4 h-4" /> Found: {referrer.name} ({referrer.type === 'mentor' ? 'Mentor' : 'Course Manager'})
                                        </div>
                                    )}
                                    {mentorError && <div style={{ fontSize: '14px', fontWeight: 500, color: '#ff6b6b' }}>{mentorError}</div>}
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={saveStatus === 'error' || saveStatus === 'saving'}
                            style={{
                                width: '100%',
                                padding: '16px',
                                fontSize: '16px',
                                fontWeight: 700,
                                borderRadius: '10px',
                                border: 'none',
                                cursor: saveStatus === 'error' || saveStatus === 'saving' ? 'not-allowed' : 'pointer',
                                background: saveStatus === 'error' || saveStatus === 'saving' ? '#233554' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                color: saveStatus === 'error' || saveStatus === 'saving' ? '#8892b0' : '#ffffff',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
                                letterSpacing: '0.02em',
                            }}
                        >
                            Proceed to Payment
                        </button>
                    </form>
                </div>
            </div>
        </>
    )
}
