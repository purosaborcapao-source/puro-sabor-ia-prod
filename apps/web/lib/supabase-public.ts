import { createClient } from '@atendimento-ia/supabase';

// Cliente configurado para uso público (chave anon)
// Ele usará as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY 
// definidas no .env.local do apps/web
export const supabasePublic = createClient();
