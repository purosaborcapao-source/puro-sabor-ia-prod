import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Singleton caches
let cachedClient: SupabaseClient<Database> | null = null
let cachedRouteClient: SupabaseClient<Database> | null = null
let cachedMiddlewareClient: SupabaseClient<Database> | null = null

// ============================================================================
// CLIENT - For browser/frontend (anon key)
// ============================================================================
export function createClient(): SupabaseClient<Database> {
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

export const supabase = createClient()

// ============================================================================
// ROUTE HANDLER - For API Routes (service role key)
// ============================================================================
export function createRouteHandlerClient(): SupabaseClient<Database> {
  if (cachedRouteClient) return cachedRouteClient

  if (!supabaseServiceRoleKey) {
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

  if (!supabaseServiceRoleKey) {
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
