const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Using service role to bypass RLS

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing env variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: users, error: errUsers } = await supabase.auth.admin.listUsers();
  console.log('Users count:', users?.users?.length);
  
  if (users?.users?.length > 0) {
    const user = users.users[0];
    const { data: profile, error: errProfile } = await supabase.from('profiles').select('*').eq('id', user.id);
    console.log('Profile for user 0:', profile, errProfile);

    const { data: session, error: errSession } = await supabase.from('operator_sessions').select('*').limit(1);
    console.log('Session table check:', session, errSession);
  }
}

run();
