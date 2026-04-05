'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn, getURL } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { getAuthClient } from '@/lib/supabase/client'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [devEmail, setDevEmail] = React.useState('')
  const [devRole, setDevRole] = React.useState<'student' | 'lecturer' | 'admin'>('student')
  const [showDevMode, setShowDevMode] = React.useState(false)

  // Keyboard shortcut to toggle Dev Mode (Ctrl+Shift+D or Cmd+Shift+D)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        setShowDevMode(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (session) {
          // User is already logged in, get their role and redirect
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

          const role: 'student' | 'lecturer' | 'admin' | undefined = (profile as any)?.role
          if (role === 'student') {
            router.push('/student')
          } else if (role === 'lecturer') {
            router.push('/lecturer')
          } else if (role === 'admin') {
            router.push('/admin')
          }
        }
      } catch (err) {
        console.error('Session check error:', err)
      }
    }

    checkSession()
  }, [router])

  // Handle OAuth callback with session already established
  useEffect(() => {
    const handleAuthCallback = async () => {
      const errorParam = searchParams.get('error')

      if (errorParam) {
        setError('Đăng nhập thất bại. Vui lòng thử lại.')
        return
      }

      // Check if we have a session (user just logged in via OAuth callback)
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

          const role: 'student' | 'lecturer' | 'admin' | undefined = (profile as any)?.role
          if (role === 'student') {
            router.push('/student')
          } else if (role === 'lecturer') {
            router.push('/lecturer')
          } else if (role === 'admin') {
            router.push('/admin')
          }
        }
      } catch (err) {
        console.error('Auth callback handling error:', err)
      }
    }
    handleAuthCallback()
  }, [searchParams, router])

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Use auth client that uses localStorage for session persistence
      const supabase = getAuthClient()

      console.log('[GoogleLogin] Starting OAuth flow...')

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${getURL()}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        console.error('Google OAuth error:', error)
        setError('Không thể kết nối với máy chủ xác thực. Vui lòng thử lại.')
        setIsLoading(false)
      } else {
        console.log('[GoogleLogin] Redirecting to Google OAuth:', data.url)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Không thể kết nối với máy chủ xác thực. Vui lòng thử lại.')
      setIsLoading(false)
    }
  }

  // Dev mode login - bypass Google OAuth for testing
  const handleDevLogin = async () => {
    if (!devEmail.trim()) {
      setError('Vui lòng nhập email Gmail')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Use auth client that uses localStorage for session
      const supabase = getAuthClient()

      console.log('[DevLogin] Starting login for:', devEmail)

      // First, try to sign in with password
      let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: devEmail.trim(),
        password: 'password123', // Default password for dev
      })

      console.log('[DevLogin] SignIn result:', { data: signInData, error: signInError })

      if (signInError) {
        // If user doesn't exist, sign up
        if (signInError.status === 404 || signInError.message.includes('Invalid login credentials')) {
          console.log('[DevLogin] User not found, signing up...')
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: devEmail.trim(),
            password: 'password123',
            options: {
              data: {
                full_name: devEmail.split('@')[0],
              },
            },
          })

          console.log('[DevLogin] SignUp result:', { data: signUpData, error: signUpError })

          if (signUpError) {
            // If user already registered (422), just try to sign in again
            if (signUpError.message.includes('User already registered')) {
              console.log('[DevLogin] User already registered, signing in...')
              const signInResult = await supabase.auth.signInWithPassword({
                email: devEmail.trim(),
                password: 'password123',
              })
              if (signInResult.error) throw signInResult.error
              signInData = signInResult.data
            } else {
              throw signUpError
            }
          } else if (signUpData?.user) {
            // New signup - create profile
            const managementClient = createClient()
            await ensureProfileExists(managementClient, signUpData.user.id, devEmail.trim(), devRole)
            // Sign in to get session
            console.log('[DevLogin] After signup, signing in...')
            const signInResult = await supabase.auth.signInWithPassword({
              email: devEmail.trim(),
              password: 'password123',
            })
            if (signInResult.error) throw signInResult.error
            signInData = signInResult.data
          }
        } else {
          throw signInError
        }
      }

      // Ensure profile exists for successful sign-in
      if (signInData?.user) {
        const managementClient = createClient()
        await ensureProfileExists(managementClient, signInData.user.id, devEmail.trim(), devRole)
      }

      // Verify session is stored in localStorage
      console.log('[DevLogin] Before getSession - localStorage keys:', Object.keys(localStorage))
      console.log('[DevLogin] Before getSession - raw storage:', {
        'sb-hhqwraokxkynkmushugf-auth-token': localStorage.getItem('sb-hhqwraokxkynkmushugf-auth-token'),
      })

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('[DevLogin] Final session check:', session)
      console.log('[DevLogin] Session error:', sessionError)
      console.log('[DevLogin] After getSession - localStorage keys:', Object.keys(localStorage))
      console.log('[DevLogin] After getSession - raw storage:', {
        'sb-hhqwraokxkynkmushugf-auth-token': localStorage.getItem('sb-hhqwraokxkynkmushugf-auth-token'),
      })

      // Wait for localStorage to persist
      await new Promise(resolve => setTimeout(resolve, 500))

      // Redirect based on role
      if (devRole === 'student') {
        window.location.href = '/student'
      } else if (devRole === 'lecturer') {
        window.location.href = '/lecturer'
      } else if (devRole === 'admin') {
        window.location.href = '/admin'
      }
    } catch (err: any) {
      console.error('Dev login error:', err)
      setError(err.message || 'Đăng nhập thất bại. Vui lòng thử lại.')
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to ensure profile exists
  const ensureProfileExists = async (supabase: any, userId: string, email: string, role: 'student' | 'lecturer' | 'admin') => {
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .single()

    if (!existingProfile) {
      // Create profile with selected role
      await supabase.from('profiles').insert({
        id: userId,
        email: email,
        full_name: email.split('@')[0],
        role: role,
        student_code: role === 'student' ? '2111' + Math.floor(Math.random() * 9000 + 1000) : null,
        is_active: true,
      } as any)
    } else if (existingProfile.role !== role) {
      // Update role if different
      await supabase.from('profiles').update({ role }).eq('id', userId)
    }
  }

  return (
    <div className="min-h-screen bg-mesh flex flex-col">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-outline-variant/15">
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <img
              src="/logos/hcmcute-logo.png"
              alt="HCMCUTE Logo"
              className="w-16 h-16 object-contain"
            />
            <div>
              <h1 className="text-sm font-headline font-bold text-primary tracking-wider uppercase">
                TRƯỜNG ĐẠI HỌC CÔNG NGHỆ KỸ THUẬT TP.HCM
              </h1>
              <p className="text-[10px] text-secondary uppercase tracking-[0.2em]">
                Hệ thống Quản lý Khóa luận
              </p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-4">
            <button className="text-secondary hover:text-primary transition-colors flex items-center gap-1 text-xs font-medium">
              <span className="material-symbols-outlined text-sm">language</span>
              Tiếng Việt
            </button>
            <button className="text-secondary hover:text-primary transition-colors flex items-center gap-1 text-xs font-medium">
              <span className="material-symbols-outlined text-sm">help_outline</span>
              Hỗ trợ
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center px-4 py-24">
        <div className="w-full max-w-[480px]">
          {/* Login Card */}
          <div className="bg-surface-container-lowest rounded-xl shadow-ambient-xl overflow-hidden">
            <div className="p-8 md:p-12">
              {/* Title */}
              <div className="text-center mb-10">
                <h2 className="font-headline text-primary text-xs font-extrabold tracking-[0.2em] mb-3 opacity-80">
                  CỔNG THÔNG TIN ĐÀO TẠO
                </h2>
                <h3 className="font-headline text-3xl font-bold text-on-surface tracking-tight">
                  ĐĂNG NHẬP
                </h3>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-error-container text-error-container rounded-lg flex items-start gap-3">
                  <span className="material-symbols-outlined text-sm mt-0.5">error</span>
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              {/* Google Login Button */}
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className={cn(
                  "w-full bg-white border border-outline-variant/30 hover:bg-surface-container-low text-on-surface font-body font-medium py-4 rounded-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98]",
                  isLoading && "opacity-70 cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                <span>Đăng nhập với Google</span>
              </button>

              {/* Divider */}
              <div className="my-6 flex items-center gap-3">
                <div className="flex-1 h-px bg-outline-variant/20" />
                <span className="text-xs text-secondary uppercase tracking-wider">Hoặc</span>
                <div className="flex-1 h-px bg-outline-variant/20" />
              </div>

              {/* Dev Mode Login - Hidden by default, press Ctrl+Shift+D to toggle */}
              {showDevMode && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-600 text-sm">code</span>
                      <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">Dev Mode (Test)</p>
                    </div>
                    <button
                      onClick={() => setShowDevMode(false)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                  <p className="text-xs text-blue-700 mb-3">
                    Nhập Gmail bất kỳ - chọn vai trò để test
                  </p>

                  {/* Role Selection */}
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setDevRole('student')}
                      className={cn(
                        "flex-1 py-2 px-3 rounded text-xs font-medium transition-all border",
                        devRole === 'student'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-600 border-slate-300 hover:border-emerald-400'
                      )}
                    >
                      <span className="material-symbols-outlined text-xs mr-1">school</span>
                      Sinh viên
                    </button>
                    <button
                      onClick={() => setDevRole('lecturer')}
                      className={cn(
                        "flex-1 py-2 px-3 rounded text-xs font-medium transition-all border",
                        devRole === 'lecturer'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                      )}
                    >
                      <span className="material-symbols-outlined text-xs mr-1">menu_book</span>
                      Giảng viên
                    </button>
                    <button
                      onClick={() => setDevRole('admin')}
                      className={cn(
                        "flex-1 py-2 px-3 rounded text-xs font-medium transition-all border",
                        devRole === 'admin'
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-slate-600 border-slate-300 hover:border-purple-400'
                      )}
                    >
                      <span className="material-symbols-outlined text-xs mr-1">admin_panel_settings</span>
                      Admin
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="yourname@gmail.com"
                      value={devEmail}
                      onChange={(e) => setDevEmail(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyDown={(e) => e.key === 'Enter' && handleDevLogin()}
                    />
                    <Button
                      onClick={handleDevLogin}
                      disabled={isLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium whitespace-nowrap"
                    >
                      {isLoading ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-xs mr-1">login</span>
                          Vào
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-[10px] text-blue-600 mt-2">
                    🔐 Mật khẩu mặc định: password123
                  </p>
                </div>
              )}

              {/* Guidance Footer */}
              <div className="mt-6 flex justify-center">
                <a
                  href="/login-guide"
                  className="text-sm text-secondary hover:text-primary transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">info</span>
                  Hướng dẫn đăng nhập
                </a>
              </div>
            </div>
          </div>

          {/* Security Tip */}
          <div className="mt-8 flex items-start gap-3 px-4 py-3 bg-secondary-container/30 rounded-lg">
            <span className="material-symbols-outlined text-secondary text-xl mt-0.5">
              verified_user
            </span>
            <p className="text-xs text-on-secondary-container leading-relaxed">
              Đây là hệ thống xác thực tập trung. Luôn kiểm tra địa chỉ URL trước khi nhập mật khẩu.
              Tuyệt đối không cung cấp thông tin tài khoản cho bất kỳ ai.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 mt-auto border-t border-outline-variant/15 bg-white/40">
        <div className="max-w-7xl mx-auto px-12 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div className="space-y-1">
            <p className="text-xs font-body font-medium text-on-surface">
              © 2024 Trường Đại học Công nghệ Kỹ thuật TP.HCM (HCMCUTE)
            </p>
            <p className="text-[10px] text-secondary uppercase tracking-wider">
              Hệ thống Quản lý Khóa luận tốt nghiệp
            </p>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-secondary hover:text-primary transition-colors">
              Hướng dẫn sử dụng
            </a>
            <a href="#" className="text-xs text-secondary hover:text-primary transition-colors">
              Chính sách bảo mật
            </a>
            <a href="#" className="text-xs text-secondary hover:text-primary transition-colors">
              Liên hệ hỗ trợ
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
