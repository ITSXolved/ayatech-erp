'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { markStudentAttendance, getSessionAttendance } from './actions'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"

type Absentee = {
    date: string
    studentName: string
    courseName: string
    status: 'absent'
}

type StudentAttendanceRecord = {
    id: string
    application_id: string
    status: 'present' | 'absent' | 'leave'
    applications: {
        student_name: string
        email: string
    }
}

type StatCard = {
    label: string
    value: number
    color: string
    icon: string
    isMoney?: boolean
}

type ClassSchedule = {
    id: string
    course?: { name: string }
    start_date: string
    end_date: string
    class_time: string
    duration_minutes: number
    hourly_rate: number
}

type AttendanceDetail = {
    date: string
    courseName: string
    status: 'present' | 'absent' | 'pending'
    hours: number
    rate: number
    earned: number
}

type IncomeSummaryItem = {
    courseName: string
    mentoringCharge: number
    commission: number
}

type Props = {
    user: {
        id: string
        email?: string
        full_name?: string
    }
    stats: {
        totalEarnings: number
        totalMentoringCharge: number
        totalCommissions: number
        totalCourses: number
    }
    todaysClasses: ClassSchedule[]
    attendanceDetails: AttendanceDetail[]
    incomeSummary: IncomeSummaryItem[]
    todayAbsentees: Absentee[]
    filters: {
        fromDate: string
        toDate: string
    }
}

function fmtMoney(n: number) {
    return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function fmtDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function MentorDashboardClient({ user, stats, todaysClasses, attendanceDetails, incomeSummary, todayAbsentees, filters }: Props) {
    const router = useRouter()
    const [from, setFrom] = useState(filters.fromDate)
    const [to, setTo] = useState(filters.toDate)


    const todayStr = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Attendance marking state
    const [isAttendanceOpen, setIsAttendanceOpen] = useState(false)
    const [selectedSession, setSelectedSession] = useState<{ id: string, name: string, date: string } | null>(null)
    const [sessionStudents, setSessionStudents] = useState<StudentAttendanceRecord[]>([])
    const [isSaving, setIsSaving] = useState(false)

    const handleOpenAttendance = async (id: string, name: string, date: string) => {
        setSelectedSession({ id, name, date })
        setIsAttendanceOpen(true)
        const records = await getSessionAttendance(id, date)
        setSessionStudents(records as unknown as StudentAttendanceRecord[])
    }

    const handleUpdateStatus = (appId: string, status: 'present' | 'absent' | 'leave') => {
        setSessionStudents(prev => prev.map(s => s.application_id === appId ? { ...s, status } : s))
    }

    const handleSaveAttendance = async () => {
        if (!selectedSession) return
        setIsSaving(true)
        try {
            await markStudentAttendance(
                selectedSession.id,
                selectedSession.date,
                sessionStudents.map(s => ({ application_id: s.application_id, status: s.status }))
            )
            setIsAttendanceOpen(false)
            router.refresh()
        } catch (err) {
            console.error(err)
            alert('Failed to save attendance')
        } finally {
            setIsSaving(false)
        }
    }

    const applyFilter = () => {
        router.push(`/dashboard/mentor?from=${from}&to=${to}`)
    }

    const statCards: StatCard[] = [
        { label: 'Total Payment Earned', value: stats.totalEarnings, color: '#0a192f', icon: '💰' },
        { label: 'Mentoring Charge', value: stats.totalMentoringCharge, color: '#dc2626', icon: '👨‍🏫' },
        { label: 'Commission', value: stats.totalCommissions, color: '#f59e0b', icon: '🤝' },
        { label: 'Total Courses', value: stats.totalCourses, color: '#16a34a', icon: '📚', isMoney: false },
    ]

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-baseline justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4 mb-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight" style={{ color: '#0a192f' }}>Dashboard Overview</h2>
                    <p className="text-sm text-muted-foreground mt-1">Mentor: {user.full_name || user.email}</p>
                </div>
            </div>


            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card) => (
                    <Card key={card.label} className="shadow-sm border-t-4" style={{ borderTopColor: card.color }}>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">{card.label}</p>
                                    <p className="text-xl sm:text-2xl font-bold mt-1" style={{ color: card.color }}>
                                        {card.isMoney === false ? card.value : fmtMoney(card.value)}
                                    </p>
                                </div>
                                <span className="text-xl sm:text-2xl">{card.icon}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Tabs defaultValue="classes" className="w-full">
                <TabsList className="flex items-center justify-start overflow-x-auto w-full max-w-full bg-slate-100 dark:bg-slate-900 mb-4 h-auto p-1 scrollbar-hide">
                    <TabsTrigger value="classes" className="flex-1 min-w-[120px]">Today&apos;s Classes</TabsTrigger>
                    <TabsTrigger value="income" className="flex-1 min-w-[120px]">Income Summary</TabsTrigger>
                    <TabsTrigger value="attendance" className="flex-1 min-w-[120px]">My Attendance</TabsTrigger>
                </TabsList>

                {/* Today's Classes */}
                <TabsContent value="classes" className="mt-0 outline-none">
                    <div className="space-y-6">
                        <Card className="shadow-sm">
                            <CardHeader>
                                <CardTitle>Today&apos;s Class Scheduled Details</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {todaysClasses.length === 0 ? (
                                        <div className="col-span-full text-center text-muted-foreground py-12 border rounded-xl bg-slate-50 dark:bg-slate-900/50">
                                            No classes scheduled for today.
                                        </div>
                                    ) : (
                                        todaysClasses.map((sch) => (
                                            <Card
                                                key={sch.id}
                                                className="cursor-pointer hover:border-[#0a192f] hover:shadow-md transition-all group flex flex-col h-full"
                                                onClick={() => handleOpenAttendance(sch.id, sch.course?.name || "Session", todayStr)}
                                            >
                                                <CardContent className="p-6 flex-1 flex flex-col">
                                                    <div className="flex justify-between items-start mb-5 gap-4">
                                                        <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 leading-tight">
                                                            {sch.course?.name}
                                                        </h3>
                                                        <div className="text-slate-400 shrink-0">
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                            </svg>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-2 mb-6">
                                                        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                                            <svg className="w-4 h-4 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span>{sch.class_time} &middot; {sch.duration_minutes} mins</span>
                                                        </div>
                                                        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                                            <svg className="w-4 h-4 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                            <span>{fmtDate(sch.start_date)} - {fmtDate(sch.end_date)}</span>
                                                        </div>
                                                    </div>

                                                    <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Attendance</span>
                                                        <div className="text-sm font-medium text-[#0a192f] dark:text-blue-400 group-hover:text-blue-600 transition-colors flex items-center">
                                                            Mark details
                                                            <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Today's Absentees Summary */}
                        <Card className={`shadow-sm border-l-4 ${todayAbsentees.length > 0 ? 'border-l-red-500' : 'border-l-slate-300'}`}>
                            <CardHeader className="py-4">
                                <CardTitle className="text-lg flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                    <span>📅</span> Today&apos;s Student Attendance Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pb-4">
                                {todayAbsentees.length > 0 ? (
                                    <div className="rounded-md border overflow-x-auto">
                                        <Table className="min-w-[400px]">
                                            <TableHeader className="bg-red-50 dark:bg-red-900/10">
                                                <TableRow>
                                                    <TableHead className="text-red-700 font-bold">Student Name</TableHead>
                                                    <TableHead className="text-red-700 font-bold">Course</TableHead>
                                                    <TableHead className="text-red-700 font-bold text-center">Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {todayAbsentees.map((abs, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-medium">{abs.studentName}</TableCell>
                                                        <TableCell>{abs.courseName}</TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                                                                Absent
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 border rounded-md bg-slate-50 dark:bg-slate-900/50 text-muted-foreground text-sm">
                                        No students marked as absent today. Use the &quot;Attendance&quot; button in Today&apos;s Classes to mark attendance.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Income Summary Table */}
                <TabsContent value="income" className="mt-0 outline-none">
                    <div className="space-y-4">
                        <Card className="shadow-sm">
                            <CardContent className="pt-6">
                                <div className="flex flex-wrap items-end gap-3 sm:gap-4">
                                    <div className="flex-1 min-w-[140px]">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">From</label>
                                        <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                                            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                    <div className="flex-1 min-w-[140px]">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">To</label>
                                        <input type="date" value={to} onChange={e => setTo(e.target.value)}
                                            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                    <Button onClick={applyFilter} className="w-full sm:w-auto text-white dark:text-slate-100 cursor-pointer transition-all hover:opacity-90 active:scale-95" style={{ backgroundColor: '#0a192f' }}>
                                        Apply Filter
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm">
                            <CardHeader>
                                <CardTitle>Summary of Income</CardTitle>
                                <p className="text-sm text-muted-foreground">{fmtDate(from)} — {fmtDate(to)}</p>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border overflow-x-auto">
                                    <Table className="min-w-[500px]">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Course</TableHead>
                                                <TableHead className="text-right">Mentoring Charge</TableHead>
                                                <TableHead className="text-right">Commission</TableHead>
                                                <TableHead className="text-right">Total Earned</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {incomeSummary.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                                                        No earnings data for the selected period.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                <>
                                                    {incomeSummary.map((item, idx) => (
                                                        <TableRow key={idx}>
                                                            <TableCell className="font-medium">{item.courseName}</TableCell>
                                                            <TableCell className="text-right">{fmtMoney(item.mentoringCharge)}</TableCell>
                                                            <TableCell className="text-right">{fmtMoney(item.commission)}</TableCell>
                                                            <TableCell className="text-right font-bold" style={{ color: '#0a192f' }}>
                                                                {fmtMoney(item.mentoringCharge + item.commission)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                    <TableRow className="bg-slate-50 dark:bg-slate-900 font-bold border-t-2">
                                                        <TableCell>Totals</TableCell>
                                                        <TableCell className="text-right">
                                                            {fmtMoney(incomeSummary.reduce((s, i) => s + i.mentoringCharge, 0))}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {fmtMoney(incomeSummary.reduce((s, i) => s + i.commission, 0))}
                                                        </TableCell>
                                                        <TableCell className="text-right" style={{ color: '#0a192f' }}>
                                                            {fmtMoney(incomeSummary.reduce((s, i) => s + i.mentoringCharge + i.commission, 0))}
                                                        </TableCell>
                                                    </TableRow>
                                                </>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Attendance History Table */}
                <TabsContent value="attendance" className="mt-0 outline-none">
                    <div className="space-y-4">
                        <Card className="shadow-sm">
                            <CardContent className="pt-6">
                                <div className="flex flex-wrap items-end gap-3 sm:gap-4">
                                    <div className="flex-1 min-w-[140px]">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">From</label>
                                        <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                                            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                    <div className="flex-1 min-w-[140px]">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">To</label>
                                        <input type="date" value={to} onChange={e => setTo(e.target.value)}
                                            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                    <Button onClick={applyFilter} className="w-full sm:w-auto text-white dark:text-slate-100 cursor-pointer transition-all hover:opacity-90 active:scale-95" style={{ backgroundColor: '#0a192f' }}>
                                        Apply Filter
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Card className="bg-green-50 dark:bg-green-900/10 border-green-200 border">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="text-green-800 dark:text-green-400 font-semibold text-sm uppercase tracking-wide">Present Sessions</div>
                                    <div className="text-2xl font-bold text-green-900 dark:text-green-300">
                                        {attendanceDetails.filter(a => a.status === 'present').length}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-red-50 dark:bg-red-900/10 border-red-200 border">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="text-red-800 dark:text-red-400 font-semibold text-sm uppercase tracking-wide">Absent Sessions</div>
                                    <div className="text-2xl font-bold text-red-900 dark:text-red-300">
                                        {attendanceDetails.filter(a => a.status === 'absent').length}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 border">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="text-yellow-800 dark:text-yellow-400 font-semibold text-sm uppercase tracking-wide">Pending Sessions</div>
                                    <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-300">
                                        {attendanceDetails.filter(a => a.status === 'pending').length}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="shadow-sm">
                            <CardHeader>
                                <CardTitle>My Attendance Details</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border overflow-x-auto">
                                    <Table className="min-w-[700px]">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Course</TableHead>
                                                <TableHead className="text-center">Status</TableHead>
                                                <TableHead className="text-right">Hours</TableHead>
                                                <TableHead className="text-right">Rate</TableHead>
                                                <TableHead className="text-right w-[100px]">Actions</TableHead>
                                                <TableHead className="text-right">Earned</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {attendanceDetails.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                                                        No attendance records found.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                attendanceDetails.map((att, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-medium">{fmtDate(att.date)}</TableCell>
                                                        <TableCell>{att.courseName}</TableCell>
                                                        <TableCell className="text-center">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${att.status === 'present' ? 'bg-green-100 text-green-800' :
                                                                att.status === 'absent' ? 'bg-red-100 text-red-800' :
                                                                    'bg-yellow-100 text-yellow-800'
                                                                }`}>
                                                                {att.status.charAt(0).toUpperCase() + att.status.slice(1)}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right">{att.hours}h</TableCell>
                                                        <TableCell className="text-right">{fmtMoney(att.rate)}</TableCell>
                                                        <TableCell className="text-right font-bold">{fmtMoney(att.earned)}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Attendance Marking Dialog */}
            <Dialog open={isAttendanceOpen} onOpenChange={setIsAttendanceOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
                    <DialogHeader className="p-6 border-b">
                        <DialogTitle>Attendance: {selectedSession?.name}</DialogTitle>
                        <p className="text-sm text-muted-foreground mt-1">Date: {selectedSession && fmtDate(selectedSession.date)}</p>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6">
                        {sessionStudents.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">
                                No students found for this session.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Student</TableHead>
                                            <TableHead className="text-center">Present</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sessionStudents.map((student) => (
                                            <TableRow key={student.application_id}>
                                                <TableCell>
                                                    <div className="font-medium">{student.applications.student_name}</div>
                                                    <div className="text-xs text-muted-foreground">{student.applications.email}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center justify-center">
                                                        <input
                                                            type="checkbox"
                                                            className="w-5 h-5 cursor-pointer accent-green-600 rounded"
                                                            checked={student.status === 'present'}
                                                            onChange={(e) => handleUpdateStatus(student.application_id, e.target.checked ? 'present' : 'absent')}
                                                        />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-6 border-t bg-slate-50 dark:bg-slate-900/50">
                        <Button variant="ghost" onClick={() => setIsAttendanceOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleSaveAttendance}
                            disabled={isSaving || sessionStudents.length === 0}
                            style={{ backgroundColor: '#0a192f' }}
                            className="text-white"
                        >
                            {isSaving ? 'Saving...' : 'Save Attendance'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
