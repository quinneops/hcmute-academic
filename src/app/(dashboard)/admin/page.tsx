'use client'

import * as React from 'react'
import { FlowMetricGrid } from '@/components/flow/FlowMetricGrid'
import { FlowPageIntro } from '@/components/flow/FlowPageIntro'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api/client'
import { useAuthUser } from '@/hooks/use-auth-user'
import { useRouter } from 'next/navigation'

interface DashboardStats {
  students: number
  theses: number
  lecturers: number
  defenses: number
  admins: number
  currentSemester: { id: string; name: string; academic_year: string } | null
}

interface Activity {
  id: string
  type: 'registration' | 'submission'
  user: string
  action: string
  thesis: string
  time: string
  status: string
}

interface Thesis {
  id: string
  title: string
  student: string
  supervisor: string
  status: string
  progress: number
}

interface Defense {
  id: string
  student: string
  title: string
  date: string
  time: string
  room: string
  council: string
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const { user } = useAuthUser()
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [stats, setStats] = React.useState<DashboardStats | null>(null)
  const [activity, setActivity] = React.useState<Activity[]>([])
  const [recentTheses, setRecentTheses] = React.useState<Thesis[]>([])
  const [upcomingDefenses, setUpcomingDefenses] = React.useState<Defense[]>([])

  React.useEffect(() => {
    async function fetchDashboard() {
      try {
        setIsLoading(true)
        setError(null)
        const data = await api.admin.dashboard()
        setStats(data.stats)
        setActivity(data.activity || [])
        setRecentTheses(data.recentTheses || [])
        setUpcomingDefenses(data.upcomingDefenses || [])
      } catch (err: any) {
        console.error('Dashboard fetch error:', err)
        setError(err.message || 'Không thể tải dữ liệu')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  const mockUser = {
    name: user?.full_name || 'Quản trị viên',
    email: user?.email || 'admin@ute.edu.vn',
    avatar: user?.avatar_url || '',
  }

  if (isLoading) {
    return (
      <Shell
        role="admin"
        user={{ name: '...', email: '...', avatar: '' }}
        breadcrumb={[{ label: 'Bảng điều khiển' }]}
        notifications={5}
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Shell>
    )
  }
  return (
    <Shell
      role="admin"
      user={mockUser}
      breadcrumb={[{ label: 'Bảng điều khiển' }]}
      notifications={5}
    >
      <FlowPageIntro
        eyebrow="Admin dashboard"
        title="Bảng điều khiển quản trị"
        description="Theo dõi quy mô hệ thống, số lượng khóa luận, giảng viên và các lịch bảo vệ đang diễn ra trong một bảng điều khiển rõ ràng hơn."
        meta={
          <>
            <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary shadow-ambient-sm">Học kỳ 2</span>
            <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary shadow-ambient-sm">Năm học 2024-2025</span>
          </>
        }
        actions={
          <>
            <Button variant="outline" className="bg-white/80 border-outline-variant/40">
              <span className="material-symbols-outlined text-sm mr-2">download</span>
              Xuất báo cáo
            </Button>
            <Button>
              <span className="material-symbols-outlined text-sm mr-2">add</span>
              Tạo học kỳ mới
            </Button>
          </>
        }
      />

      <FlowMetricGrid
        className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4"
        items={[
          { label: 'Sinh viên', value: `${stats?.students ?? 0}`, hint: 'Đang tham gia trong hệ thống.', accent: 'primary', icon: 'school' },
          { label: 'Khóa luận', value: `${stats?.theses ?? 0}`, hint: 'Đang thực hiện hoặc theo dõi.', accent: 'violet', icon: 'description' },
          { label: 'Giảng viên', value: `${stats?.lecturers ?? 0}`, hint: 'Đang tham gia hướng dẫn.', accent: 'emerald', icon: 'group' },
          { label: 'Bảo vệ', value: `${stats?.defenses ?? 0}`, hint: 'Đã được lên lịch trong kỳ.', accent: 'amber', icon: 'event' },
        ]}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Recent Theses */}
        <div className="lg:col-span-2">
          <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="font-headline font-bold text-primary text-lg flex items-center gap-2">
                  <span className="material-symbols-outlined">description</span>
                  Khóa luận gần đây
                </CardTitle>
                <Button variant="ghost" className="text-primary text-sm font-bold">
                  Xem tất cả
                  <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTheses.length === 0 ? (
                  <div className="text-center py-8 text-secondary">
                    <span className="material-symbols-outlined text-4xl mb-2">description</span>
                    <p>Chưa có khóa luận nào</p>
                  </div>
                ) : (
                  recentTheses.map((thesis) => (
                    <div
                      key={thesis.id}
                      className="p-4 bg-surface-container-low rounded-lg hover:bg-surface-container-low/80 transition-all"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-on-surface mb-1">{thesis.title}</h4>
                          <p className="text-[10px] text-secondary">{thesis.student} • GVHD: {thesis.supervisor}</p>
                        </div>
                        <Badge className={cn(
                          thesis.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          thesis.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                          thesis.status === 'pending-review' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        )}>
                          {thesis.status === 'completed' ? 'Hoàn thành' :
                           thesis.status === 'in-progress' ? 'Đang làm' :
                           thesis.status === 'pending-review' ? 'Chờ duyệt' : 'Nháp'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={thesis.progress} className="flex-1 h-2" indicatorClassName={cn(
                          thesis.progress === 100 ? 'bg-emerald-500' : 'bg-primary'
                        )} />
                        <span className="text-xs font-bold text-on-surface-variant w-10 text-right">{thesis.progress}%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Upcoming Defenses */}
        <div>
          <Card className="bg-surface-container-lowest shadow-ambient-lg border-none h-full">
            <CardHeader>
              <CardTitle className="font-headline font-bold text-primary text-lg flex items-center gap-2">
                <span className="material-symbols-outlined">event</span>
                Sắp bảo vệ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingDefenses.length === 0 ? (
                <div className="text-center py-8 text-secondary">
                  <span className="material-symbols-outlined text-4xl mb-2">event_busy</span>
                  <p>Chưa có lịch bảo vệ nào</p>
                </div>
              ) : (
                upcomingDefenses.map((defense) => (
                  <div
                    key={defense.id}
                    className="p-4 bg-surface-container-low rounded-lg border border-slate-100"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-bold text-on-surface">{defense.student}</h4>
                        <p className="text-[10px] text-secondary mt-0.5">{defense.council}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-primary">{defense.date}</p>
                        <p className="text-[10px] text-secondary">{defense.time}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-on-surface-variant mb-3 line-clamp-2">{defense.title}</p>
                    <div className="flex items-center gap-1 text-xs text-secondary">
                      <span className="material-symbols-outlined text-sm">location_on</span>
                      <span>{defense.room}</span>
                    </div>
                  </div>
                ))
              )}

              <Button className="w-full mt-4" variant="outline" onClick={() => router.push('/admin/schedule')}>
                Xem lịch bảo vệ
                <span className="material-symbols-outlined text-sm ml-1">calendar_month</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="mt-8">
        <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
          <CardHeader>
            <CardTitle className="font-headline font-bold text-primary text-lg flex items-center gap-2">
              <span className="material-symbols-outlined">activity</span>
              Hoạt động gần đây
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activity.length === 0 ? (
                <div className="text-center py-8 text-secondary">
                  <span className="material-symbols-outlined text-4xl mb-2">activity</span>
                  <p>Chưa có hoạt động gần đây</p>
                </div>
              ) : (
                activity.map((activityItem) => (
                  <div
                    key={activityItem.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-container-low/50 transition-all"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      activityItem.type === 'submission' ? 'bg-blue-100 text-blue-600' :
                      'bg-amber-100 text-amber-600'
                    )}>
                      <span className="material-symbols-outlined text-sm">
                        {activityItem.type === 'submission' ? 'upload' : 'person_add'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-on-surface">
                        <span className="font-bold">{activityItem.user}</span>{' '}
                        <span className="text-on-surface-variant">{activityItem.action}</span>
                      </p>
                      <p className="text-[10px] text-secondary mt-0.5">{activityItem.thesis} • {formatTime(activityItem.time)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  )
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (hours < 1) return 'Vừa xong'
  if (hours < 24) return `${hours} giờ trước`
  return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })
}
