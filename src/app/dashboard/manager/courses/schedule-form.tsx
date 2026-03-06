'use client'

import { useState, useTransition, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClassSchedule, updateClassSchedule } from './actions'

type Course = { id: string; name: string }
type Mentor = { id: string; name: string }

export type ScheduleEditData = {
    id: string
    courseId: string
    mentorId: string
    startDate: string
    endDate: string
    classTime: string
    durationMinutes: number
    hourlyRate: number
    excludedDates: string[]
}

function getDatesInRange(start: string, end: string): string[] {
    const dates: string[] = []
    const startDate = new Date(start + 'T00:00:00')
    const endDate = new Date(end + 'T00:00:00')
    const current = new Date(startDate)
    while (current <= endDate) {
        dates.push(current.toISOString().split('T')[0])
        current.setDate(current.getDate() + 1)
    }
    return dates
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function ScheduleForm({
    courses,
    mentors,
    editData,
    onCancel,
}: {
    courses: Course[]
    mentors: Mentor[]
    editData?: ScheduleEditData | null
    onCancel?: () => void
}) {
    const [courseId, setCourseId] = useState(editData?.courseId || '')
    const [mentorId, setMentorId] = useState(editData?.mentorId || '')
    const [startDate, setStartDate] = useState(editData?.startDate || '')
    const [endDate, setEndDate] = useState(editData?.endDate || '')
    const [classTime, setClassTime] = useState(editData?.classTime || '10:00')
    const [duration, setDuration] = useState(editData?.durationMinutes || 60)
    const [hourlyRate, setHourlyRate] = useState(editData?.hourlyRate || 0)
    const [excludedDates, setExcludedDates] = useState<Set<string>>(new Set(editData?.excludedDates || []))
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState('')

    const isEditing = !!editData

    const datesInRange = useMemo(() => {
        if (!startDate || !endDate || endDate < startDate) return []
        return getDatesInRange(startDate, endDate)
    }, [startDate, endDate])

    const monthGroups = useMemo(() => {
        const groups: Map<string, string[]> = new Map()
        for (const d of datesInRange) {
            const key = d.substring(0, 7)
            if (!groups.has(key)) groups.set(key, [])
            groups.get(key)!.push(d)
        }
        return groups
    }, [datesInRange])

    const toggleDate = (date: string) => {
        setExcludedDates(prev => {
            const next = new Set(prev)
            if (next.has(date)) next.delete(date)
            else next.add(date)
            return next
        })
    }

    const activeDatesCount = datesInRange.length - excludedDates.size

    const resetForm = () => {
        setCourseId('')
        setMentorId('')
        setStartDate('')
        setEndDate('')
        setClassTime('10:00')
        setDuration(60)
        setHourlyRate(0)
        setExcludedDates(new Set())
    }

    const handleSubmit = () => {
        setError('')
        if (!courseId || !mentorId || !startDate || !endDate || !classTime) {
            setError('Please fill in all required fields.')
            return
        }
        startTransition(async () => {
            try {
                const payload = {
                    courseId,
                    mentorId,
                    startDate,
                    endDate,
                    classTime,
                    durationMinutes: duration,
                    hourlyRate,
                    excludedDates: Array.from(excludedDates),
                }

                if (isEditing) {
                    await updateClassSchedule(editData.id, payload)
                } else {
                    await createClassSchedule(payload)
                }

                resetForm()
                onCancel?.()
            } catch (e: unknown) {
                setError(e instanceof Error ? e.message : 'Something went wrong.')
            }
        })
    }

    return (
        <Card className="shadow-sm" id="schedule-form">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{isEditing ? 'Edit Schedule' : 'Schedule a Class'}</CardTitle>
                    {onCancel && (
                        <Button size="sm" variant="ghost" onClick={() => { resetForm(); onCancel(); }} className="text-slate-500 cursor-pointer">
                            ✕ Close
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-5">
                {error && (
                    <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* Course & Mentor */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Course *</label>
                        <select
                            value={courseId}
                            onChange={(e) => setCourseId(e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="">Select course...</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Mentor *</label>
                        <select
                            value={mentorId}
                            onChange={(e) => setMentorId(e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="">Select mentor...</option>
                            {mentors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* Date Range & Time */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">From Date *</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">To Date *</label>
                        <input
                            type="date"
                            value={endDate}
                            min={startDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Class Time *</label>
                        <input
                            type="time"
                            value={classTime}
                            onChange={(e) => setClassTime(e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Duration (min)</label>
                        <input
                            type="number"
                            value={duration}
                            min={15}
                            max={480}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Hourly Rate */}
                <div className="max-w-xs">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Remuneration Per Hour (₹) *</label>
                    <input
                        type="number"
                        value={hourlyRate}
                        min={0}
                        step={50}
                        onChange={(e) => setHourlyRate(Number(e.target.value))}
                        placeholder="e.g. 500"
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>

                {/* Calendar — Exclude Dates */}
                {datesInRange.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium text-slate-700">
                                Class Dates ({activeDatesCount} active, {excludedDates.size} excluded)
                            </label>
                            <p className="text-xs text-slate-500">Click a date to exclude it</p>
                        </div>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto rounded-lg border border-slate-200 p-4 bg-slate-50/50">
                            {Array.from(monthGroups.entries()).map(([monthKey, dates]) => {
                                const monthLabel = new Date(monthKey + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                                return (
                                    <div key={monthKey}>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">{monthLabel}</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {dates.map(d => {
                                                const isExcluded = excludedDates.has(d)
                                                const dayOfWeek = new Date(d + 'T00:00:00').getDay()
                                                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
                                                return (
                                                    <button
                                                        key={d}
                                                        type="button"
                                                        onClick={() => toggleDate(d)}
                                                        title={formatDate(d)}
                                                        className={`
                                                            px-2 py-1.5 rounded text-xs font-medium transition-all cursor-pointer
                                                            ${isExcluded
                                                                ? 'bg-red-100 text-red-600 line-through border border-red-200'
                                                                : isWeekend
                                                                    ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-red-50 hover:text-red-600'
                                                                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-red-50 hover:text-red-600'
                                                            }
                                                        `}
                                                    >
                                                        {new Date(d + 'T00:00:00').getDate()}
                                                        <span className="ml-0.5 text-[10px] opacity-60">
                                                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][dayOfWeek]}
                                                        </span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Submit */}
                <div className="flex justify-end gap-2 pt-2">
                    {isEditing && onCancel && (
                        <Button variant="outline" onClick={() => { resetForm(); onCancel(); }} disabled={isPending} className="cursor-pointer">
                            Cancel
                        </Button>
                    )}
                    <Button
                        onClick={handleSubmit}
                        disabled={isPending}
                        className="text-white px-6 cursor-pointer"
                        style={{ backgroundColor: '#0a192f' }}
                    >
                        {isPending ? (isEditing ? 'Updating...' : 'Scheduling...') : (isEditing ? 'Update Schedule' : 'Schedule Class')}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
