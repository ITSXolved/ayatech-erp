'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ScheduleForm, type ScheduleEditData } from './schedule-form'
import { DeleteScheduleButton } from './delete-button'

type Schedule = {
    id: string
    course_id: string
    mentor_id: string
    start_date: string
    end_date: string
    class_time: string
    duration_minutes: number
    hourly_rate: number
    excluded_dates: string[]
}

type Props = {
    schedules: Schedule[]
    courses: { id: string; name: string }[]
    mentors: { id: string; name: string }[]
    courseNameMap: Record<string, string>
    mentorNameMap: Record<string, string>
}

export function CourseManagementClient({ schedules, courses, mentors, courseNameMap, mentorNameMap }: Props) {
    const [editData, setEditData] = useState<ScheduleEditData | null>(null)
    const [showForm, setShowForm] = useState(false)

    const handleEdit = (s: Schedule) => {
        setEditData({
            id: s.id,
            courseId: s.course_id,
            mentorId: s.mentor_id,
            startDate: s.start_date,
            endDate: s.end_date,
            classTime: s.class_time,
            durationMinutes: s.duration_minutes,
            hourlyRate: s.hourly_rate || 0,
            excludedDates: Array.isArray(s.excluded_dates) ? s.excluded_dates : [],
        })
        setShowForm(true)
        setTimeout(() => document.getElementById('schedule-form')?.scrollIntoView({ behavior: 'smooth' }), 50)
    }

    const handleCancel = () => {
        setEditData(null)
        setShowForm(false)
    }

    return (
        <>
            {/* Toggle Button */}
            {!showForm && (
                <Button
                    onClick={() => { setEditData(null); setShowForm(true) }}
                    className="text-white px-6 cursor-pointer"
                    style={{ backgroundColor: '#0a192f' }}
                >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Schedule Class
                </Button>
            )}

            {/* Scheduling Form (collapsible) */}
            {showForm && (
                <ScheduleForm
                    key={editData?.id || 'new'}
                    courses={courses}
                    mentors={mentors}
                    editData={editData}
                    onCancel={handleCancel}
                />
            )}

            {/* Existing Schedules */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Scheduled Classes</CardTitle>
                    <CardDescription>All class schedules for your courses. Mentors receive email reminders 30 minutes before each class.</CardDescription>
                </CardHeader>
                <CardContent>
                    {schedules.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <svg className="mx-auto h-12 w-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm">No classes scheduled yet. Use the form above to schedule one.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Course</TableHead>
                                        <TableHead>Mentor</TableHead>
                                        <TableHead>Date Range</TableHead>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Duration</TableHead>
                                        <TableHead>Rate/Hr</TableHead>
                                        <TableHead>Excluded</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {schedules.map((s) => {
                                        const courseName = courseNameMap[s.course_id] || 'Unknown'
                                        const mentorName = mentorNameMap[s.mentor_id] || 'Unknown'
                                        const excluded = Array.isArray(s.excluded_dates) ? s.excluded_dates : []
                                        const startStr = new Date(s.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                        const endStr = new Date(s.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                        const [hours, minutes] = s.class_time.split(':')
                                        const h = parseInt(hours)
                                        const ampm = h >= 12 ? 'PM' : 'AM'
                                        const h12 = h % 12 || 12
                                        const timeStr = `${h12}:${minutes} ${ampm}`

                                        return (
                                            <TableRow key={s.id}>
                                                <TableCell className="font-medium">{courseName}</TableCell>
                                                <TableCell>{mentorName}</TableCell>
                                                <TableCell className="text-sm">
                                                    <div>{startStr}</div>
                                                    <div className="text-xs text-muted-foreground">to {endStr}</div>
                                                </TableCell>
                                                <TableCell className="font-medium">{timeStr}</TableCell>
                                                <TableCell>{s.duration_minutes} min</TableCell>
                                                <TableCell>
                                                    <span className="font-medium text-green-700">₹{s.hourly_rate || 0}</span>
                                                </TableCell>
                                                <TableCell>
                                                    {excluded.length > 0 ? (
                                                        <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 font-medium">
                                                            {excluded.length} date{excluded.length > 1 ? 's' : ''}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">None</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="cursor-pointer"
                                                        onClick={() => handleEdit(s)}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <DeleteScheduleButton scheduleId={s.id} />
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
        </>
    )
}
