'use client'

import { useState, useTransition, useMemo, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createAdminClassSchedule, updateAdminClassSchedule, deleteAdminClassSchedule, markAdminAttendance, getClassesForDate } from './actions'

// --- Types ---
type Course = { id: string; name: string }
type Mentor = { id: string; name: string }

type ScheduleEditData = {
    id: string; courseId: string; mentorId: string; startDate: string; endDate: string
    classTime: string; durationMinutes: number; hourlyRate: number; excludedDates: string[]
}

type Schedule = {
    id: string; course_id: string; mentor_id: string; start_date: string; end_date: string
    class_time: string; duration_minutes: number; hourly_rate: number; excluded_dates: string[]
}

type ClassForDate = {
    scheduleId: string; courseName: string; mentorName: string
    classTime: string; duration: number; hourlyRate: number
    attendance: 'pending' | 'present' | 'absent' | null
}

type Props = {
    schedules: Schedule[]; courses: Course[]; mentors: Mentor[]
    courseNameMap: Record<string, string>; mentorNameMap: Record<string, string>
    todayStr: string
}

// --- Helpers ---
function getDatesInRange(start: string, end: string): string[] {
    const dates: string[] = []
    const s = new Date(start + 'T00:00:00'), e = new Date(end + 'T00:00:00'), c = new Date(s)
    while (c <= e) { dates.push(c.toISOString().split('T')[0]); c.setDate(c.getDate() + 1) }
    return dates
}

function formatTime(t: string) {
    const [h, m] = t.split(':'); const hr = parseInt(h)
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
}

// --- Main Component ---
export function AdminSchedulingClient({ schedules, courses, mentors, courseNameMap, mentorNameMap, todayStr }: Props) {
    const [editData, setEditData] = useState<ScheduleEditData | null>(null)
    const [showForm, setShowForm] = useState(false)

    const handleEdit = (s: Schedule) => {
        setEditData({
            id: s.id, courseId: s.course_id, mentorId: s.mentor_id,
            startDate: s.start_date, endDate: s.end_date, classTime: s.class_time,
            durationMinutes: s.duration_minutes, hourlyRate: s.hourly_rate || 0,
            excludedDates: Array.isArray(s.excluded_dates) ? s.excluded_dates : [],
        })
        setShowForm(true)
        setTimeout(() => document.getElementById('schedule-form')?.scrollIntoView({ behavior: 'smooth' }), 50)
    }

    const handleCancel = () => { setEditData(null); setShowForm(false) }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: '#0a192f' }}>Class Scheduling</h2>

            {!showForm && (
                <Button onClick={() => { setEditData(null); setShowForm(true) }} className="text-white px-6 cursor-pointer" style={{ backgroundColor: '#0a192f' }}>
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Schedule Class
                </Button>
            )}

            {showForm && (
                <ScheduleFormAdmin key={editData?.id || 'new'} courses={courses} mentors={mentors} editData={editData} onCancel={handleCancel} />
            )}

            {/* Scheduled Classes Table */}
            <ScheduleTable schedules={schedules} courseNameMap={courseNameMap} mentorNameMap={mentorNameMap} onEdit={handleEdit} />

            {/* Date-based Attendance */}
            <DateAttendanceSection defaultDate={todayStr} />
        </div>
    )
}

// --- Schedule Form ---
function ScheduleFormAdmin({ courses, mentors, editData, onCancel }: { courses: Course[]; mentors: Mentor[]; editData: ScheduleEditData | null; onCancel: () => void }) {
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

    const datesInRange = useMemo(() => (!startDate || !endDate || endDate < startDate) ? [] : getDatesInRange(startDate, endDate), [startDate, endDate])
    const monthGroups = useMemo(() => {
        const g: Map<string, string[]> = new Map()
        for (const d of datesInRange) { const k = d.substring(0, 7); if (!g.has(k)) g.set(k, []); g.get(k)!.push(d) }
        return g
    }, [datesInRange])

    const toggleDate = (d: string) => setExcludedDates(p => { const n = new Set(p); n.has(d) ? n.delete(d) : n.add(d); return n })
    const resetForm = () => { setCourseId(''); setMentorId(''); setStartDate(''); setEndDate(''); setClassTime('10:00'); setDuration(60); setHourlyRate(0); setExcludedDates(new Set()) }

    const handleSubmit = () => {
        setError('')
        if (!courseId || !mentorId || !startDate || !endDate || !classTime) { setError('Please fill in all required fields.'); return }
        startTransition(async () => {
            try {
                const payload = { courseId, mentorId, startDate, endDate, classTime, durationMinutes: duration, hourlyRate, excludedDates: Array.from(excludedDates) }
                if (isEditing) await updateAdminClassSchedule(editData.id, payload)
                else await createAdminClassSchedule(payload)
                resetForm(); onCancel()
            } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Something went wrong.') }
        })
    }

    const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"

    return (
        <Card className="shadow-sm" id="schedule-form">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{isEditing ? 'Edit Schedule' : 'Schedule a Class'}</CardTitle>
                    <Button size="sm" variant="ghost" onClick={() => { resetForm(); onCancel() }} className="text-slate-500 cursor-pointer">✕ Close</Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-5">
                {error && <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Course *</label>
                        <select value={courseId} onChange={e => setCourseId(e.target.value)} className={inputCls}>
                            <option value="">Select course...</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Mentor *</label>
                        <select value={mentorId} onChange={e => setMentorId(e.target.value)} className={inputCls}>
                            <option value="">Select mentor...</option>
                            {mentors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div><label className="block text-sm font-medium text-slate-700 mb-1.5">From Date *</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1.5">To Date *</label><input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} className={inputCls} /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Class Time *</label><input type="time" value={classTime} onChange={e => setClassTime(e.target.value)} className={inputCls} /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Duration (min)</label><input type="number" value={duration} min={15} max={480} onChange={e => setDuration(Number(e.target.value))} className={inputCls} /></div>
                </div>
                <div className="max-w-xs">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Remuneration Per Hour (₹) *</label>
                    <input type="number" value={hourlyRate} min={0} step={50} onChange={e => setHourlyRate(Number(e.target.value))} placeholder="e.g. 500" className={inputCls} />
                </div>
                {datesInRange.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium text-slate-700">Class Dates ({datesInRange.length - excludedDates.size} active, {excludedDates.size} excluded)</label>
                            <p className="text-xs text-slate-500">Click a date to exclude it</p>
                        </div>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto rounded-lg border border-slate-200 p-4 bg-slate-50/50">
                            {Array.from(monthGroups.entries()).map(([mk, dates]) => (
                                <div key={mk}>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">{new Date(mk + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {dates.map(d => {
                                            const ex = excludedDates.has(d), dow = new Date(d + 'T00:00:00').getDay(), we = dow === 0 || dow === 6
                                            return (
                                                <button key={d} type="button" onClick={() => toggleDate(d)} title={new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                    className={`px-2 py-1.5 rounded text-xs font-medium transition-all cursor-pointer ${ex ? 'bg-red-100 text-red-600 line-through border border-red-200' : we ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-red-50 hover:text-red-600' : 'bg-white text-slate-700 border border-slate-200 hover:bg-red-50 hover:text-red-600'}`}>
                                                    {new Date(d + 'T00:00:00').getDate()}<span className="ml-0.5 text-[10px] opacity-60">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][dow]}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => { resetForm(); onCancel() }} disabled={isPending} className="cursor-pointer">Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isPending} className="text-white px-6 cursor-pointer" style={{ backgroundColor: '#0a192f' }}>
                        {isPending ? (isEditing ? 'Updating...' : 'Scheduling...') : (isEditing ? 'Update Schedule' : 'Schedule Class')}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

// --- Schedule Table ---
function ScheduleTable({ schedules, courseNameMap, mentorNameMap, onEdit }: { schedules: Schedule[]; courseNameMap: Record<string, string>; mentorNameMap: Record<string, string>; onEdit: (s: Schedule) => void }) {
    return (
        <Card className="shadow-sm">
            <CardHeader><CardTitle>Scheduled Classes</CardTitle></CardHeader>
            <CardContent>
                {schedules.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <svg className="mx-auto h-12 w-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <p className="text-sm">No classes scheduled yet.</p>
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Course</TableHead><TableHead>Mentor</TableHead><TableHead>Date Range</TableHead>
                                    <TableHead>Time</TableHead><TableHead>Duration</TableHead><TableHead>Rate/Hr</TableHead>
                                    <TableHead>Excluded</TableHead><TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {schedules.map(s => {
                                    const excluded = Array.isArray(s.excluded_dates) ? s.excluded_dates : []
                                    return (
                                        <TableRow key={s.id}>
                                            <TableCell className="font-medium">{courseNameMap[s.course_id] || 'Unknown'}</TableCell>
                                            <TableCell>{mentorNameMap[s.mentor_id] || 'Unknown'}</TableCell>
                                            <TableCell className="text-sm">
                                                <div>{new Date(s.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                                <div className="text-xs text-muted-foreground">to {new Date(s.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                            </TableCell>
                                            <TableCell className="font-medium">{formatTime(s.class_time)}</TableCell>
                                            <TableCell>{s.duration_minutes} min</TableCell>
                                            <TableCell><span className="font-medium text-green-700">₹{s.hourly_rate || 0}</span></TableCell>
                                            <TableCell>
                                                {excluded.length > 0 ? <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 font-medium">{excluded.length} date{excluded.length > 1 ? 's' : ''}</span> : <span className="text-xs text-muted-foreground">None</span>}
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => onEdit(s)}>Edit</Button>
                                                <DeleteBtn scheduleId={s.id} />
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function DeleteBtn({ scheduleId }: { scheduleId: string }) {
    const [p, t] = useTransition()
    return (
        <Button size="sm" variant="outline" disabled={p} className="text-red-600 border-red-200 hover:bg-red-50 cursor-pointer"
            onClick={() => { if (!confirm('Delete this schedule?')) return; t(async () => { await deleteAdminClassSchedule(scheduleId) }) }}>
            {p ? '...' : 'Delete'}
        </Button>
    )
}

// --- Date-Based Attendance Section ---
function DateAttendanceSection({ defaultDate }: { defaultDate: string }) {
    const [selectedDate, setSelectedDate] = useState(defaultDate)
    const [classes, setClasses] = useState<ClassForDate[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const fetchForDate = useCallback(async (date: string) => {
        setLoading(true)
        setError('')
        try {
            const result = await getClassesForDate(date)
            setClasses(result)
        } catch {
            setError('Failed to load classes for this date.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchForDate(selectedDate) }, [selectedDate, fetchForDate])

    const handleAttendanceMarked = (scheduleId: string, status: 'present' | 'absent') => {
        setClasses(prev => prev.map(c => c.scheduleId === scheduleId ? { ...c, attendance: status } : c))
    }

    const formattedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })
    const isToday = selectedDate === defaultDate

    return (
        <Card className="shadow-sm">
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <svg className="h-5 w-5" style={{ color: '#0a192f' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            Mark Attendance
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            {formattedDate}{isToday ? <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Today</span> : null}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-slate-600 shrink-0">Select Date</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => e.target.value && setSelectedDate(e.target.value)}
                            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        />
                        {!isToday && (
                            <button
                                onClick={() => setSelectedDate(defaultDate)}
                                className="text-xs text-indigo-600 hover:underline cursor-pointer whitespace-nowrap"
                            >
                                Back to Today
                            </button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="flex items-center gap-3 text-slate-400">
                            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            <span className="text-sm">Loading classes...</span>
                        </div>
                    </div>
                ) : error ? (
                    <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700 text-center">{error}</div>
                ) : classes.length === 0 ? (
                    <div className="text-center py-12">
                        <svg className="mx-auto h-12 w-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-muted-foreground">No classes scheduled for this date.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-slate-500 mb-4">{classes.length} class{classes.length > 1 ? 'es' : ''} scheduled — mark attendance below.</p>
                        {classes.map(c => (
                            <AttendanceRow
                                key={c.scheduleId}
                                cls={c}
                                dateStr={selectedDate}
                                onMarked={handleAttendanceMarked}
                            />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function AttendanceRow({ cls, dateStr, onMarked }: { cls: ClassForDate; dateStr: string; onMarked: (id: string, s: 'present' | 'absent') => void }) {
    const [p, t] = useTransition()
    const [localStatus, setLocalStatus] = useState(cls.attendance)
    const status = localStatus || 'pending'

    const mark = (s: 'present' | 'absent') => {
        setLocalStatus(s)     // optimistic update
        onMarked(cls.scheduleId, s)
        t(async () => { await markAdminAttendance(cls.scheduleId, dateStr, s) })
    }

    return (
        <div className="flex items-center justify-between rounded-lg border p-4 bg-white hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: '#0a192f' }}>
                    {cls.courseName.charAt(0)}
                </div>
                <div>
                    <p className="font-semibold text-slate-800">{cls.courseName}</p>
                    <p className="text-sm text-slate-500">Mentor: {cls.mentorName}</p>
                </div>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
                <div className="text-right">
                    <p className="text-sm font-medium text-slate-700">{formatTime(cls.classTime)}</p>
                    <p className="text-xs text-slate-500">{cls.duration} min • ₹{cls.hourlyRate}/hr</p>
                </div>
                <div className="flex items-center gap-2">
                    {status === 'present' ? (
                        <>
                            <span className="px-3 py-1.5 rounded-full bg-green-100 text-green-800 text-sm font-medium">✓ Present</span>
                            <Button size="sm" variant="outline" disabled={p} onClick={() => mark('absent')} className="text-red-500 border-slate-200 hover:bg-red-50 cursor-pointer text-xs">{p ? '...' : 'Mark Absent'}</Button>
                        </>
                    ) : status === 'absent' ? (
                        <>
                            <span className="px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-sm font-medium">✕ Absent</span>
                            <Button size="sm" variant="outline" disabled={p} onClick={() => mark('present')} className="text-green-600 border-slate-200 hover:bg-green-50 cursor-pointer text-xs">{p ? '...' : 'Mark Present'}</Button>
                        </>
                    ) : (
                        <>
                            <Button size="sm" disabled={p} onClick={() => mark('present')} className="bg-green-600 hover:bg-green-700 text-white cursor-pointer">{p ? '...' : 'Present'}</Button>
                            <Button size="sm" variant="outline" disabled={p} onClick={() => mark('absent')} className="text-red-600 border-red-200 hover:bg-red-50 cursor-pointer">{p ? '...' : 'Absent'}</Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
