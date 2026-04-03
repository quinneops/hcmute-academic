'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { withLecturer } from '@/hocs/with-role-check'
import { useAuthUser } from '@/hooks/use-auth-user'
import { api } from '@/lib/api/client'
import { useRouter } from 'next/navigation'

interface Defense {
  student_id: string
  student_name: string
  thesis_title: string
  scheduled_time: string
  status: string
}

interface Council {
  id: string
  name: string
  code: string
  chair_name: string
  secretary_name: string
  room: string
  scheduled_date: string
  scheduled_time?: string
  status: string
  defenses: Defense[]
}

function LecturerCouncilDashboard() {
  const router = useRouter()
  const { user } = useAuthUser()
  const [councils, setCouncils] = React.useState<Council[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        const data = await api.lecturer.council.list()
        setCouncils(data || [])
      } catch (err: any) {
        setError(err.message || 'Không thể tải danh sách hội đồng')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  if (isLoading) {
    return (
      <Shell role="lecturer" isTbm={user?.is_tbm} user={{ name: '...', email: '...', avatar: '' }} breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Hội đồng' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell
      role="lecturer"
      isTbm={user?.is_tbm}
      user={{ name: user?.full_name || 'Giảng viên', email: user?.email || '...', avatar: user?.avatar_url || '' }}
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Hội đồng' }]}
    >
      <div className="mb-8">
        <h2 className="text-display-sm font-headline font-extrabold text-primary tracking-tight">
          Hội Đồng Bảo Vệ Của Tôi
        </h2>
        <p className="text-body-md text-on-surface-variant font-medium">
          Xem lịch trình và danh sách sinh viên bảo vệ tại các hội đồng bạn tham gia
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {councils.length === 0 ? (
          <Card className="p-12 text-center text-secondary">
            <span className="material-symbols-outlined text-4xl mb-4">groups</span>
            <p>Bạn chưa được phân công vào hội đồng nào trong học kỳ này</p>
          </Card>
        ) : (
          councils.map((council) => (
            <Card key={council.id} className="bg-surface-container-lowest shadow-ambient-lg border-none overflow-hidden">
              <CardHeader className="bg-surface-container-low/50 py-6 border-b border-outline-variant/10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <CardTitle className="text-xl font-bold font-headline text-primary">{council.name}</CardTitle>
                      <Badge className="bg-primary-fixed/20 text-primary text-[10px]">{council.code}</Badge>
                    </div>
                    <CardDescription className="text-sm font-medium">
                      Chủ tịch: {council.chair_name} • Thư ký: {council.secretary_name}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-secondary uppercase italic">Ngày bảo vệ</p>
                      <p className="text-sm font-bold text-on-surface">{new Date(council.scheduled_date || '2026-06-25').toLocaleDateString('vi-VN')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-secondary uppercase italic">Phòng</p>
                      <p className="text-sm font-bold text-primary">{council.room || 'Chưa xếp'}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-container-low/30">
                      <tr>
                        <th className="px-6 py-3 text-left text-[10px] font-bold text-secondary uppercase">Thời gian</th>
                        <th className="px-6 py-3 text-left text-[10px] font-bold text-secondary uppercase">Sinh viên</th>
                        <th className="px-6 py-3 text-left text-[10px] font-bold text-secondary uppercase">Đề tài</th>
                        <th className="px-6 py-3 text-right text-[10px] font-bold text-secondary uppercase">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {(council.defenses || []).map((defense, idx) => {
                        // AI saves time at council level, but manual override might exist per student
                        const time = defense.scheduled_time || council.scheduled_time || council.scheduled_date?.split('T')[1]?.substring(0,5) || '--:--'
                        return (
                        <tr key={idx} className="hover:bg-surface-container-low/20 transition-all">
                          <td className="px-6 py-4 text-sm font-black text-primary">
                            {time}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-on-surface">{defense.student_name}</p>
                            <p className="text-[10px] text-secondary">MS SV: {defense.student_id}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs text-on-surface-variant line-clamp-1">{defense.thesis_title}</p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-primary border-primary-fixed hover:bg-primary-fixed/10"
                              onClick={() => router.push(`/lecturer/grading?student=${defense.student_id}`)}
                            >
                              <span className="material-symbols-outlined text-sm mr-1">grading</span>
                              Chấm điểm
                            </Button>
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </Shell>
  )
}

export default withLecturer(LecturerCouncilDashboard)
