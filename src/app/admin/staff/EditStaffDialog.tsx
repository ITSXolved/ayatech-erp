'use client'

import { useState } from 'react'
import { updateStaff } from './actions'
import { Button } from '@/components/ui/button'

interface StaffUser {
    id: string
    full_name: string
    email: string
    phone: string | null
    address: string | null
    date_of_birth: string | null
    qualification: string | null
    roleName: string
    referralCode: string | null
    assignedCourseIds: string[]
    reporting_head_id: string | null
}

interface Course {
    id: string
    name: string
}

interface StaffOption {
    id: string
    full_name: string
    roleName: string
}

export default function EditStaffDialog({ user, courses = [], staffList = [] }: { user: StaffUser; courses?: Course[]; staffList?: StaffOption[] }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const [selectedCourses, setSelectedCourses] = useState<string[]>(user.assignedCourseIds)

    function toggleCourse(courseId: string) {
        setSelectedCourses(prev =>
            prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
        )
    }

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setMessage(null)
        formData.delete('assignedCourses')
        selectedCourses.forEach(cid => formData.append('assignedCourses', cid))

        const result = await updateStaff(formData)

        if (result?.error) {
            setMessage({ type: 'error', text: result.error })
        } else {
            setMessage({ type: 'success', text: 'Staff updated successfully!' })
            setTimeout(() => {
                setOpen(false)
                setMessage(null)
            }, 1500)
        }
        setLoading(false)
    }

    if (!open) {
        return (
            <Button
                onClick={() => setOpen(true)}
                variant="outline"
                size="sm"
                className="text-xs"
            >
                Edit
            </Button>
        )
    }

    const inputClass = "w-full px-3 py-2 border border-slate-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0a192f]"

    // Filter out self from reporting head options
    const reportingOptions = staffList.filter(s => s.id !== user.id)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={(e) => { if (e.target === e.currentTarget) { setOpen(false); setMessage(null) } }}
        >
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md p-6 mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit Staff Member</h3>
                    <button
                        onClick={() => { setOpen(false); setMessage(null) }}
                        className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>

                <form action={handleSubmit} className="space-y-4">
                    <input type="hidden" name="userId" value={user.id} />

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                        <input name="fullName" type="text" required defaultValue={user.full_name} className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                        <input name="email" type="email" required defaultValue={user.email} className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                        <input name="phone" type="tel" defaultValue={user.phone || ''} placeholder="+91 98765 43210" className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
                        <textarea name="address" rows={2} defaultValue={user.address || ''} placeholder="123 Main St, City, State"
                            className={`${inputClass} resize-none`} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date of Birth</label>
                            <input name="dateOfBirth" type="date" defaultValue={user.date_of_birth || ''} className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Qualification</label>
                            <input name="qualification" type="text" defaultValue={user.qualification || ''} placeholder="e.g. B.Tech, MBA" className={inputClass} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                        <select name="role" required defaultValue={user.roleName} className={inputClass}>
                            <option value="course_manager">Course Manager</option>
                            <option value="promoter">Promoter</option>
                            <option value="mentor">Mentor</option>
                            <option value="admin">Admin</option>
                            <option value="user">User (No Privileges)</option>
                        </select>
                    </div>

                    {(user.roleName === 'mentor' || user.roleName === 'course_manager') && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Referral Code</label>
                            <input name="referralCode" type="text" defaultValue={user.referralCode || ''} placeholder="e.g. 1234" className={inputClass} />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reporting Head</label>
                        <select name="reportingHeadId" defaultValue={user.reporting_head_id || ''} className={inputClass}>
                            <option value="">No reporting head</option>
                            {reportingOptions.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.full_name} ({s.roleName.replace('_', ' ')})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Course Assignment */}
                    {courses.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Assigned Courses
                            </label>
                            <div className="border border-slate-200 dark:border-zinc-700 rounded-lg max-h-40 overflow-y-auto">
                                {courses.map(course => (
                                    <label
                                        key={course.id}
                                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer border-b last:border-b-0 border-slate-100 dark:border-zinc-800"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedCourses.includes(course.id)}
                                            onChange={() => toggleCourse(course.id)}
                                            className="h-4 w-4 rounded border-slate-300 text-[#0a192f] focus:ring-[#0a192f]"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">{course.name}</span>
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                                {selectedCourses.length} course(s) assigned
                            </p>
                        </div>
                    )}

                    {message && (
                        <div className={`text-sm rounded-lg px-3 py-2 ${message.type === 'success'
                            ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
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
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
