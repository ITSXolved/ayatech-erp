import { updateLeadStatus } from './src/app/dashboard/manager/actions'

async function run() {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://tfmehkiouuzwiigdctgt.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    
    console.log("Triggering updateLeadStatus for 'Joined' to test commission generation...")
    try {
        await updateLeadStatus('189c77be-4f66-46fb-9349-0680424e751a', 'Joined')
        console.log("Update finished.")
    } catch (e) {
        console.error("Error:", e)
    }
}

run()
