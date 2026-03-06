const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// try using the anon key (which the client uses)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: schedule } = await supabase
        .from('class_schedules')
        .select('course_id')
        .eq('id', 'b9fb1243-c67e-470e-9f0b-ace7acf17477')
        .single();
    console.log("Schedule:", schedule);
    if (schedule) {
        const { data: students, error } = await supabase
            .from('applications')
            .select('id, student_name, email')
            .eq('course_id', schedule.course_id)
            .eq('status', 'Enrolled');
        console.log("Students Error:", error);
        console.log("Students array:", students);
    }
}
check();
