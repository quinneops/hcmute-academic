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
  return (
    <div className="min-h-screen bg-surface">
      {/* Side Navigation */}
      <SideNavBar
        role={role}
        isTbm={isTbm}
        userName={user?.name}
        userAvatar={user?.avatar}
      />

      {/* Main Content Area */}
      <div className="ml-64">
        {/* Top App Bar */}
        <TopAppBar
          pageTitle={pageTitle}
          breadcrumb={breadcrumb}
          user={user}
          onSearch={onSearch}
          notifications={notifications}
        />

        {/* Page Content */}
        <main className={cn(
          "p-12 max-w-7xl mx-auto",
          "min-h-[calc(100vh-4rem)]",
          className
        )}>
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-outline-variant/10 bg-surface-container-lowest py-8 px-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-secondary">
            <p>© 2024 Ho Chi Minh City University of Technology and Education (HCMCUTE)</p>
            <div className="flex gap-6">
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
