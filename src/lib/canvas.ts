export interface CanvasProvisioningResult {
    canvas_user_id: string;
    canvas_enrollment_id: string;
    canvas_section_id: string | null;
    canvas_section_name: string | null;
    login_id: string;
    password: string;
    lms_url: string;
}

export async function provisionCanvasUser(studentData: {
    name: string;
    email: string;
    canvas_course_id: string; // Canvas LMS Course ID
    student_class?: string;
    course_groups?: { name: string; classes: string[] }[];
}): Promise<CanvasProvisioningResult> {
    const CANVAS_URL = process.env.CANVAS_BASE_URL;
    const TOKEN = process.env.CANVAS_API_TOKEN;

    if (!CANVAS_URL || !TOKEN) {
        throw new Error('Canvas credentials missing from environment.');
    }

    if (!studentData.canvas_course_id) {
        throw new Error('Canvas Course ID not configured for this course.');
    }

    // Generate a robust initial password (uppercase + lowercase + numbers, URL-safe)
    const charset = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let password = "";
    for (let i = 0; i < 10; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    let canvasUserId: string;

    // 1. Check if user already exists in Canvas LMS
    const searchRes = await fetch(`${CANVAS_URL}/api/v1/accounts/1/users?search_term=${encodeURIComponent(studentData.email)}`, {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
    });

    const matchedUsers = await searchRes.json() as { login_id: string; email: string; id: number }[];
    const existingUser = Array.isArray(matchedUsers) ? matchedUsers.find((u) => u.login_id === studentData.email || u.email === studentData.email) : null;

    if (existingUser) {
        canvasUserId = existingUser.id.toString();
        // A. Update Existing User's Password & Name to sync with current registration
        // We'll update the name separately to be clean
        await fetch(`${CANVAS_URL}/api/v1/users/${canvasUserId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: { name: studentData.name, short_name: studentData.name } })
        });

        // We need the pseudonym ID to update the password.
        const loginRes = await fetch(`${CANVAS_URL}/api/v1/users/${canvasUserId}/logins`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const logins = await loginRes.json() as { unique_id: string; id: number }[];
        const primaryLogin = Array.isArray(logins) ? logins.find((l) => l.unique_id === studentData.email) : null;

        if (primaryLogin) {
            await fetch(`${CANVAS_URL}/api/v1/accounts/1/logins/${primaryLogin.id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ pseudonym: { password: password } })
            });
        }
    } else {
        // 2. Create New User in Canvas LMS
        const userPayload = {
            user: {
                name: studentData.name,
                short_name: studentData.name,
            },
            pseudonym: {
                unique_id: studentData.email,
                password: password,
                send_confirmation: false
            },
            communication_channel: {
                type: 'email',
                address: studentData.email,
                skip_confirmation: true
            }
        };

        const createUserRes = await fetch(`${CANVAS_URL}/api/v1/accounts/1/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userPayload)
        });

        if (!createUserRes.ok) {
            const err = await createUserRes.text();
            console.error('Canvas User Creation Error:', err);
            throw new Error('Failed to create Canvas User');
        }

        const newUser = await createUserRes.json() as { id: number };
        canvasUserId = newUser.id.toString();
    }

    // 3. Enroll User in Course (This handles both new and existing users)
    const enrollPayload = {
        enrollment: {
            user_id: canvasUserId,
            type: 'StudentEnrollment',
            enrollment_state: 'active',
            notify: false
        }
    };

    const enrollRes = await fetch(`${CANVAS_URL}/api/v1/courses/${studentData.canvas_course_id}/enrollments`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(enrollPayload)
    });

    if (!enrollRes.ok) {
        const err = await enrollRes.text();
        console.error('Canvas Enrollment Error:', err);
        // If they are already enrolled, Canvas might return an error - we should check if it's just a "already enrolled" conflict
        if (!err.includes('already enrolled') && !err.includes('Conflict')) {
            throw new Error('Failed to enroll user in Canvas course');
        }
    }

    const enrollment = await enrollRes.json() as { id: number };

    let assignedSectionName: string | null = null;
    let assignedSectionId: string | null = null;

    // 4. Dynamic Section Assignment (if class data is present)
    if (studentData.student_class && studentData.course_groups && studentData.course_groups.length > 0) {
        try {
            // Find which section prefix the student belongs to
            const targetSectionTemplate = studentData.course_groups.find(g =>
                g.classes.includes(studentData.student_class!)
            );

            if (targetSectionTemplate) {
                const sectionNamePrefix = targetSectionTemplate.name;

                // A. Fetch existing sections with student counts
                const sectionsRes = await fetch(`${CANVAS_URL}/api/v1/courses/${studentData.canvas_course_id}/sections?include[]=total_students`, {
                    headers: { 'Authorization': `Bearer ${TOKEN}` }
                });
                const sections = await sectionsRes.json() as { id: number; name: string; total_students: number }[];

                if (Array.isArray(sections)) {
                    const relevantSections = sections.filter((s) => s.name.startsWith(sectionNamePrefix))
                        .sort((a, b) => {
                            const getNum = (name: string) => {
                                const parts = name.split('-');
                                return parseInt(parts[parts.length - 1] || '0');
                            };
                            return getNum(a.name) - getNum(b.name);
                        });

                    let targetId = null;
                    let targetName = null;

                    // B. Find a section with < 22 students
                    for (const section of relevantSections) {
                        if (section.total_students < 22) {
                            targetId = section.id;
                            targetName = section.name;
                            break;
                        }
                    }

                    // C. Create new section if none available or all full
                    if (!targetId) {
                        const nextNum = relevantSections.length + 1;
                        const newSectionName = `${sectionNamePrefix}-${nextNum}`;
                        const createSectionRes = await fetch(`${CANVAS_URL}/api/v1/courses/${studentData.canvas_course_id}/sections`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ course_section: { name: newSectionName } })
                        });
                        const newSection = await createSectionRes.json() as { id: number };
                        targetId = newSection.id;
                        targetName = newSectionName;
                    }

                    // D. Enroll User in Section (Enrollment in section automatically provides course access)
                    if (targetId) {
                        await fetch(`${CANVAS_URL}/api/v1/sections/${targetId}/enrollments`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                enrollment: {
                                    user_id: canvasUserId,
                                    type: 'StudentEnrollment',
                                    enrollment_state: 'active',
                                    notify: false
                                }
                            })
                        });
                        assignedSectionId = targetId.toString();
                        assignedSectionName = targetName;
                    }
                }
            }
        } catch (sectionError) {
            console.error('Canvas Section Assignment Error (Non-blocking):', sectionError);
        }
    }

    return {
        canvas_user_id: canvasUserId,
        canvas_enrollment_id: enrollment?.id?.toString() || 'existing',
        canvas_section_id: assignedSectionId,
        canvas_section_name: assignedSectionName,
        login_id: studentData.email,
        password: password,
        lms_url: CANVAS_URL || '',
    };
}
