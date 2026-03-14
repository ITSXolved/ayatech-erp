import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { provisionCanvasUser } from '@/lib/canvas'
import { sendStudentWelcomeEmail, sendManagerNotification, sendMentorNotification } from '@/lib/email'

// Service Role client for bypass RLS
function getAdminClient() {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function processApplicationAutomation(applicationId: string) {
    const supabaseAdmin = getAdminClient()

    // 1. Fetch full application details
    const { data: fullApp } = await supabaseAdmin
        .from('applications')
        .select(`
            id, student_name, email, status, course_manager_id, class,
            courses ( 
                id, name, canvas_course_id, course_groups,
                manager:assigned_manager_id ( email ),
                mentor_commission_rate,
                manager_commission_rate,
                promoter_commission_rate
            ),
            mentors ( user_id, users:user_id ( email ) ),
            promoters ( user_id, users:user_id ( email ) )
        `)
        .eq('id', applicationId)
        .single();

    if (!fullApp) {
        console.error('Automation failed: Application not found:', applicationId)
        return { success: false, error: 'Application not found' }
    }

    // 2. Idempotency Check (Don't provision twice)
    const { data: existingMapping } = await supabaseAdmin
        .from('lms_mappings')
        .select('id')
        .eq('application_id', applicationId)
        .single();

    if (existingMapping) {
        console.log(`Application ${applicationId} already provisioned in Canvas. Skipping automation.`)
        return { success: true, status: 'already_provisioned' }
    }

    const course = Array.isArray(fullApp.courses) ? fullApp.courses[0] : fullApp.courses;
    const managerNode = Array.isArray(course?.manager) ? course?.manager[0] : course?.manager;
    const canvasCourseId = (course as { canvas_course_id?: string } | null)?.canvas_course_id;

    try {
        // 3. Provision Canvas user & enroll in section
        const credentials = await provisionCanvasUser({
            name: fullApp.student_name,
            email: fullApp.email,
            canvas_course_id: canvasCourseId || '',
            student_class: (fullApp as { class?: string }).class,
        });

        // 4. Store LMS mapping with credentials
        await supabaseAdmin.from('lms_mappings').insert([{
            application_id: fullApp.id,
            canvas_user_id: credentials.canvas_user_id,
            canvas_enrollment_id: credentials.canvas_enrollment_id,
            canvas_section_id: credentials.canvas_section_id,
            canvas_section_name: credentials.canvas_section_name,
            login_id: credentials.login_id,
            password: credentials.password,
            status: 'Provisioned'
        }]);

        // 5. Send Student Welcome Email
        await sendStudentWelcomeEmail(fullApp.email, fullApp.student_name, {
            login_id: credentials.login_id,
            password: credentials.password,
            course_name: (course as { name?: string } | null)?.name || 'Your Course',
            lms_url: credentials.lms_url,
        });

        // 6. Notify Manager
        if ((managerNode as { email?: string } | null)?.email) {
            await sendManagerNotification(
                (managerNode as { email: string }).email,
                fullApp.student_name,
                (course as { name?: string } | null)?.name || ''
            );
        }

        // 7. Notify Mentor (if assigned directly to application)
        const appMentorNode = Array.isArray(fullApp.mentors) ? fullApp.mentors[0] : fullApp.mentors;
        const appMentorUser = Array.isArray(appMentorNode?.users) ? appMentorNode?.users[0] : appMentorNode?.users;

        if ((appMentorUser as { email?: string } | null)?.email) {
            await sendMentorNotification((appMentorUser as { email: string }).email, fullApp.student_name);
        }

        // 8. AUTOMATION: Generate Commissions
        // Fetch the payment for this application
        const { data: payment } = await supabaseAdmin
            .from('payments')
            .select('id, amount')
            .eq('application_id', applicationId)
            .eq('status', 'Successful')
            .single()

        if (payment) {
            const fee = Number(payment.amount)
            let beneficiary_id: string | null = null
            let commission_amount = 0

            const appMentorNode = Array.isArray(fullApp.mentors) ? fullApp.mentors[0] : fullApp.mentors;
            const appPromoterNode = Array.isArray(fullApp.promoters) ? fullApp.promoters[0] : fullApp.promoters;

            // Check if student was referred by a Promoter first
            if (appPromoterNode) {
                beneficiary_id = (appPromoterNode as any).user_id
                const rate = Number(course?.promoter_commission_rate || 0)
                commission_amount = fee * (rate / 100)
            }
            // Check if student was referred by a Mentor
            else if (appMentorNode) {
                beneficiary_id = (appMentorNode as any).user_id
                // Use promoter_commission_rate as a fallback if mentor rate is 0
                const rate = Number(course?.mentor_commission_rate || course?.promoter_commission_rate || 0)
                commission_amount = fee * (rate / 100)
            }
            // Else check if student was referred by a Course Manager
            else if (fullApp.course_manager_id) {
                const { data: managerEntity } = await supabaseAdmin
                    .from('course_managers')
                    .select('user_id')
                    .eq('id', fullApp.course_manager_id)
                    .single()

                if (managerEntity) {
                    beneficiary_id = managerEntity.user_id
                    const rate = Number(course?.manager_commission_rate || course?.promoter_commission_rate || 0)
                    commission_amount = fee * (rate / 100)
                }
            }

            if (beneficiary_id && commission_amount > 0) {
                await supabaseAdmin.from('commissions').insert([{
                    payment_id: payment.id,
                    beneficiary_id: beneficiary_id,
                    amount: commission_amount,
                    status: 'Pending'
                }])
            }
        }

        return { success: true }

    } catch (e) {
        console.error("LMS/Email Automation Chain Failed inside Verification:", e);
        return { success: false, error: 'Automation failed' }
    }
}
