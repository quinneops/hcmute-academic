/**
 * Student Dashboard Hook
 * Fetches overview stats, thesis progress, recent documents, and feedback
 */

import * as React from 'react'
import { api } from '@/lib/api/client'

export interface DashboardStats {
  proposalsCount: number
  registrationsCount: number
  submissionsCount: number
  unreadNotifications: number
  latestRegistrationStatus: string | null
  latestRegistrationTitle: string | null
}

export interface ThesisProgress {
  milestone: string
  completed: boolean
  score?: number | null
  submittedAt?: string | null
}

export interface RecentDocument {
  id: string
  title: string
  type: string
  category: string
  file_url: string
  file_size: number | null
  download_count: number
  created_at: string
}

export interface SupervisorFeedback {
  id: string
  content: string
  lecturer_name: string | null
  created_at: string
  is_read: boolean
}

export interface Submission {
  id: string
  round_number: number
  round_name: string
  status: string
  submitted_at: string | null
  graded_at: string | null
  score?: number | null
  grade?: string | null
  feedback?: string | null
}

export function useStudentDashboard(studentId: string) {
  const [stats, setStats] = React.useState<DashboardStats | null>(null)
  const [thesisProgress, setThesisProgress] = React.useState<ThesisProgress[]>([])
  const [recentDocuments, setRecentDocuments] = React.useState<RecentDocument[]>([])
  const [feedback, setFeedback] = React.useState<SupervisorFeedback | null>(null)
  const [submissions, setSubmissions] = React.useState<Submission[]>([])
  const [supervisorName, setSupervisorName] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchDashboard = React.useCallback(async () => {
    if (!studentId) {
      console.log('[Dashboard] No studentId, returning early')
      return
    }

    console.log('[Dashboard] Fetching data for studentId:', studentId)
    setIsLoading(true)
    setError(null)

    try {
      // Fetch all data from backend
      const data = await api.dashboard.getAll(studentId)

      console.log('[Dashboard] Dashboard data:', data)

      setStats(data.stats || null)

      // Process thesis progress
      const milestones = ['Proposal', 'Draft', 'Interim', 'Final', 'Slide', 'Defense']
      if (data.thesisProgress) {
        setThesisProgress(data.thesisProgress)
      } else if (data.submissions) {
        const completedRounds = new Set(
          (data.submissions as any[])
            .filter((s: any) => s.status === 'graded')
            .map((s: any) => s.round_number)
        )
        setThesisProgress(milestones.map((milestone, idx) => ({
          milestone,
          completed: completedRounds.has(idx + 1),
        })))
      }

      // Process recent documents
      if (data.recentDocuments) {
        setRecentDocuments(data.recentDocuments)
      }

      // Process feedback
      if (data.feedback) {
        const fb = data.feedback as any
        setFeedback({
          id: fb.id,
          content: fb.content,
          lecturer_name: fb.lecturer_name || fb.lecturer?.full_name,
          created_at: fb.created_at,
          is_read: fb.is_read,
        } as any)
      }

      // Process submissions with scores
      if (data.submissions) {
        setSubmissions((data.submissions as any[]).map((s: any) => ({
          id: s.id,
          round_number: s.round_number,
          round_name: s.round_name || `Vòng ${s.round_number}`,
          status: s.status,
          submitted_at: s.submitted_at,
          graded_at: s.graded_at,
          score: s.grades?.[0]?.total_score || s.total_score || null,
          grade: s.grades?.[0]?.grade || s.grade || null,
          feedback: s.grades?.[0]?.feedback || s.feedback || null,
        })))
      }

      // Set supervisor name
      if (data.supervisor_name) {
        setSupervisorName(data.supervisor_name)
      } else if (data.latestRegistration?.supervisor_name) {
        setSupervisorName(data.latestRegistration.supervisor_name)
      }
    } catch (err: any) {
      console.error('[Dashboard] Dashboard fetch error:', err)
      setError(err.message || 'Không thể tải dữ liệu bảng điều khiển')
    } finally {
      console.log('[Dashboard] Fetch complete, isLoading=false')
      setIsLoading(false)
    }
  }, [studentId])

  React.useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  return {
    stats,
    thesisProgress,
    recentDocuments,
    feedback,
    submissions,
    supervisorName,
    isLoading,
    error,
    refresh: fetchDashboard,
  }
}
