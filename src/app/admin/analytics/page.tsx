import { createClient } from '@/lib/supabase/server'
import { enforceAdminGuard } from '@/lib/guards'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AnalyticsClient from './analytics-client'

export default async function AdminAnalyticsPage() {
    await enforceAdminGuard()
    const supabase = await createClient()

    // 1. Fetch KPI Base Entities
    const { count: mentorsCount } = await supabase.from('mentors').select('*', { count: 'exact', head: true })
    const { count: managersCount } = await supabase.from('course_managers').select('*', { count: 'exact', head: true })
    const { count: coursesCount } = await supabase.from('courses').select('*', { count: 'exact', head: true })
    const { count: studentsCount } = await supabase.from('applications').select('*', { count: 'exact', head: true }).in('status', ['Joined', 'Completed', 'Enrolled', 'Paid'])

    // Fetch all payments for total fee
    const { data: payments } = await supabase.from('payments').select('amount').in('status', ['Captured', 'Successful', 'captured', 'successful'])
    const totalFee = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

    // 2. Fetch Chart Data (Applications grouped by course)
    const { data: apps } = await supabase
        .from('applications')
        .select(`
      status, created_at, mentor_id,
      courses ( name )
    `)

    // Clean app data
    const rawApps = apps?.map(a => ({
        status: a.status,
        created_at: a.created_at,
        // @ts-expect-error - Supabase nested join return type
        courseName: Array.isArray(a.courses) ? a.courses[0]?.name : a.courses?.name
    })) || []

    // Process for Pie Chart: Self-paced vs Mentor (Converted Leads only)
    const convertedApps = apps?.filter(a => ['Joined', 'Completed', 'Enrolled', 'Paid'].includes(a.status || '')) || []
    const mentorLedCount = convertedApps.filter(a => a.mentor_id !== null).length
    const selfPacedCount = convertedApps.length - mentorLedCount

    const pieData = [
        { name: 'Mentor Led', value: mentorLedCount },
        { name: 'Self-paced', value: selfPacedCount }
    ]

    // 3. Fetch Revenue Table Data
    const { data: revenueRows } = await supabase
        .from('payments')
        .select(`
      amount, status, created_at,
      applications (
        student_name, 
        courses ( 
          name, 
          manager:assigned_manager_id ( full_name ),
          mentor:assigned_mentor_id ( full_name )
        ),
        promoters ( users ( full_name ) ),
        mentors ( users ( full_name ) )
      )
    `)
        .order('created_at', { ascending: false })

    const revenueTableData = revenueRows?.map(r => {
        const app = Array.isArray(r.applications) ? r.applications[0] : r.applications
        const course = app?.courses ? (Array.isArray(app.courses) ? app.courses[0] : app.courses) : null

        // Use the explicit aliased names
        const managerNode = course?.manager ? (Array.isArray(course.manager) ? course.manager[0] : course.manager) : null
        const mentorNode = course?.mentor ? (Array.isArray(course.mentor) ? course.mentor[0] : course.mentor) : null

        const prom = app?.promoters ? (Array.isArray(app.promoters) ? app.promoters[0] : app.promoters) : null
        const promUser = prom?.users ? (Array.isArray(prom.users) ? prom.users[0] : prom.users) : null

        const appMent = app?.mentors ? (Array.isArray(app.mentors) ? app.mentors[0] : app.mentors) : null
        const appMentUser = appMent?.users ? (Array.isArray(appMent.users) ? appMent.users[0] : appMent.users) : null

        return {
            date: r.created_at,
            course: course?.name || 'Unknown',
            manager: managerNode?.full_name || 'Unassigned',
            promoter: promUser?.full_name || 'None',
            mentor: mentorNode?.full_name || appMentUser?.full_name || 'None',
            fee: Number(r.amount),
            status: r.status,
            student: app?.student_name || 'Unknown' // kept for searching
        }
    }) || []

    // 4. Commissions Data
    const { data: commR } = await supabase
        .from('commissions')
        .select(`
      id, amount, status, created_at,
      users ( 
          full_name,
          mentors ( mentor_code ),
          managers:course_managers ( mentor_code )
      ),
      payments (
        applications (
          student_name,
          courses ( name )
        )
      )
    `)
        .order('created_at', { ascending: false })

    const commissionTableData = commR?.map(c => {
        const user = Array.isArray(c.users) ? c.users[0] : c.users
        const payment = Array.isArray(c.payments) ? c.payments[0] : c.payments
        const app = payment?.applications ? (Array.isArray(payment.applications) ? payment.applications[0] : payment.applications) : null
        const course = app?.courses ? (Array.isArray(app.courses) ? app.courses[0] : app.courses) : null

        const mentorNode = user?.mentors ? (Array.isArray(user.mentors) ? user.mentors[0] : user.mentors) : null
        const managerNode = user?.managers ? (Array.isArray(user.managers) ? user.managers[0] : user.managers) : null
        const code = mentorNode?.mentor_code || managerNode?.mentor_code || ''

        return {
            id: c.id,
            date: c.created_at,
            claimant: user?.full_name ? `${user.full_name}${code ? ` (${code})` : ''}` : 'Unknown',
            student: app?.student_name || 'Unknown',
            category: course?.name || 'Unknown',
            conversions: 1,
            amount: Number(c.amount),
            status: c.status
        }
    }) || []


    // Fetch current user's name
    const { data: { user } } = await supabase.auth.getUser()
    const { data: currentUser } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user?.id)
        .single()

    const userName = currentUser?.full_name || user?.email || 'Admin'

    return (
        <div className="space-y-6">
            <div>
                <p className="text-lg text-slate-500 dark:text-slate-400 mb-1">Hi, <span className="font-semibold text-slate-800 dark:text-white">{userName}</span> 👋</p>
                <h2 className="text-3xl font-bold tracking-tight">Business Analytics</h2>
            </div>

            {/* KPI CARDS */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Mentors</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mentorsCount || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Course Managers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{managersCount || 0}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{coursesCount || 0}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Enrolled Students</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{studentsCount || 0}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-indigo-500 bg-indigo-50 dark:bg-indigo-950">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue Generated</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">₹{totalFee.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                    </CardContent>
                </Card>
            </div>

            {/* CLIENT CHARTS & TABLES */}
            <AnalyticsClient
                rawApps={rawApps}
                pieData={pieData}
                revenue={revenueTableData}
                commissions={commissionTableData}
            />
        </div>
    )
}
