'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { enforceManagerGuard } from '@/lib/manager-guard'

export async function assignLeadToStaff(applicationId: string, staffType: 'promoter' | 'mentor', staffId: string) {
    const { assignedCourses } = await enforceManagerGuard()
    const supabase = await createClient()

    try {
        console.log(`[ACTION Triggered] assignLeadToStaff: appId=${applicationId}, staffType=${staffType}, staffId=${staffId}`)
        // Ensure manager owns this course lead
        const { data: application, error: appError } = await supabase
            .from('applications')
            .select('course_id')
            .eq('id', applicationId)
            .single()

        if (appError) {
            console.error('Database Error fetching applications for lead assignment', appError)
            return
        }

        const courseIds = assignedCourses.map((c: any) => c.id)
        if (!application || !courseIds.includes(application.course_id)) {
            console.error('Unauthorized. This lead belongs to a course you do not manage.')
            return
        }

        // Check if an assignment already exists
        const { data: existingAssignment } = await supabase
            .from('lead_assignments')
            .select('id')
            .eq('application_id', applicationId)
            .single()

        if (existingAssignment) {
            console.log(`[ACTION] Updating existing assignment id=${existingAssignment.id}`)
            // Update existing
            const payload = staffType === 'promoter' ? { promoter_id: staffId } : { mentor_id: staffId }
            const { error: updateError } = await supabase.from('lead_assignments').update(payload).eq('id', existingAssignment.id)
            if (updateError) console.error('[ACTION Error] Update:', updateError)
        } else {
            console.log(`[ACTION] Creating new assignment for appId=${applicationId}`)
            // Create new
            const payload = staffType === 'promoter'
                ? { application_id: applicationId, promoter_id: staffId }
                : { application_id: applicationId, mentor_id: staffId }
            const { error: insertError } = await supabase.from('lead_assignments').insert([payload])
            if (insertError) console.error('[ACTION Error] Insert:', insertError)
        }
    } catch (err) {
        console.error('Exception assigning lead to staff:', err)
        return
    }

    revalidatePath('/dashboard/manager')
}

export async function updateLeadStatus(applicationId: string, newStatus: string) {
    const { assignedCourses, managerId } = await enforceManagerGuard()
    const supabase = await createClient()

    try {
        // Authorization check
        const { data: application, error: appError } = await supabase
            .from('applications')
            .select(`
                course_id, 
                course_manager_id,
                courses(fee, promoter_commission_rate, mentor_commission_rate, manager_commission_rate),
                mentors(user_id),
                promoters(user_id)
            `)
            .eq('id', applicationId)
            .single()

        if (appError) {
            console.error('Database Error fetching applications for lead status update', appError)
            return
        }

        const courseIds = assignedCourses.map((c: any) => c.id)
        if (!application || !courseIds.includes(application.course_id)) {
            console.error('Unauthorized.')
            return
        }

        // Update Status
        await supabase.from('applications').update({ status: newStatus }).eq('id', applicationId)

        // CRITICAL CALCULATION: If marked "Joined" manually (assuming bypassed Razorpay Webhook), 
        // trigger commission engine.
        if (newStatus === 'Joined' || newStatus === 'Completed') {
            const { data: assignment } = await supabase
                .from('lead_assignments')
                .select('*')
                .eq('application_id', applicationId)
                .single()

            const course = Array.isArray(application.courses) ? application.courses[0] : application.courses
            const fee = Number(course?.fee || 0)

            let beneficiary_id: string | null = null;
            let commission_amount = 0;

            const appMentorNode = Array.isArray(application.mentors) ? application.mentors[0] : application.mentors;
            const appPromoterNode = Array.isArray(application.promoters) ? application.promoters[0] : application.promoters;

            // 1. Check if manager explicitly assigned a promoter/mentor via lead_assignments
            if (assignment?.promoter_id) {
                const { data: pData } = await supabase.from('promoters').select('user_id').eq('id', assignment.promoter_id).single()
                if (pData) {
                    beneficiary_id = pData.user_id;
                    const rate = Number(course?.promoter_commission_rate || 0)
                    commission_amount = fee * (rate / 100)
                }
            } else if (assignment?.mentor_id) {
                const { data: mData } = await supabase.from('mentors').select('user_id').eq('id', assignment.mentor_id).single()
                if (mData) {
                    beneficiary_id = mData.user_id;
                    const rate = Number(course?.mentor_commission_rate || course?.promoter_commission_rate || 0)
                    commission_amount = fee * (rate / 100)
                }
            }
            // 2. Fallback to organic referrals stored natively on the application object
            else if (appPromoterNode) {
                beneficiary_id = (appPromoterNode as any).user_id
                const rate = Number(course?.promoter_commission_rate || 0)
                commission_amount = fee * (rate / 100)
            } else if (appMentorNode) {
                beneficiary_id = (appMentorNode as any).user_id
                const rate = Number(course?.mentor_commission_rate || course?.promoter_commission_rate || 0)
                commission_amount = fee * (rate / 100)
            } else if (application.course_manager_id) {
                const { data: managerEntity } = await supabase
                    .from('course_managers')
                    .select('user_id')
                    .eq('id', application.course_manager_id)
                    .single()
                if (managerEntity) {
                    beneficiary_id = managerEntity.user_id
                    const rate = Number(course?.manager_commission_rate || course?.promoter_commission_rate || 0)
                    commission_amount = fee * (rate / 100)
                }
            }

            if (beneficiary_id && commission_amount > 0) {
                // Check if this commission already exists to be idempotent for manual actions
                const { data: existing } = await supabase.from('commissions').select('id').eq('beneficiary_id', beneficiary_id).eq('amount', commission_amount).limit(1)

                if (!existing || existing.length === 0) {
                    await supabase.from('commissions').insert([{
                        beneficiary_id,
                        status: 'Pending',
                        amount: commission_amount
                    }])
                }
            }
        }
    } catch (err) {
        console.error('Exception updating lead status:', err)
        return
    }

    revalidatePath('/dashboard/manager')
}

export async function updateSecretKeywords(applicationId: string, keywords: string) {
    const { assignedCourses } = await enforceManagerGuard()
    const supabase = await createClient()

    try {
        // Authorization check - ensure this application belongs to a managed course
        const { data: application, error: appError } = await supabase
            .from('applications')
            .select('course_id')
            .eq('id', applicationId)
            .single()

        if (appError || !application) {
            console.error('Error fetching application for keyword update:', appError)
            return
        }

        const courseIds = assignedCourses.map((c: any) => c.id)
        if (!courseIds.includes(application.course_id)) {
            console.error('Unauthorized. This application belongs to a course you do not manage.')
            return
        }

        const { error } = await supabase
            .from('applications')
            .update({ secret_keywords: keywords.trim() || null })
            .eq('id', applicationId)

        if (error) {
            console.error('Error updating secret keywords:', error)
        }
    } catch (err) {
        console.error('Exception updating secret keywords:', err)
    }

    revalidatePath('/dashboard/manager')
    revalidatePath('/dashboard/manager/applications')
}

export async function updateApplicationPhone(applicationId: string, phone: string) {
    const { assignedCourses } = await enforceManagerGuard()
    const supabase = await createClient()

    try {
        // Authorization check - ensure this application belongs to a managed course
        const { data: application, error: appError } = await supabase
            .from('applications')
            .select('course_id')
            .eq('id', applicationId)
            .single()

        if (appError || !application) {
            console.error('Error fetching application for mobile update:', appError)
            return
        }

        const courseIds = assignedCourses.map((c: any) => c.id)
        if (!courseIds.includes(application.course_id)) {
            console.error('Unauthorized. This application belongs to a course you do not manage.')
            return
        }

        const { error } = await supabase
            .from('applications')
            .update({ phone: phone.trim() || null })
            .eq('id', applicationId)

        if (error) {
            console.error('Error updating mobile number:', error)
        }
    } catch (err) {
        console.error('Exception updating mobile number:', err)
    }

    revalidatePath('/dashboard/manager')
    revalidatePath('/dashboard/manager/applications')
}
