import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from './types'

// Singleton caches
let cachedClient: SupabaseClient<Database> | null = null
let cachedRouteClient: SupabaseClient<Database> | null = null
let cachedMiddlewareClient: SupabaseClient<Database> | null = null

// ============================================================================
// CLIENT - For browser/frontend (anon key)
// ============================================================================
export function createClient(): SupabaseClient<Database> {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (!supabaseUrl || !supabaseAnonKey) {
    const errorMsg = 'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set';
    
    // In the browser, we don't want to throw and crash the whole React tree immediately.
    // We log the error and return a client that will fail on individual calls.
    if (typeof window !== 'undefined') {
      console.error(`❌ [supabase] ${errorMsg}`);
    } else {
      // On the server, we still want to know early.
      throw new Error(errorMsg);
    }
  }

  // @ts-ignore - Contornando conflito de tipos entre versões do supabase-js no monorepo
  cachedClient = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'puro-sabor-ia-auth-session',
      flowType: 'pkce'
    }
  }) as any
  return cachedClient as any
}

// Lazy proxy — importing this module never throws; the error surfaces only
// when a Supabase method is actually called at runtime.
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop, receiver) {
    return Reflect.get(createClient(), prop, receiver)
  }
})

// ============================================================================
// ROUTE HANDLER - For API Routes (service role key)
// ============================================================================
export function createRouteHandlerClient(): SupabaseClient<Database> {
  if (cachedRouteClient) return cachedRouteClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for API routes')
  }

  cachedRouteClient = createSupabaseClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  return cachedRouteClient
}

// ============================================================================
// MIDDLEWARE - For middleware (service role key)
// ============================================================================
export function createMiddlewareClient(): SupabaseClient<Database> {
  if (cachedMiddlewareClient) return cachedMiddlewareClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for middleware')
  }

  cachedMiddlewareClient = createSupabaseClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  return cachedMiddlewareClient
}

export default supabase
