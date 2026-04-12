import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceManagerGuard } from '@/lib/manager-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { updateLeadStatus, assignLeadToStaff, updateSecretKeywords } from './actions'
import { ActionMenuItem } from './action-menu-item'
import WhatsAppShareButton from '@/components/WhatsAppShareButton'
import SecretKeywordsEditor from '@/components/SecretKeywordsEditor'

export default async function ManagerDashboardPage() {
    const { assignedCourses } = await enforceManagerGuard()
    const supabase = await createClient()
    const adminDb = createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch the current manager's mentor code
    const { data: managerProfile } = await supabase
        .from('course_managers')
        .select('mentor_code')
        .eq('user_id', user?.id)
        .single()

    const managerMentorCode = managerProfile?.mentor_code

    const courseIds = assignedCourses.map((c: { id: string }) => c.id)

    const { data: applications, error: appError } = await adminDb
        .from('applications')
        .select(`
      id, student_name, email, phone, status, created_at, promoter_id, mentor_id, secret_keywords,
      courses ( name ),
      lead_assignments ( promoter_id, mentor_id ),
      lms_mappings ( login_id, password )
    `)
        .in('course_id', courseIds)
        .order('created_at', { ascending: false })

    if (appError) {
        console.error('[Manager Dashboard] Error fetching applications:', appError)
    }

    const rawApps = applications || []

    // Fetch staff records
    const { data: rawPromoters } = await adminDb.from('promoters').select('id, user_id')
    const { data: rawMentors } = await adminDb.from('mentors').select('id, user_id')

    // Collect all staff user_ids and fetch their names (using admin to bypass RLS)
    const staffUserIds = [
        ...(rawPromoters || []).map(p => p.user_id),
        ...(rawMentors || []).map(m => m.user_id),
    ].filter(Boolean)

    const { data: staffUsers } = staffUserIds.length > 0
        ? await adminDb.from('users').select('id, full_name').in('id', staffUserIds)
        : { data: [] }

    const userNameMap = new Map((staffUsers || []).map(u => [u.id, u.full_name]))

    const promoters = (rawPromoters || []).map(p => ({
        id: p.id,
        name: userNameMap.get(p.user_id) || 'Unknown',
    }))
    const mentors = (rawMentors || []).map(m => ({
        id: m.id,
        name: userNameMap.get(m.user_id) || 'Unknown',
    }))

    // Build staff ID -> name maps for the assignment column
    const promoterNameMap = new Map(promoters.map(p => [p.id, p.name]))
    const mentorNameMap = new Map(mentors.map(m => [m.id, m.name]))

    // KPIs
    const totalApplicants = rawApps.length
    let totalConverted = 0
    let convertedViaStaff = 0
    let selfJoined = 0

    rawApps.forEach(app => {
        if (['Joined', 'Completed', 'Enrolled', 'Paid'].includes(app.status)) {
            totalConverted++
            // If the application was submitted with THIS manager's referral code
            if (managerMentorCode && (app.promoter_id === managerMentorCode || app.mentor_id === managerMentorCode)) {
                convertedViaStaff++
            } else {
                selfJoined++
            }
        }
    })

    const kpis = [
        { label: 'Total Applicants', value: totalApplicants, sub: `Across ${courseIds.length} course(s)`, border: 'border-l-[#0a192f]' },
        { label: 'Total Converted', value: totalConverted, sub: null, border: 'border-l-green-500' },
        { label: 'Via Promoters/Mentors', value: convertedViaStaff, sub: null, border: 'border-l-indigo-500' },
        { label: 'Self Joined', value: selfJoined, sub: null, border: 'border-l-blue-500' },
    ]

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: '#0a192f' }}>Manager Hub</h2>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {kpis.map(k => (
                    <Card key={k.label} className={`shadow-sm border-l-4 ${k.border}`}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{k.label}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{k.value}</div>
                            {k.sub && <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Pipeline Table */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Course Pipeline</CardTitle>
                    <CardDescription>Assign specific staff to leads and push applicants through the funnel.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border h-[500px] overflow-y-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-white dark:bg-zinc-950 z-10 shadow-sm">
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Course Target</TableHead>
                                    <TableHead>Staff Assignment</TableHead>
                                    <TableHead>Lead Status</TableHead>
                                    <TableHead>Secret Keywords</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rawApps.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No applicants found for your courses.</TableCell>
                                    </TableRow>
                                ) : rawApps.map((app) => {
                                    const course = Array.isArray(app.courses) ? app.courses[0] : app.courses
                                    const assignedArray = Array.isArray(app.lead_assignments) ? app.lead_assignments : [app.lead_assignments]
                                    const assignmentNode = assignedArray[0] as { promoter_id?: string; mentor_id?: string } | null

                                    return (
                                        <TableRow key={app.id}>
                                            <TableCell>
                                                <div className="font-medium">{app.student_name}</div>
                                                <div className="text-xs text-muted-foreground">{app.email}</div>
                                            </TableCell>
                                            <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                                                {(course as { name: string } | null)?.name || 'Unknown'}
                                            </TableCell>
                                            <TableCell>
                                                {assignmentNode?.promoter_id ?
                                                    <span className="text-xs px-2 py-1 rounded-full font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">Promoter: {promoterNameMap.get(assignmentNode.promoter_id) || assignmentNode.promoter_id}</span> :
                                                    assignmentNode?.mentor_id ?
                                                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Mentor: {mentorNameMap.get(assignmentNode.mentor_id) || assignmentNode.mentor_id}</span> :
                                                        <span className="text-xs text-muted-foreground">Unassigned</span>}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${app.status === 'Draft' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                                    app.status === 'Followed Up' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' :
                                                        app.status === 'Payment Pending' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                                                            app.status === 'Closed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                                                'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                    }`}>
                                                    {app.status}
                                                </span>
                                            </TableCell>
                                            {/* Secret Keywords */}
                                            <TableCell>
                                                {['Joined', 'Completed', 'Enrolled', 'Paid'].includes(app.status) ? (
                                                    <SecretKeywordsEditor
                                                        applicationId={app.id}
                                                        initialKeywords={(app as any).secret_keywords || ''}
                                                        saveAction={updateSecretKeywords}
                                                    />
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button size="sm" variant="outline">Delegate</Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Assign Staff</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        {promoters?.map(p => (
                                                            <ActionMenuItem
                                                                key={p.id}
                                                                action={assignLeadToStaff.bind(null, app.id, 'promoter', p.id)}
                                                            >
                                                                Promoter: {p.name}
                                                            </ActionMenuItem>
                                                        ))}
                                                        <DropdownMenuSeparator />
                                                        {mentors?.map(m => (
                                                            <ActionMenuItem
                                                                key={m.id}
                                                                action={assignLeadToStaff.bind(null, app.id, 'mentor', m.id)}
                                                            >
                                                                Mentor: {m.name}
                                                            </ActionMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>

                                                {app.status !== 'Joined' && app.status !== 'Completed' && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button size="sm" className="text-white" style={{ backgroundColor: '#0a192f' }}>Override</Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            {['Payment Pending', 'Followed Up', 'Joined', 'Closed'].map(st => (
                                                                <ActionMenuItem
                                                                    key={st}
                                                                    action={updateLeadStatus.bind(null, app.id, st)}
                                                                >
                                                                    {st}
                                                                </ActionMenuItem>
                                                            ))}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}

                                                {app.phone && (
                                                    <WhatsAppShareButton
                                                        phone={app.phone}
                                                        studentName={app.student_name}
                                                        courseName={(course as { name: string })?.name}
                                                        loginId={(Array.isArray(app.lms_mappings) ? app.lms_mappings[0] : app.lms_mappings)?.login_id}
                                                        password={(Array.isArray(app.lms_mappings) ? app.lms_mappings[0] : app.lms_mappings)?.password}
                                                        secretKeywords={(app as any).secret_keywords || undefined}
                                                    />
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
