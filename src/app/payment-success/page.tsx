'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

type VerificationStatus = 'verifying' | 'success' | 'already_done' | 'error'

function PaymentSuccessContent() {
    const searchParams = useSearchParams()
    const applicationId = searchParams.get('application_id')
    const paymentId = searchParams.get('razorpay_payment_id')
    const linkId = searchParams.get('razorpay_payment_link_id')

    const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('verifying')
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        async function verifyAndProvision() {
            if (!applicationId) {
                setVerificationStatus('error')
                setErrorMessage('No application ID found.')
                return
            }

            try {
                const params = new URLSearchParams({ application_id: applicationId })
                if (paymentId) params.set('razorpay_payment_id', paymentId)
                if (linkId) params.set('razorpay_payment_link_id', linkId)

                const res = await fetch(`/api/verify-payment?${params.toString()}`)
                const data = await res.json()

                if (data.success) {
                    if (data.status === 'already_provisioned') {
                        setVerificationStatus('already_done')
                    } else {
                        setVerificationStatus('success')
                    }
                } else {
                    setVerificationStatus('error')
                    setErrorMessage(data.error || 'Payment verification failed. Please contact support.')
                }
            } catch {
                setVerificationStatus('error')
                setErrorMessage('Could not connect to verification server. Your payment is safe — please contact support.')
            }
        }

        verifyAndProvision()
    }, [applicationId, paymentId, linkId])

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] p-10 text-center border border-green-100">

                {/* Status Icon */}
                {verificationStatus === 'verifying' && (
                    <>
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 mb-2">Setting Up Your Account...</h1>
                        <p className="text-gray-500 mb-4">We&apos;re creating your Canvas LMS login and enrolling you in your course. This takes a few seconds.</p>
                        <div className="bg-blue-50 rounded-2xl p-4 mb-6 space-y-2">
                            <div className="flex items-center gap-2 text-sm text-blue-700">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Verifying payment with Razorpay...</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-blue-700">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Creating Canvas LMS account...</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-blue-700">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Enrolling in course section...</span>
                            </div>
                        </div>
                    </>
                )}

                {(verificationStatus === 'success' || verificationStatus === 'already_done') && (
                    <>
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-10 h-10 text-green-600" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 mb-2">Payment Successful!</h1>
                        <p className="text-gray-500 mb-8">
                            {verificationStatus === 'already_done'
                                ? 'Your account has already been set up. Check your email for login credentials.'
                                : 'Your Canvas LMS account is ready! Check your email for login credentials.'
                            }
                        </p>

                        <div className="bg-green-50 rounded-2xl p-4 mb-6 text-left space-y-2">
                            <div className="flex items-center gap-2 text-sm text-green-700">
                                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                <span>Payment verified ✓</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-green-700">
                                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                <span>Canvas LMS account created ✓</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-green-700">
                                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                <span>Enrolled in course section ✓</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-green-700">
                                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                <span>Credentials email sent ✓</span>
                            </div>
                        </div>
                    </>
                )}

                {verificationStatus === 'error' && (
                    <>
                        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-10 h-10 text-amber-600" />
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 mb-2">Processing Payment...</h1>
                        <p className="text-gray-500 mb-4">
                            {errorMessage || 'Your payment is being processed. You will receive your login credentials via email shortly.'}
                        </p>
                        <div className="bg-amber-50 rounded-2xl p-4 mb-6 text-left">
                            <p className="text-sm text-amber-700">
                                💡 If you don&apos;t receive an email within 15 minutes, please contact support at <strong>ayatechcourses@gmail.com</strong>
                            </p>
                        </div>
                    </>
                )}

                {(paymentId || linkId) && (
                    <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left space-y-2">
                        {paymentId && (
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Payment ID</span>
                                <span className="text-sm font-mono text-gray-700">{paymentId}</span>
                            </div>
                        )}
                        {applicationId && (
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Application</span>
                                <span className="text-sm font-mono text-gray-700">{applicationId.substring(0, 8)}...</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-3">
                    <a
                        href="https://lms.ayatech.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full py-3.5 text-white font-bold rounded-2xl transition-all text-center"
                        style={{ backgroundColor: '#4f46e5' }}
                    >
                        Open Learning Portal
                    </a>
                    <Link
                        href="/apply"
                        className="block w-full py-3.5 text-white font-bold rounded-2xl transition-all"
                        style={{ backgroundColor: '#c2a055' }}
                    >
                        Back to Applications
                    </Link>
                    <Link
                        href="/"
                        className="block w-full py-3.5 text-gray-600 font-medium rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all"
                    >
                        Go to Homepage
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <PaymentSuccessContent />
        </Suspense>
    )
}
