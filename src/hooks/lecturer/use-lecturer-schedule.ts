/**
 * Lecturer Schedule Hook
 * Fetches upcoming defense sessions and appointments for lecturer
 */

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ScheduleAppointment {
  id: string
  type: 'defense' | 'meeting' | 'feedback'
  student_id: string
  student_name: string
  student_code: string
  thesis_title: string
  scheduled_at: string
  end_at: string | null
  location: string
  room: string | null
  status: 'upcoming' | 'completed' | 'cancelled' | 'postponed'
  notes: string | null
  council_name: string | null
}

export interface ScheduleStats {
  today: number
  upcoming: number
  completed: number
  this_week: number
}

export function useLecturerSchedule(lecturerId: string) {
  const [appointments, setAppointments] = React.useState<ScheduleAppointment[]>([])
  const [stats, setStats] = React.useState<ScheduleStats>({
    today: 0,
    upcoming: 0,
    completed: 0,
    this_week: 0,
  })
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchSchedule = React.useCallback(async () => {
    if (!lecturerId) {
      console.log('[LecturerSchedule] No lecturerId, returning early')
      return
    }

    console.log('[LecturerSchedule] Fetching data for lecturerId:', lecturerId)
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const now = new Date().toISOString()
      const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStart = today.toISOString()
      const todayEnd = new Date(today)
      todayEnd.setHours(23, 59, 59, 999)
      const todayEndStr = todayEnd.toISOString()

      // Fetch defense sessions where lecturer is supervising
      const { data: defensesData, error: defensesError } = await supabase
        .from('defense_sessions')
        .select(`
          id,
          scheduled_at,
          duration_minutes,
          room,
          status,
          notes,
          councils (
            id,
            name
          ),
          registrations (
            student_id,
            proposals (
              title,
              supervisor_id
            )
          ),
          profiles (
            id,
            full_name,
            student_code
          )
        `)
        .eq('registrations.proposals.supervisor_id', lecturerId)
        .order('scheduled_at', { ascending: true })

      if (defensesError) {
        console.error('[LecturerSchedule] Defenses error:', defensesError)
      }

      // Transform defense sessions
      const defenseAppointments: ScheduleAppointment[] = (defensesData || []).map((d: any) => {
        const endAt = d.scheduled_at && d.duration_minutes
          ? new Date(new Date(d.scheduled_at).getTime() + d.duration_minutes * 60 * 1000).toISOString()
          : null

        return {
          id: d.id,
          type: 'defense' as const,
          student_id: d.profiles?.id,
          student_name: d.profiles?.full_name || 'Unknown',
          student_code: d.profiles?.student_code || '',
          thesis_title: d.registrations?.proposals?.title || 'Unknown',
          scheduled_at: d.scheduled_at,
          end_at: endAt,
          location: d.room || 'TBA',
          room: d.room,
          status: mapDefenseStatus(d.status),
          notes: d.notes,
          council_name: d.councils?.name,
        }
      })

      // TODO: Also fetch meetings/appointments from a separate table if exists
      // For now, just use defense sessions

      const allAppointments = defenseAppointments

      setAppointments(allAppointments)

      // Calculate stats
      setStats({
        today: allAppointments.filter(a =>
          a.scheduled_at >= todayStart && a.scheduled_at <= todayEndStr
        ).length,
        upcoming: allAppointments.filter(a =>
          a.status === 'upcoming' && a.scheduled_at >= now
        ).length,
        completed: allAppointments.filter(a =>
          a.status === 'completed'
        ).length,
        this_week: allAppointments.filter(a =>
          a.scheduled_at >= now && a.scheduled_at <= weekFromNow
        ).length,
      })

    } catch (err: any) {
      console.error('[LecturerSchedule] Fetch error:', err)
      setError(err.message || 'Không thể tải lịch hẹn')
    } finally {
      setIsLoading(false)
    }
  }, [lecturerId])

  const updateAppointmentStatus = async (
    appointmentId: string,
    status: 'completed' | 'cancelled' | 'postponed'
  ): Promise<void> => {
    setError(null)

    try {
      const supabase = createClient()

      const { error } = await (supabase
        .from('defense_sessions') as any)
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointmentId)

      if (error) throw error

      console.log('[LecturerSchedule] Appointment status updated')

      // Refresh data
      await fetchSchedule()

    } catch (err: any) {
      console.error('[LecturerSchedule] Update error:', err)
      throw err
    }
  }

  const createMeeting = async (meetingData: {
    student_id: string
    scheduled_at: string
    duration_minutes?: number
    location?: string
    notes?: string
  }): Promise<void> => {
    setError(null)

    try {
      const supabase = createClient()

      // For now, we only support defense sessions
      // Meetings would need a separate appointments table
      console.log('[LecturerSchedule] Creating meeting not yet implemented')

    } catch (err: any) {
      console.error('[LecturerSchedule] Create meeting error:', err)
      throw err
    }
  }

  React.useEffect(() => {
    fetchSchedule()
  }, [fetchSchedule])

  return {
    appointments,
    stats,
    updateAppointmentStatus,
    createMeeting,
    isLoading,
    error,
    refresh: fetchSchedule,
  }
}

function mapDefenseStatus(status: string): 'upcoming' | 'completed' | 'cancelled' | 'postponed' {
  switch (status) {
    case 'scheduled':
      return 'upcoming'
    case 'completed':
      return 'completed'
    case 'cancelled':
      return 'cancelled'
    case 'postponed':
      return 'postponed'
    default:
      return 'upcoming'
  }
}
