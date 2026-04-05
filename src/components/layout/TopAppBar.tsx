'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/supabase/auth'

interface TopAppBarProps {
  pageTitle?: string
  breadcrumb?: { label: string; href?: string }[]
  user?: {
    name: string
    email: string
    avatar?: string
  }
  onSearch?: (query: string) => void
  onMenuClick?: () => void
  notifications?: number
  className?: string
}

export function TopAppBar({
  pageTitle,
  breadcrumb,
  user,
  onSearch,
  onMenuClick,
  notifications = 0,
  className,
}: TopAppBarProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState('')

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onSearch?.(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, onSearch])

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (err: any) {
      console.error('Logout error:', err)
    }
  }

  return (
    <header className={cn(
      "sticky top-0 w-full z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant/15 shadow-ambient-sm",
      className
    )}>
      <div className="flex justify-between items-center px-4 sm:px-6 lg:px-8 py-3 sm:py-4 max-w-7xl mx-auto gap-3">
        {/* Left: Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
            aria-label="Mở menu điều hướng"
          >
            <span className="material-symbols-outlined">menu</span>
          </Button>

          {breadcrumb && breadcrumb.length > 0 && (
            <nav className="hidden sm:flex items-center gap-2 text-sm text-secondary min-w-0">
              {breadcrumb.map((item, index) => (
                <React.Fragment key={item.label}>
                  {index > 0 && (
                    <span className="material-symbols-outlined text-[14px] text-outline-variant">
                      chevron_right
                    </span>
                  )}
                  {item.href ? (
                    <a
                      href={item.href}
                      className="hover:text-primary transition-colors"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <span className="text-primary font-semibold">{item.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}

          {breadcrumb && breadcrumb.length > 0 && (
            <p className="sm:hidden text-sm font-semibold text-primary truncate">
              {breadcrumb[breadcrumb.length - 1]?.label}
            </p>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-4 shrink-0">
          {/* Search */}
          {onSearch && (
            <div className="relative hidden md:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm..."
                className="pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-full text-sm w-64 focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline/60"
              />
            </div>
          )}

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <span className="material-symbols-outlined">notifications</span>
            {notifications > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full" />
            )}
          </Button>

          {/* Help */}
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
            <span className="material-symbols-outlined">help_outline</span>
          </Button>

          {/* User Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar} alt={user.name || 'User'} />
                    <AvatarFallback className="bg-[#002068] text-white font-bold">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name || 'Người dùng'}</p>
                    <p className="text-xs leading-none text-secondary">{user.email || 'No email'}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <span className="material-symbols-outlined mr-2 text-sm">person</span>
                  Hồ sơ
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span className="material-symbols-outlined mr-2 text-sm">settings</span>
                  Cài đặt
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span className="material-symbols-outlined mr-2 text-sm">help</span>
                  Hỗ trợ
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-error" onClick={handleLogout}>
                  <span className="material-symbols-outlined mr-2 text-sm">logout</span>
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
