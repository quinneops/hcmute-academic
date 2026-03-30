'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useStudentRegistration } from '@/hooks/student/use-student-registration'
import { useStudentProfile } from '@/hooks/student/use-student-profile'
import { getAuthClient } from '@/lib/supabase/client'

export default function RegistrationPage() {
  const [userId, setUserId] = React.useState<string | null>(null)
  const [selectedRegistration, setSelectedRegistration] = React.useState<typeof registrations[0] | null>(null)

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
    registrations,
    isLoading,
    error,
    getStatusLabel,
  } = useStudentRegistration(userId || '')

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

  const statusCounts = {
    approved: registrations.filter(r => r.status === 'approved').length,
    pending: registrations.filter(r => r.status === 'pending').length,
    rejected: registrations.filter(r => r.status === 'rejected').length,
  }

  return (
    <Shell
      role="student"
      user={user}
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/student' }, { label: 'Đăng ký' }]}
      notifications={0}
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-display-sm font-headline font-extrabold text-primary tracking-tight">
            Đăng Ký Khóa Luận
          </h2>
          <p className="text-body-md text-on-surface-variant font-medium">
            Quản lý đăng ký đề tài khóa luận tốt nghiệp
          </p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-surface-container-lowest border-l-4 border-emerald-500 shadow-ambient-lg">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <span className="material-symbols-outlined text-xl">check_circle</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-headline-lg font-headline font-black text-on-surface">
              {statusCounts.approved}
            </div>
            <p className="text-label-md text-secondary mt-1">Đã duyệt</p>
          </CardContent>
        </Card>

        <Card className="bg-surface-container-lowest border-l-4 border-amber-500 shadow-ambient-lg">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <span className="material-symbols-outlined text-xl">pending_actions</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-headline-lg font-headline font-black text-on-surface">
              {statusCounts.pending}
            </div>
            <p className="text-label-md text-secondary mt-1">Chờ duyệt</p>
          </CardContent>
        </Card>

        <Card className="bg-surface-container-lowest border-l-4 border-slate-400 shadow-ambient-lg">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                <span className="material-symbols-outlined text-xl">history</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-headline-lg font-headline font-black text-on-surface">
              {statusCounts.rejected}
            </div>
            <p className="text-label-md text-secondary mt-1">Bị từ chối</p>
          </CardContent>
        </Card>
      </div>

      {/* Registration Cards */}
      <div className="space-y-6">
        {registrations.length === 0 ? (
          <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
            <CardContent className="py-12 text-center">
              <span className="material-symbols-outlined text-6xl text-secondary mb-4">description</span>
              <p className="text-secondary text-sm">Chưa có đăng ký nào</p>
            </CardContent>
          </Card>
        ) : (
          registrations.map((reg) => (
            <Card key={reg.id} className="bg-surface-container-lowest shadow-ambient-lg border-none overflow-hidden">
              <div className={cn(
                "h-1 w-full",
                reg.status === 'approved' ? 'bg-emerald-500' :
                reg.status === 'pending' ? 'bg-amber-500' :
                reg.status === 'rejected' ? 'bg-error' :
                'bg-slate-400'
              )} />

              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={cn(
                        "text-[10px] font-bold uppercase",
                        reg.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        reg.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        reg.status === 'rejected' ? 'bg-error-container text-error' :
                        'bg-slate-100 text-slate-600'
                      )}>
                        {getStatusLabel(reg.status)}
                      </Badge>
                    </div>
                    <CardTitle className="font-headline font-bold text-primary text-xl">
                      {reg.proposal_title}
                    </CardTitle>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-secondary mb-1">
                      {reg.supervisor_name || 'Chưa xác định'}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Status Timeline */}
                <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      reg.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                      reg.status === 'rejected' ? 'bg-error-container text-error' :
                      'bg-amber-100 text-amber-600'
                    )}>
                      <span className="material-symbols-outlined text-sm">
                        {reg.status === 'approved' ? 'check' :
                         reg.status === 'rejected' ? 'close' : 'pending'}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">
                        {getStatusLabel(reg.status)}
                      </p>
                      <p className="text-[10px] text-secondary">
                        Ngày duyệt: {reg.reviewed_at ? new Date(reg.reviewed_at).toLocaleDateString('vi-VN') : 'Chưa duyệt'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feedback Notes */}
                {reg.review_notes && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-blue-600 text-sm mt-0.5">feedback</span>
                      <div>
                        <p className="text-xs font-bold text-blue-800 mb-1">Nhận xét từ giảng viên</p>
                        <p className="text-sm text-blue-700 leading-relaxed">{reg.review_notes}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Meta Info */}
                <div className="flex justify-between items-center pt-4 border-t border-outline-variant/15">
                  <div className="flex items-center gap-4 text-xs text-secondary">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      Nộp: {new Date(reg.submitted_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-primary border-primary-fixed"
                      onClick={() => setSelectedRegistration(reg)}
                    >
                      <span className="material-symbols-outlined text-sm mr-1">visibility</span>
                      Xem chi tiết
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Info Banner */}
      <Card className="bg-primary-fixed/30 border border-primary-fixed mt-8">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined">info</span>
            </div>
            <div>
              <h4 className="font-bold text-primary mb-1">Thông tin đăng ký</h4>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Mỗi sinh viên được đăng ký <strong>1 đề tài duy nhất</strong>.
                Kết quả duyệt đề cương sẽ có trong vòng 5-7 ngày làm việc.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedRegistration && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto"
          onClick={() => setSelectedRegistration(null)}
        >
          <Card
            className="w-full max-w-3xl my-8 max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="border-b sticky top-0 bg-surface z-10">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <Badge className={cn(
                    "mb-2 text-[10px] font-bold uppercase",
                    selectedRegistration.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    selectedRegistration.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    selectedRegistration.status === 'rejected' ? 'bg-error-container text-error' :
                    'bg-slate-100 text-slate-600'
                  )}>
                    {getStatusLabel(selectedRegistration.status)}
                  </Badge>
                  <CardTitle className="font-headline font-bold text-primary text-xl">
                    {selectedRegistration.proposal_title}
                  </CardTitle>
                  {selectedRegistration.proposed_title && selectedRegistration.proposed_title !== selectedRegistration.proposal_title && (
                    <p className="text-sm text-secondary mt-1">
                      Đề xuất: {selectedRegistration.proposed_title}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedRegistration(null)}
                  className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-6 pb-8">
              {/* Supervisor Info */}
              <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-lg">
                <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-white font-bold">
                  <span className="material-symbols-outlined">school</span>
                </div>
                <div>
                  <p className="text-xs text-secondary uppercase tracking-wider">Giảng viên hướng dẫn</p>
                  <p className="font-bold text-on-surface">
                    {selectedRegistration.supervisor_name || 'Chưa xác định'}
                  </p>
                  {selectedRegistration.supervisor_email && (
                    <p className="text-sm text-secondary">{selectedRegistration.supervisor_email}</p>
                  )}
                </div>
              </div>

              {/* Motivation Letter */}
              {selectedRegistration.motivation_letter && (
                <div>
                  <h4 className="font-bold text-on-surface mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">edit_note</span>
                    Thư động lực
                  </h4>
                  <div className="p-4 bg-surface-container-low rounded-lg">
                    <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                      {selectedRegistration.motivation_letter}
                    </p>
                  </div>
                </div>
              )}

              {/* Submissions */}
              {selectedRegistration.submissions && selectedRegistration.submissions.length > 0 && (
                <div>
                  <h4 className="font-bold text-on-surface mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">assignment</span>
                    Các vòng nộp bài ({selectedRegistration.submissions.length})
                  </h4>
                  <div className="space-y-3">
                    {selectedRegistration.submissions.map((sub: any, index: number) => (
                      <Card key={sub.id} className="border border-outline-variant/20">
                        <CardContent className="py-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {sub.round_name || `Vòng ${sub.round_number}`}
                              </Badge>
                              <Badge className={cn(
                                "text-[10px]",
                                sub.status === 'graded' ? 'bg-emerald-100 text-emerald-700' :
                                sub.status === 'submitted' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-600'
                              )}>
                                {sub.status === 'graded' ? 'Đã chấm' :
                                 sub.status === 'submitted' ? 'Đã nộp' : sub.status}
                              </Badge>
                            </div>
                            {sub.graded_at && (
                              <span className="text-xs text-secondary">
                                Chấm: {new Date(sub.graded_at).toLocaleDateString('vi-VN')}
                              </span>
                            )}
                          </div>

                          {/* File Info */}
                          <div className="flex items-center gap-2 mb-3 p-3 bg-surface-container-low rounded-lg">
                            <span className="material-symbols-outlined text-secondary text-sm">
                              {sub.file_url?.endsWith('.pdf') ? 'picture_as_pdf' :
                               sub.file_url?.endsWith('.doc') || sub.file_url?.endsWith('.docx') ? 'description' :
                               sub.file_url?.endsWith('.ppt') || sub.file_url?.endsWith('.pptx') ? 'slideshow' :
                               'insert_drive_file'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-on-surface truncate">
                                {sub.file_name || 'File đính kèm'}
                              </p>
                              <p className="text-xs text-secondary">
                                {sub.file_size ? `${(sub.file_size / 1024 / 1024).toFixed(2)} MB` : ''}
                              </p>
                            </div>
                            {sub.file_url && (
                              <a
                                href={sub.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-surface-container-high rounded transition-colors"
                              >
                                <span className="material-symbols-outlined text-sm text-primary">open_in_new</span>
                              </a>
                            )}
                          </div>

                          {/* Grade Info */}
                          {sub.grades && sub.grades.length > 0 && sub.grades[0].is_published && (
                            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-emerald-600 text-sm">grading</span>
                                <span className="text-sm font-bold text-emerald-800">
                                  Điểm số: {sub.grades[0].total_score}/10
                                </span>
                              </div>
                              {sub.grades[0].feedback && (
                                <p className="text-sm text-emerald-700 whitespace-pre-wrap">
                                  {sub.grades[0].feedback}
                                </p>
                              )}
                              <p className="text-xs text-emerald-600 mt-2">
                                Giảng viên chấm: {sub.grades[0].grader_name}
                              </p>
                            </div>
                          )}

                          {/* Submitted At */}
                          <p className="text-xs text-secondary mt-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">schedule</span>
                            Nộp lúc: {new Date(sub.submitted_at).toLocaleString('vi-VN')}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback Thread */}
              {selectedRegistration.feedback_thread && selectedRegistration.feedback_thread.length > 0 && (
                <div>
                  <h4 className="font-bold text-on-surface mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">forum</span>
                    Phản hồi từ giảng viên ({selectedRegistration.feedback_thread.length})
                  </h4>
                  <div className="space-y-3">
                    {selectedRegistration.feedback_thread.map((fb: any, index: number) => (
                      <div
                        key={fb.id}
                        className={cn(
                          "p-4 rounded-lg border",
                          !fb.is_read ? 'bg-amber-50 border-amber-200' : 'bg-surface-container-low border-outline-variant/20'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {fb.lecturer_name?.[0]?.toUpperCase() || 'L'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="text-sm font-bold text-on-surface">
                                {fb.lecturer_name || 'Giảng viên'}
                              </p>
                              <span className="text-xs text-secondary">
                                {new Date(fb.created_at).toLocaleString('vi-VN')}
                              </span>
                            </div>
                            {!fb.is_read && (
                              <Badge className="mb-2 text-[10px]" variant="outline">
                                Mới
                              </Badge>
                            )}
                            <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                              {fb.content}
                            </p>
                            {fb.attachment_url && (
                              <a
                                href={fb.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 mt-2 text-primary text-sm hover:underline"
                              >
                                <span className="material-symbols-outlined text-sm">attach_file</span>
                                Xem file đính kèm
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Defense Session */}
              {selectedRegistration.defense_session && (
                <div>
                  <h4 className="font-bold text-on-surface mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">event</span>
                    Lịch bảo vệ
                  </h4>
                  <div className="p-4 bg-primary-fixed/30 rounded-lg border border-primary-fixed">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-sm">schedule</span>
                        <span className="text-on-surface">
                          {new Date(selectedRegistration.defense_session.scheduled_at).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      {selectedRegistration.defense_session.location && (
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-sm">location_on</span>
                          <span className="text-on-surface">
                            {selectedRegistration.defense_session.location}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Status Timeline */}
              <div>
                <h4 className="font-bold text-on-surface mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">timeline</span>
                  Trạng thái
                </h4>
                <div className="p-4 bg-surface-container-low rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      selectedRegistration.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                      selectedRegistration.status === 'rejected' ? 'bg-error-container text-error' :
                      'bg-amber-100 text-amber-600'
                    )}>
                      <span className="material-symbols-outlined">
                        {selectedRegistration.status === 'approved' ? 'check' :
                         selectedRegistration.status === 'rejected' ? 'close' : 'pending'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">
                        {getStatusLabel(selectedRegistration.status)}
                      </p>
                      <p className="text-xs text-secondary">
                        {selectedRegistration.reviewed_at
                          ? `Ngày duyệt: ${new Date(selectedRegistration.reviewed_at).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
                          : 'Chưa duyệt'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setSelectedRegistration(null)}
                >
                  Đóng
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 p-4 bg-error-container text-error rounded-lg flex items-center gap-3 shadow-lg">
          <span className="material-symbols-outlined">error</span>
          <p className="text-sm">{error}</p>
        </div>
      )}
    </Shell>
  )
}
