/**
 * Supabase Management Client
 * Uses service role key for bypassing RLS
 * DO NOT use in client components - only in server-side code or edge functions
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

let supabaseManagementClient: ReturnType<typeof createSupabaseClient> | null = null

/**
 * Create management client with service role key
 * This bypasses RLS policies - use only for admin operations
 */
export function createClient() {
  if (supabaseManagementClient) return supabaseManagementClient

  supabaseManagementClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  return supabaseManagementClient
}
