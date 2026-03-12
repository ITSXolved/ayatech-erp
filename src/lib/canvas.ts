export async function provisionCanvasUser(studentData: {
    name: string;
    email: string;
    canvas_course_id: string; // Canvas LMS Course ID
    student_class?: string;
    course_groups?: { name: string; classes: string[] }[];
}) {
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

    const matchedUsers = await searchRes.json();
    const existingUser = Array.isArray(matchedUsers) ? matchedUsers.find((u: { login_id: string; email: string; id: number }) => u.login_id === studentData.email || u.email === studentData.email) : null;

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
        const logins = await loginRes.json();
        const primaryLogin = Array.isArray(logins) ? logins.find((l: { unique_id: string; id: number }) => l.unique_id === studentData.email) : null;

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

        const newUser = await createUserRes.json();
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

    const enrollment = await enrollRes.json();

    let assignedGroupName: string | null = null;
    let assignedGroupId: string | null = null;

    // 4. Dynamic Group Assignment (if class data is present)
    if (studentData.student_class && studentData.course_groups && studentData.course_groups.length > 0) {
        try {
            // Find which group the student belongs to
            const targetGroupTemplate = studentData.course_groups.find(g =>
                g.classes.includes(studentData.student_class!)
            );

            if (targetGroupTemplate) {
                const groupNamePrefix = targetGroupTemplate.name;

                // A. Find or Create Group Category (Set) in Course
                const categoriesRes = await fetch(`${CANVAS_URL}/api/v1/courses/${studentData.canvas_course_id}/group_categories`, {
                    headers: { 'Authorization': `Bearer ${TOKEN}` }
                });
                const categories = await categoriesRes.json();
                let categoryId = categories.find((c: any) => c.name === "Course Sections")?.id;

                if (!categoryId) {
                    const createCatRes = await fetch(`${CANVAS_URL}/api/v1/courses/${studentData.canvas_course_id}/group_categories`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: "Course Sections" })
                    });
                    const newCat = await createCatRes.json();
                    categoryId = newCat.id;
                }

                if (categoryId) {
                    // B. Find an available group or create one
                    const groupsRes = await fetch(`${CANVAS_URL}/api/v1/group_categories/${categoryId}/groups?per_page=100`, {
                        headers: { 'Authorization': `Bearer ${TOKEN}` }
                    });
                    const groups = await groupsRes.json();

                    const relevantGroups = groups.filter((g: any) => g.name.startsWith(groupNamePrefix))
                        .sort((a: any, b: any) => {
                            const getNum = (name: string) => parseInt(name.split('-').pop() || '0');
                            return getNum(a.name) - getNum(b.name);
                        });

                    let targetGroupId = null;
                    let targetGroupName = null;
                    for (const group of relevantGroups) {
                        if (group.members_count < 22) {
                            targetGroupId = group.id;
                            targetGroupName = group.name;
                            break;
                        }
                    }

                    if (!targetGroupId) {
                        const nextNum = relevantGroups.length + 1;
                        const newGroupName = `${groupNamePrefix}-${nextNum}`;
                        const createGroupRes = await fetch(`${CANVAS_URL}/api/v1/group_categories/${categoryId}/groups`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: newGroupName, join_level: 'invitation_only' })
                        });
                        const newGroup = await createGroupRes.json();
                        targetGroupId = newGroup.id;
                        targetGroupName = newGroupName;
                    }

                    // D. Add student to group (check if already in group first is safer, but memberships usually idempotent)
                    if (targetGroupId) {
                        await fetch(`${CANVAS_URL}/api/v1/groups/${targetGroupId}/memberships`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ user_id: canvasUserId })
                        });
                        assignedGroupId = targetGroupId.toString();
                        assignedGroupName = targetGroupName;
                    }
                }
            }
        } catch (groupError) {
            console.error('Canvas Dynamic Group Assignment Error (Non-blocking):', groupError);
        }
    }

    return {
        canvas_user_id: canvasUserId,
        canvas_enrollment_id: enrollment?.id?.toString() || 'existing',
        canvas_group_id: assignedGroupId,
        canvas_group_name: assignedGroupName,
        login_id: studentData.email,
        password: password,
        lms_url: CANVAS_URL,
    };
}
