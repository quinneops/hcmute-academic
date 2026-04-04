/**
 * Use Auth User Hook
 * Returns current user info including role (student/lecturer/admin)
 */

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'

export type UserRole = 'student' | 'lecturer' | 'admin' | null

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  student_code: string | null
  lecturer_code: string | null
  department: string | null
  faculty: string | null
  is_active: boolean
  is_tbm: boolean
  is_secretary: boolean
}

export function useAuthUser() {
  const [user, setUser] = React.useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchUser = React.useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const supabase = createClient()

      // Get auth session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        setUser(null)
        return
      }

      // Get user profile from database
      const { data: profile, error: profileError } = await (supabase
        .from('profiles') as any)
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profileError || !profile) {
        console.error('Profile fetch error:', profileError)
        setUser(null)
        return
      }

      setUser({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        role: profile.role as UserRole,
        student_code: profile.student_code,
        lecturer_code: profile.lecturer_code,
        department: profile.department,
        faculty: profile.faculty,
        is_active: profile.is_active,
        is_tbm: !!profile.is_tbm,
        is_secretary: !!profile.is_secretary,
      })
    } catch (err: any) {
      console.error('Fetch user error:', err)
      setError(err.message || 'Không thể tải thông tin user')
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchUser()
  }, [fetchUser])

  return {
    user,
    isLoading,
    error,
    isStudent: user?.role === 'student',
    isLecturer: user?.role === 'lecturer',
    isAdmin: user?.role === 'admin',
    isAuthenticated: !!user,
    refresh: fetchUser,
  }
}
