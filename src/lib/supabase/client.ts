/**
 * Supabase Auth Client for Browser
 * Uses localStorage for session persistence
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

let supabaseAuthClient: ReturnType<typeof createSupabaseClient> | null = null

// localStorage wrapper that works in SSR
const localStorageStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(key)
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(key, value)
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(key)
  },
}

/**
 * Get auth client that uses localStorage
 * This is for dev mode login where cookies might not work
 */
export function getAuthClient() {
  if (supabaseAuthClient) return supabaseAuthClient

  supabaseAuthClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage: localStorageStorage,
      },
    }
  )

  return supabaseAuthClient
}

/**
 * Create browser client - alias for getAuthClient()
 * Used by useAuthUser hook and other client-side code
 */
export function createClient() {
  return getAuthClient()
}
