'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useStudentSubmissions } from '@/hooks/student/use-student-submissions'
import { useStudentProfile } from '@/hooks/student/use-student-profile'
import { getAuthClient } from '@/lib/supabase/client'
import { api } from '@/lib/api/client'

const milestones = [
  { name: 'Đăng ký', status: 'completed' },
  { name: 'Đề cương', status: 'completed' },
  { name: 'Chương 1-2', status: 'completed' },
  { name: 'Chương 3-4', status: 'current' },
  { name: 'Hoàn thiện', status: 'pending' },
  { name: 'Bảo vệ', status: 'pending' },
]

export default function SubmissionsPage() {
  const [userId, setUserId] = React.useState<string | null>(null)
  const [showUploadDialog, setShowUploadDialog] = React.useState(false)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [milestoneType, setMilestoneType] = React.useState('proposal')
  const [registrationId, setRegistrationId] = React.useState<string | null>(null)
  const [uploadError, setUploadError] = React.useState<string | null>(null)

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
  } = useStudentSubmissions(userId || '')

  // Fetch registrations to get registration_id for upload
  React.useEffect(() => {
    if (!userId) return
    const fetchRegistration = async () => {
      try {
        const data = await api.registrations.list(userId)
        if (data && data.length > 0) {
          setRegistrationId(data[0].id)
          console.log('[Submissions] Got registration:', data[0].id)
        } else {
          console.log('[Submissions] No registrations found')
          setRegistrationId(null)
        }
      } catch (err: any) {
        console.error('[Submissions] Registration fetch error:', err)
        setRegistrationId(null)
      }
    }
    fetchRegistration()
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
  const progressPercent = (completedCount / milestoneProgress.length) * 100

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    const roundNumber = milestoneProgress.filter(m => m.completed).length + 1

    console.log('[Upload] Starting upload:', {
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      registrationId,
      roundNumber,
      hasUserId: !!userId,
      submissionsCount: submissions.length,
    })

    if (!registrationId) {
      setUploadError('Chưa có đăng ký khóa luận nào. Vui lòng đăng ký đề tài trước khi nộp bài.')
      return
    }

    const result = await uploadSubmission(selectedFile, roundNumber, registrationId)

    if (result.success) {
      setShowUploadDialog(false)
      setSelectedFile(null)
    }
  }

  if (isLoading || !userId) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-secondary text-sm">Đang tải...</p>
        </div>
      </div>
    )
  }

  return (
    <Shell
      role="student"
      user={user}
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/student' }, { label: 'Nộp bài' }]}
      notifications={0}
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-display-sm font-headline font-extrabold text-primary tracking-tight">
            Nộp Bài & Sản Phẩm
          </h2>
          <p className="text-body-md text-on-surface-variant font-medium">
            Theo dõi lịch sử nộp bài và điểm số
          </p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-white shadow-glow-primary"
          onClick={() => setShowUploadDialog(true)}
        >
          <span className="material-symbols-outlined text-sm mr-2">cloud_upload</span>
          Nộp sản phẩm mới
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Submissions List */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
            <CardHeader>
              <CardTitle className="font-headline font-bold text-primary text-lg">
                Lịch sử nộp bài
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {submissions.length === 0 ? (
                <p className="text-secondary text-sm text-center py-8">
                  Chưa có bài nộp nào
                </p>
              ) : (
                submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="p-4 bg-surface-container-low rounded-lg hover:bg-surface-container-low/80 transition-all"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <span className="material-symbols-outlined">description</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-on-surface">{submission.file_name}</h4>
                          <p className="text-[10px] text-secondary">
                            {(submission.file_size || 0 / 1024 / 1024).toFixed(1)} MB • Vòng {submission.round_number}
                          </p>
                        </div>
                      </div>
                      <Badge className={cn(
                        submission.status === 'graded' ? 'bg-emerald-100 text-emerald-700' :
                        submission.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      )}>
                        {submission.status === 'graded' ?
                          (submission.score ? `Điểm: ${submission.score}` : 'Đã chấm') :
                          'Đã nộp'}
                      </Badge>
                    </div>

                    {submission.feedback && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-blue-600 text-sm mt-0.5">feedback</span>
                          <p className="text-xs text-blue-800">{submission.feedback}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-outline-variant/10">
                      <span className="text-xs text-secondary">
                        {new Date(submission.submitted_at).toLocaleDateString('vi-VN')}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-secondary hover:text-primary"
                          onClick={() => window.open(submission.file_url, '_blank')}
                        >
                          <span className="material-symbols-outlined text-sm">download</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Progress Timeline */}
        <div>
          <Card className="bg-surface-container-lowest shadow-ambient-lg border-none sticky top-24">
            <CardHeader>
              <CardTitle className="font-headline font-bold text-primary text-lg">
                Tiến độ thực hiện
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overall Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-on-surface">Hoàn thành</span>
                  <span className="text-xs font-bold text-primary">{Math.round(progressPercent)}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" indicatorClassName="bg-primary" />
              </div>

              {/* Timeline */}
              <div className="space-y-4">
                {milestoneProgress.map((milestone, index) => (
                  <div key={milestone.milestone} className="flex items-start gap-3">
                    <div className="relative">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center",
                        milestone.completed ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400'
                      )}>
                        <span className="material-symbols-outlined text-xs">
                          {milestone.completed ? 'check' : 'flag'}
                        </span>
                      </div>
                      {index < milestoneProgress.length - 1 && (
                        <div className={cn(
                          "absolute top-6 left-1/2 -translate-x-1/2 w-0.5 h-8",
                          milestone.completed ? 'bg-primary' : 'bg-slate-200'
                        )} />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className={cn(
                        "text-sm font-medium",
                        milestone.completed ? 'text-on-surface' : 'text-slate-400'
                      )}>
                        {milestone.milestone}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Nộp bài mới</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold mb-2 block">Loại sản phẩm</label>
                <select
                  className="w-full p-3 border border-outline-variant rounded-lg text-sm"
                  value={milestoneType}
                  onChange={(e) => setMilestoneType(e.target.value)}
                >
                  <option value="proposal">Đề cương</option>
                  <option value="draft">Bản nháp</option>
                  <option value="interim">Báo cáo giữa kỳ</option>
                  <option value="final">Bản cuối</option>
                  <option value="slide">Slide bảo vệ</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-bold mb-2 block">Tệp tin</label>
                <input
                  type="file"
                  accept="*/*"
                  onChange={handleFileSelect}
                  className="w-full p-3 border border-outline-variant rounded-lg text-sm"
                />
                {selectedFile && (
                  <p className="text-xs text-secondary mt-1">
                    Đã chọn: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUploadDialog(false)
                  setSelectedFile(null)
                }}
              >
                Hủy
              </Button>
              <Button
                className="bg-primary text-white"
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm mr-1">cloud_upload</span>
                    Nộp bài
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {uploadError && (
        <div className="fixed bottom-4 right-4 p-4 bg-error-container text-error rounded-lg flex items-center gap-3 shadow-lg">
          <span className="material-symbols-outlined">error</span>
          <p className="text-sm">{uploadError}</p>
        </div>
      )}
    </Shell>
  )
}
