import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { enforceManagerGuard } from '@/lib/manager-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils'
import WhatsAppShareButton from '@/components/WhatsAppShareButton'
import CopyApplicationLink from '@/components/CopyApplicationLink'
import SecretKeywordsEditor from '@/components/SecretKeywordsEditor'
import { updateSecretKeywords } from '../actions'

interface CourseInfo { name: string; fee: number }
interface MentorUser { full_name: string }
interface MentorInfo { mentor_code: string; users: MentorUser | MentorUser[] }
interface PaymentInfo { amount: number; status: string; razorpay_payment_id: string | null }
interface LMSInfo { login_id: string; password: string }

interface ParsedApp {
    id: string; student_name: string; email: string; phone: string
    status: string | null; created_at: string
    course: CourseInfo | null; mentor: MentorInfo | null; mentorUser: MentorUser | null
    payment: PaymentInfo | null; lms: LMSInfo | null
    secret_keywords: string | null
}

const STATUS_STYLES: Record<string, string> = {
    Draft: 'bg-slate-100 text-slate-700',
    Submitted: 'bg-blue-100 text-blue-800',
    Paid: 'bg-green-100 text-green-800',
    Enrolled: 'bg-indigo-100 text-indigo-800',
    Rejected: 'bg-red-100 text-red-800',
}

const PAYMENT_STYLES: Record<string, string> = {
    Pending: 'bg-amber-100 text-amber-800',
    Successful: 'bg-green-100 text-green-800',
    Captured: 'bg-green-100 text-green-800',
    Failed: 'bg-red-100 text-red-800',
}

export default async function ManagerApplicationsPage() {
    const { assignedCourses } = await enforceManagerGuard()
    const adminDb = createAdminClient()

    const courseIds = assignedCourses.map(c => c.id)

    if (courseIds.length === 0) {
        return (
            <div className="space-y-6">
                <h2 className="text-3xl font-bold tracking-tight" style={{ color: '#0a192f' }}>Applications</h2>
                <Card className="shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">No courses assigned to you.</CardContent></Card>
            </div>
        )
    }

    // Fetch applications for assigned courses only, using admin client to bypass RLS
    const { data: applications } = await adminDb
        .from('applications')
        .select(`
            id, student_name, email, phone, status, created_at, secret_keywords,
            courses ( name, fee ),
            mentors ( mentor_code, users:user_id ( full_name ) ),
            payments ( amount, status, razorpay_payment_id ),
            lms_mappings ( login_id, password )
        `)
        .in('course_id', courseIds)
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
            status: app.status,
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
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: '#0a192f' }}>Applications</h2>

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
                    <CardTitle>Course Applications</CardTitle>
                    <CardDescription>Applications for your assigned courses.</CardDescription>
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
                                            No applications found for your courses.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    apps.map((app) => (
                                        <TableRow key={app.id}>
                                            {/* Student */}
                                            <TableCell>
                                                <div className="font-medium">{app.student_name || 'Unnamed'}</div>
                                                <div className="text-xs text-muted-foreground">{app.email}</div>
                                                {app.phone && <div className="text-xs text-muted-foreground">{app.phone}</div>}
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

                                            {/* Secret Keywords - only editable for paid/enrolled apps */}
                                            <TableCell>
                                                {(app.payment?.status === 'Captured' || app.payment?.status === 'Successful' || app.status === 'Enrolled' || app.status === 'Paid') ? (
                                                    <SecretKeywordsEditor
                                                        applicationId={app.id}
                                                        initialKeywords={app.secret_keywords || ''}
                                                        saveAction={updateSecretKeywords}
                                                    />
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">Fee not paid</span>
                                                )}
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {app.status === 'Draft' && (
                                                        <CopyApplicationLink applicationId={app.id} />
                                                    )}
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
