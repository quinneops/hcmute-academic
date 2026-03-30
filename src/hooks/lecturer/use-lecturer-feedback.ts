/**
 * Lecturer Feedback Hook
 * Fetches feedback history and handles creating new feedback for students
 * Updated for NoSQL schema - uses API routes instead of direct Supabase queries
 */

import * as React from 'react'

export interface LecturerFeedback {
  id: string
  registration_id: string
  student_id: string
  student_name: string
  student_code: string
  thesis_title: string
  content: string
  type: 'written' | 'meeting'
  attachment_url: string | null
  attachment_name: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
  updated_at: string
}

export interface FeedbackStudent {
  id: string
  student_id: string
  student_name: string
  student_code: string
  thesis_title: string
}

export function useLecturerFeedback(lecturerId: string) {
  const [feedbacks, setFeedbacks] = React.useState<LecturerFeedback[]>([])
  const [students, setStudents] = React.useState<FeedbackStudent[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const fetchFeedback = React.useCallback(async () => {
    if (!lecturerId) {
      console.log('[LecturerFeedback] No lecturerId, returning early')
      return
    }

    console.log('[LecturerFeedback] Fetching data for lecturerId:', lecturerId)
    setIsLoading(true)
    setError(null)

    try {
      // Call API route instead of direct Supabase query
      const response = await fetch('/api/lecturer/feedback', {
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('sb-hhqwraokxkynkmushugf-auth-token')?.slice(1, -1).replace(/"/g, '') : ''}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch feedback')
      }

      setFeedbacks(data.feedbacks || [])
      setStudents(data.students || [])
      console.log('[LecturerFeedback] Data loaded:', {
        feedbacksCount: data.feedbacks?.length,
        studentsCount: data.students?.length,
      })
    } catch (err: any) {
      console.error('[LecturerFeedback] Fetch error:', err)
      setError(err.message || 'Không thể tải phản hồi')
    } finally {
      setIsLoading(false)
    }
  }, [lecturerId])

  const createFeedback = async (feedbackData: {
    registration_id: string
    content: string
    type?: 'written' | 'meeting'
    attachment_url?: string
    attachment_name?: string
  }): Promise<void> => {
    if (!lecturerId) throw new Error('No lecturer ID')

    setIsSubmitting(true)
    setError(null)

    try {
      // Call API route instead of direct Supabase insert
      const response = await fetch('/api/lecturer/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('sb-hhqwraokxkynkmushugf-auth-token')?.slice(1, -1).replace(/"/g, '') : ''}`,
        },
        body: JSON.stringify(feedbackData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create feedback')
      }

      console.log('[LecturerFeedback] Feedback created successfully')

      // Refresh data
      await fetchFeedback()
    } catch (err: any) {
      console.error('[LecturerFeedback] Create error:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  React.useEffect(() => {
    fetchFeedback()
  }, [fetchFeedback])

  return {
    feedbacks,
    students,
    isLoading,
    error,
    isSubmitting,
    createFeedback,
    refresh: fetchFeedback,
  }
}
