/**
 * Notification Service
 * Helper functions for sending notifications to users
 */

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export type NotificationAction = 'created' | 'updated' | 'cancelled' | 'reminder'

export interface AppointmentNotificationData {
  studentId: string
  studentName: string
  lecturerName: string
  lecturerEmail?: string
  appointmentId: string
  scheduledAt: string
  location: string
  room?: string
  meetingLink?: string
  type: string
  thesisTitle?: string
  cancellationReason?: string
}

/**
 * Vietnamese notification templates for appointments
 */
const NOTIFICATION_TEMPLATES = {
  created: {
    title: 'Lịch hẹn mới với giảng viên',
    content: (data: AppointmentNotificationData) => {
      const locationInfo = data.location === 'online' && data.meetingLink
        ? `Online: ${data.meetingLink}`
        : data.location === 'in-person' && data.room
        ? `Trực tiếp tại phòng ${data.room}`
        : data.location || 'online'

      return `Bạn có lịch hẹn mới với ${data.lecturerName} vào ${formatDateTime(data.scheduledAt)} tại ${locationInfo}.${data.thesisTitle ? ` Đề tài: ${data.thesisTitle}` : ''}`
    },
    action_label: 'Xem chi tiết',
    action_url: '/student/appointments',
    type: 'deadline' as const,
    priority: 'high' as const,
  },
  updated: {
    title: 'Lịch hẹn đã được thay đổi',
    content: (data: AppointmentNotificationData) => {
      const locationInfo = data.location === 'online' && data.meetingLink
        ? `Online: ${data.meetingLink}`
        : data.location === 'in-person' && data.room
        ? `Trực tiếp tại phòng ${data.room}`
        : data.location || 'online'

      return `Lịch hẹn với ${data.lecturerName} đã được thay đổi sang ${formatDateTime(data.scheduledAt)} tại ${locationInfo}. Vui lòng xem lại chi tiết.`
    },
    action_label: 'Xem lịch mới',
    action_url: '/student/appointments',
    type: 'deadline' as const,
    priority: 'high' as const,
  },
  cancelled: {
    title: 'Lịch hẹn đã bị hủy',
    content: (data: AppointmentNotificationData) =>
      `Lịch hẹn với ${data.lecturerName} đã bị hủy. ${data.cancellationReason ? `Lý do: ${data.cancellationReason}` : 'Vui lòng liên hệ giảng viên để biết thêm chi tiết.'}`,
    action_label: 'Xem chi tiết',
    action_url: '/student/appointments',
    type: 'academic' as const,
    priority: 'normal' as const,
  },
  reminder: {
    title: 'Nhắc nhở lịch hẹn',
    content: (data: AppointmentNotificationData) => {
      const locationInfo = data.location === 'online' && data.meetingLink
        ? `Online: ${data.meetingLink}`
        : data.location === 'in-person' && data.room
        ? `Trực tiếp tại phòng ${data.room}`
        : data.location || 'online'

      return `Lịch hẹn với ${data.lecturerName} sẽ diễn ra vào ${formatDateTime(data.scheduledAt)} tại ${locationInfo}. Đừng quên tham gia đúng giờ!`
    },
    action_label: 'Tham gia',
    action_url: '/student/appointments',
    type: 'deadline' as const,
    priority: 'high' as const,
  },
}

/**
 * Format datetime to Vietnamese locale
 */
function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Send appointment notification to student
 */
export async function sendAppointmentNotification(
  action: NotificationAction,
  data: AppointmentNotificationData
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = NOTIFICATION_TEMPLATES[action]
    if (!template) {
      throw new Error(`Invalid notification action: ${action}`)
    }

    const notification = {
      user_id: data.studentId,
      title: template.title,
      content: template.content(data),
      type: template.type,
      priority: template.priority,
      is_read: false,
      action_url: template.action_url,
      action_label: template.action_label,
      metadata: {
        appointment_id: data.appointmentId,
        lecturer_id: data.lecturerName,
        scheduled_at: data.scheduledAt,
        action,
      },
    }

    const { error } = await supabaseAdmin
      .from('notifications')
      .insert(notification)

    if (error) {
      console.error('Failed to send notification:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Notification error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send batch notifications (for council meetings, etc.)
 */
export async function sendBatchNotifications(
  action: NotificationAction,
  dataList: AppointmentNotificationData[]
): Promise<{ success: number; failed: number; errors?: string[] }> {
  let success = 0
  let failed = 0
  const errors: string[] = []

  for (const data of dataList) {
    const result = await sendAppointmentNotification(action, data)
    if (result.success) {
      success++
    } else {
      failed++
      errors.push(result.error)
    }
  }

  return { success, failed, errors }
}
