import { createClient } from '@/lib/supabase/server'
import { enforcePromoterGuard } from '@/lib/promoter-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

import { markLeadFollowedUp, markLeadConverted } from './actions'

export default async function PromoterDashboardPage() {
    const { promoterId } = await enforcePromoterGuard()
    const supabase = await createClient()

    // 1. Fetch Lead Queue (Assigned Applications)
    const { data: leads } = await supabase
        .from('lead_assignments')
        .select(`
      assigned_at,
      applications (
        id, student_name, email, phone, status, created_at,
        courses ( name, fee, promoter_commission_rate )
      )
    `)
        .eq('promoter_id', promoterId)
        .order('assigned_at', { ascending: false })

    // Clean data structure safely handling arrays vs objects
    const activeLeads = leads?.map(l => {
        const app = Array.isArray(l.applications) ? l.applications[0] : l.applications
        return {
            assigned_at: l.assigned_at,
            app: app as any // Cast for complex nested type inference suppression
        }
    }) || []

    // 2. Fetch Earnings Summary (Commissions)
    const { data: commissions } = await supabase
        .from('commissions')
        .select('amount, status, created_at')
        .eq('promoter_id', promoterId)

    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()

    let monthlyEarnings = 0
    let totalEarnings = 0
    let convertedCount = 0

    commissions?.forEach(comm => {
        if (comm.status === 'Paid') {
            const commDate = new Date(comm.created_at)
            totalEarnings += Number(comm.amount)
            if (commDate.getMonth() === currentMonth && commDate.getFullYear() === currentYear) {
                monthlyEarnings += Number(comm.amount)
            }
        }
    })

    // Calculate Conversions (applications that are marked Joined or Completed)
    activeLeads.forEach(lead => {
        if (lead.app.status === 'Joined' || lead.app.status === 'Completed') {
            convertedCount++
        }
    })

    const pendingLeads = activeLeads.filter(l => l.app.status !== 'Joined' && l.app.status !== 'Completed' && l.app.status !== 'Closed')
    const missesCount = activeLeads.filter(l => l.app.status === 'Closed').length

    return (
        <div className="space-y-6 flex flex-col h-full mt-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-3xl font-bold tracking-tight">Promoter Hub</h2>
            </div>

            {/* EARNINGS SUMMARY */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-sm border-l-4 border-l-green-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Earnings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{monthlyEarnings.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground mt-1">For {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Lifetime Earnings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{totalEarnings.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-l-4 border-l-indigo-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Conversions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{convertedCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total Leads Closed</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-l-4 border-l-red-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Misses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{missesCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">Closed without conversion</p>
                    </CardContent>
                </Card>
            </div>

            {/* LEAD QUEUE */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Open Lead Queue</CardTitle>
                    <CardDescription>Follow up on your assigned leads to earn your commission.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Course Target</TableHead>
                                    <TableHead>Possible Earn</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingLeads.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                            No open leads. You&apos;re all caught up!
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    pendingLeads.map((lead) => {
                                        const course = Array.isArray(lead.app.courses) ? lead.app.courses[0] : lead.app.courses
                                        const estCommission = course ? (Number(course.fee) * (Number(course.promoter_commission_rate) / 100)) : 0

                                        return (
                                            <TableRow key={lead.app.id}>
                                                <TableCell>
                                                    <div className="font-medium">{lead.app.student_name}</div>
                                                    <div className="text-xs text-muted-foreground">{lead.app.email}</div>
                                                    <div className="text-xs text-muted-foreground">{lead.app.phone}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800">
                                                        {course?.name || 'Unknown'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="font-semibold text-green-600 dark:text-green-500">
                                                    ₹{estCommission.toFixed(2)}
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${lead.app.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' :
                                                        lead.app.status === 'Followed Up' ? 'bg-indigo-100 text-indigo-800' :
                                                            'bg-slate-100 text-slate-800'
                                                        }`}>
                                                        {lead.app.status}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    {lead.app.status !== 'Followed Up' && (
                                                        <form className="inline-block" action={markLeadFollowedUp.bind(null, lead.app.id)}>
                                                            <Button size="sm" variant="outline" type="submit">Flag Contacted</Button>
                                                        </form>
                                                    )}
                                                    <form className="inline-block" action={markLeadConverted.bind(null, lead.app.id)}>
                                                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" type="submit">Mark Paid</Button>
                                                    </form>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

        </div>
    )
}
