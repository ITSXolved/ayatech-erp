import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import SecretKeywordsEditor from '@/components/SecretKeywordsEditor'
import MobileNumberEditor from '@/components/MobileNumberEditor'
import { updateApplicationStatus, deleteApplication, adminSyncApplicationPayment, updateSecretKeywords, updateApplicationPhone } from './actions'
import { formatDate } from '@/lib/utils'
import WhatsAppShareButton from '@/components/WhatsAppShareButton'
import CopyApplicationLink from '@/components/CopyApplicationLink'
// Allow this route to run up to 60 seconds on Vercel to handle LMS provisioning and emails via Server Actions
export const maxDuration = 60;

interface CourseInfo {
    name: string
    fee: number
}

interface MentorUser {
    full_name: string
}

interface MentorInfo {
    mentor_code: string
    users: MentorUser | MentorUser[]
}

interface PaymentInfo {
    amount: number
    status: string
    razorpay_payment_id: string | null
}

interface LMSInfo {
    login_id: string
    password: string
}

interface ParsedApp {
    id: string
    student_name: string
    email: string
    phone: string
    state: string | null
    status: string | null
    class: string | null
    created_at: string
    course: CourseInfo | null
    mentor: MentorInfo | null
    mentorUser: MentorUser | null
    payment: PaymentInfo | null
    lms: LMSInfo | null
    secret_keywords: string | null
}

const STATUS_STYLES: Record<string, string> = {
    Draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    Submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    Paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    Enrolled: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    Rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

const PAYMENT_STYLES: Record<string, string> = {
    Pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    Successful: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    Captured: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    Failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export default async function AdminApplicationsPage() {
    // We use the service_role key to bypass RLS on related tables like `payments` that might block non-admins
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch applications with course, mentor, and payment info
    const { data: applications } = await supabase
        .from('applications')
        .select(`
            id, student_name, email, phone, state, status, class, created_at, secret_keywords,
            courses ( name, fee ),
            mentors ( mentor_code, users:user_id ( full_name ) ),
            payments ( amount, status, razorpay_payment_id ),
            lms_mappings ( login_id, password )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    const apps: ParsedApp[] = (applications || []).map(app => {
        const course = (Array.isArray(app.courses) ? app.courses[0] : app.courses) as CourseInfo | null
        const rawMentor = (Array.isArray(app.mentors) ? app.mentors[0] : app.mentors) as MentorInfo | null
        const mentorUser = rawMentor ? (Array.isArray(rawMentor.users) ? rawMentor.users[0] : rawMentor.users) as MentorUser | null : null
        const payment = (Array.isArray(app.payments) ? app.payments[0] : app.payments) as PaymentInfo | null
        return {
            id: app.id,
            student_name: app.student_name,
            email: app.email,
            phone: app.phone,
            state: app.state,
            status: app.status,
            class: app.class,
            created_at: app.created_at,
            course,
            mentor: rawMentor,
            mentorUser,
            payment,
            lms: (Array.isArray(app.lms_mappings) ? app.lms_mappings[0] : app.lms_mappings) as LMSInfo | null,
            secret_keywords: (app as any).secret_keywords || null,
        }
    })

    // Summary stats
    const total = apps.length
    const drafts = apps.filter(a => a.status === 'Draft').length
    const paid = apps.filter(a => a.payment?.status === 'Captured' || a.payment?.status === 'Successful').length
    const pendingPayment = apps.filter(a => a.status !== 'Draft' && a.payment?.status !== 'Captured' && a.payment?.status !== 'Successful').length

    const summaryCards = [
        { label: 'Total Applications', value: total, color: 'border-l-[#0a192f]' },
        { label: 'Paid', value: paid, color: 'border-l-green-500' },
        { label: 'Pending Payment', value: pendingPayment, color: 'border-l-amber-500' },
        { label: 'Drafts', value: drafts, color: 'border-l-slate-400' },
    ]

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Applications</h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {summaryCards.map(card => (
                    <Card key={card.label} className={`shadow-sm border-l-4 ${card.color}`}>
                        <CardContent className="pt-6">
                            <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                            <p className="text-3xl font-bold mt-1">{card.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Applications Table */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>All Applications</CardTitle>
                    <CardDescription>View and manage course applications with payment information.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                        <Table className="min-w-full">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Course</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Payment</TableHead>
                                    <TableHead>Mentor</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Secret Keywords</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {apps.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                                            No applications found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    apps.map((app) => (
                                        <TableRow key={app.id}>
                                            {/* Student */}
                                            <TableCell>
                                                <div className="font-medium">{app.student_name || 'Unnamed'}</div>
                                                <div className="text-xs text-muted-foreground">{app.email}</div>
                                                <div className="flex flex-col gap-1 mt-1">
                                                    <MobileNumberEditor
                                                        applicationId={app.id}
                                                        initialPhone={app.phone || ''}
                                                        saveAction={updateApplicationPhone}
                                                    />
                                                    {app.class && <div className="text-xs font-semibold text-indigo-400">[{app.class}]</div>}
                                                </div>
                                                {app.lms && (
                                                    <div className="mt-1 p-1.5 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-100 dark:border-blue-900">
                                                        <div className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider mb-0.5">Canvas LMS</div>
                                                        <div className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate" title={app.lms.login_id}>U: {app.lms.login_id}</div>
                                                        <div className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate">P: {app.lms.password}</div>
                                                    </div>
                                                )}
                                            </TableCell>

                                            {/* Course */}
                                            <TableCell>
                                                {app.course ? (
                                                    <div>
                                                        <div className="font-medium text-sm">{app.course.name}</div>
                                                        <div className="text-xs text-muted-foreground">₹{app.course.fee}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">Not selected</span>
                                                )}
                                            </TableCell>

                                            {/* Status */}
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[app.status || 'Draft'] || STATUS_STYLES.Draft}`}>
                                                    {app.status || 'Draft'}
                                                </span>
                                            </TableCell>

                                            {/* Payment */}
                                            <TableCell>
                                                {app.payment ? (
                                                    <div>
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STYLES[app.payment.status] || PAYMENT_STYLES.Pending}`}>
                                                            {app.payment.status}
                                                        </span>
                                                        <div className="text-xs text-muted-foreground mt-1">₹{app.payment.amount}</div>
                                                        {app.payment.razorpay_payment_id && (
                                                            <div className="text-xs text-muted-foreground font-mono truncate max-w-[120px]" title={app.payment.razorpay_payment_id}>
                                                                {app.payment.razorpay_payment_id}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">No payment</span>
                                                )}
                                            </TableCell>

                                            {/* Mentor */}
                                            <TableCell>
                                                {app.mentor ? (
                                                    <div>
                                                        <div className="text-sm">{app.mentorUser?.full_name || 'Unknown'}</div>
                                                        <div className="text-xs text-muted-foreground font-mono">{app.mentor.mentor_code}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">None</span>
                                                )}
                                            </TableCell>

                                            {/* Date */}
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                                {formatDate(app.created_at)}
                                            </TableCell>

                                            {/* Secret Keywords */}
                                            <TableCell>
                                                <SecretKeywordsEditor
                                                    applicationId={app.id}
                                                    initialKeywords={app.secret_keywords || ''}
                                                    saveAction={updateSecretKeywords}
                                                />
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="text-right">
                                                <div className="flex flex-col gap-1 items-end">
                                                    {app.status === 'Draft' && (
                                                        <CopyApplicationLink applicationId={app.id} />
                                                    )}
                                                    {app.status === 'Draft' && (
                                                        <form action={updateApplicationStatus.bind(null, app.id, 'Submitted')}>
                                                            <Button size="sm" variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100">
                                                                Mark Submitted
                                                            </Button>
                                                        </form>
                                                    )}
                                                    {app.status !== 'Rejected' && (
                                                        <form action={adminSyncApplicationPayment.bind(null, app.id)}>
                                                            <Button size="sm" variant="outline" className="text-xs bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 hover:bg-purple-100" title="Check Razorpay for payment updates">
                                                                <svg className="w-3 h-3 mr-1 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                                                                </svg>
                                                                Sync Payment
                                                            </Button>
                                                        </form>
                                                    )}
                                                    {app.status !== 'Enrolled' && app.status !== 'Rejected' && (
                                                        <form action={updateApplicationStatus.bind(null, app.id, 'Enrolled')}>
                                                            <Button size="sm" variant="outline" className="text-xs bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 hover:bg-green-100">
                                                                Mark Enrolled
                                                            </Button>
                                                        </form>
                                                    )}
                                                    {app.status !== 'Rejected' && (
                                                        <form action={updateApplicationStatus.bind(null, app.id, 'Rejected')}>
                                                            <Button size="sm" variant="outline" className="text-xs bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 hover:bg-red-100">
                                                                Reject
                                                            </Button>
                                                        </form>
                                                    )}
                                                    <form action={deleteApplication.bind(null, app.id)}>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50" title="Delete Application">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                                                        </Button>
                                                    </form>

                                                    {app.phone && (
                                                        <WhatsAppShareButton
                                                            phone={app.phone}
                                                            studentName={app.student_name}
                                                            courseName={app.course?.name}
                                                            loginId={app.lms?.login_id}
                                                            password={app.lms?.password}
                                                            secretKeywords={app.secret_keywords || undefined}
                                                        />
                                                    )}
                                                </div>
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
