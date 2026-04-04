const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('registrations').select('id, student_id, student_name, proposal_title, reviewer_id').neq('reviewer_id', null);
  console.log(data);
}
run();
