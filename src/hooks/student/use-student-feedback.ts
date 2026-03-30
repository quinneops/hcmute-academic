/**
 * Student Feedback Hook
 * Handles bidirectional messaging with lecturers
 */

import * as React from 'react'
import { api } from '@/lib/api/client'

export interface FeedbackMessage {
  id: string
  subject: string
  content: string
  is_read: boolean
  is_from_student: boolean
  created_at: string
  lecturer_name: string | null
  lecturer_avatar: string | null
}

export function useStudentFeedback(studentId: string) {
  const [messages, setMessages] = React.useState<FeedbackMessage[]>([])
  const [selectedMessage, setSelectedMessage] = React.useState<FeedbackMessage | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isSending, setIsSending] = React.useState(false)

  const fetchMessages = React.useCallback(async () => {
    if (!studentId) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await api.feedback.list(studentId)

      const messagesData = ((data as any) || []).map((m: any) => ({
        id: m.id,
        subject: m.subject || 'Không có tiêu đề',
        content: m.content,
        is_read: m.is_read,
        is_from_student: m.is_from_student,
        created_at: m.created_at,
        lecturer_name: m.lecturer?.full_name,
        lecturer_avatar: m.lecturer?.avatar_url,
      }))

      setMessages(messagesData)
    } catch (err: any) {
      console.error('Feedback fetch error:', err)
      setError(err.message || 'Không thể tải phản hồi')
    } finally {
      setIsLoading(false)
    }
  }, [studentId])

  const sendMessage = async (
    lecturerId: string,
    subject: string,
    content: string
  ): Promise<{ success?: boolean; error?: string }> => {
    if (!studentId) return { error: 'Không tìm thấy user ID' }

    setIsSending(true)
    setError(null)

    try {
      await api.feedback.send({
        student_id: studentId,
        lecturer_id: lecturerId,
        subject,
        content,
        is_from_student: true,
        is_read: false,
      })

      await fetchMessages()
      return { success: true }
    } catch (err: any) {
      console.error('Send message error:', err)
      setError(err.message || 'Không thể gửi phản hồi')
      return { error: err.message }
    } finally {
      setIsSending(false)
    }
  }

  const markAsRead = async (messageId: string): Promise<void> => {
    try {
      await api.feedback.markAsRead(messageId)

      // Update local state
      setMessages(prev =>
        prev.map(m => (m.id === messageId ? { ...m, is_read: true } : m))
      )

      if (selectedMessage?.id === messageId) {
        setSelectedMessage(prev => prev ? { ...prev, is_read: true } : null)
      }
    } catch (err: any) {
      console.error('Mark as read error:', err)
    }
  }

  React.useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  return {
    messages,
    selectedMessage,
    setSelectedMessage,
    isLoading,
    error,
    isSending,
    sendMessage,
    markAsRead,
    refresh: fetchMessages,
  }
}
