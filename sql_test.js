const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: schedule } = await supabase
        .from('class_schedules')
        .select('*');
    console.log("Schedules:", schedule?.length);
    if (schedule?.length) {
        const { data: students } = await supabase
            .from('applications')
            .select('*')
            .eq('course_id', schedule[0].course_id)
            .eq('status', 'Enrolled');
        console.log("Students enrolled for course", schedule[0].course_id, ":", students?.length);
        console.log("Students:", students);
    }
}
check();
