/**
 * With Role Check HOC
 * Protects pages by user role - redirects if user doesn't have required role
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useAuthUser, UserRole } from '@/hooks/use-auth-user'
import { getDashboardUrl } from '@/lib/auth-config'

interface WithRoleCheckOptions {
  requiredRole: UserRole | UserRole[] // Single role or array of roles
  redirectPath?: string // Custom redirect path (defaults to role's dashboard)
  loadingComponent?: React.ReactNode // Custom loading component
}

export function withRoleCheck<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithRoleCheckOptions
) {
  return function WithRoleCheckComponent(props: P) {
    const router = useRouter()
    const { user, isLoading, isAuthenticated } = useAuthUser()
    const [isChecking, setIsChecking] = React.useState(true)

    const {
      requiredRole,
      redirectPath,
      loadingComponent,
    } = options

    React.useEffect(() => {
      if (!isLoading && user) {
        setIsChecking(false)

        // Check if user has required role
        const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]

        if (!allowedRoles.includes(user.role)) {
          // Redirect to appropriate dashboard
          const targetPath = redirectPath || getDashboardUrl(user.role)
          router.replace(targetPath)
        }
      } else if (!isLoading && !isAuthenticated) {
        // Not authenticated - redirect to login
        setIsChecking(false)
        router.replace('/login')
      }
    }, [isLoading, isAuthenticated, user, router, requiredRole, redirectPath])

    // Show loading state
    if (isLoading || isChecking) {
      if (loadingComponent) {
        return <>{loadingComponent}</>
      }

      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )
    }

    // Check if user has required role
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]

    if (!user || !allowedRoles.includes(user.role)) {
      return null
    }

    // Render the wrapped component
    return <WrappedComponent {...props} />
  }
}

/**
 * Convenience wrappers for common role checks
 */
export function withStudent<P extends object>(component: React.ComponentType<P>) {
  return withRoleCheck(component, { requiredRole: 'student' })
}

export function withLecturer<P extends object>(component: React.ComponentType<P>) {
  return withRoleCheck(component, { requiredRole: 'lecturer' })
}

export function withAdmin<P extends object>(component: React.ComponentType<P>) {
  return withRoleCheck(component, { requiredRole: 'admin' })
}
