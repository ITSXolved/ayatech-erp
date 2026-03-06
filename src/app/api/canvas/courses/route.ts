import { NextResponse } from 'next/server'

const CANVAS_URL = process.env.CANVAS_BASE_URL
const TOKEN = process.env.CANVAS_API_TOKEN

// Fetch all courses from Canvas LMS, grouped by sub-account (category)
export async function GET() {
    if (!CANVAS_URL || !TOKEN) {
        return NextResponse.json({ error: 'Canvas not configured' }, { status: 500 })
    }

    try {
        // Fetch existing Supabase courses to filter them out of the Canvas list
        const { createClient } = await import('@/lib/supabase/server')
        const supabase = await createClient()
        const { data: existingCourses } = await supabase.from('courses').select('canvas_course_id').not('canvas_course_id', 'is', null)
        const existingCanvasIds = new Set(existingCourses?.map(c => c.canvas_course_id) || [])

        // 1. Fetch sub-accounts (categories) from Canvas
        const subAccountsRes = await fetch(`${CANVAS_URL}/api/v1/accounts/1/sub_accounts?per_page=100`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` },
        })

        let categories: { id: string; name: string }[] = []

        if (subAccountsRes.ok) {
            const subAccounts = await subAccountsRes.json()
            categories = subAccounts.map((sa: { id: number; name: string }) => ({
                id: String(sa.id),
                name: sa.name,
            }))
        }

        // Always include the root account as a category
        categories.unshift({ id: '1', name: 'Default' })

        // 2. Fetch all courses from Canvas (root account)
        const allCourses: { id: string; name: string; category_id: string; category_name: string }[] = []

        for (const cat of categories) {
            const coursesRes = await fetch(
                `${CANVAS_URL}/api/v1/accounts/${cat.id}/courses?per_page=100&include[]=total_students`,
                { headers: { 'Authorization': `Bearer ${TOKEN}` } }
            )

            if (coursesRes.ok) {
                const courses = await coursesRes.json()
                for (const c of courses) {
                    const canvasIdStr = String(c.id)
                    // Skip if already imported into Supabase or already in our list
                    if (existingCanvasIds.has(canvasIdStr)) continue

                    existingCanvasIds.add(canvasIdStr)

                    allCourses.push({
                        id: canvasIdStr,
                        name: c.name,
                        category_id: cat.id,
                        category_name: cat.name,
                    })
                }
            }
        }

        return NextResponse.json({ categories, courses: allCourses })
    } catch (error) {
        console.error('Canvas API fetch error:', error)
        return NextResponse.json({ error: 'Failed to fetch from Canvas' }, { status: 500 })
    }
}
