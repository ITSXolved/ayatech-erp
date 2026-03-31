'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'

function PaymentSuccessContent() {
    const searchParams = useSearchParams()
    const applicationId = searchParams.get('application_id')
    const paymentId = searchParams.get('razorpay_payment_id')
    const linkId = searchParams.get('razorpay_payment_link_id')

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] p-10 text-center border border-green-100">
                {/* Success Icon */}
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                </div>

                <h1 className="text-3xl font-black text-gray-900 mb-2">Payment Successful!</h1>
                <p className="text-gray-500 mb-8">Your enrollment has been confirmed. You will receive a confirmation email shortly.</p>

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
                        Go to Dashboard
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
