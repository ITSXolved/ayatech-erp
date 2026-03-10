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

const ALL_CLASSES = [
    "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th", "Graduate", "Post Graduate"
];

export default function AddCourseForm() {
    const [loading, setLoading] = useState(false)
    const [dbCategories, setDbCategories] = useState<string[]>([])
    const [canvasCourses, setCanvasCourses] = useState<CanvasCourse[]>([])
    const [selectedCourse, setSelectedCourse] = useState<CanvasCourse | null>(null)
    const [fetchError, setFetchError] = useState('')
    const [isAddingCategory, setIsAddingCategory] = useState(false)
    const [groups, setGroups] = useState<{ name: string; classes: string[] }[]>([])

    const addGroup = () => setGroups([...groups, { name: '', classes: [] }])
    const removeGroup = (index: number) => setGroups(groups.filter((_, i) => i !== index))
    const updateGroupName = (index: number, name: string) => {
        const newGroups = [...groups]
        newGroups[index].name = name
        setGroups(newGroups)
    }
    const updateGroupClasses = (index: number, cls: string) => {
        const newGroups = [...groups]
        const currentClasses = newGroups[index].classes
        if (currentClasses.includes(cls)) {
            newGroups[index].classes = currentClasses.filter(c => c !== cls)
        } else {
            newGroups[index].classes = [...currentClasses, cls]
        }
        setGroups(newGroups)
    }

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

                <div className="space-y-4 border-t border-slate-200 dark:border-zinc-800 pt-4">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-slate-900 dark:text-white">Course Groups</label>
                        <Button
                            type="button"
                            onClick={addGroup}
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                            Add Group
                        </Button>
                    </div>

                    <input type="hidden" name="course_groups" value={JSON.stringify(groups)} />

                    {groups.map((group, gIndex) => (
                        <div key={gIndex} className="p-4 border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-zinc-800/30 space-y-3 relative">
                            <button
                                type="button"
                                onClick={() => removeGroup(gIndex)}
                                className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                            </button>

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Group Label</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Primary Batch"
                                    value={group.name}
                                    onChange={(e) => updateGroupName(gIndex, e.target.value)}
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Classes</label>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {ALL_CLASSES.map(cls => (
                                        <label key={cls} className="flex items-center gap-1.5 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={group.classes.includes(cls)}
                                                onChange={() => updateGroupClasses(gIndex, cls)}
                                                className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-[11px] text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{cls}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}

                    {groups.length === 0 && (
                        <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-xl">
                            <p className="text-sm text-slate-400">No class groups added yet.</p>
                            <button type="button" onClick={addGroup} className="text-xs text-indigo-500 font-medium hover:underline mt-1">Add your first group</button>
                        </div>
                    )}
                </div>
                <Button type="submit" className="w-full mt-2" disabled={!selectedCourse}>
                    Create Course
                </Button>
            </form>
        </div>
    )
}
