'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { StudentPageIntro } from '@/components/student/StudentPageIntro'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useStudentSubmissions } from '@/hooks/student/use-student-submissions'
import { useStudentProfile } from '@/hooks/student/use-student-profile'
import { getAuthClient } from '@/lib/supabase/client'
import { api } from '@/lib/api/client'
import { useRouter } from 'next/navigation'

export default function SubmissionsPage() {
  const router = useRouter()
  const [userId, setUserId] = React.useState<string | null>(null)
  const [showUploadDialog, setShowUploadDialog] = React.useState(false)
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([])
  const [milestoneType, setMilestoneType] = React.useState('proposal')
  const [registrationId, setRegistrationId] = React.useState<string | null>(null)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const [currentRegistration, setCurrentRegistration] = React.useState<any>(null)
  const [isUploadingMultiple, setIsUploadingMultiple] = React.useState(false)

  React.useEffect(() => {
    const getUser = async () => {
      const supabase = getAuthClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUserId(session.user.id)
      }
    }
    getUser()
  }, [])

  const { profile } = useStudentProfile(userId || '')
  const {
    submissions,
    milestoneProgress,
    isLoading,
    error,
    isUploading,
    uploadSubmission,
  } = useStudentSubmissions(userId || '', currentRegistration?.proposal_type, registrationId)

  // Fetch registrations to get registration_id for upload
  React.useEffect(() => {
    if (!userId) return
    const fetchRegistration = async () => {
      try {
        const data = await api.registrations.list(userId)
        if (data && data.length > 0) {
          // 1. First, try to find a registration that is NOT 'completed' or 'rejected'
          const activeRegistrations = data.filter((r: any) => 
            !['completed', 'rejected'].includes(r.status)
          )
          
          let selection: any = null
          
          if (activeRegistrations.length > 0) {
            const statusOrder: Record<string, number> = { 
              'active': 0, 
              'approved': 1, 
              'pending': 2, 
              'completed': 3, 
              'rejected': 4 
            }
            
            // Pick the most relevant active one (KLTN first, then by status order, then by date)
            selection = activeRegistrations.sort((a: any, b: any) => {
              if (a.proposal_type !== b.proposal_type) return a.proposal_type === 'KLTN' ? -1 : 1
              const orderA = statusOrder[a.status] ?? 99
              const orderB = statusOrder[b.status] ?? 99
              if (orderA !== orderB) return orderA - orderB
              return new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime()
            })[0]
          } else {
            // If everything is completed/rejected, just pick the latest overall
            selection = [...data].sort((a: any, b: any) => 
              new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime()
            )[0]
          }
          
          setRegistrationId(selection.id)
          setCurrentRegistration(selection)
          console.log('[Submissions] Priority Selection:', selection.id, selection.proposal_type, selection.status)
        } else {
          setRegistrationId(null)
          setCurrentRegistration(null)
        }
      } catch (err: any) {
        console.error('[Submissions] Registration fetch error:', err)
      }
    }
    fetchRegistration()
  }, [userId])

  // Get all registrations for the switcher
  const [allRegistrations, setAllRegistrations] = React.useState<any[]>([])
  React.useEffect(() => {
    if (!userId) return
    api.registrations.list(userId).then(setAllRegistrations).catch(console.error)
  }, [userId])

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

  const completedCount = milestoneProgress.filter(m => m.completed).length
  const progressPercent = Math.round((completedCount / milestoneProgress.length) * 100)
  const circumference = 2 * Math.PI * 70

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files))
    }
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    console.log('[Upload] Starting upload:', {
      fileCount: selectedFiles.length,
      fileNames: selectedFiles.map(f => f.name),
      registrationId,
      milestoneType,
      hasUserId: !!userId,
      submissionsCount: submissions.length,
    })

    if (!registrationId) {
      console.error('[Upload] Cannot proceed: registrationId is missing')
      setUploadError('Chưa có đăng ký khóa luận nào. Vui lòng đăng ký đề tài trước khi nộp bài.')
      return
    }

    console.log('[Upload] Triggering upload with ID:', registrationId)

    setIsUploadingMultiple(true)
    let successCount = 0
    let errorCount = 0

    // Upload each file sequentially
    for (const file of selectedFiles) {
      try {
        console.log(`[Upload] Uploading file: ${file.name} for registration: ${registrationId}`)
        const result = await uploadSubmission(file, milestoneType, registrationId)
        if (result.success) {
          successCount++
        } else if (result.validationError) {
          setUploadError(result.validationError.error)
          errorCount++
          break // Stop on validation error
        } else {
          errorCount++
        }
      } catch (err: any) {
        console.error('[Upload] File upload error:', err)
        errorCount++
      }
    }

    setIsUploadingMultiple(false)

    if (successCount > 0) {
      setShowUploadDialog(false)
      setSelectedFiles([])
      // Refresh data
      window.location.reload()
    }

    if (errorCount > 0 && successCount > 0) {
      setUploadError(`Đã nộp thành công ${successCount} file, thất bại ${errorCount} file`)
    }
  }

  // Get current milestone info (first incomplete milestone)
  const currentMilestoneIndex = milestoneProgress.findIndex(m => !m.completed)
  const currentMilestone = currentMilestoneIndex >= 0 ? milestoneProgress[currentMilestoneIndex] : null

  if (isLoading || !userId) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-on-surface-variant text-sm">Đang tải...</p>
        </div>
      </div>
    )
  }

  return (
    <Shell
      role="student"
      user={user}
      breadcrumb={[{ label: 'Theses' }, { label: 'Trạng thái Đề tài' }]}
      notifications={0}
    >
      <div className="max-w-6xl mx-auto pt-4 sm:pt-6 pb-10 sm:pb-12 px-0 sm:px-2 lg:px-8">
        <StudentPageIntro
          eyebrow="Submissions"
          title={currentRegistration?.proposal_title || 'Theo dõi tiến độ nộp bài'}
          description="Quản lý các mốc nộp, xem trạng thái hồ sơ và theo dõi tiến độ thực hiện khóa luận trong một luồng thống nhất."
          meta={
            <>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800">Tiến độ hiện tại</span>
              <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">Sinh viên: {profile?.full_name || user.name}</span>
              {currentRegistration?.supervisor_name ? (
                <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">GVHD: {currentRegistration.supervisor_name}</span>
              ) : null}
            </>
          }
          actions={
            <div className="relative flex h-32 w-32 items-center justify-center">
              <svg className="h-full w-full -rotate-90 transform">
                <circle
                  className="text-secondary-container"
                  cx="64"
                  cy="64"
                  fill="transparent"
                  r="54"
                  stroke="currentColor"
                  strokeWidth="8"
                />
                <circle
                  className="text-primary"
                  cx="64"
                  cy="64"
                  fill="transparent"
                  r="54"
                  stroke="currentColor"
                  strokeDasharray={2 * Math.PI * 54}
                  strokeDashoffset={2 * Math.PI * 54 - (progressPercent / 100) * (2 * Math.PI * 54)}
                  strokeLinecap="round"
                  strokeWidth="8"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black text-primary">{progressPercent}%</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Hoàn thành</span>
              </div>
            </div>
          }
        />

        {currentRegistration?.status === 'completed' && currentRegistration?.proposal_type === 'BCTT' && (
          <Card className="mb-8 border-none bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-200">
            <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-3xl">
                  <span className="material-symbols-outlined">workspace_premium</span>
                </div>
                <div>
                  <h3 className="text-2xl font-black font-headline tracking-tight">Chúc mừng! Bạn đã hoàn thành BCTT</h3>
                  <p className="text-emerald-50/90 font-medium">Giảng viên đã duyệt báo cáo và đánh giá kết quả của bạn.</p>
                </div>
              </div>
              <Button 
                className="bg-white text-emerald-700 font-bold hover:bg-emerald-50 px-8 h-12 rounded-full shadow-lg transition-all active:scale-95"
                onClick={() => router.push('/student/proposals')}
              >
                Tiếp tục đăng ký KLTN
                <span className="material-symbols-outlined ml-2">arrow_forward</span>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {/* Progress Timeline (2/3) */}
          <div className="lg:col-span-2 bg-surface-container-low rounded-xl p-4 sm:p-6 lg:p-8">
            <h2 className="font-headline text-lg sm:text-xl font-bold text-primary mb-6 sm:mb-8">Lộ trình Thực hiện</h2>
            <div className="space-y-0">
              {milestoneProgress.map((milestone, index) => {
                const isCompleted = milestone.completed
                const isCurrent = !isCompleted && index === currentMilestoneIndex
                const isPending = !isCompleted && !isCurrent

                return (
                  <div
                    key={milestone.milestone}
                    className={cn(
                      "relative flex gap-6 pb-10",
                      index < milestoneProgress.length - 1 && "step-line"
                    )}
                  >
                    {/* Custom step line */}
                    {index < milestoneProgress.length - 1 && (
                      <div
                        className={cn(
                          "absolute left-5 top-10 w-0.5",
                          isCompleted ? "bg-primary" : "bg-slate-200"
                        )}
                        style={{ height: 'calc(100% + 2.5rem)' }}
                      />
                    )}
                    <div className={cn(
                      "z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-lg",
                      isCompleted && "bg-emerald-600 text-white shadow-emerald-200",
                      isCurrent && "bg-primary text-white shadow-primary/20 ring-4 ring-primary-fixed",
                      isPending && "bg-surface-container-highest text-slate-500 border border-slate-300"
                    )}>
                      <span
                        className="material-symbols-outlined"
                        style={{ fontVariationSettings: isCompleted ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        {isCompleted ? 'check' : isCurrent ? 'edit_note' : 'pending'}
                      </span>
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-1">
                        <h3 className={cn(
                          "font-bold text-lg",
                          isPending ? "text-slate-500" : "text-primary"
                        )}>
                          {milestone.milestone}
                        </h3>
                        <div className="flex items-center gap-2">
                          {/* Total score badge for graded submissions */}
                          {isCompleted && milestone.submission?.grades?.[0]?.total_score !== undefined && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 rounded-full">
                              <span className="material-symbols-outlined text-emerald-600 text-xs">star</span>
                              <span className="text-xs font-black text-emerald-700">
                                {milestone.submission.grades[0].total_score}
                              </span>
                            </div>
                          )}
                          <span className={cn(
                            "text-xs font-bold px-2 py-1 rounded-full uppercase",
                            isCompleted && "bg-emerald-50 text-emerald-700",
                            isCurrent && "bg-blue-50 text-blue-700",
                            isPending && "bg-slate-100 text-slate-500",
                            currentRegistration?.status === 'completed' && "bg-emerald-600 text-white"
                          )}>
                            {currentRegistration?.status === 'completed' ? 'Hoàn thành' : isCompleted ? 'Hoàn tất' : isCurrent ? 'Đang thực hiện' : 'Đang chờ'}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-on-surface-variant italic">
                        {milestone.milestone === 'Đề cương & Bản nháp' && '📌 GVHD nhận xét đề cương và bản thảo đầu tiên.'}
                        {milestone.milestone === 'Báo cáo Giữa kỳ' && '📌 GVHD chấm điểm tiến độ thực hiện & kết quả giữa kỳ.'}
                        {milestone.milestone === 'Nhận xét Phản biện' && '📌 GVPB chấm điểm và nhận xét phản biện chi tiết.'}
                        {milestone.milestone === 'Bảo vệ Hội đồng' && '📌 Hội đồng chấm điểm bảo vệ khóa luận cuối cùng.'}
                        {milestone.milestone === 'Báo cáo Thực tập' && '📌 GVHD chấm báo cáo thực tập cuối khóa.'}
                      </p>

                      {/* Upload button for next allowed milestone */}
                      {milestone.nextAllowed && (
                        <div className="mt-3">
                          <Button
                            className="bg-primary text-white font-bold text-sm py-2 px-4 rounded-lg flex items-center gap-2 hover:brightness-110 transition-all"
                            onClick={() => {
                              // Map Vietnamese milestone names to English submission types
                              const milestoneTypeMap: Record<string, string> = {
                                'Đề cương & Bản nháp': 'proposal',
                                'Báo cáo Giữa kỳ': 'interim',
                                'Nhận xét Phản biện': 'final',
                                'Bảo vệ Hội đồng': 'defense',
                                'Báo cáo Thực tập': 'bctt_report',
                              }
                              setMilestoneType(milestoneTypeMap[milestone.milestone] || 'proposal')
                              setShowUploadDialog(true)
                            }}
                          >
                            <span className="material-symbols-outlined text-sm">add_circle</span>
                            Nộp tài liệu
                          </Button>
                          <p className="text-xs text-primary mt-1 font-medium">
                            ✨ Đây là bước tiếp theo bạn cần nộp
                          </p>
                        </div>
                      )}

                      {/* Submission & Grade Info - Show ALL documents for this milestone */}
                      {milestone.submission && (
                        <div className="mt-4 space-y-3">
                          {/* Header showing all submissions count */}
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                              Tài liệu đã nộp ({milestone.completed ? 'Đã chấm' : 'Đang chờ'})
                            </h4>
                            {milestone.completed && milestone.submission?.grades?.[0]?.total_score && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 rounded-full">
                                <span className="material-symbols-outlined text-emerald-600 text-xs">star</span>
                                <span className="text-xs font-black text-emerald-700">
                                  {milestone.submission.grades[0].total_score}/10
                                </span>
                              </div>
                            )}
                          </div>

                          {/* List all submissions for this milestone */}
                          {submissions
                            .filter(s => {
                              const milestoneTypeMap: Record<string, string> = {
                                'Đề cương': 'proposal',
                                'Bản nháp': 'draft',
                                'Giữa kỳ': 'interim',
                                'Cuối kỳ': 'final',
                                'Slide': 'slide',
                                'Bảo vệ': 'defense',
                                'Báo cáo Thực tập': 'bctt_report',
                              }
                              return s.submission_type === milestoneTypeMap[milestone.milestone]
                            })
                            .map((sub, idx) => (
                              <div
                                key={sub.id}
                                className="p-3 bg-surface-container-low rounded-lg border border-outline/10"
                              >
                                <div className="flex items-start gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-sm">description</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-on-surface truncate">
                                      {sub.file_name}
                                    </p>
                                    <p className="text-[10px] text-secondary">
                                      Nộp: {new Date(sub.submitted_at).toLocaleDateString('vi-VN')}
                                    </p>
                                    {sub.status === 'graded' && sub.grades?.[0]?.feedback && (
                                      <div className="mt-2 p-2 bg-white rounded border border-emerald-100">
                                        <div className="flex items-center gap-1 mb-1">
                                          <span className="material-symbols-outlined text-emerald-600 text-xs">comment</span>
                                          <p className="text-[9px] font-bold text-emerald-800">Phản hồi</p>
                                        </div>
                                        <p className="text-xs text-emerald-900 line-clamp-2">
                                          {sub.grades[0].feedback}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  <Badge className={cn(
                                    sub.status === 'graded' ? 'bg-emerald-100 text-emerald-700' :
                                    sub.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                                    'bg-slate-100 text-slate-600',
                                    'text-[10px] flex-shrink-0'
                                  )}>
                                    {sub.status === 'graded' ? 'Đã chấm' : 'Đã nộp'}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Progress bar for current milestone */}
                      {isCurrent && (
                        <div className="w-full bg-secondary-container h-1.5 rounded-full mt-3 overflow-hidden">
                          <div className="bg-primary h-full rounded-full" style={{ width: `${60 + (index * 8)}%` }} />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sidebar Actions (1/3) */}
          <div className="space-y-6">
            {/* Actions Card */}
            <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-primary mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined">settings_suggest</span>
                Đề tài của tôi
              </h3>
              <div className="flex flex-col gap-3">
                <Button
                  className="w-full bg-secondary-container text-on-secondary-container font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:brightness-95 transition-all"
                  onClick={() => router.push('/student/proposals')}
                >
                  <span className="material-symbols-outlined text-xl">edit</span>
                  Chỉnh sửa tên đề tài
                </Button>
              </div>
            </div>


            {/* Submissions List - Mini */}
            <Card className="bg-surface-container-lowest shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="font-headline font-bold text-primary text-base flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">upload_file</span>
                  Bài đã nộp
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {submissions.length === 0 ? (
                  <p className="text-sm text-on-surface-variant text-center py-4">
                    Chưa có bài nộp nào
                  </p>
                ) : (
                  submissions.slice(0, 3).map((submission) => (
                    <div
                      key={submission.id}
                      className="p-3 bg-surface-container-low rounded-lg hover:bg-surface-container-low/80 transition-all"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-sm">description</span>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-on-surface truncate max-w-[120px]">
                              {submission.file_name}
                            </h4>
                            <p className="text-[10px] text-secondary">
                              Vòng {submission.round_number}
                            </p>
                          </div>
                        </div>
                        <Badge className={cn(
                          submission.status === 'graded' ? 'bg-emerald-100 text-emerald-700 text-[10px]' :
                          submission.status === 'submitted' ? 'bg-blue-100 text-blue-700 text-[10px]' :
                          'bg-slate-100 text-slate-600 text-[10px]'
                        )}>
                          {submission.status === 'graded' ?
                            (submission.score ? `${submission.score}` : 'Chấm') :
                            'Đã nộp'}
                        </Badge>
                      </div>
                      {submission.feedback && (
                        <p className="text-[10px] text-on-surface-variant line-clamp-2 mt-1">
                          {submission.feedback}
                        </p>
                      )}
                    </div>
                  ))
                )}
                {submissions.length > 0 && (
                  <Button
                    variant="outline"
                    className="w-full text-xs mt-2"
                    onClick={() => setShowUploadDialog(true)}
                  >
                    Xem tất cả ({submissions.length})
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Upload Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined">cloud_upload</span>
              </div>
              <div>
                <h3 className="text-lg font-bold font-headline text-primary">Nộp bài mới</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Bước tiếp theo: <span className="font-bold text-primary">{milestoneType}</span>
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Sequential order notice */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-sm">info</span>
                  <p className="text-xs text-blue-800">
                    {currentRegistration?.proposal_type === 'BCTT' 
                      ? "Bạn hãy nộp Báo cáo thực tập và các tài liệu liên quan tại đây."
                      : `Bạn cần nộp theo thứ tự. Sau khi nộp bước ${milestoneType} và được chấm, bạn mới có thể nộp bước tiếp theo.`
                    }
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold mb-2 block">Loại sản phẩm</label>
                <div className="p-3 bg-surface-container-lowest border border-outline-variant rounded-lg">
                  <p className="text-sm font-bold text-primary capitalize">
                    {milestoneType === 'proposal' && 'Đề cương'}
                    {milestoneType === 'draft' && 'Bản nháp'}
                    {milestoneType === 'interim' && 'Báo cáo giữa kỳ'}
                    {milestoneType === 'final' && 'Báo cáo cuối kỳ'}
                    {milestoneType === 'slide' && 'Slide bảo vệ'}
                    {milestoneType === 'defense' && 'Tài liệu bảo vệ'}
                    {milestoneType === 'bctt_report' && 'Báo cáo Thực tập'}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Đây là bước tiếp theo bạn được phép nộp
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold mb-2 block">Tệp tin</label>
                <input
                  type="file"
                  accept="*/*"
                  multiple
                  onChange={handleFileSelect}
                  className="w-full p-3 border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {selectedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-bold text-primary">
                      Đã chọn {selectedFiles.length} file:
                    </p>
                    {selectedFiles.slice(0, 5).map((file, idx) => (
                      <p key={idx} className="text-xs text-secondary truncate">
                        • {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                      </p>
                    ))}
                    {selectedFiles.length > 5 && (
                      <p className="text-xs text-secondary">
                        ...và {selectedFiles.length - 5} file khác
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-xs text-amber-800">
                  <span className="font-bold">Lưu ý:</span> Bạn có thể nộp nhiều tài liệu cho cùng một bước.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end mt-6">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setShowUploadDialog(false)
                  setSelectedFiles([])
                }}
                disabled={isUploadingMultiple}
              >
                Hủy
              </Button>
              <Button
                className="w-full sm:w-auto bg-primary text-white font-bold"
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || isUploadingMultiple}
              >
                {isUploadingMultiple ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Đang nộp...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm mr-1">cloud_upload</span>
                    Nộp {selectedFiles.length > 0 ? `${selectedFiles.length} file` : 'bài'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* FAB for quick help */}
      <button className="fixed bottom-5 right-5 sm:bottom-8 sm:right-8 w-12 h-12 sm:w-14 sm:h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all z-50">
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>help</span>
      </button>

      {uploadError && (
        <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-8 p-4 bg-error-container text-error rounded-lg flex items-center gap-3 shadow-lg z-50 max-w-[calc(100vw-2rem)] sm:max-w-none">
          <span className="material-symbols-outlined">error</span>
          <p className="text-sm">{uploadError}</p>
        </div>
      )}

      <style jsx global>{`
        .step-line::after {
          content: '';
          position: absolute;
          left: 1.25rem;
          top: 2.5rem;
          bottom: -0.5rem;
          width: 2px;
          background-color: #eceef0;
        }
        .step-line:last-child::after {
          display: none;
        }
      `}</style>
    </Shell>
  )
}
