'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { addCourse, getCourseCategories } from './actions'

type CanvasCourse = {
    id: string
    name: string
    category_id: string
    category_name: string
}

export default function AddCourseForm() {
    const [loading, setLoading] = useState(false)
    const [dbCategories, setDbCategories] = useState<string[]>([])
    const [canvasCourses, setCanvasCourses] = useState<CanvasCourse[]>([])
    const [selectedCourse, setSelectedCourse] = useState<CanvasCourse | null>(null)
    const [fetchError, setFetchError] = useState('')
    const [isAddingCategory, setIsAddingCategory] = useState(false)

    // Fetch existing categories from DB for the datalist once on mount
    useEffect(() => {
        getCourseCategories().then(cats => {
            setDbCategories(cats)
            if (cats.length === 0) setIsAddingCategory(true)
        }).catch(console.error)
    }, [])

    async function fetchCanvasCourses() {
        setLoading(true)
        setFetchError('')
        try {
            const res = await fetch('/api/canvas/courses')
            if (!res.ok) throw new Error('Failed to fetch')
            const data = await res.json()
            setCanvasCourses(data.courses || [])
        } catch {
            setFetchError('Could not connect to Canvas LMS. Check your configuration.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCanvasCourses()
    }, [])

    function handleCourseSelect(courseId: string) {
        const course = canvasCourses.find(c => c.id === courseId)
        setSelectedCourse(course || null)
    }

    const inputClass = "w-full px-3 py-2 border border-slate-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0a192f]"
    const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                {loading && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 py-4 justify-center">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                        </svg>
                        Fetching from Canvas LMS...
                    </div>
                )}

                {fetchError && (
                    <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 px-3 py-2 rounded-lg">
                        {fetchError}
                    </div>
                )}

                {!loading && !fetchError && canvasCourses.length > 0 && (
                    <div>
                        <label className={labelClass}>Course (from Canvas)</label>
                        <select
                            value={selectedCourse?.id || ''}
                            onChange={(e) => handleCourseSelect(e.target.value)}
                            className={inputClass}
                        >
                            <option value="">Select an available course...</option>
                            {canvasCourses.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-400 mt-1">Showing courses not yet imported.</p>
                    </div>
                )}
            </div>

            {/* The actual form — pre-filled if importing */}
            <form action={addCourse} className="space-y-4">
                <input
                    type="hidden"
                    name="name"
                    value={selectedCourse?.name || ''}
                />
                <input
                    type="hidden"
                    name="canvas_course_id"
                    value={selectedCourse?.id || ''}
                />
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
                        ) : dbCategories.length > 0 ? (
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
                            defaultValue={selectedCourse?.category_name || ''}
                            key={`cat-input-${selectedCourse?.id || 'manual'}`}
                            className={inputClass}
                        />
                    ) : (
                        <select
                            name="category"
                            required
                            defaultValue={selectedCourse?.category_name || (dbCategories.length > 0 ? dbCategories[0] : '')}
                            key={`cat-select-${selectedCourse?.id || 'manual'}`}
                            className={inputClass}
                        >
                            {dbCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    )}
                    {isAddingCategory && <p className="text-xs text-slate-400 mt-1">Type the name of the new category.</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Fee (INR)</label>
                        <input
                            name="fee"
                            type="number"
                            step="0.01"
                            required
                            placeholder="4999"
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Comm Rate (%)</label>
                        <input
                            name="promoter_commission_rate"
                            type="number"
                            step="0.1"
                            required
                            placeholder="10.5"
                            className={inputClass}
                        />
                    </div>
                </div>
                <Button type="submit" className="w-full mt-2" disabled={!selectedCourse}>
                    Create Course
                </Button>
            </form>
        </div>
    )
}
