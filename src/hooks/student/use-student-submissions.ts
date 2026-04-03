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
  grades?: Array<{
    id: string
    feedback: string
    graded_at: string
    grader_id: string
    grader_name: string
    grader_role: string
    total_score: number
    is_published: boolean
    criteria_scores?: {
      qna?: number
      content?: number
      methodology?: number
      presentation?: number
    }
  }>
  submission_type?: string
  document_number?: number
}

export interface MilestoneProgress {
  milestone: string
  completed: boolean
  submission?: Submission
  nextAllowed?: boolean  // Is this the next milestone student can submit to?
  canUploadMultiple?: boolean  // Can upload multiple docs to this milestone?
}

export interface SubmissionType {
  type: string
  label: string
  labelVi: string
  order: number
}

export const SUBMISSION_TYPES: SubmissionType[] = [
  { type: 'proposal', label: 'Proposal', labelVi: 'Đề cương', order: 0 },
  { type: 'draft', label: 'Draft', labelVi: 'Bản nháp', order: 1 },
  { type: 'interim', label: 'Interim', labelVi: 'Giữa kỳ', order: 2 },
  { type: 'final', label: 'Final', labelVi: 'Cuối kỳ', order: 3 },
  { type: 'slide', label: 'Slide', labelVi: 'Slide', order: 4 },
  { type: 'defense', label: 'Defense', labelVi: 'Bảo vệ', order: 5 },
]

export function getSubmissionTypeFromRound(roundNumber: number): SubmissionType {
  const typeIndex = (roundNumber - 1) % SUBMISSION_TYPES.length
  return SUBMISSION_TYPES[typeIndex]
}

export function getNextAllowedType(submissions: Submission[]): SubmissionType | null {
  if (!submissions || submissions.length === 0) {
    return SUBMISSION_TYPES[0] // proposal
  }

  // Find highest order type that has been graded
  const gradedSubmissions = submissions.filter(s => s.status === 'graded')
  if (gradedSubmissions.length === 0) {
    // Must grade proposal first
    return SUBMISSION_TYPES[0]
  }

  const maxGradedRound = Math.max(...gradedSubmissions.map(s => s.round_number))
  const nextTypeIndex = maxGradedRound % SUBMISSION_TYPES.length

  if (nextTypeIndex >= SUBMISSION_TYPES.length) {
    return null // All complete
  }

  return SUBMISSION_TYPES[nextTypeIndex]
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
        grades: s.grades || [],
      }))

      setSubmissions(submissionsData)

      // Calculate milestone progress with sequential enforcement
      const milestones = SUBMISSION_TYPES.map((submissionType) => {
        // Find submissions for this type
        const typeSubmissions = submissionsData.filter(s => {
          const sType = getSubmissionTypeFromRound(s.round_number)
          return sType.type === submissionType.type
        })

        // Check if any submission for this type is graded
        const isCompleted = typeSubmissions.some(s => s.status === 'graded')
        const latestSubmission = typeSubmissions.length > 0
          ? typeSubmissions[typeSubmissions.length - 1]
          : undefined

        return {
          milestone: submissionType.labelVi,
          completed: isCompleted,
          submission: latestSubmission,
          canUploadMultiple: true, // Allow multiple docs per milestone
          nextAllowed: false, // Will be set below
        }
      })

      // Calculate next allowed milestone
      const nextAllowedType = getNextAllowedType(submissionsData)
      if (nextAllowedType) {
        const nextIndex = milestones.findIndex(m =>
          SUBMISSION_TYPES.find(t => t.labelVi === m.milestone)?.type === nextAllowedType.type
        )
        if (nextIndex >= 0) {
          milestones[nextIndex].nextAllowed = true
        }
      }

      setMilestoneProgress(milestones)
    } catch (err: any) {
      console.error('Submissions fetch error:', err)
      setError(err.message || 'Không thể tải lịch sử nộp')
    } finally {
      setIsLoading(false)
    }
  }, [studentId])

  const uploadSubmission = async (
    file: File,
    submissionType: string,  // Changed from roundNumber to submissionType
    registrationId: string
  ): Promise<{ success?: boolean; error?: string; validationError?: any }> => {
    console.log('[uploadSubmission] Called with:', {
      studentId,
      submissionType,
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
      formData.append('submission_type', submissionType)

      console.log('[uploadSubmission] FormData prepared, sending to API...')

      const response = await api.submissions.upload(formData)

      console.log('[uploadSubmission] Upload successful')

      await fetchSubmissions()
      return { success: true }
    } catch (err: any) {
      console.error('Upload error:', err)
      // Check for validation error (sequential order)
      if (err.validationError) {
        return { error: err.validationError.error, validationError: err.validationError }
      }
      setError(err.message || 'Không thể nộp bài')
      return { error: err.message, validationError: null }
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
