'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useStudentNotifications } from '@/hooks/student/use-student-notifications'
import { useStudentProfile } from '@/hooks/student/use-student-profile'
import { getAuthClient } from '@/lib/supabase/client'

const typeIcons: Record<string, string> = {
  deadline: 'schedule',
  feedback: 'feedback',
  academic: 'school',
  system: 'notifications',
  announcement: 'campaign',
  submission: 'assignment',
}

const typeColors: Record<string, string> = {
  deadline: 'bg-red-50 text-red-600',
  feedback: 'bg-blue-50 text-blue-600',
  academic: 'bg-emerald-50 text-emerald-600',
  system: 'bg-slate-100 text-slate-600',
  announcement: 'bg-amber-50 text-amber-600',
  submission: 'bg-purple-50 text-purple-600',
}

export default function NotificationsPage() {
  const [userId, setUserId] = React.useState<string | null>(null)
  const [filter, setFilter] = React.useState<'all' | 'unread' | 'read'>('all')

  React.useEffect(() => {
    const getUser = async () => {
      const supabase = getAuthClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUserId(session.user.id)
      }
    }
    getUser()
  }, [])

  const { profile } = useStudentProfile(userId || '')
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    getIcon,
  } = useStudentNotifications(userId || '')

  const user = profile
    ? {
        name: profile.full_name || profile.email.split('@')[0],
        email: profile.email,
        avatar: profile.avatar_url || '',
      }
    : {
        name: 'Sinh viên',
        email: '',
        avatar: '',
      }

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read
    if (filter === 'read') return n.is_read
    return true
  })

  if (isLoading || !userId) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-secondary text-sm">Đang tải...</p>
        </div>
      </div>
    )
  }

  return (
    <Shell
      role="student"
      user={user}
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/student' }, { label: 'Thông báo' }]}
      notifications={unreadCount}
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-display-sm font-headline font-extrabold text-primary tracking-tight">
            Thông Báo
          </h2>
          <p className="text-body-md text-on-surface-variant font-medium">
            Cập nhật các thông báo quan trọng từ hệ thống
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="border-primary-fixed text-primary"
            >
              <span className="material-symbols-outlined text-sm mr-1">done_all</span>
              Đánh dấu tất cả đã đọc
            </Button>
          )}
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'bg-primary' : 'border-primary-fixed text-primary'}
          >
            Tất cả
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
            className={filter === 'unread' ? 'bg-primary' : 'border-primary-fixed text-primary'}
          >
            Chưa đọc
            <Badge className="ml-2 bg-amber-100 text-amber-700 text-[10px]">
              {unreadCount}
            </Badge>
          </Button>
          <Button
            variant={filter === 'read' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('read')}
            className={filter === 'read' ? 'bg-primary' : 'border-primary-fixed text-primary'}
          >
            Đã đọc
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
        <CardContent className="p-0">
          <div className="divide-y divide-outline-variant/10">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "p-6 hover:bg-surface-container-low/50 transition-all cursor-pointer",
                  !notification.is_read && 'bg-primary-fixed/10'
                )}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                    typeColors[notification.type] || 'bg-slate-100 text-slate-600'
                  )}>
                    <span className="material-symbols-outlined">
                      {getIcon(notification.type)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className={cn(
                        "text-sm font-bold",
                        !notification.is_read ? 'text-on-surface' : 'text-on-surface-variant'
                      )}>
                        {notification.title}
                      </h3>
                      <span className="text-xs text-secondary">
                        {new Date(notification.created_at).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                      {notification.content}
                    </p>
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary h-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          markAsRead(notification.id)
                        }}
                      >
                        <span className="material-symbols-outlined text-sm mr-1">done</span>
                        Đánh dấu đã đọc
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredNotifications.length === 0 && (
            <div className="py-16 text-center">
              <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">notifications_none</span>
              <p className="text-slate-400">
                {filter === 'unread' ? 'Không có thông báo chưa đọc' :
                 filter === 'read' ? 'Không có thông báo đã đọc' :
                 'Không có thông báo nào'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="fixed bottom-4 right-4 p-4 bg-error-container text-error rounded-lg flex items-center gap-3 shadow-lg">
          <span className="material-symbols-outlined">error</span>
          <p className="text-sm">{error}</p>
        </div>
      )}
    </Shell>
  )
}
