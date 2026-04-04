'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavItem {
  icon: string
  label: string
  href: string
  badge?: number
}

interface SideNavBarProps {
  role: 'student' | 'lecturer' | 'admin'
  userName?: string
  userAvatar?: string
  onLogout?: () => void
  mobile?: boolean
  isOpen?: boolean
  onClose?: () => void
}

const studentNavItems: NavItem[] = [
  { icon: 'dashboard', label: 'Bảng điều khiển', href: '/student' },
  { icon: 'lightbulb', label: 'Đề tài gợi ý', href: '/student/proposals' },
  { icon: 'how_to_reg', label: 'Đăng ký', href: '/student/registration' },
  { icon: 'trending_up', label: 'Tiến độ', href: '/student/submissions' },
  // { icon: 'folder_open', label: 'Tài liệu', href: '/student/documents' },
  { icon: 'forum', label: 'Phản hồi', href: '/student/feedback' },
  { icon: 'calendar_month', label: 'Lịch hẹn', href: '/student/appointments' },
  { icon: 'auto_awesome', label: 'Trợ lý AI', href: '/student/ai' },
  { icon: 'notifications', label: 'Thông báo', href: '/student/notifications' },
];

const lecturerNavItems: NavItem[] = [
  { icon: 'dashboard', label: 'Bảng điều khiển', href: '/lecturer' },
  { icon: 'groups', label: 'Sinh viên', href: '/lecturer/students' },
  { icon: 'grading', label: 'Chấm điểm', href: '/lecturer/grading' },
  { icon: 'assignment', label: 'Đề tài', href: '/lecturer/proposals' },
  { icon: 'event', label: 'Lịch bảo vệ', href: '/lecturer/schedule' },
  { icon: 'forum', label: 'Phản hồi', href: '/lecturer/feedback' },
  { icon: 'calendar_month', label: 'Lịch hẹn', href: '/lecturer/appointments' },
  { icon: 'auto_awesome', label: 'Trợ lý AI', href: '/lecturer/ai' },
];

const adminNavItems: NavItem[] = [
  { icon: 'dashboard', label: 'Bảng điều khiển', href: '/admin' },
  { icon: 'people', label: 'Người dùng', href: '/admin/users' },
  { icon: 'school', label: 'Khóa luận', href: '/admin/theses' },
  { icon: 'groups', label: 'Hội đồng', href: '/admin/councils' },
  { icon: 'schedule', label: 'Lịch biểu', href: '/admin/schedule' },
  { icon: 'assessment', label: 'Báo cáo', href: '/admin/reports' },
]

export function SideNavBar({
  role,
  userName,
  userAvatar,
  onLogout,
  mobile = false,
  isOpen = false,
  onClose,
}: SideNavBarProps) {
  const pathname = usePathname()

  const navItems = role === 'student'
    ? studentNavItems
    : role === 'lecturer'
    ? lecturerNavItems
    : adminNavItems

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen w-64 bg-surface-container-low border-r border-outline-variant/10 flex flex-col z-50 transition-transform duration-300",
        mobile
          ? (isOpen ? "translate-x-0" : "-translate-x-full")
          : "hidden lg:flex"
      )}
      aria-hidden={mobile ? !isOpen : undefined}
    >
      {/* Brand Header */}
      <div className="px-6 py-6 mb-4">
        <div className="flex items-center gap-3">
          <img
            src="/logos/hcmcute-logo.png"
            alt="HCMCUTE Logo"
            className="w-10 h-10 object-contain"
          />
          <div>
            <h1 className="font-headline font-bold text-sm text-primary leading-tight">
              HCMCUTE
            </h1>
            <p className="text-[10px] text-secondary uppercase tracking-widest">
              Thesis Management
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => mobile && onClose?.()}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-surface-container-lowest text-primary shadow-ambient-sm font-semibold translate-x-1"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-primary hover:translate-x-0.5"
              )}
            >
              <span className="material-symbols-outlined text-base">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="px-2 py-0.5 bg-primary text-on-primary text-[10px] font-bold rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Profile - Link to Profile Page */}
      <Link
        href={role === 'student' ? '/student/profile' : role === 'lecturer' ? '/lecturer/profile' : '/admin/profile'}
        className="block px-4 py-4 border-t border-outline-variant/15"
        onClick={() => mobile && onClose?.()}
      >
        <div className="flex items-center gap-3 p-3 bg-surface-container-lowest rounded-lg shadow-ambient-sm hover:bg-surface-container-high transition-colors">
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-white font-bold text-sm">
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className="w-full h-full object-cover rounded-full" />
            ) : (
              userName?.[0]?.toUpperCase() || 'U'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-on-surface truncate">
              {userName || 'User'}
            </p>
            <p className="text-[10px] text-secondary uppercase tracking-wider">
              {role === 'student' ? 'Sinh viên' : role === 'lecturer' ? 'Giảng viên' : 'Admin'}
            </p>
          </div>
          <span className="material-symbols-outlined text-sm text-secondary">chevron_right</span>
        </div>
      </Link>
    </aside>
  )
}
