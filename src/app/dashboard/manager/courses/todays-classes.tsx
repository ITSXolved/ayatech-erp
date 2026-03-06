'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { markAttendance } from './actions'

type TodayClass = {
    scheduleId: string
    courseName: string
    mentorName: string
    classTime: string
    duration: number
    hourlyRate: number
    attendance: 'pending' | 'present' | 'absent' | null
}

export function TodaysClasses({ classes, todayStr }: { classes: TodayClass[]; todayStr: string }) {
    if (classes.length === 0) {
        return (
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Today&apos;s Classes</CardTitle>
                    <CardDescription>No classes scheduled for today.</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle>Today&apos;s Classes</CardTitle>
                <CardDescription>
                    {classes.length} class{classes.length > 1 ? 'es' : ''} scheduled for today. Mark attendance below.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {classes.map((cls) => (
                        <TodayClassRow key={cls.scheduleId} cls={cls} todayStr={todayStr} />
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

function TodayClassRow({ cls, todayStr }: { cls: TodayClass; todayStr: string }) {
    const [isPending, startTransition] = useTransition()
    const status = cls.attendance || 'pending'

    const handleMark = (newStatus: 'present' | 'absent') => {
        startTransition(async () => {
            await markAttendance(cls.scheduleId, todayStr, newStatus)
        })
    }

    // Format time
    const [hours, minutes] = cls.classTime.split(':')
    const h = parseInt(hours)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    const timeStr = `${h12}:${minutes} ${ampm}`

    return (
        <div className="flex items-center justify-between rounded-lg border p-4 bg-white">
            <div className="flex-1">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: '#0a192f' }}>
                        {cls.courseName.charAt(0)}
                    </div>
                    <div>
                        <p className="font-semibold text-slate-800">{cls.courseName}</p>
                        <p className="text-sm text-slate-500">Mentor: {cls.mentorName}</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="text-right">
                    <p className="text-sm font-medium text-slate-700">{timeStr}</p>
                    <p className="text-xs text-slate-500">{cls.duration} min • ₹{cls.hourlyRate}/hr</p>
                </div>

                <div className="flex items-center gap-2">
                    {status === 'present' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                            ✓ Present
                        </span>
                    ) : status === 'absent' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-sm font-medium">
                            ✕ Absent
                        </span>
                    ) : (
                        <>
                            <Button
                                size="sm"
                                disabled={isPending}
                                onClick={() => handleMark('present')}
                                className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                            >
                                {isPending ? '...' : 'Present'}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={isPending}
                                onClick={() => handleMark('absent')}
                                className="text-red-600 border-red-200 hover:bg-red-50 cursor-pointer"
                            >
                                {isPending ? '...' : 'Absent'}
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
