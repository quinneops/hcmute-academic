/**
 * Auth Utils
 * Helper functions to check user role and permissions
 */

import { createClient } from '@/lib/supabase/client'
import { createServerClient } from '@/lib/supabase/server'
import { UserRole } from './auth-config'

export { getDashboardUrl, getNavLinks } from '@/lib/auth-config'

/**
 * Check if current user is a lecturer (client-side)
 */
export async function checkIsLecturer(): Promise<boolean> {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) return false

  const { data: profile } = await (supabase
    .from('profiles') as any)
    .select('role')
    .eq('id', session.user.id)
    .single()

  return profile?.role === 'lecturer'
}

/**
 * Check if current user is a student (client-side)
 */
export async function checkIsStudent(): Promise<boolean> {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) return false

  const { data: profile } = await (supabase
    .from('profiles') as any)
    .select('role')
    .eq('id', session.user.id)
    .single()

  return profile?.role === 'student'
}

/**
 * Get current user role (client-side)
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) return null

  const { data: profile } = await (supabase
    .from('profiles') as any)
    .select('role')
    .eq('id', session.user.id)
    .single()

  return profile?.role as UserRole | null
}

/**
 * Check if current user is a lecturer (server-side)
 */
export async function checkIsLecturerServer(): Promise<boolean> {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return false

  const { data: profile } = await (supabase
    .from('profiles') as any)
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'lecturer'
}

/**
 * Check if current user is a student (server-side)
 */
export async function checkIsStudentServer(): Promise<boolean> {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return false

  const { data: profile } = await (supabase
    .from('profiles') as any)
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'student'
}

/**
 * Get current user role (server-side)
 */
export async function getCurrentUserRoleServer(): Promise<UserRole | null> {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await (supabase
    .from('profiles') as any)
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role as UserRole | null
}

// Re-export getDashboardUrl and getNavLinks from auth-config
