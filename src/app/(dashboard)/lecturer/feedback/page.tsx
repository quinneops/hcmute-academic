'use client'

import * as React from 'react'
import { FlowPageIntro } from '@/components/flow/FlowPageIntro'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api/client'
import { withLecturer } from '@/hocs/with-role-check'
import { useAuthUser } from '@/hooks/use-auth-user'
import { createClient } from '@/lib/supabase/client'

interface Feedback {
  id: string
  registration_id: string
  student_id: string
  student_name: string
  student_code: string
  thesis_title: string
  content: string
  type: 'written' | 'meeting'
  is_read: boolean
  created_at: string
}

interface Student {
  id: string
  student_id: string
  student_name: string
  student_code: string
  thesis_title: string
  registration_id?: string
  category?: string
}

function LecturerFeedbackPage() {
  const [feedbacks, setFeedbacks] = React.useState<Feedback[]>([])
  const [students, setStudents] = React.useState<Student[]>([])
  const { user } = useAuthUser()
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isComposing, setIsComposing] = React.useState(false)
  const [selectedStudentId, setSelectedStudentId] = React.useState('')
  const [feedbackContent, setFeedbackContent] = React.useState('')
  const [feedbackType, setFeedbackType] = React.useState<'written' | 'meeting'>('written')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isGeneratingAi, setIsGeneratingAi] = React.useState(false)
  const [aiFeedback, setAiFeedback] = React.useState<{
    feedback_draft: string
    strengths: string[]
    areas_for_improvement: string[]
    suggestions: string[]
    encouragement: string
  } | null>(null)
  const [feedbackQuality, setFeedbackQuality] = React.useState<{
    tone_analysis: { score: number; detected_tone: string; issues: string[] }
    suggested_revisions: Array<{ original: string; suggested: string; reason: string }>
    missing_elements: string[]
  } | null>(null)
  const [isCheckingQuality, setIsCheckingQuality] = React.useState(false)

  const fetchFeedback = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await api.lecturer.feedback.list()
      setFeedbacks(data.feedbacks || [])
      setStudents(data.students || [])

      // Set first student as default for compose form
      if (data.students?.length > 0) {
        setSelectedStudentId(data.students[0].student_id)
      }
    } catch (err: any) {
      console.error('Feedback fetch error:', err)
      setError(err.message || 'Không thể tải lịch sử góp ý')
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchFeedback()
  }, [fetchFeedback])

  const handleSubmitFeedback = async () => {
    if (!selectedStudentId || !feedbackContent.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      // Find registration_id for selected student
      const student = students.find(s => s.student_id === selectedStudentId)
      if (!student) return

      // We need to get registration_id from somewhere
      // For now, we'll need to fetch it or store it in the student object
      // This is a simplification - in production you'd want to fetch registrations

      await api.lecturer.feedback.create({
        registration_id: student.registration_id || student.id,
        content: feedbackContent,
        type: feedbackType,
      })

      setFeedbackContent('')
      setIsComposing(false)
      await fetchFeedback()
    } catch (err: any) {
      console.error('Submit feedback error:', err)
      setError(err.message || 'Không thể gửi góp ý')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGenerateAiFeedback = async () => {
    if (!selectedStudentId) return

    setIsGeneratingAi(true)
    setError(null)
    setAiFeedback(null)

    try {
      const student = students.find(s => s.student_id === selectedStudentId)
      if (!student) return

      // Get access token from session
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Phiên đăng nhập đã hết hạn')
        setIsGeneratingAi(false)
        return
      }

      const response = await fetch('/api/ai/feedback-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          proposal_title: student.thesis_title,
          student_name: student.student_name,
          category: student.category,
          criteria_scores: {
            criteria_1: { score: 8, justification: 'Tốt' },
            criteria_2: { score: 7.5, justification: 'Khá' },
            criteria_3: { score: 8.5, justification: 'Rất tốt' },
            criteria_4: { score: 7, justification: 'Khá' },
          },
          total_score: 7.75,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Không thể tạo phản hồi AI')
      }

      const data = await response.json()
      setAiFeedback({
        feedback_draft: data.feedback_draft,
        strengths: data.strengths,
        areas_for_improvement: data.areas_for_improvement,
        suggestions: data.suggestions,
        encouragement: data.encouragement,
      })

      setFeedbackContent(data.feedback_draft)
    } catch (err: any) {
      console.error('AI feedback error:', err)
      setError(err.message || 'Không thể tạo phản hồi từ AI')
    } finally {
      setIsGeneratingAi(false)
    }
  }

  const handleCheckFeedbackQuality = async () => {
    if (!feedbackContent.trim()) return

    setIsCheckingQuality(true)
    setError(null)
    setFeedbackQuality(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Phiên đăng nhập đã hết hạn')
        setIsCheckingQuality(false)
        return
      }

      const student = students.find(s => s.student_id === selectedStudentId)

      const response = await fetch('/api/ai/feedback-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          feedback_content: feedbackContent,
          student_name: student?.student_name,
          total_score: 7.5,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Không thể kiểm tra chất lượng')
      }

      const data = await response.json()
      setFeedbackQuality({
        tone_analysis: data.tone_analysis,
        suggested_revisions: data.suggested_revisions,
        missing_elements: data.missing_elements,
      })
    } catch (err: any) {
      console.error('AI quality check error:', err)
      setError(err.message || 'Không thể kiểm tra từ AI')
    } finally {
      setIsCheckingQuality(false)
    }
  }

  if (isLoading) {
    return (
      <Shell 
        role="lecturer" 
        isTbm={user?.is_tbm}
        user={{ name: '...', email: '...', avatar: '' }} 
        breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Góp ý' }]}
      >
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
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Góp ý' }]}
      notifications={0}
    >
      <FlowPageIntro
        eyebrow="Lecturer / feedback"
        title="Góp ý sinh viên"
        description="Quản lý các góp ý đã gửi, tạo phản hồi mới và giữ toàn bộ trao đổi trong một bố cục đồng nhất hơn."
        actions={
          <Button onClick={() => setIsComposing(!isComposing)}>
            <span className="material-symbols-outlined text-sm mr-2">{isComposing ? 'close' : 'edit'}</span>
            {isComposing ? 'Hủy' : 'Viết góp ý mới'}
          </Button>
        }
      />

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg text-error">
          <p className="font-bold">Lỗi: {error}</p>
        </div>
      )}

      {/* Compose Form */}
      {isComposing && (
        <Card className="bg-surface-container-lowest shadow-ambient-lg border-none mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="font-headline font-bold text-primary text-lg">
                Viết góp ý mới
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setIsComposing(false)}>
                <span className="material-symbols-outlined text-sm">close</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-bold text-secondary uppercase block mb-2">Chọn sinh viên</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-low rounded-lg border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {students.map((student) => (
                  <option key={student.student_id} value={student.student_id}>
                    {student.student_name} - {student.student_code}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-bold text-secondary uppercase block mb-2">Loại góp ý</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    checked={feedbackType === 'written'}
                    onChange={() => setFeedbackType('written')}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-on-surface">Viết (qua hệ thống)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    checked={feedbackType === 'meeting'}
                    onChange={() => setFeedbackType('meeting')}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-on-surface">Gặp trực tiếp</span>
                </label>
              </div>
            </div>
            <div>
              <label className="text-sm font-bold text-secondary uppercase block mb-2">Nội dung</label>
              <textarea
                value={feedbackContent}
                onChange={(e) => setFeedbackContent(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-low rounded-lg border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary min-h-[150px]"
                placeholder="Nhập nội dung góp ý cho sinh viên..."
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100"
                onClick={handleGenerateAiFeedback}
                disabled={isGeneratingAi || !selectedStudentId}
              >
                {isGeneratingAi ? (
                  <>
                    <span className="material-symbols-outlined text-sm mr-2 animate-spin">progress_activity</span>
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm mr-2">auto_awesome</span>
                    Tạo phản hồi AI
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                onClick={handleCheckFeedbackQuality}
                disabled={isCheckingQuality || !feedbackContent.trim()}
              >
                {isCheckingQuality ? (
                  <>
                    <span className="material-symbols-outlined text-sm mr-2 animate-spin">progress_activity</span>
                    Đang kiểm tra...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm mr-2">verified</span>
                    Kiểm tra chất lượng
                  </>
                )}
              </Button>
              <Button
                className="bg-primary text-white flex-1"
                onClick={handleSubmitFeedback}
                disabled={isSubmitting || !feedbackContent.trim() || !selectedStudentId}
              >
                <span className="material-symbols-outlined text-sm mr-2">send</span>
                Gửi góp ý
              </Button>
              <Button variant="outline" onClick={() => setIsComposing(false)} disabled={isSubmitting}>
                Hủy
              </Button>
            </div>

            {/* AI Feedback Quality Report */}
            {feedbackQuality && (
              <Card className={cn(
                "border-2",
                feedbackQuality.tone_analysis.score >= 80 ? "bg-emerald-50 border-emerald-200" :
                feedbackQuality.tone_analysis.score >= 60 ? "bg-amber-50 border-amber-200" :
                "bg-orange-50 border-orange-200"
              )}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        feedbackQuality.tone_analysis.score >= 80 ? "bg-emerald-100 text-emerald-600" :
                        feedbackQuality.tone_analysis.score >= 60 ? "bg-amber-100 text-amber-600" :
                        "bg-orange-100 text-orange-600"
                      )}>
                        <span className="material-symbols-outlined text-sm">{feedbackQuality.tone_analysis.score >= 80 ? 'check_circle' : 'warning'}</span>
                      </div>
                      <p className={cn(
                        "text-sm font-bold",
                        feedbackQuality.tone_analysis.score >= 80 ? "text-emerald-900" :
                        feedbackQuality.tone_analysis.score >= 60 ? "text-amber-900" :
                        "text-orange-900"
                      )}>Chất lượng phản hồi</p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-xl font-bold",
                        feedbackQuality.tone_analysis.score >= 80 ? "text-emerald-600" :
                        feedbackQuality.tone_analysis.score >= 60 ? "text-amber-600" :
                        "text-orange-600"
                      )}>{feedbackQuality.tone_analysis.score}/100</p>
                      <p className="text-xs text-secondary capitalize">{feedbackQuality.tone_analysis.detected_tone}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {feedbackQuality.tone_analysis.issues.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-secondary uppercase mb-2">Vấn đề:</p>
                      <ul className="text-xs text-on-surface-variant list-disc list-inside space-y-1">
                        {feedbackQuality.tone_analysis.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                      </ul>
                    </div>
                  )}
                  {feedbackQuality.suggested_revisions.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-secondary uppercase mb-2">Gợi ý chỉnh sửa:</p>
                      <div className="space-y-2">
                        {feedbackQuality.suggested_revisions.map((rev, i) => (
                          <div key={i} className="p-2 bg-white rounded text-xs">
                            <p className="text-slate-500 line-through">{rev.original}</p>
                            <p className="text-emerald-700 font-medium">{rev.suggested}</p>
                            <p className="text-slate-400 mt-1">{rev.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {feedbackQuality.missing_elements.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-secondary uppercase mb-2">Thiếu:</p>
                      <ul className="text-xs text-on-surface-variant list-disc list-inside space-y-1">
                        {feedbackQuality.missing_elements.map((el, i) => <li key={i}>{el}</li>)}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {aiFeedback && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-sm">psychology</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-purple-900 mb-2">Gợi ý từ AI:</p>
                    {aiFeedback.strengths.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-bold text-purple-700 uppercase mb-1">Điểm mạnh:</p>
                        <ul className="text-xs text-purple-800 list-disc list-inside space-y-1">
                          {aiFeedback.strengths.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiFeedback.areas_for_improvement.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-bold text-purple-700 uppercase mb-1">Cải thiện:</p>
                        <ul className="text-xs text-purple-800 list-disc list-inside space-y-1">
                          {aiFeedback.areas_for_improvement.map((a, i) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiFeedback.suggestions.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-bold text-purple-700 uppercase mb-1">Đề xuất:</p>
                        <ul className="text-xs text-purple-800 list-disc list-inside space-y-1">
                          {aiFeedback.suggestions.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiFeedback.encouragement && (
                      <p className="text-xs text-purple-700 italic mt-2">{aiFeedback.encouragement}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Feedback List */}
      <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
        <CardHeader>
          <CardTitle className="font-headline font-bold text-primary text-lg">
            Lịch sử góp ý
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {feedbacks.length === 0 ? (
            <div className="text-center py-8 text-secondary">
              <span className="material-symbols-outlined text-4xl mb-2">feedback</span>
              <p>Chưa có góp ý nào</p>
            </div>
          ) : (
            feedbacks.map((feedback) => (
              <div
                key={feedback.id}
                className="p-4 bg-surface-container-low rounded-lg hover:bg-surface-container-low/80 transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      feedback.type === 'written' ? 'bg-blue-50 text-blue-600' :
                      'bg-emerald-50 text-emerald-600'
                    )}>
                      <span className="material-symbols-outlined">
                        {feedback.type === 'written' ? 'feedback' : 'meeting_room'}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-on-surface">{feedback.student_name}</h4>
                      <p className="text-[10px] text-secondary">{feedback.student_code} • {feedback.thesis_title}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-secondary">{formatDate(feedback.created_at)}</p>
                    <div className="flex items-center gap-1 justify-end mt-1">
                      {feedback.is_read ? (
                        <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
                          <span className="material-symbols-outlined text-[10px] mr-1">check</span>
                          Đã đọc
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-600 text-[10px]">Chưa đọc</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed mb-3">{feedback.content}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </Shell>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default withLecturer(LecturerFeedbackPage)
