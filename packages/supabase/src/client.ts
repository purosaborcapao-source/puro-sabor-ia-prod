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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set')
  }

  if (cachedClient) return cachedClient
  cachedClient = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  })
  return cachedClient
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
