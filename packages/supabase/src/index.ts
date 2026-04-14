export {
  supabase,
  createClient,
  createRouteHandlerClient,
  createMiddlewareClient,
  default as supabaseClient
} from './client'
export { SupabaseAuth } from './auth'
export { SupabaseRealtime, type RealtimeEvent, type TableName } from './realtime'
export { SupabaseStorage } from './storage'
export type { Database, Tables, Enums, Json } from './types'

// Only import server-side exports in server contexts
// export { supabaseServer, default as supabaseServerClient } from './server'
