import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function test() {
    const { data: apps, error } = await supabase
        .from('applications')
        .select(`id, status, student_name, created_at, payments (id, status, amount)`)
        .order('created_at', { ascending: false })
        .limit(1)

    console.log("Error:", error)
    console.log("Apps:", JSON.stringify(apps, null, 2))
}

test().catch(console.error)
