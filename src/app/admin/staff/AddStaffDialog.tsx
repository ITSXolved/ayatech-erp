'use client'

import { useState } from 'react'
import { createStaffUser } from './actions'
import { Button } from '@/components/ui/button'

interface StaffOption {
    id: string
    full_name: string
    roleName: string
}

export default function AddStaffDialog({ staffList = [] }: { staffList?: StaffOption[] }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setMessage(null)

        const result = await createStaffUser(formData)

        if (result?.error) {
            setMessage({ type: 'error', text: result.error })
        } else if (result?.warning) {
            setMessage({ type: 'warning', text: result.warning })
        } else {
            setMessage({ type: 'success', text: 'Staff created successfully! Credentials have been emailed.' })
            setTimeout(() => {
                setOpen(false)
                setMessage(null)
            }, 2500)
        }
        setLoading(false)
    }

    if (!open) {
        return (
            <Button
                onClick={() => setOpen(true)}
                className="bg-[#0a192f] text-white hover:bg-[#112240] px-6"
            >
                + Add Staff
            </Button>
        )
    }

    const inputClass = "w-full px-3 py-2 border border-slate-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0a192f]"

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md p-6 mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Add New Staff</h3>
                    <button
                        onClick={() => { setOpen(false); setMessage(null) }}
                        className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>

                <form action={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                        <input name="fullName" type="text" required placeholder="e.g. John Doe" className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                        <input name="email" type="email" required placeholder="e.g. john@example.com" className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number <span className="text-red-500">*</span></label>
                        <input name="phone" type="tel" required placeholder="e.g. +91 9876543210" className={inputClass} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date of Birth <span className="text-red-500">*</span></label>
                            <input name="dateOfBirth" type="date" required className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Qualification <span className="text-red-500">*</span></label>
                            <input name="qualification" type="text" required placeholder="e.g. B.Tech" className={inputClass} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
                        <textarea name="address" rows={2} placeholder="e.g. 123 Main St, City, State"
                            className={`${inputClass} resize-none`} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                        <select name="role" required className={inputClass}>
                            <option value="">Select a role...</option>
                            <option value="course_manager">Course Manager</option>
                            <option value="promoter">Promoter</option>
                            <option value="mentor">Mentor</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reporting Head</label>
                        <select name="reportingHeadId" className={inputClass}>
                            <option value="">No reporting head</option>
                            {staffList.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.full_name} ({s.roleName.replace('_', ' ')})
                                </option>
                            ))}
                        </select>
                    </div>

                    {message && (
                        <div className={`text-sm rounded-lg px-3 py-2 ${message.type === 'success'
                            ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                            : message.type === 'warning'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => { setOpen(false); setMessage(null) }}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-[#0a192f] text-white hover:bg-[#112240]"
                        >
                            {loading ? 'Creating...' : 'Create & Send Email'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
