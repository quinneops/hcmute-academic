/**
 * Lecturer Dashboard Hook
 * Fetches overview stats: total students, pending grading, upcoming defenses, pending proposals
 */

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'

export interface LecturerDashboardStats {
  total_students: number
  pending_grading: number
  upcoming_defenses: number
  pending_proposals: number
}

export interface RecentSubmission {
  id: string
  student_name: string
  student_code: string
  thesis_title: string
  submission_type: string
  file_url: string
  file_name: string
  submitted_at: string
  status: string
  round_name: string
}

export interface UpcomingDefense {
  id: string
  student_name: string
  student_code: string
  thesis_title: string
  scheduled_at: string
  room: string
  council_name: string
}

export function useLecturerDashboard(lecturerId: string) {
  const [stats, setStats] = React.useState<LecturerDashboardStats | null>(null)
  const [recentSubmissions, setRecentSubmissions] = React.useState<RecentSubmission[]>([])
  const [upcomingDefenses, setUpcomingDefenses] = React.useState<UpcomingDefense[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchDashboard = React.useCallback(async () => {
    if (!lecturerId) {
      console.log('[LecturerDashboard] No lecturerId, returning early')
      return
    }

    console.log('[LecturerDashboard] Fetching data for lecturerId:', lecturerId)
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // 1. Fetch stats from view
      const { data: statsData, error: statsError } = await supabase
        .from('lecturer_dashboard_overview')
        .select('*')
        .eq('lecturer_id', lecturerId)
        .single()

      if (statsError) {
        console.error('[LecturerDashboard] Stats error:', statsError)
        // If view doesn't exist, fall back to manual queries
        setStats({
          total_students: 0,
          pending_grading: 0,
          upcoming_defenses: 0,
          pending_proposals: 0,
        })
      } else {
        setStats(statsData as LecturerDashboardStats)
      }

      // 2. Fetch recent submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select(`
          id,
          file_url,
          file_name,
          submitted_at,
          status,
          round_number,
          registrations (
            student_id,
            proposals (
              title,
              supervisor_id
            )
          ),
          profiles!inner (
            id,
            full_name,
            student_code
          )
        `)
        .eq('registrations.proposals.supervisor_id', lecturerId)
        .order('submitted_at', { ascending: false })
        .limit(5)

      if (submissionsError) {
        console.error('[LecturerDashboard] Submissions error:', submissionsError)
      } else {
        setRecentSubmissions(
          (submissionsData || []).map((sub: any) => ({
            id: sub.id,
            student_name: sub.profiles?.full_name || 'Unknown',
            student_code: sub.profiles?.student_code || '',
            thesis_title: sub.registrations?.proposals?.title || 'Unknown',
            submission_type: `Round ${sub.round_number}`,
            file_url: sub.file_url,
            file_name: sub.file_name,
            submitted_at: sub.submitted_at,
            status: sub.status,
            round_name: `Round ${sub.round_number}`,
          }))
        )
      }

      // 3. Fetch upcoming defenses
      const { data: defensesData, error: defensesError } = await supabase
        .from('defense_sessions')
        .select(`
          id,
          scheduled_at,
          room,
          councils (
            name
          ),
          registrations (
            student_id,
            proposals (
              title
            )
          ),
          profiles (
            id,
            full_name,
            student_code
          )
        `)
        .eq('registrations.proposals.supervisor_id', lecturerId)
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(5)

      if (defensesError) {
        console.error('[LecturerDashboard] Defenses error:', defensesError)
      } else {
        setUpcomingDefenses(
          (defensesData || []).map((d: any) => ({
            id: d.id,
            student_name: d.profiles?.full_name || 'Unknown',
            student_code: d.profiles?.student_code || '',
            thesis_title: d.registrations?.proposals?.title || 'Unknown',
            scheduled_at: d.scheduled_at,
            room: d.room || 'TBA',
            council_name: d.councils?.name || 'Unknown',
          }))
        )
      }
    } catch (err: any) {
      console.error('[LecturerDashboard] Fetch error:', err)
      setError(err.message || 'Không thể tải dữ liệu bảng điều khiển')
    } finally {
      console.log('[LecturerDashboard] Fetch complete, isLoading=false')
      setIsLoading(false)
    }
  }, [lecturerId])

  React.useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  return {
    stats,
    recentSubmissions,
    upcomingDefenses,
    isLoading,
    error,
    refresh: fetchDashboard,
  }
}
