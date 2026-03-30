/**
 * Lecturer Students Hook
 * Fetches list of students supervised by lecturer with their progress
 */

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'

export interface LecturerStudent {
  id: string
  student_id: string
  student_name: string
  student_code: string
  student_email: string
  avatar_url: string | null
  proposal_id: string
  thesis_title: string
  registration_status: string
  progress_percentage: number
  total_submissions: number
  last_submission_at: string | null
  defense_date: string | null
  defense_status: string | null
  final_score: number | null
  final_grade: string | null
}

export function useLecturerStudents(lecturerId: string, semesterId?: string) {
  const [students, setStudents] = React.useState<LecturerStudent[]>([])
  const [stats, setStats] = React.useState({
    total: 0,
    active: 0,
    defended: 0,
  })
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchStudents = React.useCallback(async () => {
    if (!lecturerId) {
      console.log('[LecturerStudents] No lecturerId, returning early')
      return
    }

    console.log('[LecturerStudents] Fetching data for lecturerId:', lecturerId)
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Build query
      let query = supabase
        .from('lecturer_students_progress')
        .select('*')
        .eq('lecturer_id', lecturerId)

      if (semesterId) {
        // If semester filter needed, add it
        // Note: current view doesn't have semester, would need to join
      }

      const { data, error } = await query

      if (error) {
        console.error('[LecturerStudents] Fetch error:', error)
        setError(error.message)
        return
      }

      // Transform data
      const transformedStudents = (data || []).map((item: any) => ({
        id: item.student_id,
        student_id: item.student_id,
        student_name: item.student_name,
        student_code: item.student_code,
        student_email: item.student_email,
        avatar_url: item.avatar_url,
        proposal_id: item.proposal_id,
        thesis_title: item.thesis_title,
        registration_status: item.registration_status,
        progress_percentage: calculateProgress(item),
        total_submissions: item.total_submissions || 0,
        last_submission_at: item.last_submission_at,
        defense_date: item.defense_date,
        defense_status: item.defense_status,
        final_score: item.final_score,
        final_grade: item.final_grade,
      }))

      setStudents(transformedStudents)

      // Calculate stats
      setStats({
        total: transformedStudents.length,
        active: transformedStudents.filter(s =>
          ['pending', 'approved', 'active'].includes(s.registration_status)
        ).length,
        defended: transformedStudents.filter(s =>
          ['completed', 'defended'].includes(s.registration_status) || s.defense_status === 'completed'
        ).length,
      })

    } catch (err: any) {
      console.error('[LecturerStudents] Fetch error:', err)
      setError(err.message || 'Không thể tải danh sách sinh viên')
    } finally {
      setIsLoading(false)
    }
  }, [lecturerId, semesterId])

  React.useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  return {
    students,
    stats,
    isLoading,
    error,
    refresh: fetchStudents,
  }
}

function calculateProgress(item: any): number {
  // Calculate progress based on milestones
  let progress = 0

  // Proposal approved: 10%
  if (item.registration_status === 'approved') progress += 10

  // Submissions count (each round ~15%, max 4 rounds = 60%)
  const submissionProgress = Math.min((item.total_submissions || 0) * 15, 60)
  progress += submissionProgress

  // Defense scheduled: +20%
  if (item.defense_date) progress += 20

  // Completed: 100%
  if (item.registration_status === 'completed' || item.defense_status === 'completed') {
    return 100
  }

  // Has final score: at least 90%
  if (item.final_score) progress = Math.max(progress, 90)

  return Math.min(progress, 100)
}
