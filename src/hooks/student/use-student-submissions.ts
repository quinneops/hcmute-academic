/**
 * Student Submissions Hook
 * Handles file uploads, submission history, and milestone tracking
 */

import * as React from 'react'
import { api } from '@/lib/api/client'

export interface Submission {
  id: string
  round_number: number
  file_url: string
  file_name: string
  file_size: number | null
  status: string
  submitted_at: string
  graded_at: string | null
  score: number | null
  grade: string | null
  feedback: string | null
  thesis_title: string
}

export interface MilestoneProgress {
  milestone: string
  completed: boolean
  submission?: Submission
}

export function useStudentSubmissions(studentId: string) {
  const [submissions, setSubmissions] = React.useState<Submission[]>([])
  const [milestoneProgress, setMilestoneProgress] = React.useState<MilestoneProgress[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isUploading, setIsUploading] = React.useState(false)

  const fetchSubmissions = React.useCallback(async () => {
    if (!studentId) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await api.submissions.list(studentId)

      const submissionsData = ((data as any) || []).map((s: any) => ({
        id: s.id,
        round_number: s.round_number,
        file_url: s.file_url,
        file_name: s.file_name,
        file_size: s.file_size,
        status: s.status,
        submitted_at: s.submitted_at,
        graded_at: s.graded_at,
        score: s.score || null,
        grade: s.grade || null,
        feedback: s.feedback,
        thesis_title: s.thesis_title || 'Khóa luận tốt nghiệp',
      }))

      setSubmissions(submissionsData)

      // Calculate milestone progress
      const milestones = ['Proposal', 'Draft', 'Interim', 'Final', 'Slide', 'Defense']
      const progress = milestones.map((milestone, idx) => {
        const submission = submissionsData.find(s => s.round_number === idx + 1)
        return {
          milestone,
          completed: submission?.status === 'graded' || !!submission?.graded_at,
          submission,
        }
      })

      setMilestoneProgress(progress)
    } catch (err: any) {
      console.error('Submissions fetch error:', err)
      setError(err.message || 'Không thể tải lịch sử nộp')
    } finally {
      setIsLoading(false)
    }
  }, [studentId])

  const uploadSubmission = async (
    file: File,
    roundNumber: number,
    registrationId: string
  ): Promise<{ success?: boolean; error?: string }> => {
    console.log('[uploadSubmission] Called with:', {
      studentId,
      roundNumber,
      registrationId,
      fileName: file.name,
    })

    if (!studentId) {
      const error = 'Không tìm thấy student ID'
      console.error('[uploadSubmission]', error)
      return { error }
    }

    if (!registrationId) {
      const error = 'Không tìm thấy registration ID'
      console.error('[uploadSubmission]', error)
      return { error }
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('student_id', studentId)
      formData.append('registration_id', registrationId)
      formData.append('round_number', String(roundNumber))

      console.log('[uploadSubmission] FormData prepared, sending to API...')

      await api.submissions.upload(formData)

      console.log('[uploadSubmission] Upload successful')

      await fetchSubmissions()
      return { success: true }
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Không thể nộp bài')
      return { error: err.message }
    } finally {
      setIsUploading(false)
    }
  }

  React.useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  return {
    submissions,
    milestoneProgress,
    isLoading,
    error,
    isUploading,
    uploadSubmission,
    refresh: fetchSubmissions,
  }
}
