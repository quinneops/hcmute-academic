/**
 * Student Registration Hook
 * Handles thesis registration workflow and approval tracking
 */

import * as React from 'react'
import { api } from '@/lib/api/client'

export interface Registration {
  id: string
  proposal_id: string
  status: string
  motivation_letter: string | null
  proposed_title: string | null
  submitted_at: string
  reviewed_at: string | null
  review_notes: string | null
  proposal_title: string
  proposal_type: 'BCTT' | 'KLTN'
  supervisor_name: string | null
  supervisor_email: string | null
  lecturer_code: string | null
  submissions?: any[]
  feedback_thread?: any[]
  defense_session?: any | null
}

export function useStudentRegistration(studentId: string) {
  const [registrations, setRegistrations] = React.useState<Registration[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const fetchRegistrations = React.useCallback(async () => {
    if (!studentId) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await api.registrations.list(studentId)

      setRegistrations((data || []).map((r: any) => ({
        id: r.id,
        proposal_id: r.proposal_id,
        status: r.status,
        motivation_letter: r.motivation_letter,
        proposed_title: r.proposed_title,
        submitted_at: r.submitted_at,
        reviewed_at: r.reviewed_at,
        review_notes: r.review_notes,
        proposal_title: r.proposal_title,
        proposal_type: (r.proposal_type || r.proposal?.type || 'KLTN') as 'BCTT' | 'KLTN',
        supervisor_name: r.supervisor_name,
        supervisor_email: r.supervisor_email,
        lecturer_code: r.lecturer_code,
        submissions: r.submissions || [],
        feedback_thread: r.feedback_thread || [],
        defense_session: r.defense_session || null,
      })))
    } catch (err: any) {
      console.error('Registrations fetch error:', err)
      setError(err.message || 'Không thể tải lịch sử đăng ký')
    } finally {
      setIsLoading(false)
    }
  }, [studentId])

  const submitRegistration = async (
    proposalId: string,
    motivationLetter: string,
    proposedTitle: string
  ): Promise<{ success?: boolean; error?: string }> => {
    if (!studentId) return { error: 'Không tìm thấy user ID' }

    setIsSubmitting(true)
    setError(null)

    try {
      // Check if already registered for this proposal
      const existing = await api.registrations.checkExisting(studentId, proposalId)

      if (existing) {
        return { error: 'Bạn đã đăng ký đề tài này rồi' }
      }

      await api.registrations.submit({
        student_id: studentId,
        proposal_id: proposalId,
        status: 'pending',
        motivation_letter: motivationLetter,
        proposed_title: proposedTitle,
      })

      await fetchRegistrations()
      return { success: true }
    } catch (err: any) {
      console.error('Registration submit error:', err)
      setError(err.message || 'Không thể gửi đăng ký')
      return { error: err.message }
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: 'Chờ duyệt',
      approved: 'Đã duyệt',
      rejected: 'Bị từ chối',
      withdrawn: 'Đã hủy',
      completed: 'Hoàn thành',
    }
    return labels[status] || status
  }

  React.useEffect(() => {
    fetchRegistrations()
  }, [fetchRegistrations])

  return {
    registrations,
    isLoading,
    error,
    isSubmitting,
    submitRegistration,
    getStatusLabel,
    refresh: fetchRegistrations,
  }
}
