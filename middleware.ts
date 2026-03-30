/**
 * Next.js Middleware for Authentication & Role-Based Access
 *
 * - Protects authenticated routes (/student, /lecturer, /admin)
 * - Redirects based on user role after login
 * - Refreshes session tokens
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public routes that don't require authentication
const publicRoutes = ['/login', '/login-guide', '/support', '/privacy']

// Route to role mapping
const roleRoutes = {
  student: '/student',
  lecturer: '/lecturer',
  admin: '/admin',
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          })
        },
      },
    }
  )

  // Refresh session if expired
  const { data: { user }, error } = await supabase.auth.getUser()

  // Check if route is public
  const isPublicRoute = publicRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Handle public routes
  if (isPublicRoute) {
    // If user is already logged in and visiting login page, redirect to dashboard
    if (request.nextUrl.pathname === '/login' && user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const role = profile?.role as keyof typeof roleRoutes
      if (role && roleRoutes[role]) {
        return NextResponse.redirect(new URL(roleRoutes[role], request.url))
      }
    }
    return response
  }

  // Handle auth callback
  if (request.nextUrl.pathname === '/auth/callback') {
    return response
  }

  // Protected routes: require authentication
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  // Check if account is active
  if (!profile?.is_active) {
    // Sign out inactive users
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const userRole = profile?.role as keyof typeof roleRoutes

  // Check role-based access
  const protectedRouteMatch = request.nextUrl.pathname.match(/^\/(student|lecturer|admin)/)

  if (protectedRouteMatch) {
    const routeRole = protectedRouteMatch[1] as keyof typeof roleRoutes

    // User can only access their own role routes (admins can access all)
    if (userRole !== routeRole && userRole !== 'admin') {
      // Redirect to their own dashboard
      return NextResponse.redirect(new URL(roleRoutes[userRole], request.url))
    }
  }

  // Root path: redirect to role-specific dashboard
  if (request.nextUrl.pathname === '/') {
    if (userRole && roleRoutes[userRole]) {
      return NextResponse.redirect(new URL(roleRoutes[userRole], request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
