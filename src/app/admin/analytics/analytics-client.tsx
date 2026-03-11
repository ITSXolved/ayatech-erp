'use client'

import { useState, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas-pro'
import { formatDate } from '@/lib/utils'
import DeleteCommissionButton from './DeleteCommissionButton'

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
const PIE_COLORS = ['#3b82f6', '#ec4899']

export default function AnalyticsClient({ rawApps, pieData, revenue, commissions }: {
    rawApps: Array<{ status: string; courseName: string; created_at: string }>;
    pieData: Array<{ name: string; value: number }>;
    revenue: Array<{ date: string; course: string; manager: string; promoter: string; mentor: string; fee: number; status: string; student: string }>;
    commissions: Array<{ id: string; date: string; claimant: string; student: string; category: string; conversions: number; amount: number; status: string }>;
}) {
    const [revenueFilter, setRevenueFilter] = useState('')
    const [barFilter, setBarFilter] = useState('')
    const [revStartDate, setRevStartDate] = useState('')
    const [revEndDate, setRevEndDate] = useState('')
    const [commStartDate, setCommStartDate] = useState('')
    const [commEndDate, setCommEndDate] = useState('')
    const [revenueSort, setRevenueSort] = useState<'Date' | 'Course' | 'Fee'>('Date')
    const [isGrouped, setIsGrouped] = useState(false)

    const reportRef = useRef<HTMLDivElement>(null)

    // Aggregate Bar Data
    const barData = useMemo(() => {
        const courseMap: Record<string, { name: string, Interested: number, Converted: number, Done: number }> = {}

        const filteredApps = barFilter ? rawApps.filter(a => a.courseName?.toLowerCase().includes(barFilter.toLowerCase())) : rawApps

        filteredApps.forEach(app => {
            const c = app.courseName || 'Misc'
            if (!courseMap[c]) courseMap[c] = { name: c, Interested: 0, Converted: 0, Done: 0 }

            if (['Draft', 'Submitted', 'Followed Up', 'Payment Pending'].includes(app.status)) courseMap[c].Interested += 1
            if (['Paid', 'Enrolled', 'Joined'].includes(app.status)) courseMap[c].Converted += 1
            if (['Completed'].includes(app.status)) courseMap[c].Done += 1
        })

        return Object.values(courseMap)
    }, [rawApps, barFilter])

    const filteredRevenue = useMemo(() => {
        let revs = revenue.filter(r => {
            const matchesSearch = r.course.toLowerCase().includes(revenueFilter.toLowerCase()) ||
                r.student.toLowerCase().includes(revenueFilter.toLowerCase())

            const rDate = new Date(r.date).getTime()
            const start = revStartDate ? new Date(revStartDate).getTime() : -Infinity
            const end = revEndDate ? new Date(revEndDate).getTime() + 86399999 : Infinity
            const matchesDate = rDate >= start && rDate <= end

            return matchesSearch && matchesDate
        })

        if (isGrouped) {
            const grouped: Record<string, typeof revenue[0]> = {}
            revs.forEach(r => {
                if (!grouped[r.course]) {
                    grouped[r.course] = { ...r, student: 'Multiple', manager: 'Multiple', promoter: 'Multiple', mentor: 'Multiple', fee: 0 }
                }
                grouped[r.course].fee += r.fee
            })
            revs = Object.values(grouped)
        }

        if (revenueSort === 'Course') revs = revs.sort((a, b) => a.course.localeCompare(b.course))
        else if (revenueSort === 'Fee') revs = revs.sort((a, b) => b.fee - a.fee)
        else revs = revs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        return revs
    }, [revenue, revenueFilter, revenueSort, isGrouped, revStartDate, revEndDate])

    const filteredCommissions = useMemo(() => {
        return commissions.filter(c => {
            const cDate = new Date(c.date).getTime()
            const start = commStartDate ? new Date(commStartDate).getTime() : -Infinity
            const end = commEndDate ? new Date(commEndDate).getTime() + 86399999 : Infinity
            return cDate >= start && cDate <= end
        })
    }, [commissions, commStartDate, commEndDate])

    const generatePDF = async () => {
        if (reportRef.current) {
            const canvas = await html2canvas(reportRef.current, { scale: 2 } as any)
            const imgData = canvas.toDataURL('image/png')

            const pdf = new jsPDF('p', 'mm', 'a4')
            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width

            let dateText = "All Time"
            if (commStartDate && commEndDate) dateText = `From: ${commStartDate} To: ${commEndDate}`
            else if (commStartDate) dateText = `From: ${commStartDate}`
            else if (commEndDate) dateText = `To: ${commEndDate}`

            pdf.setFontSize(14)
            pdf.setFont('helvetica', 'bold')
            pdf.text('Ayatech Commission Report', 14, 15)

            pdf.setFontSize(10)
            pdf.setFont('helvetica', 'normal')
            pdf.text(`Date Range: ${dateText}`, 14, 22)

            // Shift image down to accommodate the beautiful text headers
            pdf.addImage(imgData, 'PNG', 0, 25, pdfWidth, pdfHeight, undefined, 'FAST')
            pdf.save(`Commission-Report-${commStartDate || 'all'}-to-${commEndDate || 'all'}.pdf`)
        }
    }

    return (
        <div className="space-y-6">

            {/* CHARTS */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Application Funnel by Course</CardTitle>
                        <Input
                            placeholder="Filter by Course..."
                            value={barFilter}
                            onChange={(e) => setBarFilter(e.target.value)}
                            className="max-w-[150px] h-8 text-xs"
                        />
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Legend />
                                <Bar dataKey="Interested" name="Interested" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Converted" name="Converted" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Done" name="Done" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Delivery Model (Self-Paced vs Mentor-Led)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[350px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={120}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* REVENUE TABLE */}
            <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle>Course Revenue Ledger</CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-md mr-2">
                            <Input type="date" value={revStartDate} onChange={(e) => setRevStartDate(e.target.value)} className="h-8 w-32 text-xs border-none bg-transparent" title="Start Date" />
                            <span className="text-muted-foreground text-xs">to</span>
                            <Input type="date" value={revEndDate} onChange={(e) => setRevEndDate(e.target.value)} className="h-8 w-32 text-xs border-none bg-transparent" title="End Date" />
                        </div>
                        <Button
                            variant={isGrouped ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                                setIsGrouped(!isGrouped)
                                if (!isGrouped) setRevenueSort('Fee')
                            }}
                        >
                            {isGrouped ? 'Ungroup' : 'Group by Course'}
                        </Button>
                        <Button variant={revenueSort === 'Date' ? 'default' : 'outline'} size="sm" onClick={() => {
                            setRevenueSort('Date')
                            setIsGrouped(false)
                        }}>Sort Date</Button>
                        <Input
                            placeholder="Search..."
                            value={revenueFilter}
                            onChange={(e) => setRevenueFilter(e.target.value)}
                            className="max-w-[150px] h-9"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border h-96 overflow-y-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-white dark:bg-zinc-950">
                                <TableRow>
                                    <TableHead>Course</TableHead>
                                    <TableHead>Manager</TableHead>
                                    <TableHead>Promoter</TableHead>
                                    <TableHead>Mentor</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Fee</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRevenue.map((r, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{r.course}</TableCell>
                                        <TableCell>{r.manager}</TableCell>
                                        <TableCell>{r.promoter}</TableCell>
                                        <TableCell>{r.mentor}</TableCell>
                                        <TableCell>{formatDate(r.date)}</TableCell>
                                        <TableCell className="text-right text-green-600 dark:text-green-400 font-semibold">₹{r.fee}</TableCell>
                                        <TableCell>{r.status}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* COMMISSIONS TABLE VIEW */}
            <Card ref={reportRef} className="bg-white dark:bg-zinc-950">
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle>Commissions Dashboard</CardTitle>
                    <div className="flex items-center gap-2" data-html2canvas-ignore="true">
                        <Input type="date" value={commStartDate} onChange={(e) => setCommStartDate(e.target.value)} className="h-9 w-36" title="Start Date" />
                        <span className="text-muted-foreground text-sm">to</span>
                        <Input type="date" value={commEndDate} onChange={(e) => setCommEndDate(e.target.value)} className="h-9 w-36" title="End Date" />
                        <Button onClick={generatePDF} size="sm" className="bg-slate-900 text-white ml-2">Export to PDF</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border h-72 overflow-y-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-white dark:bg-zinc-950">
                                <TableRow>
                                    <TableHead>Mentor/Promoter</TableHead>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-center">Conversions</TableHead>
                                    <TableHead className="text-right">Commission</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCommissions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No commissions found.</TableCell>
                                    </TableRow>
                                ) : filteredCommissions.map((c, i) => (
                                    <TableRow key={`comm-${i}`}>
                                        <TableCell className="font-medium text-indigo-600 dark:text-indigo-400">{c.claimant}</TableCell>
                                        <TableCell>{c.student}</TableCell>
                                        <TableCell>{c.category}</TableCell>
                                        <TableCell className="text-center">{c.conversions}</TableCell>
                                        <TableCell className="text-right font-semibold">₹{c.amount}</TableCell>
                                        <TableCell>{formatDate(c.date)}</TableCell>
                                        <TableCell className="text-right">
                                            <DeleteCommissionButton id={c.id} claimant={c.claimant} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

        </div>
    )
}
