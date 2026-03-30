/**
 * Supabase Server Client
 *
 * For use in Server Components, Server Actions, and API routes
 * Uses cookies for session management
 */

import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

/**
 * Server client for server-side operations
 * Use in: Server Components, Server Actions, API routes
 */
export function createServerClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined')
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined')
  }

  const cookieStore = cookies()

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Alias for createServerClient - used by API routes
 */
export const createClient = createServerClient

/**
 * Create API client that reads Authorization header
 * For use in API routes with Bearer token auth
 * Uses ANON_KEY to properly verify JWT tokens
 */
export async function createApiClient(authorizationHeader: string | null) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined')
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined')
  }

  const cookieStore = cookies()

  const supabase = createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore in API routes
          }
        },
      },
    }
  )

  // If Authorization header is present, set the session from token
  if (authorizationHeader?.startsWith('Bearer ')) {
    const token = authorizationHeader.substring(7)
    await supabase.auth.setSession({
      access_token: token,
      refresh_token: '',
    })
  }

  return supabase
}

/**
 * Get current user from server session
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  const supabase = createServerClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  // Get user profile with role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, role, student_code, department, faculty')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return null
  }

  return profile
}

/**
 * Check if user has required role
 * Use for route protection in Server Components
 */
export async function requireRole(requiredRole: 'student' | 'lecturer' | 'admin') {
  const user = await getCurrentUser()

  if (!user) {
    return { authorized: false, redirect: '/login' }
  }

  if (user.role !== requiredRole && user.role !== 'admin') {
    return { authorized: false, redirect: '/unauthorized' }
  }

  return { authorized: true, user }
}

/**
 * Get user's dashboard redirect URL based on role
 */
export function getDashboardUrl(role: string) {
  switch (role) {
    case 'student':
      return '/student'
    case 'lecturer':
      return '/lecturer'
    case 'admin':
      return '/admin'
    default:
      return '/'
  }
}
