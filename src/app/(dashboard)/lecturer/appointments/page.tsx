'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { withLecturer } from '@/hocs/with-role-check'
import { useAuthUser } from '@/hooks/use-auth-user'
import { cn } from '@/lib/utils'

function LecturerAppointmentsPage() {
  const { user } = useAuthUser()
  const [appointments, setAppointments] = React.useState([
    {
      id: '1',
      studentName: 'Nguyễn Văn A',
      studentCode: '21110123',
      title: 'Trao đổi về đề tài: Nền tảng E-Learning',
      type: 'meeting',
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      location: 'Phòng 405, Tòa A1',
      status: 'scheduled'
    },
    {
      id: '2',
      studentName: 'Trần Thị B',
      studentCode: '21110456',
      title: 'Báo cáo tiến độ tuần 12',
      type: 'feedback',
      scheduledAt: new Date(Date.now() + 172800000).toISOString(),
      location: 'Online - Google Meet',
      status: 'scheduled'
    }
  ])

  return (
    <Shell
      role="lecturer"
      user={{ name: user?.full_name || 'Giảng viên', email: user?.email || '...', avatar: user?.avatar_url || '' }}
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Lịch hẹn' }]}
    >
      <div className="mb-8">
        <h2 className="text-3xl font-headline font-bold text-on-surface mb-2">Lịch hẹn của tôi</h2>
        <p className="text-secondary">Quản lý các buổi họp và trao đổi với sinh viên đang hướng dẫn.</p>
      </div>

      <div className="flex gap-4 mb-8">
        <Button className="bg-primary hover:bg-primary/90 rounded-xl">
          <span className="material-symbols-outlined mr-2">add</span>
          Tạo lịch hẹn mới
        </Button>
        <Button variant="outline" className="rounded-xl">
          <span className="material-symbols-outlined mr-2">calendar_today</span>
          Xem dạng lịch
        </Button>
      </div>

      <div className="space-y-4 max-w-5xl">
        {appointments.map((apt) => (
          <Card key={apt.id} className="bg-surface-container-lowest border-none shadow-ambient-sm hover:shadow-ambient-md transition-shadow">
            <CardContent className="p-6 flex items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-primary-container/20 rounded-2xl flex flex-col items-center justify-center text-primary border border-primary/10">
                  <span className="text-xs font-bold uppercase">{new Date(apt.scheduledAt).toLocaleDateString('vi-VN', { month: 'short' })}</span>
                  <span className="text-2xl font-bold">{new Date(apt.scheduledAt).getDate()}</span>
                </div>

                <div>
                  <h4 className="text-lg font-bold text-on-surface mb-1">{apt.title}</h4>
                  <p className="text-sm font-medium text-secondary mb-2">Sinh viên: {apt.studentName} ({apt.studentCode})</p>
                  <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      <span>{new Date(apt.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">location_on</span>
                      <span>{apt.location}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge className="bg-primary-fixed text-primary px-3 py-1 text-xs">
                  {apt.type === 'meeting' ? 'Họp' : 'Phản hồi'}
                </Badge>
                <Button variant="ghost" size="icon" className="text-secondary hover:text-primary">
                  <span className="material-symbols-outlined">more_vert</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Shell>
  )
}

export default withLecturer(LecturerAppointmentsPage)
