/**
 * Lecturer Grading Hook
 * Fetches submissions pending grading and handles grade CRUD operations
 */

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'

export interface GradingSubmission {
  id: string
  registration_id: string
  student_id: string
  student_name: string
  student_code: string
  thesis_title: string
  round_number: number
  round_name: string
  file_url: string
  file_name: string
  file_size: number | null
  submitted_at: string
  status: string
  has_grade: boolean
  grade_score: number | null
  grade_feedback: string | null
}

export interface GradeCriteria {
  criteria_1_score: number | null  // Content
  criteria_2_score: number | null  // Methodology
  criteria_3_score: number | null  // Presentation
  criteria_4_score: number | null  // Q&A
  criteria_5_score: number | null  // Creativity
}

export interface GradeData {
  submission_id: string
  criteria_scores: {
    content?: number
    methodology?: number
    presentation?: number
    qna?: number
    creativity?: number
  }
  total_score: number
  feedback: string
  is_published: boolean
}

export const GRADING_CRITERIA = [
  { key: 'criteria_1_score', name: 'Nội dung', maxScore: 3 },
  { key: 'criteria_2_score', name: 'Phương pháp', maxScore: 2 },
  { key: 'criteria_3_score', name: 'Trình bày', maxScore: 2 },
  { key: 'criteria_4_score', name: 'Tài liệu tham khảo', maxScore: 1 },
  { key: 'criteria_5_score', name: 'Sáng tạo', maxScore: 2 },
] as const

export function useLecturerGrading(lecturerId: string) {
  const [pendingSubmissions, setPendingSubmissions] = React.useState<GradingSubmission[]>([])
  const [gradedSubmissions, setGradedSubmissions] = React.useState<GradingSubmission[]>([])
  const [selectedSubmission, setSelectedSubmission] = React.useState<GradingSubmission | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const fetchSubmissions = React.useCallback(async () => {
    if (!lecturerId) return

    console.log('[LecturerGrading] Fetching data for lecturerId:', lecturerId)
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Fetch all submissions for lecturer's students
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          id,
          registration_id,
          round_number,
          file_url,
          file_name,
          file_size,
          submitted_at,
          status,
          registrations (
            student_id,
            proposals (
              id,
              title,
              supervisor_id
            )
          ),
          grades (
            id,
            grader_id,
            total_score,
            feedback,
            is_published
          ),
          profiles (
            id,
            full_name,
            student_code
          )
        `)
        .eq('registrations.proposals.supervisor_id', lecturerId)
        .order('submitted_at', { ascending: false })

      if (error) throw error

      const pending: GradingSubmission[] = []
      const graded: GradingSubmission[] = []

      ;(data || []).forEach((sub: any) => {
        const hasGrade = sub.grades?.some((g: any) => g.grader_id === lecturerId)
        const myGrade = sub.grades?.find((g: any) => g.grader_id === lecturerId)

        const submission: GradingSubmission = {
          id: sub.id,
          registration_id: sub.registration_id,
          student_id: sub.profiles?.id,
          student_name: sub.profiles?.full_name || 'Unknown',
          student_code: sub.profiles?.student_code || '',
          thesis_title: sub.registrations?.proposals?.title || 'Unknown',
          round_number: sub.round_number,
          round_name: `Round ${sub.round_number}`,
          file_url: sub.file_url,
          file_name: sub.file_name,
          file_size: sub.file_size,
          submitted_at: sub.submitted_at,
          status: sub.status,
          has_grade: !!hasGrade,
          grade_score: myGrade?.total_score,
          grade_feedback: myGrade?.feedback,
        }

        if (hasGrade) {
          graded.push(submission)
        } else {
          pending.push(submission)
        }
      })

      setPendingSubmissions(pending)
      setGradedSubmissions(graded)

      // Set first pending as selected by default
      if (pending.length > 0 && !selectedSubmission) {
        setSelectedSubmission(pending[0])
      }

    } catch (err: any) {
      console.error('[LecturerGrading] Fetch error:', err)
      setError(err.message || 'Không thể tải danh sách cần chấm')
    } finally {
      setIsLoading(false)
    }
  }, [lecturerId, selectedSubmission])

  const submitGrade = async (gradeData: GradeData): Promise<void> => {
    if (!lecturerId) throw new Error('No lecturer ID')

    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()

      const { data, error } = await (supabase
        .from('grades') as any)
        .upsert({
          submission_id: gradeData.submission_id,
          grader_id: lecturerId,
          grader_role: 'supervisor',
          criteria_1_score: gradeData.criteria_scores.content,
          criteria_2_score: gradeData.criteria_scores.methodology,
          criteria_3_score: gradeData.criteria_scores.presentation,
          criteria_4_score: gradeData.criteria_scores.qna,
          criteria_5_score: gradeData.criteria_scores.creativity,
          total_score: gradeData.total_score,
          feedback: gradeData.feedback,
          is_published: gradeData.is_published,
          weight_percentage: 25.0,
        }, {
          onConflict: 'submission_id,grader_id'
        })
        .select()
        .single()

      if (error) throw error

      console.log('[LecturerGrading] Grade submitted successfully')

      // Refresh data
      await fetchSubmissions()

    } catch (err: any) {
      console.error('[LecturerGrading] Submit grade error:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateGrade = async (gradeId: string, updates: Partial<GradeData>): Promise<void> => {
    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()

      const { error } = await (supabase
        .from('grades') as any)
        .update({
          ...(updates.criteria_scores && {
            criteria_1_score: updates.criteria_scores.content,
            criteria_2_score: updates.criteria_scores.methodology,
            criteria_3_score: updates.criteria_scores.presentation,
            criteria_4_score: updates.criteria_scores.qna,
            criteria_5_score: updates.criteria_scores.creativity,
          }),
          total_score: updates.total_score,
          feedback: updates.feedback,
          is_published: updates.is_published,
          graded_at: new Date().toISOString(),
        })
        .eq('id', gradeId)

      if (error) throw error

      console.log('[LecturerGrading] Grade updated successfully')
      await fetchSubmissions()

    } catch (err: any) {
      console.error('[LecturerGrading] Update grade error:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteGrade = async (gradeId: string): Promise<void> => {
    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('grades')
        .delete()
        .eq('id', gradeId)

      if (error) throw error

      console.log('[LecturerGrading] Grade deleted successfully')
      await fetchSubmissions()

    } catch (err: any) {
      console.error('[LecturerGrading] Delete grade error:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  React.useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  return {
    pendingSubmissions,
    gradedSubmissions,
    selectedSubmission,
    setSelectedSubmission,
    submitGrade,
    updateGrade,
    deleteGrade,
    isLoading,
    isSubmitting,
    error,
    refresh: fetchSubmissions,
  }
}
