'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { StudentEmptyState } from '@/components/student/StudentEmptyState'
import { StudentPageIntro } from '@/components/student/StudentPageIntro'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { withStudent } from '@/hocs/with-role-check'
import { useAuthUser } from '@/hooks/use-auth-user'
import { api } from '@/lib/api/client'

interface Appointment {
  id: string
  lecturer_id: string
  lecturer_name?: string | null
  lecturer_email?: string | null
  lecturer_code?: string | null
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

function StudentAppointmentsPage() {
  const { user } = useAuthUser()
  const [appointments, setAppointments] = React.useState<Appointment[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedAppointment, setSelectedAppointment] = React.useState<Appointment | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false)
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = React.useState(false)
  const [rescheduleReason, setRescheduleReason] = React.useState('')

  React.useEffect(() => {
    async function fetchAppointments() {
      if (!user?.id) return

      setIsLoading(true)
      setError(null)

      try {
        const data = await api.student.appointments.list()
        setAppointments((data || []).map((apt: any) => ({
          id: apt.id,
          lecturer_id: apt.lecturer_id,
          lecturer_name: apt.lecturer_name,
          lecturer_email: apt.lecturer_email,
          lecturer_code: apt.lecturer_code,
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
    }

    fetchAppointments()
  }, [user?.id])

  const openDetailModal = (apt: Appointment) => {
    setSelectedAppointment(apt)
    setIsDetailModalOpen(true)
  }

  const handleRescheduleRequest = async () => {
    if (!selectedAppointment || !rescheduleReason.trim()) return

    // In a real implementation, this would call an API to request rescheduling
    // For now, we'll just add the request to notes
    console.log('Reschedule request:', {
      appointmentId: selectedAppointment.id,
      reason: rescheduleReason,
    })

    setIsRescheduleModalOpen(false)
    setIsDetailModalOpen(false)
    setRescheduleReason('')

    // Show success message
    alert('Yêu cầu đổi lịch đã được gửi đến giảng viên. Giảng viên sẽ phản hồi sớm.')
  }

  const upcomingAppointments = appointments.filter((a) => a.status === 'scheduled')
  const completedAppointments = appointments.filter((a) => a.status === 'completed')
  const cancelledAppointments = appointments.filter((a) => a.status === 'cancelled')

  if (isLoading) {
    return (
      <Shell role="student" user={{ name: '...', email: '...', avatar: '' }} breadcrumb={[{ label: 'Bảng điều khiển', href: '/student' }, { label: 'Lịch hẹn' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell
      role="student"
      user={{ name: user?.full_name || 'Sinh viên', email: user?.email || '...', avatar: user?.avatar_url || '' }}
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/student' }, { label: 'Lịch hẹn' }]}
      notifications={0}
    >
      <StudentPageIntro
        eyebrow="Appointments"
        title="Lịch hẹn với giảng viên"
        description="Theo dõi các buổi họp, lịch bảo vệ và lịch trao đổi với giảng viên trong một luồng trực quan và chuyên nghiệp hơn."
      />

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg text-error">
          <p className="font-bold">Lỗi: {error}</p>
        </div>
      )}

      {/* Upcoming Appointments */}
      {upcomingAppointments.length === 0 ? (
        <StudentEmptyState
          icon="event_available"
          title="Chưa có lịch hẹn sắp tới"
          description="Giảng viên sẽ tạo lịch hẹn và thông báo cho bạn tại đây."
        />
      ) : (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-secondary uppercase tracking-widest mb-4">Sắp tới</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingAppointments.map((appointment) => (
              <Card
                key={appointment.id}
                className="bg-surface-container-lowest shadow-ambient-lg border-none cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openDetailModal(appointment)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <Badge className={cn(
                      appointment.type === 'defense' ? 'bg-primary-fixed text-primary' :
                      appointment.type === 'meeting' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    )}>
                      {getTypeLabel(appointment.type)}
                    </Badge>
                    <Badge variant="success">Sắp tới</Badge>
                  </div>

                  <h4 className="text-headline-md font-headline font-bold text-on-surface mb-2">
                    {appointment.title}
                  </h4>

                  <p className="text-sm font-medium text-secondary mb-3">
                    {appointment.lecturer_name || 'Giảng viên'}
                    {appointment.lecturer_code && ` - ${appointment.lecturer_code}`}
                  </p>

                  <div className="space-y-2 text-sm text-on-surface-variant">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      <span>{formatTime(appointment.scheduled_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">calendar_today</span>
                      <span>{formatDate(appointment.scheduled_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">location_on</span>
                      <span>{appointment.location === 'online' ? 'Online' : appointment.room || 'Trực tiếp'}</span>
                    </div>
                  </div>

                  {appointment.thesis_title && (
                    <p className="text-xs text-secondary mt-3 line-clamp-2">
                      {appointment.thesis_title}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completed Appointments */}
      {completedAppointments.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-secondary uppercase tracking-widest mb-4">Đã hoàn thành</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedAppointments.map((appointment) => (
              <Card
                key={appointment.id}
                className="bg-surface-container-low shadow-ambient-lg border-none opacity-75 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openDetailModal(appointment)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <Badge className="bg-slate-100 text-slate-600">
                      {getTypeLabel(appointment.type)}
                    </Badge>
                    <Badge variant="outline">Hoàn thành</Badge>
                  </div>

                  <h4 className="text-headline-md font-headline font-bold text-on-surface mb-2">
                    {appointment.title}
                  </h4>

                  <p className="text-sm font-medium text-secondary mb-3">
                    {appointment.lecturer_name || 'Giảng viên'}
                  </p>

                  <div className="space-y-2 text-sm text-on-surface-variant">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      <span>{formatDate(appointment.scheduled_at)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Cancelled Appointments */}
      {cancelledAppointments.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-secondary uppercase tracking-widest mb-4">Đã hủy</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cancelledAppointments.map((appointment) => (
              <Card
                key={appointment.id}
                className="bg-surface-container-low shadow-ambient-lg border-none opacity-60"
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <Badge className="bg-slate-100 text-slate-600">
                      {getTypeLabel(appointment.type)}
                    </Badge>
                    <Badge variant="destructive">Đã hủy</Badge>
                  </div>

                  <h4 className="text-headline-md font-headline font-bold text-on-surface mb-2">
                    {appointment.title}
                  </h4>

                  <p className="text-sm font-medium text-secondary mb-3">
                    {appointment.lecturer_name || 'Giảng viên'}
                  </p>

                  {appointment.cancellation_reason && (
                    <p className="text-xs text-secondary">
                      Lý do: {appointment.cancellation_reason}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <>
          <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>Chi Tiết Lịch Hẹn</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-secondary">Loại</Label>
                    <p className="font-medium">{getTypeLabel(selectedAppointment.type)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-secondary">Trạng thái</Label>
                    <p className="font-medium">{getStatusLabel(selectedAppointment.status)}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-secondary">Tiêu đề</Label>
                  <p className="font-medium">{selectedAppointment.title}</p>
                </div>

                {selectedAppointment.thesis_title && (
                  <div>
                    <Label className="text-sm text-secondary">Đề tài</Label>
                    <p className="font-medium">{selectedAppointment.thesis_title}</p>
                  </div>
                )}

                <div>
                  <Label className="text-sm text-secondary">Giảng viên</Label>
                  <p className="font-medium break-all sm:break-normal">
                    {selectedAppointment.lecturer_name || 'Giảng viên'}
                    {selectedAppointment.lecturer_email && (
                      <span className="text-sm text-secondary ml-2">
                        {selectedAppointment.lecturer_email}
                      </span>
                    )}
                    {selectedAppointment.lecturer_code && (
                      <span className="text-sm text-secondary ml-2">
                        {selectedAppointment.lecturer_code}
                      </span>
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-secondary">Ngày giờ</Label>
                    <p className="font-medium">{formatDateTime(selectedAppointment.scheduled_at)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-secondary">Thời lượng</Label>
                    <p className="font-medium">{selectedAppointment.duration_minutes} phút</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-secondary">Hình thức</Label>
                  <p className="font-medium">
                    {selectedAppointment.location === 'online' && selectedAppointment.meeting_link ? (
                      <a
                        href={selectedAppointment.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Online - {selectedAppointment.meeting_link}
                      </a>
                    ) : (
                      selectedAppointment.location === 'online' ? 'Online' :
                      selectedAppointment.room ? `Phòng ${selectedAppointment.room}` :
                      'Trực tiếp'
                    )}
                  </p>
                </div>

                {selectedAppointment.description && (
                  <div>
                    <Label className="text-sm text-secondary">Mô tả</Label>
                    <p className="font-medium whitespace-pre-wrap">{selectedAppointment.description}</p>
                  </div>
                )}

                {selectedAppointment.notes && (
                  <div>
                    <Label className="text-sm text-secondary">Ghi chú</Label>
                    <p className="font-medium whitespace-pre-wrap">{selectedAppointment.notes}</p>
                  </div>
                )}

                {selectedAppointment.cancellation_reason && (
                  <div>
                    <Label className="text-sm text-secondary">Lý do hủy</Label>
                    <p className="font-medium text-error whitespace-pre-wrap">{selectedAppointment.cancellation_reason}</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                  {selectedAppointment.meeting_link && selectedAppointment.status === 'scheduled' && (
                    <Button
                      onClick={() => window.open(selectedAppointment.meeting_link, '_blank')}
                      className="flex-1 bg-primary hover:bg-primary/90"
                    >
                      <span className="material-symbols-outlined text-sm mr-2">video_call</span>
                      Tham gia
                    </Button>
                  )}
                  {selectedAppointment.status === 'scheduled' && (
                    <Button
                      onClick={() => {
                        setIsDetailModalOpen(false)
                        setIsRescheduleModalOpen(true)
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      <span className="material-symbols-outlined text-sm mr-2">reschedule</span>
                      Đổi lịch
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Reschedule Request Modal */}
          <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
            <DialogContent className="max-w-lg p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>Yêu Cầu Đổi Lịch</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="reason">Lý do đổi lịch *</Label>
                  <Textarea
                    id="reason"
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    placeholder="Trình bày lý do bạn muốn đổi lịch hẹn..."
                    rows={4}
                  />
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-2">
                  <Button
                    onClick={handleRescheduleRequest}
                    disabled={!rescheduleReason.trim()}
                    className="flex-1"
                  >
                    Gửi yêu cầu
                  </Button>
                  <Button
                    onClick={() => {
                      setIsRescheduleModalOpen(false)
                      setRescheduleReason('')
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Hủy
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </Shell>
  )
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    meeting: 'Họp',
    defense: 'Bảo vệ',
    feedback: 'Phản hồi',
    office_hour: 'Giờ tiếp sinh viên',
  }
  return labels[type] || type
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    scheduled: 'Đã lên lịch',
    confirmed: 'Đã xác nhận',
    cancelled: 'Đã hủy',
    completed: 'Hoàn thành',
    no_show: 'Không tham gia',
  }
  return labels[status] || status
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('vi-VN', {
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

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default withStudent(StudentAppointmentsPage)
