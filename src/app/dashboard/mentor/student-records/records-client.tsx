'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type Props = {
    studentAttendanceHistory: {
        id: string
        date: string
        studentName: string
        courseName: string
        status: 'present' | 'absent' | 'leave'
    }[]
    filters: {
        from: string
        to: string
        course: string
        student: string
    }
    availableCourses: string[]
}

function fmtDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function StudentRecordsClient({ studentAttendanceHistory, filters, availableCourses }: Props) {
    const router = useRouter()
    const [from, setFrom] = useState(filters.from)
    const [to, setTo] = useState(filters.to)
    const [course, setCourse] = useState(filters.course)
    const [student, setStudent] = useState(filters.student)

    const applyFilter = () => {
        router.push(`/dashboard/mentor/student-records?from=${from}&to=${to}&course=${encodeURIComponent(course)}&student=${encodeURIComponent(student)}`)
    }

    const clearFilters = () => {
        setFrom('')
        setTo('')
        setCourse('all')
        setStudent('')
        router.push(`/dashboard/mentor/student-records`)
    }

    const presentCount = studentAttendanceHistory.filter(h => h.status === 'present').length
    const absentCount = studentAttendanceHistory.filter(h => h.status === 'absent').length
    const leaveCount = studentAttendanceHistory.filter(h => h.status === 'leave').length

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-baseline justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4 mb-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight" style={{ color: '#0a192f' }}>Student Attendance Records</h2>
                    <p className="text-sm text-muted-foreground mt-1">History of student attendance for your assigned courses.</p>
                </div>
            </div>

            <Card className="shadow-sm">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row items-end gap-3 sm:gap-4">
                        <div className="flex-1 w-full md:min-w-[140px]">
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">From</label>
                            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="flex-1 w-full md:min-w-[140px]">
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">To</label>
                            <input type="date" value={to} onChange={e => setTo(e.target.value)}
                                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="flex-1 w-full md:min-w-[180px]">
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Course</label>
                            <select
                                value={course}
                                onChange={e => setCourse(e.target.value)}
                                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="all">All Courses</option>
                                {availableCourses.map((c, i) => (
                                    <option key={i} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 w-full md:min-w-[180px]">
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Student</label>
                            <Input
                                placeholder="Search by name..."
                                value={student}
                                onChange={e => setStudent(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-auto flex flex-row gap-2">
                            <Button onClick={applyFilter} className="flex-1 md:w-auto text-white dark:text-slate-100 cursor-pointer transition-all hover:opacity-90 active:scale-95" style={{ backgroundColor: '#0a192f' }}>
                                Apply
                            </Button>
                            <Button variant="outline" onClick={clearFilters} className="px-3">
                                Clear
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-green-50 dark:bg-green-900/10 border-green-200 border">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="text-green-800 dark:text-green-400 font-semibold text-sm uppercase tracking-wide">Present Sessions</div>
                        <div className="text-2xl font-bold text-green-900 dark:text-green-300">{presentCount}</div>
                    </CardContent>
                </Card>
                <Card className="bg-red-50 dark:bg-red-900/10 border-red-200 border">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="text-red-800 dark:text-red-400 font-semibold text-sm uppercase tracking-wide">Absent Sessions</div>
                        <div className="text-2xl font-bold text-red-900 dark:text-red-300">{absentCount}</div>
                    </CardContent>
                </Card>
                <Card className="bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 border">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="text-yellow-800 dark:text-yellow-400 font-semibold text-sm uppercase tracking-wide">On Leave</div>
                        <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-300">{leaveCount}</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-sm border-t-4" style={{ borderTopColor: '#0a192f' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xl font-bold">Attendance Log</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                        <Table className="min-w-[600px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Student Name</TableHead>
                                    <TableHead>Course</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {studentAttendanceHistory.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                                            No student attendance records yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    studentAttendanceHistory.map((h) => (
                                        <TableRow key={h.id}>
                                            <TableCell>{fmtDate(h.date)}</TableCell>
                                            <TableCell className="font-medium">{h.studentName}</TableCell>
                                            <TableCell>{h.courseName}</TableCell>
                                            <TableCell className="text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${h.status === 'present' ? 'bg-green-100 text-green-800' :
                                                    h.status === 'absent' ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {h.status.charAt(0).toUpperCase() + h.status.slice(1)}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
