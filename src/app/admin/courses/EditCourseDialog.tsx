'use client'

import { useState, useEffect } from 'react'
import { updateCourse, getCourseCategories } from './actions'
import { Button } from '@/components/ui/button'

interface CourseData {
    id: string
    name: string
    category: string
    fee: number
    promoter_commission_rate: number | null
    assigned_manager_ids: string[]
    assigned_mentor_ids: string[]
    canvas_course_id: string | null
    applicable_classes: string[] | null
    class_group_name: string | null
}

interface Manager {
    id: string
    full_name: string
    email: string
}

export default function EditCourseDialog({ course, managers, mentors = [] }: { course: CourseData; managers: Manager[]; mentors?: Manager[] }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [categories, setCategories] = useState<string[]>([])
    const [isAddingCategory, setIsAddingCategory] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    useEffect(() => {
        if (open) {
            getCourseCategories().then(cats => setCategories(cats)).catch(console.error)
        }
    }, [open])

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setMessage(null)
        await updateCourse(formData)
        setMessage({ type: 'success', text: 'Course updated successfully!' })
        setLoading(false)
        setTimeout(() => {
            setOpen(false)
            setMessage(null)
        }, 1500)
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={(e) => { if (e.target === e.currentTarget) { setOpen(false); setMessage(null) } }}
        >
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md p-6 mx-4">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit Course</h3>
                    <button
                        onClick={() => { setOpen(false); setMessage(null) }}
                        className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>

                <form action={handleSubmit} className="space-y-4">
                    <input type="hidden" name="courseId" value={course.id} />

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Course Name</label>
                        <input
                            name="name"
                            type="text"
                            required
                            defaultValue={course.name}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0a192f]"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
                            {!isAddingCategory ? (
                                <button
                                    type="button"
                                    onClick={() => setIsAddingCategory(true)}
                                    className="text-xs flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                                    Add New
                                </button>
                            ) : categories.length > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => setIsAddingCategory(false)}
                                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                >
                                    Cancel
                                </button>
                            ) : null}
                        </div>
                        {isAddingCategory ? (
                            <input
                                name="category"
                                type="text"
                                required
                                placeholder="e.g. Engineering"
                                defaultValue={course.category}
                                key={`cat-input-edit-${course.id}`}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0a192f]"
                            />
                        ) : (
                            <select
                                name="category"
                                required
                                defaultValue={course.category}
                                key={`cat-select-edit-${course.id}`}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0a192f]"
                            >
                                {/* Ensure the current category is always an option even if deleted */}
                                {!categories.includes(course.category) && (
                                    <option value={course.category}>{course.category}</option>
                                )}
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        )}
                        {isAddingCategory && <p className="text-xs text-slate-400 mt-1">Type the name of the new category.</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fee (INR)</label>
                            <input
                                name="fee"
                                type="number"
                                step="0.01"
                                required
                                defaultValue={course.fee}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0a192f]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Comm Rate (%)</label>
                            <input
                                name="promoter_commission_rate"
                                type="number"
                                step="0.1"
                                required
                                defaultValue={course.promoter_commission_rate ?? 0}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0a192f]"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assigned Managers</label>
                        <select
                            name="assigned_manager_ids"
                            multiple
                            defaultValue={course.assigned_manager_ids}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0a192f] min-h-[100px]"
                        >
                            {managers.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.full_name} ({m.email})
                                </option>
                            ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1">Hold Ctrl/Cmd to select multiple</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assigned Mentors</label>
                        <select
                            name="assigned_mentor_ids"
                            multiple
                            defaultValue={course.assigned_mentor_ids}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0a192f] min-h-[100px]"
                        >
                            {mentors.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.full_name} ({m.email})
                                </option>
                            ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1">Hold Ctrl/Cmd to select multiple</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Canvas Course ID</label>
                        <input
                            name="canvas_course_id"
                            type="text"
                            defaultValue={course.canvas_course_id || ''}
                            placeholder="e.g. 101"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0a192f]"
                        />
                        <p className="text-xs text-slate-400 mt-1">The course ID from Canvas LMS for auto-enrollment</p>
                    </div>

                    <div className="mt-2" style={{padding:'10px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                        <p className="text-xs" style={{color:'#818cf8'}}>
                            <strong>Section assignment is automatic.</strong> Students are placed into Canvas sections based on their class:<br/>
                            1st–3rd → <em>lower primary-N</em> · 4th–5th → <em>primary-N</em> · 6th–7th → <em>upper primary-N</em> · Others → <em>other-N</em><br/>
                            Sections are capped at 22 students and auto-created as needed.
                        </p>
                    </div>

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
