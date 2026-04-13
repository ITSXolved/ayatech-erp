export interface CanvasProvisioningResult {
    canvas_user_id: string;
    canvas_enrollment_id: string;
    canvas_section_id: string | null;
    canvas_section_name: string | null;
    login_id: string;
    password: string;
    lms_url: string;
}

/**
 * Determines the Canvas section prefix based on the student's class.
 * Hardcoded rules:
 *  - 1st, 2nd, 3rd       → "lower primary"
 *  - 4th, 5th             → "primary"
 *  - 6th, 7th             → "upper primary"
 *  - all others           → "other"
 */
function getSectionPrefix(studentClass: string | undefined): string {
    if (!studentClass) return 'other';
    const cls = studentClass.toLowerCase().trim();
    if (['1st', '2nd', '3rd'].includes(cls)) return 'lower primary';
    if (['4th', '5th'].includes(cls)) return 'primary';
    if (['6th', '7th'].includes(cls)) return 'upper primary';
    return 'other';
}

export async function provisionCanvasUser(studentData: {
    name: string;
    email: string;
    canvas_course_id: string;
    student_class?: string;
}): Promise<CanvasProvisioningResult> {
    const CANVAS_URL = process.env.CANVAS_BASE_URL || 'https://lms.ayatech.org';
    const TOKEN = process.env.CANVAS_API_TOKEN || 'XCcWZe6uyZ8mxHfxxDEC4xHy48X8cVETTMFkAnZ4PPYMxJVmruTMt9HzzM9AaBWF';

    if (!CANVAS_URL || !TOKEN) {
        throw new Error('Canvas credentials missing from environment.');
    }

    if (!studentData.canvas_course_id) {
        throw new Error('Canvas Course ID not configured for this course.');
    }

    // Generate a robust password (uppercase + lowercase + numbers, URL-safe)
    const charset = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    let canvasUserId: string;

    // 1. Check if user already exists in Canvas LMS
    const searchRes = await fetch(
        `${CANVAS_URL}/api/v1/accounts/1/users?search_term=${encodeURIComponent(studentData.email)}`,
        { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    const matchedUsers = (await searchRes.json()) as { login_id: string; email: string; id: number }[];
    const existingUser = Array.isArray(matchedUsers)
        ? matchedUsers.find((u) => u.login_id === studentData.email || u.email === studentData.email)
        : null;

    if (existingUser) {
        canvasUserId = existingUser.id.toString();

        // Update name
        await fetch(`${CANVAS_URL}/api/v1/users/${canvasUserId}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: { name: studentData.name, short_name: studentData.name } }),
        });

        // Update password via pseudonym
        const loginRes = await fetch(`${CANVAS_URL}/api/v1/users/${canvasUserId}/logins`, {
            headers: { Authorization: `Bearer ${TOKEN}` },
        });
        const logins = (await loginRes.json()) as { unique_id: string; id: number }[];
        const primaryLogin = Array.isArray(logins)
            ? logins.find((l) => l.unique_id === studentData.email)
            : null;

        if (primaryLogin) {
            await fetch(`${CANVAS_URL}/api/v1/accounts/1/logins/${primaryLogin.id}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ pseudonym: { password } }),
            });
        }
    } else {
        // 2. Create new user in Canvas LMS
        const createUserRes = await fetch(`${CANVAS_URL}/api/v1/accounts/1/users`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user: { name: studentData.name, short_name: studentData.name },
                pseudonym: { unique_id: studentData.email, password, send_confirmation: false },
                communication_channel: { type: 'email', address: studentData.email, skip_confirmation: true },
            }),
        });

        if (!createUserRes.ok) {
            const err = await createUserRes.text();
            console.error('Canvas User Creation Error:', err);
            throw new Error('Failed to create Canvas User');
        }

        const newUser = (await createUserRes.json()) as { id: number };
        canvasUserId = newUser.id.toString();
    }

    // 3. Determine the section prefix from hardcoded class rules
    const sectionPrefix = getSectionPrefix(studentData.student_class);

    // 4. Find or create a numbered section and enroll the user into it
    let assignedSectionId: string | null = null;
    let assignedSectionName: string | null = null;
    let enrollmentId = 'unknown';

    // A. Fetch all existing sections for the course with student counts
    const sectionsRes = await fetch(
        `${CANVAS_URL}/api/v1/courses/${studentData.canvas_course_id}/sections?include[]=total_students&per_page=100`,
        { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    const allSections = (await sectionsRes.json()) as { id: number; name: string; total_students: number }[];

    // Filter to only sections matching this prefix, sorted numerically (e.g. lower primary-1, lower primary-2)
    const relevantSections = Array.isArray(allSections)
        ? allSections
              .filter((s) => s.name.toLowerCase().startsWith(sectionPrefix))
              .sort((a, b) => {
                  const getNum = (name: string) => {
                      const match = name.match(/-(\d+)$/);
                      return match ? parseInt(match[1]) : 0;
                  };
                  return getNum(a.name) - getNum(b.name);
              })
        : [];

    let targetSectionId: number | null = null;
    let targetSectionName: string | null = null;

    // B. Find first section with room (< 22 students)
    for (const section of relevantSections) {
        if (section.total_students < 22) {
            targetSectionId = section.id;
            targetSectionName = section.name;
            break;
        }
    }

    // C. All existing sections full (or none exist) — create a new numbered one
    if (!targetSectionId) {
        const nextNum = relevantSections.length + 1;
        // e.g. "lower primary-1", "primary-1", "upper primary-1", "other-1"
        const newSectionName = `${sectionPrefix}-${nextNum}`;

        console.log(`[Canvas] Creating new section: "${newSectionName}"`);
        const createRes = await fetch(
            `${CANVAS_URL}/api/v1/courses/${studentData.canvas_course_id}/sections`,
            {
                method: 'POST',
                headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ course_section: { name: newSectionName } }),
            }
        );

        if (!createRes.ok) {
            const err = await createRes.text();
            console.error('Canvas Section Creation Error:', err);
            throw new Error('Failed to create Canvas section');
        }

        const newSection = (await createRes.json()) as { id: number };
        targetSectionId = newSection.id;
        targetSectionName = newSectionName;
    }

    // D. Enroll user directly into the section (gives full course access)
    console.log(`[Canvas] Enrolling user ${canvasUserId} into section "${targetSectionName}" (id: ${targetSectionId})`);
    const enrollRes = await fetch(
        `${CANVAS_URL}/api/v1/sections/${targetSectionId}/enrollments`,
        {
            method: 'POST',
            headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                enrollment: {
                    user_id: canvasUserId,
                    type: 'StudentEnrollment',
                    enrollment_state: 'active',
                    notify: false,
                },
            }),
        }
    );

    if (!enrollRes.ok) {
        const err = await enrollRes.text();
        if (!err.includes('already enrolled') && !err.includes('Conflict')) {
            console.error('Canvas Section Enrollment Error:', err);
            throw new Error('Failed to enroll user in Canvas section');
        }
        console.log(`[Canvas] User already in section "${targetSectionName}", continuing.`);
    } else {
        const enrollment = (await enrollRes.json()) as { id: number };
        enrollmentId = enrollment?.id?.toString() || 'enrolled';
    }

    assignedSectionId = targetSectionId.toString();
    assignedSectionName = targetSectionName;

    return {
        canvas_user_id: canvasUserId,
        canvas_enrollment_id: enrollmentId,
        canvas_section_id: assignedSectionId,
        canvas_section_name: assignedSectionName,
        login_id: studentData.email,
        password,
        lms_url: CANVAS_URL,
    };
}
