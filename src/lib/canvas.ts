export async function provisionCanvasUser(studentData: {
    name: string;
    email: string;
    canvas_course_id: string; // Canvas LMS Course ID (set in admin course settings)
}) {
    const CANVAS_URL = process.env.CANVAS_BASE_URL;
    const TOKEN = process.env.CANVAS_API_TOKEN;

    if (!CANVAS_URL || !TOKEN) {
        throw new Error('Canvas credentials missing from environment.');
    }

    if (!studentData.canvas_course_id) {
        throw new Error('Canvas Course ID not configured for this course.');
    }

    // Generate a random initial password
    const password = Math.random().toString(36).slice(-10);

    // 1. Create User in Canvas LMS
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

    const canvasUser = await createUserRes.json();

    // 2. Enroll User in Course using the real Canvas Course ID
    const enrollPayload = {
        enrollment: {
            user_id: canvasUser.id,
            type: 'StudentEnrollment',
            enrollment_state: 'active',
            notify: false // we handle emails manually via Gmail SMTP
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
        throw new Error('Failed to enroll user in Canvas course');
    }

    const enrollment = await enrollRes.json();

    return {
        canvas_user_id: canvasUser.id.toString(),
        canvas_enrollment_id: enrollment.id.toString(),
        login_id: studentData.email,
        password: password,
        lms_url: CANVAS_URL,
    };
}
