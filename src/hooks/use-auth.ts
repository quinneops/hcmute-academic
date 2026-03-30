/**
 * Authentication Hook
 * Provides authentication state and actions
 */

import { getAuthClient } from '@/lib/supabase/client'
import * as React from 'react'

export interface User {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
}

export function useAuth() {
  const [user, setUser] = React.useState<User | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const supabase = getAuthClient()

    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name,
            avatar_url: session.user.user_metadata?.avatar_url,
          })
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name,
          avatar_url: session.user.user_metadata?.avatar_url,
        })
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const supabase = getAuthClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    const supabase = getAuthClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    })
    if (error) throw error
  }

  const signOut = async () => {
    const supabase = getAuthClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return {
    user,
    isLoading,
    error,
    signIn,
    signUp,
    signOut,
  }
}
