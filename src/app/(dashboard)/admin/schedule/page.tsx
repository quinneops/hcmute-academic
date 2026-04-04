'use client'

import * as React from 'react'
import { FlowPageIntro } from '@/components/flow/FlowPageIntro'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const mockUser = {
  name: 'PGS.TS. Trần Văn A',
  email: 'tranvana@ute.edu.vn',
  avatar: '',
}

const mockDefenses = [
  { id: 1, student: 'Nguyễn Văn A', thesis: 'Hệ thống gợi ý phim', council: 'Hội đồng 1', date: '29/03/2025', time: '14:00 - 14:45', room: 'Hội trường A', status: 'scheduled' },
  { id: 2, student: 'Trần Thị C', thesis: 'AI trong y khoa', council: 'Hội đồng 1', date: '29/03/2025', time: '15:00 - 15:45', room: 'Hội trường A', status: 'scheduled' },
  { id: 3, student: 'Lê Văn D', thesis: 'Phân tích dữ liệu', council: 'Hội đồng 2', date: '29/03/2025', time: '14:00 - 14:45', room: 'Phòng A301', status: 'scheduled' },
  { id: 4, student: 'Phạm Thị E', thesis: 'Machine Learning', council: 'Hội đồng 2', date: '30/03/2025', time: '08:00 - 08:45', room: 'Phòng A301', status: 'scheduled' },
  { id: 5, student: 'Hoàng Văn F', thesis: 'Deep Learning', council: 'Hội đồng 3', date: '30/03/2025', time: '09:00 - 09:45', room: 'Phòng A302', status: 'scheduled' },
]

export default function AdminSchedulePage() {
  const [viewDate, setViewDate] = React.useState('29/03/2025')

  const defensesOnDate = mockDefenses.filter(d => d.date === viewDate)

  return (
    <Shell
      role="admin"
      user={mockUser}
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/admin' }, { label: 'Lịch bảo vệ' }]}
      notifications={5}
    >
      <FlowPageIntro
        eyebrow="Admin flow / defense schedule"
        title="Lịch bảo vệ khóa luận"
        description="Quản lý lịch bảo vệ khóa luận tốt nghiệp với bố cục mở đầu đồng nhất và nhấn mạnh các hành động chính hơn."
        actions={
          <>
            <Button variant="outline" className="bg-white/80 border-outline-variant/40">
              <span className="material-symbols-outlined text-sm mr-2">download</span>
              Xuất lịch
            </Button>
            <Button>
              <span className="material-symbols-outlined text-sm mr-2">add</span>
              Xếp lịch mới
            </Button>
          </>
        }
      />

      {/* Date Selector */}
      <Card className="bg-gradient-to-r from-primary to-primary-container text-white shadow-lg border-none mb-8">
        <CardContent className="py-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-white/70 mb-1">Chọn ngày</p>
              <h3 className="text-2xl font-bold text-white">Lịch bảo vệ tháng 03/2025</h3>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewDate === '29/03/2025' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewDate('29/03/2025')}
                className={viewDate === '29/03/2025' ? 'bg-white text-primary' : 'border-white/30 text-white hover:bg-white/10'}
              >
                29/03
              </Button>
              <Button
                variant={viewDate === '30/03/2025' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewDate('30/03/2025')}
                className={viewDate === '30/03/2025' ? 'bg-white text-primary' : 'border-white/30 text-white hover:bg-white/10'}
              >
                30/03
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule by Room */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {['Hội trường A', 'Phòng A301', 'Phòng A302'].map((room) => {
          const roomDefenses = defensesOnDate.filter(d => d.room === room)
          if (roomDefenses.length === 0) return null

          return (
            <Card key={room} className="bg-surface-container-lowest shadow-ambient-lg border-none">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="font-headline font-bold text-primary text-lg flex items-center gap-2">
                    <span className="material-symbols-outlined">location_on</span>
                    {room}
                  </CardTitle>
                  <Badge className="bg-primary-fixed text-primary text-[10px]">
                    {roomDefenses.length} buổi
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {roomDefenses.map((defense) => (
                  <div
                    key={defense.id}
                    className="p-4 bg-surface-container-low rounded-lg border border-slate-100 hover:border-primary-fixed/30 transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-sm font-bold text-on-surface">{defense.student}</h4>
                        <p className="text-xs text-secondary mt-0.5 line-clamp-1">{defense.thesis}</p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
                        {defense.status === 'scheduled' ? 'Đã xếp' : 'Hoàn thành'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-secondary mt-3">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">schedule</span>
                        {defense.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">group</span>
                        {defense.council}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-outline-variant/10">
                      <Button variant="ghost" size="sm" className="text-secondary hover:text-primary h-8">
                        <span className="material-symbols-outlined text-xs">visibility</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="text-secondary hover:text-primary h-8">
                        <span className="material-symbols-outlined text-xs">edit</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="text-secondary hover:text-error h-8">
                        <span className="material-symbols-outlined text-xs">delete</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </Shell>
  )
}
