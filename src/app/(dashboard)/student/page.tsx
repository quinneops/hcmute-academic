'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useStudentDashboard } from '@/hooks/student/use-student-dashboard'
import { useStudentProfile } from '@/hooks/student/use-student-profile'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getAuthClient } from '@/lib/supabase/client'

const progressSteps = [
  { id: 1, name: 'Register', label: 'Đăng ký', status: 'completed' as const },
  { id: 2, name: 'Proposal', label: 'Đề cương', status: 'completed' as const },
  { id: 3, name: 'Approval', label: 'Duyệt', status: 'completed' as const },
  { id: 4, name: 'Execution', label: 'Thực hiện', status: 'completed' as const },
  { id: 5, name: 'Submission', label: 'Nộp tài liệu', status: 'current' as const },
  { id: 6, name: 'Defense', label: 'Bảo vệ', status: 'pending' as const },
]

export default function StudentDashboardPage() {
  const router = useRouter()
  const [userId, setUserId] = React.useState<string | null>(null)

  // Fetch current user
  React.useEffect(() => {
    const getUser = async () => {
      console.log('[StudentPage] Fetching user session...')
      console.log('[StudentPage] Before getAuthClient - localStorage keys:', typeof window !== 'undefined' ? Object.keys(localStorage) : 'window not available')
      console.log('[StudentPage] Before getAuthClient - raw storage:', typeof window !== 'undefined' ? {
        'sb-hhqwraokxkynkmushugf-auth-token': localStorage.getItem('sb-hhqwraokxkynkmushugf-auth-token'),
      } : {})

      // Use auth client that reads from localStorage
      const supabase = getAuthClient()

      // Try to get session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('[StudentPage] Session:', session)
      console.log('[StudentPage] Session error:', sessionError)

      // Also check current user directly
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      console.log('[StudentPage] User:', user)
      console.log('[StudentPage] User error:', userError)

      if (session || user) {
        const userId = session?.user?.id || user?.id
        console.log('[StudentPage] Setting userId:', userId)
        setUserId(userId)
      } else {
        console.log('[StudentPage] No session found, redirecting to login')
        router.push('/login')
      }
    }
    getUser()
  }, [])

  const {
    stats,
    thesisProgress,
    recentDocuments,
    feedback,
    submissions,
    supervisorName,
    isLoading: dashboardLoading,
    error: dashboardError,
  } = useStudentDashboard(userId || '')

  const { profile } = useStudentProfile(userId || '')

  const isLoading = !userId || dashboardLoading

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-secondary text-sm">Đang tải...</p>
        </div>
      </div>
    )
  }

  const user = profile
    ? {
        name: profile.full_name || profile.email.split('@')[0],
        email: profile.email,
        avatar: profile.avatar_url || '',
      }
    : {
        name: 'Sinh viên',
        email: '',
        avatar: '',
      }

  const completedSteps = thesisProgress.filter(s => s.completed).length
  const progressPercent = (completedSteps / progressSteps.length) * 100

  return (
    <Shell
      role="student"
      user={user}
      breadcrumb={[{ label: 'Bảng điều khiển' }]}
      notifications={stats?.unreadNotifications || 0}
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8">
        <div>
          <h2 className="text-display-sm font-headline font-extrabold text-primary tracking-tight mb-2">
            Tổng quan Khóa luận
          </h2>
          <p className="text-body-md text-on-surface-variant font-medium">
            Năm học 2024-2025 • Học kỳ 2
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="border-primary-fixed text-primary hover:bg-surface-container-low"
            onClick={() => router.push('/student/calendar')}
          >
            Xem lịch biểu
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 text-white shadow-glow-primary"
            onClick={() => router.push('/student/documents')}
          >
            Tải hướng dẫn
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Registered Thesis */}
        <Card className="bg-surface-container-lowest border-l-4 border-primary shadow-ambient-lg">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-primary-fixed text-primary rounded-lg">
                <span className="material-symbols-outlined text-xl">book</span>
              </div>
              <Badge variant="secondary" className="text-[10px] font-bold uppercase">
                Đã đăng ký
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-headline-lg font-headline font-black text-on-surface">
              {stats?.registrationsCount || 0}
            </div>
            <p className="text-label-md text-secondary mt-1">Đề tài đã đăng ký</p>
          </CardContent>
        </Card>

        {/* Status */}
        <Card className="bg-surface-container-lowest border-l-4 border-emerald-500 shadow-ambient-lg">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <span className="material-symbols-outlined text-xl">verified</span>
              </div>
              <Badge variant="secondary" className="text-[10px] font-bold uppercase">
                Trạng thái
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-headline-lg font-headline font-black text-on-surface">Đã duyệt</div>
            <div className="flex items-center gap-1 text-emerald-600 mt-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <span className="text-label-md font-medium">Đang thực hiện</span>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        <Card className="bg-surface-container-lowest border-l-4 border-blue-400 shadow-ambient-lg">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <span className="material-symbols-outlined text-xl">bolt</span>
              </div>
              <Badge variant="secondary" className="text-[10px] font-bold uppercase">
                Hoàn thành
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-headline-lg font-headline font-black text-on-surface">
              {Math.round(progressPercent)}%
            </div>
            <Progress value={progressPercent} className="h-2 mt-3 bg-secondary-container" indicatorClassName="bg-primary" />
          </CardContent>
        </Card>

        {/* Feedback */}
        <Card className="bg-surface-container-lowest border-l-4 border-tertiary shadow-ambient-lg">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-tertiary-fixed text-tertiary rounded-lg">
                <span className="material-symbols-outlined text-xl">mark_chat_unread</span>
              </div>
              <Badge variant="secondary" className="text-[10px] font-bold uppercase">
                Phản hồi
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-headline-lg font-headline font-black text-on-surface">
              {feedback && !feedback.is_read ? '1' : '0'}
            </div>
            <p className="text-label-md text-tertiary mt-1 font-bold">
              {feedback && !feedback.is_read ? 'Chưa đọc từ GVHD' : 'Không có mới'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Thesis Info & Submissions */}
        <div className="lg:col-span-2 space-y-8">
          {/* Thesis Proposal Info Card */}
          {(stats?.latestRegistrationTitle || supervisorName) && (
            <Card className="bg-gradient-to-r from-primary to-primary-container text-white shadow-xl shadow-primary/10 border-none">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-white/80">school</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Đề tài khóa luận</span>
                    </div>
                    <h3 className="text-xl font-bold mb-1">{stats?.latestRegistrationTitle || 'Chưa xác định'}</h3>
                    {supervisorName && (
                      <p className="text-sm text-white/80 flex items-center gap-1 mt-2">
                        <span className="material-symbols-outlined text-sm">person</span>
                        GVHD: <strong>{supervisorName}</strong>
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submissions & Scores */}
          {submissions.length > 0 && (
            <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="font-headline font-bold text-primary text-lg flex items-center gap-2">
                    <span className="material-symbols-outlined">graduation_cap</span>
                    Điểm số các vòng nộp
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {submissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg border border-outline-variant/10"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center",
                          sub.status === 'graded' ? "bg-emerald-50 text-emerald-600" :
                          sub.status === 'submitted' ? "bg-blue-50 text-blue-600" :
                          "bg-slate-100 text-slate-500"
                        )}>
                          <span className="material-symbols-outlined text-xl">
                            {sub.status === 'graded' ? 'check_circle' :
                             sub.status === 'submitted' ? 'upload_file' : 'schedule'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">{sub.round_name}</p>
                          <p className="text-[10px] text-secondary">
                            {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('vi-VN') : 'Chưa nộp'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {sub.score !== null && sub.score !== undefined ? (
                          <>
                            <p className="text-2xl font-black text-primary">{sub.score}</p>
                            {sub.grade && (
                              <p className="text-[10px] font-bold text-secondary">Hạng: {sub.grade}</p>
                            )}
                          </>
                        ) : (
                          <Badge variant="outline" className={cn(
                            sub.status === 'graded' ? "border-emerald-300 text-emerald-600" :
                            sub.status === 'submitted' ? "border-blue-300 text-blue-600" :
                            "border-slate-300 text-slate-500"
                          )}>
                            {sub.status === 'graded' ? 'Đã chấm' :
                             sub.status === 'submitted' ? 'Đã nộp' : 'Chờ nộp'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {/* Thesis Progress Flow */}
          <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="font-headline font-bold text-primary text-lg">
                  Lộ trình Khóa luận
                </CardTitle>
                <Badge className="bg-primary-fixed text-primary text-[10px] font-bold uppercase tracking-widest">
                  Giai đoạn hiện tại: Nộp tài liệu
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative flex justify-between items-center">
                {/* Progress Line */}
                <div className="absolute top-5 left-0 w-full h-[2px] bg-slate-100 z-0" />
                <div
                  className="absolute top-5 left-0 h-[2px] bg-primary z-0 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />

                {/* Steps */}
                {progressSteps.map((step, index) => {
                  const isCompleted = thesisProgress[index]?.completed || index < completedSteps
                  const isCurrent = !isCompleted && index === completedSteps
                  const isPending = !isCompleted && !isCurrent

                  return (
                    <div key={step.id} className="relative z-10 flex flex-col items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center shadow-md",
                          isCompleted && "bg-primary text-white",
                          isCurrent && "bg-white border-4 border-primary text-primary ring-4 ring-primary-fixed",
                          isPending && "bg-slate-200 text-slate-500 opacity-40"
                        )}
                      >
                        {isCompleted ? (
                          <span className="material-symbols-outlined text-xl">check</span>
                        ) : isCurrent ? (
                          <span className="material-symbols-outlined text-xl">upload_file</span>
                        ) : (
                          <span className="material-symbols-outlined text-xl">flag</span>
                        )}
                      </div>
                      <div className="text-center">
                        <p className={cn(
                          "text-xs font-bold",
                          isCurrent || isCompleted ? "text-on-surface" : "text-slate-400"
                        )}>
                          {step.label}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {isCompleted ? 'Đã xong' : isCurrent ? 'Đang thực hiện' : ''}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Documents */}
          <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="font-headline font-bold text-primary text-lg flex items-center gap-2">
                  <span className="material-symbols-outlined">folder</span>
                  Tài liệu tham khảo
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/student/documents')}
                >
                  Xem tất cả
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentDocuments.length === 0 ? (
                <p className="text-secondary text-sm text-center py-8">Không có tài liệu nào</p>
              ) : (
                recentDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="group flex items-center justify-between p-4 bg-surface-container-lowest rounded-lg border border-slate-100 hover:border-primary-fixed hover:bg-blue-50/30 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-red-50 text-red-600 flex items-center justify-center rounded">
                        <span className="material-symbols-outlined">picture_as_pdf</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{doc.title}</p>
                        <p className="text-[10px] text-secondary">
                          {new Date(doc.created_at).toLocaleDateString('vi-VN')} • {(doc.file_size || 0 / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => window.open(doc.file_url, '_blank')}>
                        <span className="material-symbols-outlined">download</span>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Supervisor Feedback */}
        <div className="lg:col-span-1">
          <Card className="bg-primary text-white shadow-xl shadow-primary/10 relative overflow-hidden h-full">
            {/* Decorative Icon */}
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <span className="material-symbols-outlined text-[120px]">forum</span>
            </div>

            <CardContent className="relative z-10 flex flex-col h-full p-8">
              {/* Header */}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">person</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm">Phản hồi từ Giảng viên</h4>
                  <p className="text-[10px] text-on-primary-container font-medium">
                    {feedback ? new Date(feedback.created_at).toLocaleDateString('vi-VN') : 'Không có'}
                  </p>
                </div>
              </div>

              {/* Feedback Content */}
              {feedback ? (
                <>
                  <div className="bg-white/10 backdrop-blur-md p-6 rounded-lg border border-white/10 flex-1 mb-8">
                    <span className="material-symbols-outlined text-tertiary-fixed text-3xl mb-4">format_quote</span>
                    <p className="text-sm leading-relaxed font-medium italic">
                      {feedback.content}
                    </p>
                    <div className="mt-6 flex justify-end">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-on-primary-container">
                        {feedback.lecturer_name || 'Giảng viên'}
                      </span>
                    </div>
                  </div>

                  {/* Reply Button */}
                  <Button
                    className="w-full py-4 bg-tertiary text-on-tertiary-fixed font-bold rounded-lg"
                    onClick={() => router.push('/student/feedback')}
                  >
                    <span className="material-symbols-outlined text-sm mr-2">reply</span>
                    Phản hồi Giảng viên
                  </Button>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-center text-sm opacity-80">
                    Chưa có phản hồi từ giảng viên
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {dashboardError && (
        <div className="mt-6 p-4 bg-error-container text-error rounded-lg flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
          <p className="text-sm">{dashboardError}</p>
        </div>
      )}
    </Shell>
  )
}
