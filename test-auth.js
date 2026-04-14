require('dotenv').config({ path: 'apps/admin/.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if(!supabaseUrl) {
    console.log("Variáveis de ambiente faltando.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function signIn() {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'purosaborcapao@gmail.com',
        password: 'Password123' // Supondo que vai falhar ou dar ok
    });
    console.log("Auth:", !!data.user, error?.message);
    if(data.user) {
        const { data: p, error: pe } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
        console.log("Profile:", !!p, pe?.message);
    }
}
signIn();
