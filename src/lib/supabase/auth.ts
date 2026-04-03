/**
 * Supabase Auth Functions
 * Uses localStorage-based client for session persistence
 */

import { Database } from '@/types/database'
import { getAuthClient } from './client'

/**
 * Helper to check if a user is authenticated
 */
export async function checkAuth() {
  const supabase = getAuthClient()

  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) {
    return { isAuthenticated: false, user: null, session: null }
  }

  // Get user profile with role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, role, student_code, department')
    .eq('id', session.user.id)
    .single()

  if (profileError || !profile) {
    return { isAuthenticated: false, user: null, session }
  }

  return {
    isAuthenticated: true,
    user: profile,
    session,
  }
}

/**
 * Sign in with Google OAuth
 * Redirects to Google, then to callback URL
 */
export async function signInWithGoogle() {
  const supabase = getAuthClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `http://localhost:3001/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) {
    throw error
  }

  return data
}

/**
 * Sign out current user
 */
export async function signOut() {
  const supabase = getAuthClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Get user's role from profile
 * Use for role-based UI rendering
 */
export async function getUserRole(userId: string) {
  const supabase = getAuthClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return null
  }

  const profile = data as { role: 'student' | 'lecturer' | 'admin' }
  return profile.role
}
