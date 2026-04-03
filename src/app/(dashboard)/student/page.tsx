'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useStudentDashboard } from '@/hooks/student/use-student-dashboard'
import { useStudentProfile } from '@/hooks/student/use-student-profile'
import { useRouter } from 'next/navigation'
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
          <p className="text-on-surface-variant text-sm">Đang tải...</p>
        </div>
      </div>
    )
  }

  const user = profile
    ? {
        name: profile.full_name || profile.email.split('@')[0],
        email: profile.email,
        avatar: profile.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDQ8MNlnrDHc5LO4LZc75_OClKYdfqr9B11eTgJhDU5v4Jp3ZpPtaebIDNkawcLk-_FFcjW6UQpueA3-MXHWoC9eLC0ZJC9nWO2SRWBI8oELoQBr5q0SuyBwzYbahT-NREcu5ThuV24rsXpQq4oAk9g0IMiK2cXoeSKMVHOael7WJyWhMNZUrtpu0ZsUsl4j0ceHSS3HXYdEdoFi7l1fmY7x3JwzfYGrh0sNFnVXgNszborPk1WcFYGcjkjC_VRZl_gTjhyZmopg2E',
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
      breadcrumb={[{ label: 'Sinh viên' }, { label: 'Bảng điều khiển' }]}
      notifications={stats?.unreadNotifications || 0}
    >
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8">
        <div>
          <h2 className="text-4xl font-headline font-extrabold text-primary tracking-tight mb-2">
            Tổng quan Khóa luận
          </h2>
          <p className="text-on-surface-variant font-medium">
            Năm học 2024-2025 • Học kỳ 2
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="px-5 py-2.5 bg-white text-primary border border-primary-fixed font-semibold rounded-lg text-sm hover:bg-surface-container-low transition-all"
            onClick={() => router.push('/student/calendar')}
          >
            Xem lịch biểu
          </Button>
          <Button
            className="px-5 py-2.5 bg-primary text-white font-semibold rounded-lg text-sm hover:shadow-lg hover:shadow-primary/20 transition-all"
            onClick={() => router.push('/student/documents')}
          >
            Tải hướng dẫn
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Registered Thesis */}
        <Card className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-l-4 border-primary">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-primary-fixed text-primary rounded-lg">
              <span className="material-symbols-outlined">book</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Đã đăng ký</span>
          </div>
          <div className="text-3xl font-headline font-black text-on-surface">
            {stats?.registrationsCount || 0} Đề tài
          </div>
          <p className="text-xs text-slate-500 mt-1">Đã xác nhận cho HK2</p>
        </Card>

        {/* Status */}
        <Card className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-l-4 border-emerald-500">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <span className="material-symbols-outlined">verified</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Trạng thái</span>
          </div>
          <div className="text-3xl font-headline font-black text-on-surface">Đã duyệt</div>
          <div className="text-xs text-emerald-600 mt-1 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Đang thực hiện
          </div>
        </Card>

        {/* Progress */}
        <Card className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-l-4 border-blue-400">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <span className="material-symbols-outlined">bolt</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Hoàn thành</span>
          </div>
          <div className="text-3xl font-headline font-black text-on-surface">
            {Math.round(progressPercent)}%
          </div>
          <div className="w-full bg-secondary-container h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-primary h-full rounded-full" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </Card>

        {/* Feedback */}
        <Card className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-l-4 border-tertiary">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-tertiary-fixed text-tertiary rounded-lg">
              <span className="material-symbols-outlined">mark_chat_unread</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Phản hồi</span>
          </div>
          <div className="text-3xl font-headline font-black text-on-surface">
            {feedback && !feedback.is_read ? '1' : '0'}
          </div>
          <p className="text-xs text-tertiary mt-1 font-bold">
            {feedback && !feedback.is_read ? 'Chưa đọc từ GVHD' : 'Không có mới'}
          </p>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Thesis Info & Submissions */}
        <div className="lg:col-span-2 space-y-8">
          {/* Thesis Details Card */}
          <Card className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/50">
            <div className="flex justify-between items-start mb-6">
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-primary-fixed text-primary text-[10px] font-bold rounded uppercase tracking-wider">
                  HK2 2024-2025
                </span>
                {stats?.latestRegistrationStatus === 'approved' && (
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">lock</span> ĐÃ DUYỆT
                  </span>
                )}
              </div>
            </div>

            <h1 className="text-2xl font-headline font-bold text-primary mb-4 leading-tight">
              {stats?.latestRegistrationTitle || 'Chưa xác định đề tài'}
            </h1>

            <div className="flex flex-wrap gap-2 mb-8">
              <span className="px-3 py-1 bg-surface-container-low text-on-surface-variant text-xs font-medium rounded-full border border-slate-100">#AI</span>
              <span className="px-3 py-1 bg-surface-container-low text-on-surface-variant text-xs font-medium rounded-full border border-slate-100">#MachineLearning</span>
              <span className="px-3 py-1 bg-surface-container-low text-on-surface-variant text-xs font-medium rounded-full border border-slate-100">#Thesis</span>
              <span className="px-3 py-1 bg-surface-container-low text-on-surface-variant text-xs font-medium rounded-full border border-slate-100">#DataScience</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-surface-container-low rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center text-primary shadow-sm">
                  <span className="material-symbols-outlined text-2xl">person</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">GIẢNG VIÊN HƯỚNG DẪN</p>
                  <p className="font-bold text-on-surface">{supervisorName || 'Chưa xác định'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center text-primary shadow-sm">
                  <span className="material-symbols-outlined text-2xl">fingerprint</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MÃ SỐ ĐỀ TÀI</p>
                  <p className="font-bold text-on-surface">UTE-IT-2024-{stats?.registrationsCount ? String(stats.registrationsCount).padStart(4, '0') : '0000'}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Submissions & Scores */}
          {submissions.length > 0 ? (
            <Card className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/50">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <span className="material-symbols-outlined">graduation_cap</span>
                </div>
                <h3 className="text-lg font-headline font-bold text-primary">Điểm số các vòng nộp</h3>
              </div>
              <div className="space-y-3">
                {submissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-lg hover:border-primary-fixed hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
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
                        <p className="text-[10px] text-slate-400">
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
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                          sub.status === 'graded' ? "bg-emerald-100 text-emerald-600" :
                          sub.status === 'submitted' ? "bg-blue-100 text-blue-600" :
                          "bg-slate-100 text-slate-500"
                        )}>
                          {sub.status === 'graded' ? 'Đã chấm' :
                           sub.status === 'submitted' ? 'Đã nộp' : 'Chờ nộp'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {/* Thesis Progress Flow */}
          <Card className="bg-white p-8 rounded-xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 mb-8">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-lg font-headline font-bold text-primary">Lộ trình Khóa luận</h3>
              <span className="px-3 py-1 bg-primary-fixed text-primary text-[11px] font-bold rounded-full uppercase tracking-widest">
                GIAI ĐOẠN HIỆN TẠI: NỘP TÀI LIỆU
              </span>
            </div>
            <div className="relative flex justify-between">
              {/* Background Progress Line */}
              <div className="absolute top-5 left-0 w-full h-[2px] bg-slate-100 z-0"></div>
              <div
                className="absolute top-5 left-0 h-[2px] bg-primary z-0 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>

              {/* Progress Steps */}
              {progressSteps.map((step, index) => {
                const isCompleted = thesisProgress[index]?.completed || index < completedSteps
                const isCurrent = !isCompleted && index === completedSteps
                const isPending = !isCompleted && !isCurrent

                const stepIcons = [
                  { completed: 'check_circle', current: 'assignment', pending: 'flag' },
                  { completed: 'check_circle', current: 'edit_note', pending: 'description' },
                  { completed: 'check_circle', current: 'fact_check', pending: 'pending_actions' },
                  { completed: 'check_circle', current: 'psychology', pending: 'auto_awesome' },
                  { completed: 'check_circle', current: 'upload_file', pending: 'send' },
                  { completed: 'check_circle', current: 'school', pending: 'emoji_events' },
                ]

                const icon = isCompleted ? stepIcons[index].completed
                  : isCurrent ? stepIcons[index].current
                  : stepIcons[index].pending

                return (
                  <div key={step.id} className="relative z-10 flex flex-col items-center gap-3 group">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                        isCompleted && "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30",
                        isCurrent && "bg-white border-2 border-primary text-primary shadow-lg shadow-primary/30 scale-110",
                        isPending && "bg-slate-100 text-slate-400"
                      )}
                    >
                      <span className="material-symbols-outlined text-[22px]">{icon}</span>
                    </div>
                    <div className="text-center">
                      <p className={cn(
                        "text-xs font-bold transition-colors",
                        isCompleted ? "text-emerald-700" : isCurrent ? "text-primary" : "text-slate-400"
                      )}>{step.label}</p>
                      <p className="text-[10px] text-slate-400">
                        {isCompleted ? 'Đã xong' : isCurrent ? 'Đang chạy' : 'Chưa bắt đầu'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Recent Documents */}
          <Card className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/50">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-tertiary/10 text-tertiary rounded-lg">
                  <span className="material-symbols-outlined">folder</span>
                </div>
                <h3 className="text-lg font-headline font-bold text-primary">Tài liệu tham khảo</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/student/documents')}
                className="text-xs font-bold uppercase tracking-widest"
              >
                Xem tất cả
              </Button>
            </div>
            <div className="space-y-4">
              {recentDocuments.length === 0 ? (
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest text-center py-8">Không có tài liệu nào</p>
              ) : (
                recentDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 bg-white border border-slate-100 rounded-lg hover:border-primary-fixed hover:shadow-sm transition-all flex justify-between items-center group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 text-slate-500 flex items-center justify-center rounded">
                        <span className="material-symbols-outlined">picture_as_pdf</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{doc.title}</p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(doc.created_at).toLocaleDateString('vi-VN')} • {((doc.file_size || 0) / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(doc.file_url, '_blank')}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <span className="material-symbols-outlined">download</span>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Column - Supervisor Feedback */}
        <div className="lg:col-span-1">
          <Card className="bg-primary text-white p-8 rounded-xl shadow-xl shadow-primary/10 relative overflow-hidden h-full">
            {/* Decorative Icon */}
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <span className="material-symbols-outlined text-[120px]">forum</span>
            </div>

            <div className="relative z-10 flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">person</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Phản hồi từ Giảng viên</h4>
                  <p className="text-[10px] text-white/80 font-medium">
                    {feedback ? `Hoạt động: ${new Date(feedback.created_at).toLocaleDateString('vi-VN')}` : 'Không có'}
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
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                        {feedback.lecturer_name || 'Giảng viên'}
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full py-4 bg-tertiary text-on-tertiary-fixed font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-tertiary-container transition-all shadow-lg active:scale-95"
                    onClick={() => router.push('/student/feedback')}
                  >
                    <span className="material-symbols-outlined text-sm">reply</span> Phản hồi Giảng viên
                  </Button>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-center text-sm opacity-80">
                    Chưa có phản hồi từ giảng viên
                  </p>
                </div>
              )}
            </div>
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
