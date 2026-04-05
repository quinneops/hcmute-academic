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
  proposal_type?: 'KLTN' | 'BCTT'
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

export const KLTN_SUBMISSION_TYPES: SubmissionType[] = [
  { type: 'proposal', label: 'Proposal & Draft', labelVi: 'Đề cương & Bản nháp', order: 0 },
  { type: 'interim', label: 'Interim', labelVi: 'Báo cáo Giữa kỳ', order: 1 },
  { type: 'final', label: 'Final Review', labelVi: 'Nhận xét Phản biện', order: 2 },
  { type: 'defense', label: 'Final Defense', labelVi: 'Bảo vệ Hội đồng', order: 3 },
]

export const BCTT_SUBMISSION_TYPES: SubmissionType[] = [
  { type: 'bctt_report', label: 'BCTT Report', labelVi: 'Báo cáo Thực tập', order: 0 }
]

export function getSubmissionTypes(proposalType?: string): SubmissionType[] {
  return proposalType === 'BCTT' ? BCTT_SUBMISSION_TYPES : KLTN_SUBMISSION_TYPES
}

export function getSubmissionTypeFromRound(roundNumber: number, proposalType?: string): SubmissionType {
  const types = getSubmissionTypes(proposalType)
  const typeIndex = (roundNumber - 1) % types.length
  return types[typeIndex]
}

export function getNextAllowedType(submissions: Submission[], proposalType?: string): SubmissionType | null {
  const types = getSubmissionTypes(proposalType)
  if (!submissions || submissions.length === 0) {
    return types[0]
  }

  // Find the highest order milestone that has a graded submission
  const gradedSubmissions = submissions.filter(s => s.status === 'graded')
  if (gradedSubmissions.length === 0) {
    return types[0]
  }

  // Determine the highest milestone index reached and graded
  const gradedIndexes = gradedSubmissions.map(s => {
    try {
      const sType = getSubmissionTypeFromRound(s.round_number, proposalType)
      if (!sType) return -1
      return types.findIndex(t => t.type === sType.type)
    } catch (e) {
      return -1
    }
  }).filter(idx => idx >= 0)

  const maxGradedIndex = gradedIndexes.length > 0 ? Math.max(...gradedIndexes) : -1

  // If the last milestone is graded, we are done
  if (maxGradedIndex >= types.length - 1) {
    return null
  }

  // The next milestone is the one immediately after the highest graded one
  const nextIndex = maxGradedIndex + 1
  return nextIndex < types.length ? types[nextIndex] : null
}

export function useStudentSubmissions(studentId: string, currentProposalType?: string, registrationId?: string | null) {
  const [submissions, setSubmissions] = React.useState<Submission[]>([])
  const [milestoneProgress, setMilestoneProgress] = React.useState<MilestoneProgress[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isUploading, setIsUploading] = React.useState(false)

  const fetchSubmissions = React.useCallback(async () => {
    if (!studentId) return

    setIsLoading(true)
    setError(null)
    
    console.log('[useSubmissions] Fetching for:', { studentId, registrationId })

    try {
      const data = await api.submissions.list(studentId, registrationId)
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
        thesis_title: s.thesis_title || 'Khóa luận / Đề tài',
        proposal_type: s.proposal_type || 'KLTN', 
        submission_type: s.submission_type,
        registration_id: s.registration_id,
        grades: s.grades || [],
      }))
      
      const activeProposalType = (currentProposalType || (submissionsData.length > 0 ? submissionsData[0].proposal_type : 'KLTN')) as 'KLTN' | 'BCTT'
      const types = getSubmissionTypes(activeProposalType)
      let relevantSubmissions = activeProposalType ? submissionsData.filter((s: any) => s.proposal_type === activeProposalType) : submissionsData
      
      if (registrationId) {
        relevantSubmissions = relevantSubmissions.filter((s: any) => s.registration_id === registrationId)
      }

      setSubmissions(relevantSubmissions)

      // Calculate milestones
      const milestones = types.map((submissionType) => {
        const typeSubmissions = relevantSubmissions.filter(s => {
          const sType = getSubmissionTypeFromRound(s.round_number, activeProposalType)
          return sType.type === submissionType.type || s.submission_type === submissionType.type
        })
        const isCompleted = typeSubmissions.some(s => s.status === 'graded')
        return {
          milestone: submissionType.labelVi,
          completed: isCompleted,
          submission: typeSubmissions.length > 0 ? typeSubmissions[typeSubmissions.length - 1] : undefined,
          canUploadMultiple: true,
          nextAllowed: false,
        }
      })

      const nextAllowedType = getNextAllowedType(relevantSubmissions, activeProposalType)
      if (nextAllowedType) {
        const nextIndex = milestones.findIndex(m =>
          types.find(t => t.labelVi === m.milestone)?.type === nextAllowedType.type
        )
        if (nextIndex >= 0) milestones[nextIndex].nextAllowed = true
      }

      setMilestoneProgress(milestones)
    } catch (err: any) {
      console.error('[useSubmissions] Error:', err)
      setError(err.message || 'Error loading submissions')
    } finally {
      setIsLoading(false)
    }
  }, [studentId, currentProposalType, registrationId])

  React.useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

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

      console.log('[uploadSubmission] FormData prepared:', {
        student_id: studentId,
        registration_id: registrationId,
        submission_type: submissionType,
        file_name: file.name
      })

      const response = await api.submissions.upload(formData)

      console.log('[uploadSubmission] Upload success response:', response)

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
    activeProposalType: (currentProposalType || (submissions.length > 0 ? submissions[0].proposal_type : 'KLTN')) as 'KLTN' | 'BCTT',
    refresh: fetchSubmissions,
  }
}
