/**
 * Server-side Role Guard
 * Protects API routes by user role
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export type UserRole = 'student' | 'lecturer' | 'admin'

export interface AuthenticatedRequest {
  userId: string
  email: string
  role: UserRole
  profile: any
}

/**
 * Guard for API routes - checks if user is authenticated and has required role
 *
 * Usage in API route:
 * export async function GET(request: NextRequest) {
 *   const auth = await requireAuthRole('lecturer')
 *   if (!auth.authorized) return auth.response
 *
 *   // auth.user contains the authenticated user info
 *   // ... your code here
 * }
 */
export async function requireAuthRole(
  requiredRole: UserRole | UserRole[]
): Promise<{ authorized: boolean; response?: NextResponse; user?: AuthenticatedRequest }> {
  const supabase = createServerClient()

  // Get auth user
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

  if (authError || !authUser) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  // Get user profile
  const { data: profile, error: profileError } = await (supabase
    .from('profiles') as any)
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (profileError || !profile) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Profile not found' }, { status: 404 }),
    }
  }

  const userRole = profile.role as UserRole
  const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]

  if (!allowedRoles.includes(userRole)) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return {
    authorized: true,
    user: {
      userId: authUser.id,
      email: profile.email,
      role: userRole,
      profile,
    },
  }
}

/**
 * Convenience guards for specific roles
 */
export async function requireStudent(): Promise<{ authorized: boolean; response?: NextResponse; user?: AuthenticatedRequest }> {
  return requireAuthRole('student')
}

export async function requireLecturer(): Promise<{ authorized: boolean; response?: NextResponse; user?: AuthenticatedRequest }> {
  return requireAuthRole('lecturer')
}

export async function requireAdmin(): Promise<{ authorized: boolean; response?: NextResponse; user?: AuthenticatedRequest }> {
  return requireAuthRole('admin')
}

/**
 * Guard that only checks authentication (any role)
 */
export async function requireAuth(): Promise<{ authorized: boolean; response?: NextResponse; user?: AuthenticatedRequest }> {
  const supabase = createServerClient()

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

  if (authError || !authUser) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const { data: profile, error: profileError } = await (supabase
    .from('profiles') as any)
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (profileError || !profile) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Profile not found' }, { status: 404 }),
    }
  }

  return {
    authorized: true,
    user: {
      userId: authUser.id,
      email: profile.email,
      role: profile.role as UserRole,
      profile,
    },
  }
}
