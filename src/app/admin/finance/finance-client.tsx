'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

type FinanceTableRow = {
    mentorName: string; courseName: string; totalHours: number
    dateFrom: string; dateTo: string; hourlyRate: number
    totalRemuneration: number; commission: number; totalPayment: number
}

type Props = {
    fromDate: string; toDate: string
    totalFeeCollected: number; totalRemuneration: number
    totalCommission: number; remaining: number
    tableRows: FinanceTableRow[]
}

function fmtMoney(n: number) { return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }
function pdfMoney(n: number) { return 'Rs.' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }
function fmtDate(d: string) { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }

export function FinanceDashboardClient({ fromDate, toDate, totalFeeCollected, totalRemuneration, totalCommission, remaining, tableRows }: Props) {
    const router = useRouter()
    const [from, setFrom] = useState(fromDate)
    const [to, setTo] = useState(toDate)
    const tableRef = useRef<HTMLDivElement>(null)

    const applyFilter = () => {
        router.push(`/admin/finance?from=${from}&to=${to}`)
    }

    const handleDownloadPDF = async () => {
        // Dynamic import of jspdf + autotable
        const { default: jsPDF } = await import('jspdf')
        const autoTable = (await import('jspdf-autotable')).default

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

        // Title
        doc.setFontSize(18)
        doc.setTextColor(10, 25, 47)
        doc.text('Finance Report', 14, 18)
        doc.setFontSize(10)
        doc.setTextColor(100)
        doc.text(`Period: ${fmtDate(from)} - ${fmtDate(to)}`, 14, 25)

        // Summary
        doc.setFontSize(11)
        doc.setTextColor(0)
        const summaryY = 34
        doc.text(`Total Fee Collected: ${pdfMoney(totalFeeCollected)}`, 14, summaryY)
        doc.text(`Total Remuneration: ${pdfMoney(totalRemuneration)}`, 100, summaryY)
        doc.text(`Total Commission: ${pdfMoney(totalCommission)}`, 186, summaryY)
        doc.setTextColor(totalRemuneration > 0 ? 0 : 100)
        doc.text(`Remaining: ${pdfMoney(remaining)}`, 14, summaryY + 7)

        // Table
        autoTable(doc, {
            startY: summaryY + 14,
            head: [['Mentor', 'Course', 'Hours', 'Date Range', 'Rs/Hr', 'Remuneration', 'Commission', 'Total']],
            body: tableRows.map(r => [
                r.mentorName,
                r.courseName,
                r.totalHours.toString(),
                `${fmtDate(r.dateFrom)} - ${fmtDate(r.dateTo)}`,
                pdfMoney(r.hourlyRate),
                pdfMoney(r.totalRemuneration),
                pdfMoney(r.commission),
                pdfMoney(r.totalPayment),
            ]),
            foot: [['', '', '', '', '', pdfMoney(totalRemuneration), pdfMoney(totalCommission), pdfMoney(totalRemuneration + totalCommission)]],
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [10, 25, 47], textColor: 255, fontStyle: 'bold' },
            footStyles: { fillColor: [241, 245, 249], textColor: [10, 25, 47], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [248, 250, 252] },
        })

        doc.save(`finance-report_${from}_${to}.pdf`)
    }

    const summaryCards = [
        { label: 'Total Fee Collected', value: totalFeeCollected, color: '#0a192f', icon: '💰' },
        { label: 'Remuneration Given', value: totalRemuneration, color: '#dc2626', icon: '👨‍🏫' },
        { label: 'Commission Given', value: totalCommission, color: '#f59e0b', icon: '🤝' },
        { label: 'Remaining Amount', value: remaining, color: remaining >= 0 ? '#16a34a' : '#dc2626', icon: '📊' },
    ]

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight" style={{ color: '#0a192f' }}>Finance Dashboard</h2>
                <Button onClick={handleDownloadPDF} variant="outline" className="gap-2 cursor-pointer">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Download PDF
                </Button>
            </div>

            {/* Date Filter */}
            <Card className="shadow-sm">
                <CardContent className="pt-6">
                    <div className="flex flex-wrap items-end gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">From</label>
                            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">To</label>
                            <input type="date" value={to} onChange={e => setTo(e.target.value)}
                                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                        </div>
                        <Button onClick={applyFilter} className="text-white cursor-pointer" style={{ backgroundColor: '#0a192f' }}>
                            Apply Filter
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {summaryCards.map(card => (
                    <Card key={card.label} className="shadow-sm border-t-4" style={{ borderTopColor: card.color }}>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                                    <p className="text-2xl font-bold mt-1" style={{ color: card.color }}>{fmtMoney(card.value)}</p>
                                </div>
                                <span className="text-2xl">{card.icon}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Detailed Table */}
            <Card className="shadow-sm" ref={tableRef}>
                <CardHeader>
                    <CardTitle>Mentor Remuneration & Commission</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{fmtDate(from)} — {fmtDate(to)}</p>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                        <Table className="min-w-full">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Mentor</TableHead>
                                    <TableHead>Course</TableHead>
                                    <TableHead className="text-right">Hours</TableHead>
                                    <TableHead>Date Range</TableHead>
                                    <TableHead className="text-right">₹/Hr</TableHead>
                                    <TableHead className="text-right">Remuneration</TableHead>
                                    <TableHead className="text-right">Commission</TableHead>
                                    <TableHead className="text-right">Total Payment</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tableRows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                                            No data for the selected period.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {tableRows.map((r, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium">{r.mentorName}</TableCell>
                                                <TableCell>{r.courseName}</TableCell>
                                                <TableCell className="text-right font-medium">{r.totalHours}</TableCell>
                                                <TableCell className="text-sm">
                                                    <div>{fmtDate(r.dateFrom)}</div>
                                                    <div className="text-xs text-muted-foreground">to {fmtDate(r.dateTo)}</div>
                                                </TableCell>
                                                <TableCell className="text-right">{fmtMoney(r.hourlyRate)}</TableCell>
                                                <TableCell className="text-right font-medium text-red-600">{fmtMoney(r.totalRemuneration)}</TableCell>
                                                <TableCell className="text-right font-medium text-amber-600">{fmtMoney(r.commission)}</TableCell>
                                                <TableCell className="text-right font-bold">{fmtMoney(r.totalPayment)}</TableCell>
                                            </TableRow>
                                        ))}
                                        {/* Totals Row */}
                                        <TableRow className="bg-slate-50 font-bold border-t-2">
                                            <TableCell colSpan={5} className="text-right">Totals</TableCell>
                                            <TableCell className="text-right text-red-600">{fmtMoney(totalRemuneration)}</TableCell>
                                            <TableCell className="text-right text-amber-600">{fmtMoney(totalCommission)}</TableCell>
                                            <TableCell className="text-right">{fmtMoney(totalRemuneration + totalCommission)}</TableCell>
                                        </TableRow>
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
