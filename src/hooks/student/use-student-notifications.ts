/**
 * Student Notifications Hook
 * Handles real-time notifications with read/unread states
 */

import * as React from 'react'
import { api } from '@/lib/api/client'

export interface Notification {
  id: string
  type: string
  title: string
  content: string | null
  is_read: boolean
  created_at: string
  priority: string
  action_url: string | null
  action_label: string | null
  metadata?: any
}

const typeIcons: Record<string, string> = {
  system: 'settings',
  academic: 'school',
  deadline: 'schedule',
  feedback: 'feedback',
  announcement: 'campaign',
  submission: 'assignment',
}

export function useStudentNotifications(studentId: string) {
  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [filter, setFilter] = React.useState<'all' | 'unread' | 'read'>('all')
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [unreadCount, setUnreadCount] = React.useState(0)

  const fetchNotifications = React.useCallback(async () => {
    if (!studentId) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await api.notifications.list(studentId)
      let filteredData = data || []

      if (filter === 'unread') {
        filteredData = filteredData.filter((n: any) => !n.is_read)
      } else if (filter === 'read') {
        filteredData = filteredData.filter((n: any) => n.is_read)
      }

      setNotifications(filteredData)

      // Get unread count
      setUnreadCount((data || []).filter((n: any) => !n.is_read).length)
    } catch (err: any) {
      console.error('Notifications fetch error:', err)
      setError(err.message || 'Không thể tải thông báo')
    } finally {
      setIsLoading(false)
    }
  }, [studentId, filter])

  const markAsRead = async (notificationId: string): Promise<void> => {
    try {
      await api.notifications.markAsRead(notificationId)

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      )

      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err: any) {
      console.error('Mark as read error:', err)
    }
  }

  const markAllAsRead = async (): Promise<void> => {
    try {
      // Mark all as read by calling each one
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
      for (const id of unreadIds) {
        await api.notifications.markAsRead(id)
      }

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (err: any) {
      console.error('Mark all as read error:', err)
    }
  }

  const getIcon = (type: string): string => {
    return typeIcons[type] || 'notifications'
  }

  React.useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  return {
    notifications,
    filter,
    setFilter,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    getIcon,
    refresh: fetchNotifications,
  }
}
