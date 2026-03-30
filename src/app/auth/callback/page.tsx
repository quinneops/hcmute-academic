'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { getAuthClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [isProcessing, setIsProcessing] = React.useState(true)

  React.useEffect(() => {
    const handleCallback = async () => {
      console.log('[AuthCallback] Page loaded')
      console.log('[AuthCallback] Current URL:', window.location.href)
      console.log('[AuthCallback] Hash fragment:', window.location.hash)

      // Parse the fragment manually since useSearchParams doesn't handle # fragments
      const hash = window.location.hash.substring(1) // Remove #
      const params = new URLSearchParams(hash)

      const code = params.get('code')
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const errorParam = params.get('error')
      const errorDescription = params.get('error_description')

      console.log('[AuthCallback] Parsed params:', {
        code,
        accessToken: accessToken ? 'present' : 'missing',
        refreshToken: refreshToken ? 'present' : 'missing',
        error: errorParam,
      })

      if (errorParam) {
        console.error('[AuthCallback] OAuth error:', errorParam, errorDescription)
        setError(`Lỗi: ${errorDescription || errorParam}`)
        setIsProcessing(false)
        setTimeout(() => router.push('/login'), 5000)
        return
      }

      // If we have access_token, set the session directly
      if (accessToken && refreshToken) {
        try {
          console.log('[AuthCallback] Setting session from token...')

          // Use auth client that uses localStorage
          const supabase = getAuthClient()

          // Set the session from the token
          const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (setSessionError) {
            console.error('[AuthCallback] Set session error:', setSessionError)
            throw setSessionError
          }

          console.log('[AuthCallback] Session set:', sessionData.session)
          console.log('[AuthCallback] LocalStorage keys:', Object.keys(localStorage))

          const user = sessionData.session?.user
          if (user) {
            // Ensure profile exists - call API route instead of management client
            const response = await fetch('/api/auth/create-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.id,
                email: user.email || '',
                fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
                avatarUrl: user.user_metadata?.avatar_url || null,
              }),
            })

            const result = await response.json()

            if (!response.ok) {
              throw new Error(result.error || 'Failed to create profile')
            }

            console.log('[AuthCallback] Profile check/created:', result)

            // Verify session is stored in localStorage
            const { data: { session } } = await supabase.auth.getSession()
            console.log('[AuthCallback] Final session check:', session)
            console.log('[AuthCallback] LocalStorage keys after getSession:', Object.keys(localStorage))

            // Wait for localStorage to persist
            await new Promise(resolve => setTimeout(resolve, 500))

            // Redirect based on role
            const role: 'student' | 'lecturer' | 'admin' = result.profile?.role || 'student'
            const targetUrl = role === 'lecturer' ? '/lecturer'
              : role === 'admin' ? '/admin'
              : '/student'

            console.log('[AuthCallback] Redirecting to:', targetUrl)
            window.location.href = targetUrl
          }
          return
        } catch (err: any) {
          console.error('[AuthCallback] Token error:', err)
          setError(err.message || 'Đăng nhập thất bại. Vui lòng thử lại.')
          setIsProcessing(false)
          setTimeout(() => router.push('/login'), 5000)
          return
        }
      }

      // If we have code, exchange it for session
      if (code) {
        try {
          console.log('[AuthCallback] Exchanging code for session...')

          // Use auth client that uses localStorage
          const supabase = getAuthClient()

          // Exchange the OAuth code for a session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

          if (exchangeError) {
            console.error('[AuthCallback] Exchange error:', exchangeError)
            throw exchangeError
          }

          console.log('[AuthCallback] Session obtained:', data.session)
          console.log('[AuthCallback] LocalStorage keys:', Object.keys(localStorage))

          // Ensure profile exists - call API route instead of management client
          if (data.session?.user) {
            const response = await fetch('/api/auth/create-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: data.session.user.id,
                email: data.session.user.email || '',
                fullName: data.session.user.user_metadata?.full_name || data.session.user.email?.split('@')[0] || '',
                avatarUrl: data.session.user.user_metadata?.avatar_url || null,
              }),
            })

            const result = await response.json()

            if (!response.ok) {
              throw new Error(result.error || 'Failed to create profile')
            }

            console.log('[AuthCallback] Profile check/created:', result)

            // Verify session is stored in localStorage
            const { data: { session } } = await supabase.auth.getSession()
            console.log('[AuthCallback] Final session check:', session)
            console.log('[AuthCallback] LocalStorage keys after getSession:', Object.keys(localStorage))

            // Wait for localStorage to persist
            await new Promise(resolve => setTimeout(resolve, 500))

            // Redirect based on role
            const role: 'student' | 'lecturer' | 'admin' = result.profile?.role || 'student'
            const targetUrl = role === 'lecturer' ? '/lecturer'
              : role === 'admin' ? '/admin'
              : '/student'

            console.log('[AuthCallback] Redirecting to:', targetUrl)
            window.location.href = targetUrl
          }
          return
        } catch (err: any) {
          console.error('[AuthCallback] Code exchange error:', err)
          setError(err.message || 'Đăng nhập thất bại. Vui lòng thử lại.')
          setIsProcessing(false)
          setTimeout(() => router.push('/login'), 5000)
          return
        }
      }

      // No code or token found
      console.error('[AuthCallback] No code or token in URL')
      setError('Mã xác thực không hợp lệ. Vui lòng đăng nhập lại.')
      setIsProcessing(false)
      setTimeout(() => router.push('/login'), 3000)
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-secondary text-sm">Đang xử lý đăng nhập...</p>
        {error && (
          <p className="text-error text-sm mt-4">{error}</p>
        )}
      </div>
    </div>
  )
}
