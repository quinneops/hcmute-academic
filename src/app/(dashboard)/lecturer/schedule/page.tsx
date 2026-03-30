'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api/client'
import { withLecturer } from '@/hocs/with-role-check'
import { useAuthUser } from '@/hooks/use-auth-user'

interface Appointment {
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

interface ScheduleStats {
  today: number
  upcoming: number
  completed: number
  this_week: number
}

function LecturerSchedulePage() {
  const [appointments, setAppointments] = React.useState<Appointment[]>([])
  const [stats, setStats] = React.useState<ScheduleStats>({
    today: 0,
    upcoming: 0,
    completed: 0,
    this_week: 0,
  })
  const { user } = useAuthUser()
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchSchedule() {
      try {
        setIsLoading(true)
        const data = await api.lecturer.schedule()
        setAppointments(data.appointments || [])
        setStats(data.stats || { today: 0, upcoming: 0, completed: 0, this_week: 0 })
      } catch (err: any) {
        console.error('Schedule fetch error:', err)
        setError(err.message || 'Không thể tải lịch hẹn')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSchedule()
  }, [])

  if (isLoading) {
    return (
      <Shell role="lecturer" user={{ name: '...', email: '...', avatar: '' }} breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Lịch hẹn' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Shell>
    )
  }

  const todayAppointments = appointments.filter(a =>
    a.scheduled_at >= new Date().toDateString() &&
    a.scheduled_at < new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toDateString()
  )

  const upcomingAppointments = appointments.filter(a => a.status === 'upcoming')

  return (
    <Shell
      role="lecturer"
      user={{ name: user?.full_name || 'Giảng viên', email: user?.email || '...', avatar: user?.avatar_url || '' }}
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Lịch hẹn' }]}
      notifications={0}
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-display-sm font-headline font-extrabold text-primary tracking-tight">
            Lịch Hẹn Gặp
          </h2>
          <p className="text-body-md text-on-surface-variant font-medium">
            Quản lý lịch hẹn với sinh viên
          </p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-primary hover:bg-primary/90 text-white shadow-glow-primary">
            <span className="material-symbols-outlined text-sm mr-2">add</span>
            Tạo lịch hẹn
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg text-error">
          <p className="font-bold">Lỗi: {error}</p>
        </div>
      )}

      {/* Today's Schedule */}
      <div className="mb-8">
        <Card className="bg-gradient-to-r from-primary to-primary-container text-white shadow-lg border-none">
          <CardContent className="py-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-sm font-medium text-white/80 mb-1">Hôm nay</p>
                <h3 className="text-3xl font-black text-white">{formatToday()}</h3>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-white/80">Tổng số lịch</p>
                <p className="text-4xl font-black text-white">{stats.today}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <p className="text-xs text-white/70 mb-1">Sắp tới</p>
                <p className="text-xl font-bold text-white">{stats.upcoming}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <p className="text-xs text-white/70 mb-1">Hoàn thành</p>
                <p className="text-xl font-bold text-white">{stats.completed}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <p className="text-xs text-white/70 mb-1">Tuần này</p>
                <p className="text-xl font-bold text-white">{stats.this_week}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule List */}
      {upcomingAppointments.length === 0 && appointments.filter(a => a.status === 'completed').length === 0 ? (
        <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
          <CardContent className="py-12 text-center text-secondary">
            <span className="material-symbols-outlined text-4xl mb-2">event_busy</span>
            <p>Chưa có lịch hẹn nào</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {upcomingAppointments.map((appointment) => (
            <Card key={appointment.id} className="bg-surface-container-lowest shadow-ambient-lg border-none">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <Badge className={cn(
                    appointment.type === 'defense' ? 'bg-primary-fixed text-primary' :
                    appointment.type === 'meeting' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  )}>
                    {appointment.type === 'defense' ? 'Bảo vệ' : appointment.type === 'meeting' ? 'Gặp mặt' : 'Góp ý'}
                  </Badge>
                  <span className="text-xs font-bold text-emerald-600">
                    Sắp tới
                  </span>
                </div>

                <h4 className="text-headline-md font-headline font-bold text-on-surface mb-4">
                  {appointment.student_name}
                </h4>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-lg">schedule</span>
                    <span>{formatTime(appointment.scheduled_at)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-lg">calendar_today</span>
                    <span>{formatDate(appointment.scheduled_at)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-lg">location_on</span>
                    <span>{appointment.location}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-6 pt-4 border-t border-outline-variant/15">
                  <Button variant="outline" className="flex-1 border-primary-fixed text-primary">
                    <span className="material-symbols-outlined text-sm mr-2">video_call</span>
                    Họp online
                  </Button>
                  <Button variant="outline" className="flex-1 border-slate-200 text-secondary">
                    <span className="material-symbols-outlined text-sm mr-2">reschedule</span>
                    Đổi lịch
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Completed Appointments */}
          {appointments.filter(a => a.status === 'completed').length > 0 && (
            <>
              <div className="col-span-full py-4">
                <h3 className="text-lg font-bold text-secondary uppercase tracking-widest">Đã hoàn thành</h3>
              </div>
              {appointments.filter(a => a.status === 'completed').map((appointment) => (
                <Card key={appointment.id} className="bg-surface-container-low shadow-ambient-lg border-none opacity-70">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <Badge className="bg-slate-100 text-slate-600">
                        {appointment.type === 'defense' ? 'Bảo vệ' : 'Gặp mặt'}
                      </Badge>
                      <span className="text-xs font-bold text-slate-400">
                        Hoàn thành
                      </span>
                    </div>

                    <h4 className="text-headline-md font-headline font-bold text-on-surface mb-4">
                      {appointment.student_name}
                    </h4>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                        <span className="material-symbols-outlined text-secondary text-lg">schedule</span>
                        <span>{formatTime(appointment.scheduled_at)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                        <span className="material-symbols-outlined text-secondary text-lg">calendar_today</span>
                        <span>{formatDate(appointment.scheduled_at)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                        <span className="material-symbols-outlined text-secondary text-lg">location_on</span>
                        <span>{appointment.location}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      )}
    </Shell>
  )
}

function formatToday(): string {
  return new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default withLecturer(LecturerSchedulePage)
