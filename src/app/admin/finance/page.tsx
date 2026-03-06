import { createAdminClient } from '@/lib/supabase/admin'
import { FinanceDashboardClient } from './finance-client'

export default async function FinancePage({
    searchParams,
}: {
    searchParams: Promise<{ from?: string; to?: string }>
}) {
    const params = await searchParams
    const adminDb = createAdminClient()

    // Default date range: current month
    const now = new Date()
    const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
    const defaultFrom = new Date(istNow.getFullYear(), istNow.getMonth(), 1).toISOString().split('T')[0]
    const defaultTo = istNow.toISOString().split('T')[0]

    const fromDate = params.from || defaultFrom
    const toDate = params.to || defaultTo

    // 2. Get all courses for commission rates
    const { data: allCourses } = await adminDb.from('courses').select('id, name, fee, mentor_commission_rate, promoter_commission_rate, manager_commission_rate')
    const courseMap = new Map((allCourses || []).map(c => [c.id, c]))

    // ========================
    // PERIOD TOTALS (for summary cards, respecting date filter)
    // ========================

    // Fee collected in period
    const { data: periodPayments } = await adminDb
        .from('payments')
        .select('amount, status, created_at')
        .in('status', ['Captured', 'Successful'])
        .gte('created_at', fromDate + 'T00:00:00')
        .lte('created_at', toDate + 'T23:59:59')

    const totalFeeCollected = (periodPayments || []).reduce((s, p) => s + Number(p.amount || 0), 0)

    // Commissions in period
    const { data: periodCommissions } = await adminDb
        .from('commissions')
        .select(`
            amount, 
            beneficiary_id, 
            created_at,
            payment:payments!payment_id (
                application:applications!application_id ( course_id )
            )
        `)
        .gte('created_at', fromDate + 'T00:00:00')
        .lte('created_at', toDate + 'T23:59:59')

    // Remuneration in period
    const { data: periodAttendance } = await adminDb
        .from('class_attendance')
        .select('schedule_id, status, class_date')
        .eq('status', 'present')
        .gte('class_date', fromDate)
        .lte('class_date', toDate)

    const periodScheduleIds = [...new Set((periodAttendance || []).map(a => a.schedule_id))]
    const { data: periodSchedules } = periodScheduleIds.length > 0
        ? await adminDb.from('class_schedules').select('id, mentor_id, course_id, duration_minutes, hourly_rate').in('id', periodScheduleIds)
        : { data: [] }
    const periodSchMap = new Map((periodSchedules || []).map(s => [s.id, s]))
    const beneficiaryUserIds = [...new Set([
        ...(periodCommissions || []).map(c => c.beneficiary_id),
    ].filter(Boolean) as string[])]

    const { data: allMentors } = await adminDb.from('mentors').select('id, user_id')
    const userIdToMentorId = new Map((allMentors || []).map(m => [m.user_id, m.id]))

    const allUserIds = [...new Set([...beneficiaryUserIds, ...(allMentors || []).map(m => m.user_id)])]
    const { data: allUsers } = allUserIds.length > 0
        ? await adminDb.from('users').select('id, full_name').in('id', allUserIds)
        : { data: [] }
    const userNameMap = new Map((allUsers || []).map(u => [u.id, u.full_name]))

    // 4. Build Aggregated Rows (Key: RecipientID__CourseID)
    type FinanceRow = {
        recipientId: string
        recipientName: string
        type: 'Mentor' | 'Promoter'
        courseId: string
        totalHours: number
        hourlyRate: number
        remuneration: number
        commission: number
    }
    const rowMap: Map<string, FinanceRow> = new Map()

    // Process Attendance (Mentors)
    for (const att of (periodAttendance || [])) {
        const sch = periodSchMap.get(att.schedule_id)
        if (!sch) continue
        const key = `${sch.mentor_id}__${sch.course_id}`
        const hours = (sch.duration_minutes || 60) / 60
        const rate = Number(sch.hourly_rate || 0)
        const remun = hours * rate

        if (!rowMap.has(key)) {
            const userId = (allMentors || []).find(m => m.id === sch.mentor_id)?.user_id
            rowMap.set(key, {
                recipientId: sch.mentor_id,
                recipientName: userNameMap.get(userId || '') || 'Unknown',
                type: 'Mentor',
                courseId: sch.course_id,
                totalHours: 0,
                hourlyRate: rate,
                remuneration: 0,
                commission: 0,
            })
        }
        const row = rowMap.get(key)!
        row.totalHours += hours
        row.remuneration += remun
    }

    // Process Commissions (Mentors & Promoters)
    for (const comm of (periodCommissions || [])) {
        const payment = Array.isArray(comm.payment) ? comm.payment[0] : comm.payment
        if (!payment || !payment.application) continue
        const app = Array.isArray(payment.application) ? payment.application[0] : payment.application
        if (!app.course_id || !comm.beneficiary_id) continue

        // Check if beneficiary is a mentor
        const mentorId = userIdToMentorId.get(comm.beneficiary_id)
        const recipientId = mentorId || comm.beneficiary_id
        const key = `${recipientId}__${app.course_id}`

        if (!rowMap.has(key)) {
            rowMap.set(key, {
                recipientId: recipientId,
                recipientName: userNameMap.get(comm.beneficiary_id) || 'Unknown',
                type: mentorId ? 'Mentor' : 'Promoter',
                courseId: app.course_id,
                totalHours: 0,
                hourlyRate: 0,
                remuneration: 0,
                commission: 0,
            })
        }
        const row = rowMap.get(key)!
        row.commission += Number(comm.amount || 0)
    }

    // 5. Final Totals from RowMap (ensures consistency)
    let totalRemuneration = 0
    let totalCommission = 0
    const tableRows = [...rowMap.values()].map(r => {
        totalRemuneration += r.remuneration
        totalCommission += r.commission

        return {
            mentorName: r.type === 'Promoter' ? `[Promoter] ${r.recipientName}` : r.recipientName,
            courseName: courseMap.get(r.courseId)?.name || 'Unknown',
            totalHours: Math.round(r.totalHours * 100) / 100,
            dateFrom: fromDate,
            dateTo: toDate,
            hourlyRate: r.hourlyRate,
            totalRemuneration: Math.round(r.remuneration * 100) / 100,
            commission: Math.round(r.commission * 100) / 100,
            totalPayment: Math.round((r.remuneration + r.commission) * 100) / 100,
        }
    })

    const remaining = totalFeeCollected - totalRemuneration - totalCommission

    return (
        <FinanceDashboardClient
            fromDate={fromDate}
            toDate={toDate}
            totalFeeCollected={Math.round(totalFeeCollected * 100) / 100}
            totalRemuneration={Math.round(totalRemuneration * 100) / 100}
            totalCommission={Math.round(totalCommission * 100) / 100}
            remaining={Math.round(remaining * 100) / 100}
            tableRows={tableRows}
        />
    )
}

