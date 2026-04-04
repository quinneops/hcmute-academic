'use client'

import * as React from 'react'
import { FlowMetricGrid } from '@/components/flow/FlowMetricGrid'
import { FlowPageIntro } from '@/components/flow/FlowPageIntro'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api/client'
import { useRouter } from 'next/navigation'
import { withLecturer } from '@/hocs/with-role-check'
import { useAuthUser } from '@/hooks/use-auth-user'
import { createClient } from '@/lib/supabase/client'

interface DashboardStats {
  total_students: number
  pending_grading: number
  upcoming_defenses: number
  pending_proposals: number
}

interface RecentSubmission {
  id: string
  student_name: string
  student_code: string
  thesis_title: string
  submission_type: string
  file_name: string
  submitted_at: string
  status: string
}

interface UpcomingDefense {
  id: string
  student_name: string
  student_code: string
  thesis_title: string
  scheduled_at: string
  room: string
  council_name: string
}

function LecturerDashboardPage() {
  const router = useRouter()
  const { user } = useAuthUser()
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [stats, setStats] = React.useState<DashboardStats | null>(null)
  const [recentSubmissions, setRecentSubmissions] = React.useState<RecentSubmission[]>([])
  const [upcomingDefenses, setUpcomingDefenses] = React.useState<UpcomingDefense[]>([])
  const [atRiskStudents, setAtRiskStudents] = React.useState<Array<{
    student_id: string
    student_name: string
    risk_score: number
    risk_factors: string[]
    recommended_action: string
  }>>([])
  const [isLoadingAtRisk, setIsLoadingAtRisk] = React.useState(false)
  const [overallHealth, setOverallHealth] = React.useState<'good' | 'concerning' | 'critical'>('good')

  React.useEffect(() => {
    async function fetchDashboard() {
      try {
        setIsLoading(true)
        setError(null)
        const data = await api.lecturer.dashboard()
        setStats(data.stats)
        setRecentSubmissions(data.recentSubmissions || [])
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

  const handleLoadAtRiskAnalysis = async () => {
    if (!user?.email) return

    setIsLoadingAtRisk(true)
    setAtRiskStudents([])

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Get lecturer profile to get ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', user.email)
        .single()

      const lecturerId = (profile as any)?.id
      if (!lecturerId) return

      const response = await fetch(`/api/ai/at-risk-analysis?lecturer_id=${lecturerId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Không thể phân tích')
      }

      const data = await response.json()
      setAtRiskStudents(data.at_risk_students || [])
      setOverallHealth(data.overall_health || 'good')
    } catch (err: any) {
      console.error('At-risk analysis error:', err)
    } finally {
      setIsLoadingAtRisk(false)
    }
  }

  if (isLoading) {
    return (
      <Shell role="lecturer" user={{ name: '...', email: '...', avatar: '', is_tbm: false, is_secretary: false }} breadcrumb={[{ label: 'Bảng điều khiển' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Shell>
    )
  }

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
      breadcrumb={[{ label: 'Bảng điều khiển' }]}
      notifications={0}
    >
      <FlowPageIntro
        eyebrow="Lecturer dashboard"
        title="Bảng điều khiển giảng viên"
        description="Theo dõi sinh viên hướng dẫn, đề cương cần duyệt, bài cần chấm và những buổi bảo vệ sắp tới trong một giao diện thống nhất hơn."
        meta={
          <>
            <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary shadow-ambient-sm">Học kỳ 2</span>
            <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary shadow-ambient-sm">Năm học 2024-2025</span>
          </>
        }
        actions={
          <>
            <Button variant="outline" className="bg-white/80 border-outline-variant/40">
              Xem lịch hẹn
            </Button>
            <Button>
              <span className="material-symbols-outlined text-sm mr-2">add</span>
              Đề xuất mới
            </Button>
          </>
        }
      />

      <FlowMetricGrid
        className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4"
        items={[
          { label: 'Sinh viên', value: `${stats?.total_students ?? 0}`, hint: 'Đang được bạn hướng dẫn.', accent: 'primary', icon: 'group' },
          { label: 'Chờ duyệt', value: `${stats?.pending_proposals ?? 0}`, hint: 'Đề cương đang chờ review.', accent: 'amber', icon: 'description' },
          { label: 'Chấm điểm', value: `${stats?.pending_grading ?? 0}`, hint: 'Bài nộp đang cần chấm.', accent: 'violet', icon: 'rate_review' },
          { label: 'Bảo vệ', value: `${stats?.upcoming_defenses ?? 0}`, hint: 'Các buổi bảo vệ sắp diễn ra.', accent: 'emerald', icon: 'event' },
        ]}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Recent Submissions */}
        <div className="lg:col-span-2">
          <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="font-headline font-bold text-primary text-lg flex items-center gap-2">
                  <span className="material-symbols-outlined">inbox</span>
                  Nộp bài gần đây
                </CardTitle>
                <Button
                  variant="ghost"
                  className="text-primary text-sm font-bold"
                  onClick={() => router.push('/lecturer/grading')}
                >
                  Xem tất cả
                  <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentSubmissions.length === 0 ? (
                <div className="text-center py-8 text-secondary">
                  <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
                  <p>Chưa có bài nộp nào</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentSubmissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg hover:bg-surface-container-low/80 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          submission.submission_type.includes('Proposal') ? 'bg-blue-50 text-blue-600' :
                          submission.submission_type.includes('Round 1') ? 'bg-amber-50 text-amber-600' :
                          'bg-emerald-50 text-emerald-600'
                        )}>
                          <span className="material-symbols-outlined">description</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">{submission.student_name}</p>
                          <p className="text-[10px] text-secondary">{submission.thesis_title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{submission.submission_type} • {formatDate(submission.submitted_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={cn(
                          submission.status === 'submitted' ? 'bg-amber-100 text-amber-700' :
                          submission.status === 'graded' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-slate-100 text-slate-600'
                        )}>
                          {submission.status === 'submitted' ? 'Chờ xem' : 'Đã chấm'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-primary border-primary-fixed"
                          onClick={() => router.push(`/lecturer/grading?submission=${submission.id}`)}
                        >
                          Xem
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Upcoming Defense */}
        <div>
          <Card className="bg-primary text-white shadow-xl shadow-primary/10 relative overflow-hidden h-full">
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <span className="material-symbols-outlined text-[120px]">school</span>
            </div>

            <CardContent className="relative z-10 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">event</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm">Bảo vệ khóa luận</h4>
                  <p className="text-[10px] text-on-primary-container font-medium">Sắp diễn ra</p>
                </div>
              </div>

              {upcomingDefenses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-white/70">Chưa có lịch bảo vệ nào</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingDefenses.slice(0, 1).map((defense) => (
                    <div key={defense.id}>
                      <div>
                        <p className="text-[10px] font-bold text-on-primary-container uppercase tracking-widest mb-1">
                          Sinh viên
                        </p>
                        <p className="font-bold text-lg">{defense.student_name}</p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold text-on-primary-container uppercase tracking-widest mb-1">
                          Đề tài
                        </p>
                        <p className="text-sm font-medium leading-relaxed">{defense.thesis_title}</p>
                      </div>

                      <div className="flex items-center gap-2 text-on-primary-container">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        <span className="text-sm font-medium">{formatDateTime(defense.scheduled_at)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-on-primary-container">
                        <span className="material-symbols-outlined text-sm">location_on</span>
                        <span className="text-sm font-medium">{defense.room}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-8 flex gap-3">
                <Button
                  className="flex-1 bg-tertiary text-on-tertiary-fixed font-bold"
                  onClick={() => router.push('/lecturer/grading')}
                >
                  <span className="material-symbols-outlined text-sm mr-2">grading</span>
                  Chấm điểm
                </Button>
                <Button
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                  onClick={() => router.push('/lecturer/schedule')}
                >
                  Chi tiết
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* At-Risk Analysis Widget */}
      <div className="mt-8">
        <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="font-headline font-bold text-primary text-lg flex items-center gap-2">
                <span className="material-symbols-outlined">monitoring</span>
                Cảnh báo sớm sinh viên có nguy cơ
              </CardTitle>
              <Button
                variant="outline"
                className="text-primary border-primary-fixed"
                onClick={handleLoadAtRiskAnalysis}
                disabled={isLoadingAtRisk}
              >
                {isLoadingAtRisk ? (
                  <><span className="material-symbols-outlined text-sm mr-1 animate-spin">progress_activity</span>Đang phân tích...</>
                ) : (
                  <><span className="material-symbols-outlined text-sm mr-1">psychology</span>Phân tích AI</>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {atRiskStudents.length === 0 && !isLoadingAtRisk ? (
              <div className="text-center py-8">
                <div className={cn(
                  "inline-flex items-center gap-3 px-6 py-4 rounded-lg mb-4",
                  overallHealth === 'good' ? 'bg-emerald-50 text-emerald-700' :
                  overallHealth === 'concerning' ? 'bg-amber-50 text-amber-700' :
                  'bg-red-50 text-red-700'
                )}>
                  <span className="material-symbols-outlined text-2xl">
                    {overallHealth === 'good' ? 'check_circle' : overallHealth === 'concerning' ? 'warning' : 'error'}
                  </span>
                  <div className="text-left">
                    <p className="font-bold text-sm">
                      {overallHealth === 'good' ? 'Tất cả sinh viên đang tiến độ tốt' :
                       overallHealth === 'concerning' ? 'Có một số mối quan tâm' :
                       'Cần can thiệp ngay'}
                    </p>
                    <p className="text-xs text-secondary mt-1">
                      {overallHealth === 'good' ? 'Không có sinh viên nào có nguy cơ' :
                       overallHealth === 'concerning' ? 'Theo sát các sinh viên bên dưới' :
                       'Liên hệ ngay với sinh viên có nguy cơ cao'}
                    </p>
                  </div>
                </div>
                <p className="text-secondary text-sm">Nhấn "Phân tích AI" để xem danh sách chi tiết</p>
              </div>
            ) : isLoadingAtRisk ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {atRiskStudents.map((student) => (
                  <div
                    key={student.student_id}
                    className={cn(
                      "p-6 rounded-lg border-l-4",
                      student.risk_score >= 80 ? 'bg-red-50 border-red-500' :
                      student.risk_score >= 50 ? 'bg-amber-50 border-amber-500' :
                      'bg-blue-50 border-blue-500'
                    )}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-on-surface">{student.student_name}</h4>
                        <p className="text-xs text-secondary mt-1">ID: {student.student_id}</p>
                      </div>
                      <Badge className={cn(
                        student.risk_score >= 80 ? 'bg-red-100 text-red-700' :
                        student.risk_score >= 50 ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      )}>
                        Risk: {student.risk_score}%
                      </Badge>
                    </div>

                    <div className="mb-3">
                      <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-2">Yếu tố nguy cơ</p>
                      <div className="flex flex-wrap gap-2">
                        {student.risk_factors.map((factor, i) => (
                          <span key={i} className="text-xs bg-white/50 px-2 py-1 rounded">
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <span className="material-symbols-outlined text-primary">lightbulb</span>
                      <span className="text-secondary font-medium">{student.recommended_action}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
          <CardHeader>
            <CardTitle className="font-headline font-bold text-primary text-lg">
              Thao tác nhanh
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { icon: 'assignment_add', label: 'Tạo đề cương', href: '/lecturer/proposals', color: 'text-blue-600 bg-blue-50' },
                { icon: 'group_add', label: 'Nhận sinh viên', href: '/lecturer/students', color: 'text-emerald-600 bg-emerald-50' },
                { icon: 'rate_review', label: 'Chấm bài', href: '/lecturer/grading', color: 'text-amber-600 bg-amber-50' },
                { icon: 'feedback', label: 'Góp ý', href: '/lecturer/feedback', color: 'text-purple-600 bg-purple-50' },
                { icon: 'event_available', label: 'Lịch hẹn', href: '/lecturer/schedule', color: 'text-pink-600 bg-pink-50' },
                { icon: 'summarize', label: 'Báo cáo', href: '/lecturer', color: 'text-indigo-600 bg-indigo-50' },
              ].map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  onClick={() => router.push(action.href)}
                  className="flex flex-col items-center gap-2 h-auto py-4 border-slate-100 hover:border-primary-fixed hover:bg-primary-fixed/10"
                >
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", action.color)}>
                    <span className="material-symbols-outlined">{action.icon}</span>
                  </div>
                  <span className="text-xs font-medium text-on-surface">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (hours < 1) return 'Vừa xong'
  if (hours < 24) return `${hours} giờ trước`
  return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
  })
}

export default withLecturer(LecturerDashboardPage)
