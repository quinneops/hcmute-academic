/**
 * Lecturer Appointments Hook
 * Handles appointment CRUD operations and calendar view
 */

import * as React from 'react'
import { api } from '@/lib/api/client'

export interface Appointment {
  id: string
  lecturer_id: string
  student_id: string | null
  student_name?: string | null
  student_email?: string | null
  student_code?: string | null
  type: string
  scheduled_at: string
  end_at: string | null
  duration_minutes: number | null
  location: string | null
  room: string | null
  title: string
  description: string | null
  thesis_title: string | null
  status: string
  notes: string | null
  cancellation_reason: string | null
  council_name: string | null
  meeting_link: string | null
  created_at: string
  updated_at: string
}

export interface AppointmentFilters {
  start_date?: string
  end_date?: string
  status?: string
  type?: string
}

export function useAppointments(lecturerId: string, filters?: AppointmentFilters) {
  const [appointments, setAppointments] = React.useState<Appointment[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isCreating, setIsCreating] = React.useState(false)
  const [isUpdating, setIsUpdating] = React.useState(false)

  const fetchAppointments = React.useCallback(async () => {
    if (!lecturerId) return

    setIsLoading(true)
    setError(null)

    try {
      const params: AppointmentFilters = {
        ...filters,
        start_date: filters?.start_date,
        end_date: filters?.end_date,
        status: filters?.status,
      }
      const data = await api.lecturer.appointments.list(params)

      setAppointments((data || []).map((apt: any) => ({
        id: apt.id,
        lecturer_id: apt.lecturer_id,
        student_id: apt.student_id,
        student_name: apt.student_name,
        student_email: apt.student_email,
        student_code: apt.student_code,
        type: apt.type,
        scheduled_at: apt.scheduled_at,
        end_at: apt.end_at,
        duration_minutes: apt.duration_minutes,
        location: apt.location,
        room: apt.room,
        title: apt.title,
        description: apt.description,
        thesis_title: apt.thesis_title,
        status: apt.status,
        notes: apt.notes,
        cancellation_reason: apt.cancellation_reason,
        council_name: apt.council_name,
        meeting_link: apt.meeting_link,
        created_at: apt.created_at,
        updated_at: apt.updated_at,
      })))
    } catch (err: any) {
      console.error('Appointments fetch error:', err)
      setError(err.message || 'Không thể tải lịch hẹn')
    } finally {
      setIsLoading(false)
    }
  }, [lecturerId, filters])

  const createAppointment = async (
    data: {
      student_id?: string
      student_ids?: string[]
      type: string
      scheduled_at: string
      duration_minutes?: number
      location?: string
      room?: string
      title: string
      description?: string
      thesis_title?: string
      meeting_link?: string
    }
  ): Promise<{ success?: boolean; error?: string; appointment?: Appointment }> => {
    if (!lecturerId) return { error: 'Không tìm thấy lecturer ID' }

    setIsCreating(true)
    setError(null)

    try {
      const appointment = await api.lecturer.appointments.create({
        ...data,
        lecturer_id: lecturerId,
      })

      await fetchAppointments()
      return { success: true, appointment }
    } catch (err: any) {
      console.error('Appointment create error:', err)
      setError(err.message || 'Không thể tạo lịch hẹn')
      return { error: err.message }
    } finally {
      setIsCreating(false)
    }
  }

  const updateAppointment = async (
    id: string,
    data: {
      status?: string
      scheduled_at?: string
      duration_minutes?: number
      location?: string
      room?: string
      title?: string
      description?: string
      notes?: string
      cancellation_reason?: string
      meeting_link?: string
    }
  ): Promise<{ success?: boolean; error?: string }> => {
    setIsUpdating(true)
    setError(null)

    try {
      await api.lecturer.appointments.update(id, data)
      await fetchAppointments()
      return { success: true }
    } catch (err: any) {
      console.error('Appointment update error:', err)
      setError(err.message || 'Không thể cập nhật lịch hẹn')
      return { error: err.message }
    } finally {
      setIsUpdating(false)
    }
  }

  const deleteAppointment = async (id: string): Promise<{ success?: boolean; error?: string }> => {
    setError(null)

    try {
      await api.lecturer.appointments.delete(id)
      await fetchAppointments()
      return { success: true }
    } catch (err: any) {
      console.error('Appointment delete error:', err)
      setError(err.message || 'Không thể xóa lịch hẹn')
      return { error: err.message }
    }
  }

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      scheduled: 'Đã lên lịch',
      confirmed: 'Đã xác nhận',
      cancelled: 'Đã hủy',
      completed: 'Hoàn thành',
      no_show: 'Không tham gia',
    }
    return labels[status] || status
  }

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      meeting: 'Họp',
      defense: 'Bảo vệ',
      feedback: 'Phản hồi',
      office_hour: 'Giờ tiếp sinh viên',
    }
    return labels[type] || type
  }

  React.useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  return {
    appointments,
    isLoading,
    error,
    isCreating,
    isUpdating,
    fetchAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    getStatusLabel,
    getTypeLabel,
  }
}
