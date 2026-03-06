const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function test() {
    console.log("Admin Client:")
    const { data: appsAdmin, error: errAdmin } = await supabaseAdmin
        .from('applications')
        .select(`id, status, payments (amount, status, razorpay_payment_id)`)
        .order('created_at', { ascending: false })
        .limit(1)
    console.log("Error:", errAdmin)
    console.log("Apps Admin:", JSON.stringify(appsAdmin, null, 2))
}

test()
