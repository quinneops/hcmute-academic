'use client'

import * as React from 'react'
import { SideNavBar } from './SideNavBar'
import { TopAppBar } from './TopAppBar'
import { cn } from '@/lib/utils'

interface ShellProps {
  role: 'student' | 'lecturer' | 'admin'
  isTbm?: boolean
  user?: {
    name: string
    email: string
    avatar?: string
    is_tbm?: boolean
    is_secretary?: boolean
  }
  pageTitle?: string
  breadcrumb?: { label: string; href?: string }[]
  children: React.ReactNode
  className?: string
  onSearch?: (query: string) => void
  notifications?: number
}

/**
 * Shell Component - Main application layout
 *
 * Provides the standard layout structure for all authenticated pages:
 * - Fixed SideNavBar (left, 256px)
 * - Fixed TopAppBar (top, with backdrop blur)
 * - Scrollable main content area (with proper margins)
 *
 * Design Principles:
 * - No-Line Rule: Borders replaced with tonal transitions
 * - Layered Surface: Content sits on surface-container-low
 * - Editorial Spacing: 12 (3rem) / 16 (4rem) page margins
 */
export function Shell({
  role,
  isTbm,
  user,
  pageTitle,
  breadcrumb = [],
  children,
  className,
  onSearch,
  notifications = 0,
}: ShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)

  React.useEffect(() => {
    if (!mobileNavOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [mobileNavOpen])

  return (
    <div className="min-h-screen bg-surface">
      {/* Desktop Side Navigation */}
      <SideNavBar
        role={role}
        isTbm={isTbm}
        userName={user?.name}
        userAvatar={user?.avatar}
        is_tbm={user?.is_tbm}
        is_secretary={user?.is_secretary}
      />

      {/* Mobile Side Navigation */}
      <SideNavBar
        role={role}
        userName={user?.name}
        userAvatar={user?.avatar}
        is_tbm={user?.is_tbm}
        is_secretary={user?.is_secretary}
        mobile
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* Mobile Overlay */}
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Đóng menu điều hướng"
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="lg:ml-64">
        {/* Top App Bar */}
        <TopAppBar
          pageTitle={pageTitle}
          breadcrumb={breadcrumb}
          user={user}
          onSearch={onSearch}
          onMenuClick={() => setMobileNavOpen(true)}
          notifications={notifications}
        />

        {/* Page Content */}
        <main className={cn(
          "p-4 sm:p-6 lg:p-12 max-w-7xl mx-auto",
          "min-h-[calc(100vh-4rem)]",
          className
        )}>
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-outline-variant/10 bg-surface-container-lowest py-6 sm:py-8 px-4 sm:px-6 lg:px-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-secondary">
            <p>© 2024 Ho Chi Minh City University of Technology and Education (HCMCUTE)</p>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              <a href="#" className="hover:text-primary transition-colors">Hướng dẫn</a>
              <a href="#" className="hover:text-primary transition-colors">Hỗ trợ</a>
              <a href="#" className="hover:text-primary transition-colors">Bảo mật</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
