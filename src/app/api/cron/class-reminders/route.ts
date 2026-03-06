import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendClassReminder } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminDb = createAdminClient()

    // Get current time in IST (UTC+5:30)
    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000
    const istNow = new Date(now.getTime() + istOffset)

    const todayStr = istNow.toISOString().split('T')[0]
    const currentHours = istNow.getUTCHours()
    const currentMinutes = istNow.getUTCMinutes()

    // Target time: 30 minutes from now
    const targetMinutes = currentMinutes + 30
    const targetHours = currentHours + Math.floor(targetMinutes / 60)
    const targetMins = targetMinutes % 60
    const targetTimeStr = `${String(targetHours).padStart(2, '0')}:${String(targetMins).padStart(2, '0')}`

    console.log(`[CRON] Checking class reminders for ${todayStr} at target time ${targetTimeStr} (current IST: ${currentHours}:${String(currentMinutes).padStart(2, '0')})`)

    // Fetch schedules where:
    // - today is between start_date and end_date
    // - class_time matches the target time (within a 10-minute window)
    const { data: schedules, error } = await adminDb
        .from('class_schedules')
        .select('*, courses(name)')
        .lte('start_date', todayStr)
        .gte('end_date', todayStr)

    if (error) {
        console.error('[CRON] Error fetching schedules:', error)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!schedules || schedules.length === 0) {
        return NextResponse.json({ message: 'No schedules for today', sent: 0 })
    }

    let sentCount = 0

    for (const schedule of schedules) {
        // Check if today is excluded
        const excluded = Array.isArray(schedule.excluded_dates) ? schedule.excluded_dates : []
        if (excluded.includes(todayStr)) {
            console.log(`[CRON] Skipping schedule ${schedule.id} — today is excluded`)
            continue
        }

        // Check if class_time is ~30 min from now (within 5 min tolerance for cron drift)
        const [schedH, schedM] = schedule.class_time.split(':').map(Number)
        const schedTotalMin = schedH * 60 + schedM
        const targetTotalMin = targetHours * 60 + targetMins
        const diff = Math.abs(schedTotalMin - targetTotalMin)

        if (diff > 5) {
            continue // Not within the reminder window
        }

        // Get mentor's user info
        const { data: mentor } = await adminDb
            .from('mentors')
            .select('user_id')
            .eq('id', schedule.mentor_id)
            .single()

        if (!mentor) continue

        const { data: user } = await adminDb
            .from('users')
            .select('full_name, email')
            .eq('id', mentor.user_id)
            .single()

        if (!user || !user.email) continue

        const courseName = Array.isArray(schedule.courses) ? schedule.courses[0]?.name : schedule.courses?.name
        const h = schedH % 12 || 12
        const ampm = schedH >= 12 ? 'PM' : 'AM'
        const timeStr = `${h}:${String(schedM).padStart(2, '0')} ${ampm}`

        try {
            await sendClassReminder(user.email, user.full_name, courseName || 'Class', timeStr)
            sentCount++
            console.log(`[CRON] Sent reminder to ${user.email} for ${courseName} at ${timeStr}`)
        } catch (e) {
            console.error(`[CRON] Failed to send reminder to ${user.email}:`, e)
        }
    }

    return NextResponse.json({ message: `Sent ${sentCount} reminder(s)`, sent: sentCount })
}
