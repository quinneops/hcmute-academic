'use client'

import * as React from 'react'
import { FlowPageIntro } from '@/components/flow/FlowPageIntro'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { cn } from '@/lib/utils'
import { withLecturer } from '@/hocs/with-role-check'
import { useAuthUser } from '@/hooks/use-auth-user'
import { useAppointments, Appointment } from '@/hooks/lecturer/use-appointments'
import { api } from '@/lib/api/client'

interface StudentOption {
  id: string
  full_name: string
  student_code: string
}

function LecturerSchedulePage() {
  const { user } = useAuthUser()
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date())
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false)
  const [selectedAppointment, setSelectedAppointment] = React.useState<Appointment | null>(null)
  const [students, setStudents] = React.useState<StudentOption[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = React.useState<string[]>([])

  // Form state
  const [formState, setFormState] = React.useState({
    student_id: '',
    type: 'meeting',
    scheduled_at: '',
    duration_minutes: 30,
    location: 'online',
    room: '',
    title: '',
    description: '',
    thesis_title: '',
    meeting_link: '',
  })

  const {
    appointments,
    isLoading,
    isCreating,
    isUpdating,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    getStatusLabel,
    getTypeLabel,
  } = useAppointments(user?.id || '')

  // Fetch students for dropdown
  React.useEffect(() => {
    async function fetchStudents() {
      try {
        const data = await api.lecturer.students()
        // Map from API response format {students: [...], stats: {...}}
        const studentsList = data.students || []
        setStudents(studentsList.map((s: any) => ({
          id: s.student_id,
          full_name: s.student_name,
          student_code: s.student_code || '',
        })))
      } catch (err) {
        console.error('Failed to fetch students:', err)
      }
    }
    fetchStudents()
  }, [])

  // Get appointments for selected date
  const selectedDateAppointments = React.useMemo(() => {
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.scheduled_at)
      return (
        aptDate.getDate() === selectedDate.getDate() &&
        aptDate.getMonth() === selectedDate.getMonth() &&
        aptDate.getFullYear() === selectedDate.getFullYear()
      )
    })
  }, [appointments, selectedDate])

  const handleCreateAppointment = async () => {
    if (selectedStudentIds.length === 0 || !formState.scheduled_at || !formState.title) {
      return
    }

    const result = await createAppointment({
      student_ids: selectedStudentIds.length === 1 ? undefined : selectedStudentIds,
      student_id: selectedStudentIds.length === 1 ? selectedStudentIds[0] : undefined,
      type: formState.type,
      scheduled_at: new Date(formState.scheduled_at).toISOString(),
      duration_minutes: formState.duration_minutes,
      location: formState.location,
      room: formState.room,
      title: formState.title,
      description: formState.description,
      thesis_title: formState.thesis_title,
      meeting_link: formState.meeting_link,
    })

    if (result.success) {
      setIsCreateModalOpen(false)
      setSelectedStudentIds([])
      setFormState({
        student_id: '',
        type: 'meeting',
        scheduled_at: '',
        duration_minutes: 30,
        location: 'online',
        room: '',
        title: '',
        description: '',
        thesis_title: '',
        meeting_link: '',
      })
    }
  }

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    await updateAppointment(id, { status })
    setIsDetailModalOpen(false)
  }

  const handleDeleteAppointment = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa lịch hẹn này?')) {
      await deleteAppointment(id)
      setIsDetailModalOpen(false)
    }
  }

  const openDetailModal = (apt: Appointment) => {
    setSelectedAppointment(apt)
    setIsDetailModalOpen(true)
  }

  const todayAppointments = appointments.filter((a) => {
    const aptDate = new Date(a.scheduled_at)
    const today = new Date()
    return (
      aptDate.getDate() === today.getDate() &&
      aptDate.getMonth() === today.getMonth() &&
      aptDate.getFullYear() === today.getFullYear()
    )
  })

  const upcomingAppointments = appointments.filter((a) => a.status === 'scheduled')

  return (
    <Shell
      role="lecturer"
      user={{
        name: user?.full_name || 'Giảng viên',
        email: user?.email || '...',
        avatar: user?.avatar_url || '',
        is_tbm: user?.is_tbm,
        is_secretary: user?.is_secretary
      }}
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Lịch hẹn' }]}
      notifications={0}
    >
      <FlowPageIntro
        eyebrow="Lecturer / schedule"
        title="Lịch hẹn gặp"
        description="Quản lý lịch hẹn với sinh viên, theo dõi các buổi họp và tạo lịch mới trong một không gian trực quan hơn."
        actions={
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white shadow-glow-primary">
              <span className="material-symbols-outlined text-sm mr-2">add</span>
              Tạo lịch hẹn
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tạo Lịch Hẹn Mới</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Chọn sinh viên (có thể chọn nhiều) *</Label>
                <div className="border border-outline-variant/30 rounded-md max-h-48 overflow-y-auto p-2 space-y-2">
                  {students.length === 0 ? (
                    <p className="text-sm text-secondary py-2">Chưa có sinh viên nào</p>
                  ) : (
                    students.map((student) => (
                      <label
                        key={student.id}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-surface-container-high cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(student.id)}
                          onChange={() => toggleStudentSelection(student.id)}
                          className="h-4 w-4"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-on-surface">{student.full_name}</p>
                          <p className="text-xs text-on-surface-variant">{student.student_code || 'Không có mã SV'}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                {selectedStudentIds.length > 0 && (
                  <p className="text-xs text-primary font-medium">
                    Đã chọn {selectedStudentIds.length} sinh viên{selectedStudentIds.length > 1 ? ' (Họp nhóm)' : ''}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="type">Loại lịch hẹn</Label>
                <Select
                  value={formState.type}
                  onValueChange={(value) => setFormState({ ...formState, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meeting">Họp</SelectItem>
                    <SelectItem value="defense">Bảo vệ</SelectItem>
                    <SelectItem value="feedback">Phản hồi</SelectItem>
                    <SelectItem value="office_hour">Giờ tiếp sinh viên</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="scheduled_at">Ngày giờ *</Label>
                <Input
                  id="scheduled_at"
                  type="datetime-local"
                  value={formState.scheduled_at}
                  onChange={(e) => setFormState({ ...formState, scheduled_at: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="duration_minutes">Thời lượng (phút)</Label>
                  <Select
                    value={String(formState.duration_minutes)}
                    onValueChange={(value) => setFormState({ ...formState, duration_minutes: Number(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 phút</SelectItem>
                      <SelectItem value="30">30 phút</SelectItem>
                      <SelectItem value="45">45 phút</SelectItem>
                      <SelectItem value="60">60 phút</SelectItem>
                      <SelectItem value="90">90 phút</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="location">Hình thức</Label>
                  <Select
                    value={formState.location}
                    onValueChange={(value) => setFormState({ ...formState, location: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="in-person">Trực tiếp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formState.location === 'in-person' && (
                <div className="grid gap-2">
                  <Label htmlFor="room">Phòng</Label>
                  <Input
                    id="room"
                    value={formState.room}
                    onChange={(e) => setFormState({ ...formState, room: e.target.value })}
                    placeholder="Ví dụ: P.101"
                  />
                </div>
              )}

              {formState.location === 'online' && (
                <div className="grid gap-2">
                  <Label htmlFor="meeting_link">Link họp online</Label>
                  <Input
                    id="meeting_link"
                    value={formState.meeting_link}
                    onChange={(e) => setFormState({ ...formState, meeting_link: e.target.value })}
                    placeholder="https://meet.google.com/..."
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="title">Tiêu đề *</Label>
                <Input
                  id="title"
                  value={formState.title}
                  onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                  placeholder="Ví dụ: Thảo luận đề tài khóa luận"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="thesis_title">Tên đề tài</Label>
                <Input
                  id="thesis_title"
                  value={formState.thesis_title}
                  onChange={(e) => setFormState({ ...formState, thesis_title: e.target.value })}
                  placeholder="Tên khóa luận"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  placeholder="Nội dung cần thảo luận..."
                  rows={3}
                />
              </div>

              <Button
                onClick={handleCreateAppointment}
                disabled={isCreating || selectedStudentIds.length === 0 || !formState.scheduled_at || !formState.title}
                className="w-full"
              >
                {isCreating ? 'Đang tạo...' : `Tạo lịch hẹn${selectedStudentIds.length > 1 ? ` cho ${selectedStudentIds.length} sinh viên` : ''}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        }
      />

      {/* Main Content - Calendar + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2 bg-surface-container-lowest shadow-ambient-lg border-none">
          <CardHeader>
            <CardTitle>Lịch tháng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <Calendar
                onChange={(value) => setSelectedDate(value as Date)}
                value={selectedDate}
                locale="vi-VN"
                tileClassName={({ date }) => {
                  const hasAppointment = appointments.some((apt) => {
                    const aptDate = new Date(apt.scheduled_at)
                    return (
                      aptDate.getDate() === date.getDate() &&
                      aptDate.getMonth() === date.getMonth() &&
                      aptDate.getFullYear() === date.getFullYear()
                    )
                  })
                  return hasAppointment ? 'bg-primary/20 font-bold' : undefined
                }}
                className="rounded-lg border shadow-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Details */}
        <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
          <CardHeader>
            <CardTitle>
              {selectedDate.toLocaleDateString('vi-VN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateAppointments.length === 0 ? (
              <div className="text-center text-secondary py-8">
                <span className="material-symbols-outlined text-4xl mb-2">event_busy</span>
                <p>Không có lịch hẹn nào</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateAppointments.map((apt) => (
                  <Card
                    key={apt.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => openDetailModal(apt)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <Badge className={cn(
                          apt.type === 'defense' ? 'bg-primary-fixed text-primary' :
                          apt.type === 'meeting' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        )}>
                          {getTypeLabel(apt.type)}
                        </Badge>
                        <Badge variant={apt.status === 'cancelled' ? 'destructive' : 'secondary'}>
                          {getStatusLabel(apt.status)}
                        </Badge>
                      </div>
                      <h4 className="font-bold text-on-surface mb-1">{apt.title}</h4>
                      <p className="text-sm text-on-surface-variant mb-2">
                        {apt.student_name || 'Chưa có sinh viên'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        <span>{new Date(apt.scheduled_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's Summary */}
      <div className="mt-8">
        <Card className="bg-gradient-to-r from-primary to-primary-container text-white shadow-lg border-none">
          <CardContent className="py-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-white/80 mb-1">Hôm nay</p>
                <h3 className="text-2xl font-black text-white">{formatToday()}</h3>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-white/80">Tổng số lịch</p>
                <p className="text-3xl font-black text-white">{todayAppointments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments List */}
      {upcomingAppointments.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-bold text-secondary uppercase tracking-widest mb-4">Sắp tới</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingAppointments.slice(0, 6).map((appointment) => (
              <Card
                key={appointment.id}
                className="bg-surface-container-lowest shadow-ambient-lg border-none cursor-pointer"
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
                    <span className="text-xs font-bold text-emerald-600">
                      {getStatusLabel(appointment.status)}
                    </span>
                  </div>

                  <h4 className="text-headline-md font-headline font-bold text-on-surface mb-2">
                    {appointment.student_name || 'Chưa có sinh viên'}
                  </h4>

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
                      <span>{appointment.location || appointment.room || 'Chưa xác định'}</span>
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

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Chi Tiết Lịch Hẹn</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
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
                <Label className="text-sm text-secondary">Sinh viên</Label>
                <p className="font-medium">
                  {selectedAppointment.student_name || 'Chưa có sinh viên'}
                  {selectedAppointment.student_code && ` (${selectedAppointment.student_code})`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                      {selectedAppointment.location} - {selectedAppointment.meeting_link}
                    </a>
                  ) : (
                    selectedAppointment.location
                  )}
                  {selectedAppointment.room && ` - Phòng ${selectedAppointment.room}`}
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

              <div className="flex gap-2 pt-4 border-t">
                {selectedAppointment.status === 'scheduled' && (
                  <>
                    <Button
                      onClick={() => handleUpdateStatus(selectedAppointment.id, 'confirmed')}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      Xác nhận
                    </Button>
                    <Button
                      onClick={() => handleUpdateStatus(selectedAppointment.id, 'completed')}
                      variant="outline"
                      className="flex-1"
                    >
                      Hoàn thành
                    </Button>
                  </>
                )}
                {selectedAppointment.status !== 'cancelled' && (
                  <Button
                    onClick={() => handleDeleteAppointment(selectedAppointment.id)}
                    variant="outline"
                    className="flex-1 border-error text-error hover:bg-error/10"
                  >
                    Hủy
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
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

export default withLecturer(LecturerSchedulePage)
