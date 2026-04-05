'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { withLecturer } from '@/hocs/with-role-check'
import { createClient } from '@/lib/supabase/client'
import { useAuthUser } from '@/hooks/use-auth-user'
import Papa from 'papaparse'

// Sub-components
import { SupervisorPanel } from './components/SupervisorPanel'
import { GradingPanel } from '../reviewer/components/GradingPanel'
import { SubmissionViewerModal } from './components/SubmissionViewerModal'
import { cn } from '@/lib/utils'

interface Submission {
  id: string
  registration_id: string
  student_id: string
  student_name: string
  student_code: string
  thesis_title: string
  round_number: number
  file_url: string
  file_name: string
  file_size: number | null
  submitted_at: string
  status: string
  has_grade: boolean
  grade_score: number | null
  grade_feedback: string | null
  proposal_type?: string
}

interface Criteria {
  name: string
  sub: string
  key: string
  maxScore: number
  levels: Record<string, { score: string, text: string }>
}

const GRADING_CRITERIA: Criteria[] = [
  {
    name: 'Slide',
    sub: 'Trình bày & Thẩm mỹ',
    key: 'slide',
    maxScore: 1.0,
    levels: {
      'yếu': { score: '0.2', text: 'Không chuẩn bị slide hoặc slide quá sơ sài, thiếu tính thẩm mỹ.' },
      'trung_binh': { score: '0.5', text: 'Slide chuẩn bị đầy đủ nhưng chưa đẹp, bố cục còn lộn xộn.' },
      'kha': { score: '0.8', text: 'Slide đẹp, bố cục rõ ràng, hình ảnh minh họa tốt.' },
      'gioi': { score: '1.0', text: 'Slide rất đẹp, bố cục chuyên nghiệp, sáng tạo, thu hút.' }
    }
  },
  {
    name: 'Thuyết trình (Presentation)',
    sub: 'Phong thái & Diễn đạt',
    key: 'presentation',
    maxScore: 1.5,
    levels: {
      'yếu': { score: '0.5', text: 'Nói nhỏ, thiếu tự tin, đọc slide, không thoát ý.' },
      'trung_binh': { score: '1.0', text: 'Nói rõ ràng nhưng chưa lôi cuốn, còn phụ thuộc tài liệu.' },
      'kha': { score: '1.2', text: 'Nói lưu loát, tự tin, làm chủ được nội dung.' },
      'gioi': { score: '1.5', text: 'Thuyết trình lôi cuốn, phong cách chuyên nghiệp, thuyết phục.' }
    }
  },
  {
    name: 'Thời gian (Timing)',
    sub: 'Phân bổ & Tuân thủ',
    key: 'timing',
    maxScore: 0.5,
    levels: {
      'yếu': { score: '0', text: 'Quá thời gian quy định nhiều (> 5 phút).' },
      'trung_binh': { score: '0.1', text: 'Quá thời gian quy định ít (1-3 phút).' },
      'kha': { score: '0.3', text: 'Đúng thời gian quy định (+/- 1 phút).' },
      'gioi': { score: '0.5', text: 'Phân bổ thời gian rất hợp lý cho từng phần.' }
    }
  },
  {
    name: 'Nội dung (Content)',
    sub: 'Chất lượng & Chi tiết',
    key: 'content',
    maxScore: 4.0,
    levels: {
      'yếu': { score: '0.6 - 1.5', text: 'Nội dung sơ sài, chưa giải quyết được mục tiêu đề tài.' },
      'trung_binh': { score: '1.6 - 2.5', text: 'Nội dung đầy đủ nhưng chưa sâu, còn sai sót nhỏ.' },
      'kha': { score: '2.6 - 3.5', text: 'Nội dung tốt, giải quyết tốt các mục tiêu đề ra.' },
      'gioi': { score: '3.6 - 4.0', text: 'Nội dung xuất sắc, có tính mới hoặc ứng dụng cao.' }
    }
  },
  {
    name: 'Trả lời câu hỏi (Q&A)',
    sub: 'Bản lĩnh & Kiến thức',
    key: 'qa',
    maxScore: 2.0,
    levels: {
      'yếu': { score: '0 - 0.8', text: 'Không trả lời được các câu hỏi của Hội đồng.' },
      'trung_binh': { score: '0.9 - 1.2', text: 'Trả lời được một phần, còn lúng túng.' },
      'kha': { score: '1.3 - 1.7', text: 'Trả lời rõ ràng, đúng trọng tâm phần lớn câu hỏi.' },
      'gioi': { score: '1.8 - 2.0', text: 'Trả lời xuất sắc, bản lĩnh, thuyết phục hoàn toàn.' }
    }
  },
  {
    name: 'Tính sáng tạo',
    sub: 'Tính mới & Giải pháp',
    key: 'innovation',
    maxScore: 1.0,
    levels: {
      'yếu': { score: '0.2', text: 'Giải pháp cũ, không có tính mới.' },
      'trung_binh': { score: '0.5', text: 'Có nỗ lực cải tiến nhưng chưa rõ nét.' },
      'kha': { score: '0.8', text: 'Có tính mới và giải pháp sáng tạo.' },
      'gioi': { score: '1.0', text: 'Rất sáng tạo, có giá trị khoa học/thực tiễn cao.' }
    }
  },
  {
    name: 'Điểm cộng',
    sub: 'Tiếng Anh (Max 1) + Bài báo (Max 1)',
    key: 'bonus',
    maxScore: 2.0,
    levels: {
      'khong': { score: '0', text: 'Không có điểm cộng.' },
      'co': { score: '1.0 - 2.0', text: 'Có viết bằng tiếng Anh hoặc có bài báo khoa học.' }
    }
  }
]

function LecturerGradingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuthUser()
  const [pendingSubmissions, setPendingSubmissions] = React.useState<Submission[]>([])
  const [gradedSubmissions, setGradedSubmissions] = React.useState<Submission[]>([])
  const [selectedSubmission, setSelectedSubmission] = React.useState<Submission | null>(null)

  const [scores, setScores] = React.useState<Record<string, string>>({})
  const [feedback, setFeedback] = React.useState('')
  const [isPublishing, setIsPublishing] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const [showTurnitinUpload, setShowTurnitinUpload] = React.useState(false)
  const [isUploadingTurnitin, setIsUploadingTurnitin] = React.useState(false)
  const [turnitinReport, setTurnitinReport] = React.useState<{ similarity_score: number | null, file_url: string | null }>({
    similarity_score: null, file_url: null
  })

  // AI states
  const [isGeneratingAi, setIsGeneratingAi] = React.useState(false)
  const [aiSuggestions, setAiSuggestions] = React.useState<any>(null)
  const [submissionSummary, setSubmissionSummary] = React.useState<any>(null)
  const [isGeneratingSummary, setIsGeneratingSummary] = React.useState(false)
  const [plagiarismReport, setPlagiarismReport] = React.useState<any>(null)
  const [isCheckingPlagiarism, setIsCheckingPlagiarism] = React.useState(false)

  // Viewer state
  const [isViewerOpen, setIsViewerOpen] = React.useState(false)

  // Sync state
  const [isSyncingSpreadsheet, setIsSyncingSpreadsheet] = React.useState(false)

  // Post-defense state
  const [activeTab, setActiveTab] = React.useState<'progress' | 'post_defense'>('progress')
  const [postDefensePending, setPostDefensePending] = React.useState<any[]>([])
  const [isReviewingPostDefense, setIsReviewingPostDefense] = React.useState<string | null>(null)

  const handlePostDefenseReview = async (registrationId: string, action: 'approved' | 'rejected') => {
    let notes = ''
    if (action === 'rejected') {
      const input = prompt('Nhập lý do yêu cầu chỉnh sửa lại:')
      if (input === null) return
      notes = input
    }
    try {
      setIsReviewingPostDefense(registrationId)
      await api.lecturer.postDefense.review(registrationId, action, notes || undefined)
      await fetchPostDefense()
    } catch (err: any) {
      setError(err.message || 'Không thể thực hiện duyệt sau bảo vệ')
    } finally {
      setIsReviewingPostDefense(null)
    }
  }


  const fetchSubmissions = React.useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await api.lecturer.submissions({ role: 'supervisor' })
      setPendingSubmissions(data.pendingSubmissions || [])
      setGradedSubmissions(data.gradedSubmissions || [])

      const submissionId = searchParams.get('submission')
      const paramRegistrationId = searchParams.get('registrationId')

      if (submissionId) {
        const found = [...(data.pendingSubmissions || []), ...(data.gradedSubmissions || [])].find(
          (s: Submission) => s.id === submissionId
        )
        if (found) setSelectedSubmission(found)
      } else if (paramRegistrationId) {
        const found = [...(data.pendingSubmissions || []), ...(data.gradedSubmissions || [])].find(
          (s: Submission) => s.registration_id === paramRegistrationId
        )
        if (found) setSelectedSubmission(found)
      } else {
        // Default to list view
        setSelectedSubmission(null)
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách cần chấm')
    } finally {
      setIsLoading(false)
    }
  }, [searchParams])

  const fetchPostDefense = React.useCallback(async () => {
    try {
      const data = await api.lecturer.postDefense.submissions()
      setPostDefensePending(data || [])
    } catch (err) {
      // Not critical - silent fail
    }
  }, [])

  React.useEffect(() => {
    fetchSubmissions()
    fetchPostDefense()
  }, [fetchSubmissions, fetchPostDefense])


  React.useEffect(() => {
    if (selectedSubmission?.has_grade) {
      setFeedback(selectedSubmission.grade_feedback || '')
    } else {
      setScores({})
      setFeedback('')
    }
    setAiSuggestions(null)
    setSubmissionSummary(null)
    setPlagiarismReport(null)

    // Background text extraction for AI
    if (selectedSubmission?.file_url) {
      fetch('/api/file/extract-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: selectedSubmission.file_url, fileName: selectedSubmission.file_name })
      })
        .then(r => r.json())
        .then(data => {
          if (data.text) (window as any).__currentSubmissionContent = data.text
        })
        .catch(console.error)
    }
  }, [selectedSubmission])

  const calculateTotal = React.useMemo(() => {
    const sum = Object.values(scores).reduce((acc, val) => acc + (parseFloat(val) || 0), 0)
    return Math.min(10, Math.max(0, sum)).toFixed(1)
  }, [scores])

  const handleSubmitGrade = async (publish: boolean) => {
    if (!selectedSubmission) return
    setIsPublishing(true)
    setError(null)
    try {
      const isBctt = selectedSubmission.proposal_type === 'BCTT'
      await api.lecturer.grades.submit({
        submission_id: selectedSubmission.id,
        registration_id: selectedSubmission.registration_id,
        criteria_scores: isBctt ? {} : scores,
        total_score: isBctt ? (publish ? 10 : 0) : parseFloat(calculateTotal),
        feedback: feedback,
        is_published: publish,
        grader_role: 'supervisor',
        turnitin_score: turnitinReport.similarity_score,
        turnitin_file: turnitinReport.file_url
      })
      setSuccess(true)
      await fetchSubmissions()
      if (publish) setSelectedSubmission(null) // return to list view after complete submit
    } catch (err: any) {
      setError(err.message || 'Không thể lưu điểm')
    } finally {
      setIsPublishing(false)
    }
  }

  // --- AI Tools Logic (unchanged essentially) ---
  const handleGenerateAiSuggestion = async () => {
    if (!selectedSubmission) return
    const content = (window as any).__currentSubmissionContent
    if (!content) {
      // Suggest opening viewer to load content first
      setError('Cần phải xem tài liệu một lần (để hệ thống tải trích xuất) trước khi gọi AI gợi ý chấm điểm.')
      return
    }
    setIsGeneratingAi(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/ai/grade-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          proposal_title: selectedSubmission.thesis_title,
          submission_content: content.substring(0, 1000),
          round_name: `Vòng ${selectedSubmission.round_number}`
        }),
      })
      const data = await response.json()
      setAiSuggestions(data)
      const newScores: Record<string, string> = {}
      if (data.criteria_scores) {
        Object.entries(data.criteria_scores).forEach(([key, value]: [string, any]) => {
          const scoreVal = value.score || 0
          const criterion = GRADING_CRITERIA.find(c => {
            if (key === 'criteria_1' && c.key === 'content') return true
            if (key === 'criteria_2' && c.key === 'slide') return true
            if (key === 'criteria_3' && c.key === 'presentation') return true
            if (key === 'criteria_4' && c.key === 'qa') return true
            if (key === 'criteria_5' && c.key === 'innovation') return true
            if (key === 'criteria_6' && c.key === 'timing') return true
            return false
          })

          if (criterion) {
            newScores[criterion.key] = Math.min(criterion.maxScore, scoreVal).toString()
          }
        })
      }
      setScores(prev => ({ ...prev, ...newScores }))

      // Auto-fill into feedback textarea
      if (data.overall_feedback) {
        setFeedback((prev: string) => {
          let aiText = data.overall_feedback
          if (data.strengths?.length > 0) {
            aiText += '\n\nĐiểm mạnh:\n' + data.strengths.map((s: string) => `- ${s}`).join('\n')
          }
          if (data.areas_for_improvement?.length > 0) {
            aiText += '\n\nCần cải thiện:\n' + data.areas_for_improvement.map((s: string) => `- ${s}`).join('\n')
          }
          return prev ? `${prev}\n\n[Ý KIẾN AI]:\n${aiText}` : aiText
        })
      }
    } catch (err: any) {
      setError('Lỗi khi tạo gợi ý AI')
    } finally {
      setIsGeneratingAi(false)
    }
  }

  const handleGenerateSummary = async () => {
    if (!selectedSubmission) return
    const content = (window as any).__currentSubmissionContent
    if (!content) { setError('Hãy mở Xem bài nộp trước để AI có thể đọc file.'); return }
    setIsGeneratingSummary(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/ai/submission-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ proposal_title: selectedSubmission.thesis_title, submission_content: content.substring(0, 1000) }),
      })
      const data = await response.json()
      setSubmissionSummary(data)

      if (data.executive_summary) {
        let aiText = data.executive_summary
        if (data.key_contributions?.length > 0) {
          aiText += '\n\nĐóng góp chính:\n' + data.key_contributions.map((s: string) => `- ${s}`).join('\n')
        }

        setFeedback((prev: string) => prev ? `${prev}\n\n[TÓM TẮT AI]:\n${aiText}` : aiText)
        setScores(prev => ({
          ...prev,
          reviewer_feedback: prev['reviewer_feedback'] ? `${prev['reviewer_feedback']}\n\n[TÓM TẮT AI]:\n${aiText}` : aiText
        }))
      }
    } catch (err) { setError('Lỗi AI tóm tắt') } finally { setIsGeneratingSummary(false) }
  }

  const handleCheckPlagiarism = async () => {
    if (!selectedSubmission) return
    const content = (window as any).__currentSubmissionContent
    if (!content) { setError('Hãy mở Xem bài nộp trước để AI có thể đọc file.'); return }
    setIsCheckingPlagiarism(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/ai/plagiarism-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ proposal_title: selectedSubmission.thesis_title, submission_content: content.substring(0, 1000) }),
      })
      const data = await response.json()
      setPlagiarismReport(data)
    } catch (err) { setError('Lỗi AI kiểm tra') } finally { setIsCheckingPlagiarism(false) }
  }

  const handleUploadTurnitin = async (file: File, score: string) => {
    if (!selectedSubmission) return
    setIsUploadingTurnitin(true)
    try {
      const supabase = createClient()
      const path = `${selectedSubmission.id}/turnitin_${Date.now()}.pdf`
      await supabase.storage.from('submissions').upload(path, file)
      const { data: { publicUrl } } = supabase.storage.from('submissions').getPublicUrl(path)
      setTurnitinReport({ similarity_score: parseInt(score), file_url: publicUrl })
      setShowTurnitinUpload(false)
    } catch (err) { setError('Lỗi tải Turnitin') } finally { setIsUploadingTurnitin(false) }
  }

  if (isLoading) return <Shell role="lecturer" user={user as any} breadcrumb={[]}><div className="h-64 flex items-center justify-center animate-pulse text-[#002068] font-black">Loading...</div></Shell>

  return (
    <Shell
      role="lecturer"
      isTbm={user?.is_tbm}
      user={{
        name: user?.full_name || 'Giảng viên',
        email: user?.email || '...',
        avatar: user?.avatar_url || '',
        is_tbm: user?.is_tbm,
        is_secretary: user?.is_secretary
      }}
      breadcrumb={selectedSubmission ?
        [{ label: 'Chấm điểm', href: '/lecturer/grading' }, { label: selectedSubmission.student_name }] :
        [{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Chấm điểm' }]}
    >
      {/* View 1: Main Dashboard List */}
      {!selectedSubmission && (
        <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500">
          {/* Header Area */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200/60">
            <div>
              <h1 className="text-3xl font-black font-headline text-[#002068] tracking-tight uppercase mb-2">QUẢN LÝ TIẾN ĐỘ</h1>
              <p className="text-slate-500 font-medium">Theo dõi và phê duyệt sản phẩm của sinh viên do bạn hướng dẫn.</p>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50/30 border-amber-200/60 shadow-ambient-sm rounded-3xl overflow-hidden">
              <CardContent className="p-8 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-amber-700 mb-2">CHỜ CHẤM ĐIỂM</p>
                  <p className="text-5xl font-black tabular-nums tracking-tighter text-amber-600">{pendingSubmissions.length}</p>
                </div>
                <div className="w-16 h-16 rounded-full bg-amber-100/50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-amber-500">pending_actions</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50/30 border-emerald-200/60 shadow-ambient-sm rounded-3xl overflow-hidden">
              <CardContent className="p-8 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700 mb-2">ĐÃ HOÀN THÀNH</p>
                  <p className="text-5xl font-black tabular-nums tracking-tighter text-emerald-600">{gradedSubmissions.length}</p>
                </div>
                <div className="w-16 h-16 rounded-full bg-emerald-100/50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-emerald-500">task_alt</span>
                </div>
              </CardContent>
            </Card>

            <Card
              className={cn("rounded-3xl overflow-hidden cursor-pointer transition-all border",
                postDefensePending.length > 0 ? "bg-gradient-to-br from-violet-50 to-purple-50/30 border-violet-200/60" : "bg-white border-slate-200/60")}
              onClick={() => setActiveTab('post_defense')}
            >
              <CardContent className="p-8 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-violet-700 mb-2">SAU BẢO VỆ</p>
                  <p className={cn("text-5xl font-black tabular-nums tracking-tighter", postDefensePending.length > 0 ? 'text-violet-600' : 'text-slate-300')}>{postDefensePending.length}</p>
                </div>
                <div className={cn("w-16 h-16 rounded-full flex items-center justify-center", postDefensePending.length > 0 ? 'bg-violet-100/50' : 'bg-slate-50')}>
                  <span className={cn("material-symbols-outlined text-4xl", postDefensePending.length > 0 ? 'text-violet-500' : 'text-slate-300')}>edit_document</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tab Bar */}
          <div className="flex gap-1 p-1 bg-slate-100/80 rounded-2xl w-fit">
            <button onClick={() => setActiveTab('progress')}
              className={cn("px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                activeTab === 'progress' ? 'bg-white text-[#002068] shadow-sm' : 'text-slate-400 hover:text-slate-600')}>
              Theo Dõi Tiến Độ
            </button>
            <button onClick={() => setActiveTab('post_defense')}
              className={cn("px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === 'post_defense' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-400 hover:text-slate-600')}
            >
              Sau Bảo Vệ
              {postDefensePending.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[9px] font-black flex items-center justify-center">{postDefensePending.length}</span>
              )}
            </button>
          </div>

          {/* PROGRESS TAB */}
          {activeTab === 'progress' && (
            <div className="space-y-6">
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-ambient-lg overflow-hidden">
                <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#002068]" />
                  <h2 className="text-sm font-black uppercase tracking-widest text-[#002068]">DANH SÁCH BÀI NỘP</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                        <th className="py-4 px-6 w-[25%]">Sinh viên</th>
                        <th className="py-4 px-6 w-[35%]">Tên đề tài</th>
                        <th className="py-4 px-6 text-center w-[15%]">Vòng</th>
                        <th className="py-4 px-6 text-center w-[10%]">Trạng thái</th>
                        <th className="py-4 px-6 text-right w-[15%]">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white/50">
                      {pendingSubmissions.length === 0 && gradedSubmissions.length === 0 ? (
                        <tr><td colSpan={5} className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Không có bài nộp nào</td></tr>
                      ) : (
                        [...pendingSubmissions, ...gradedSubmissions].map((sub) => (
                          <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="py-4 px-6 relative">
                              {sub.status === 'submitted' && !sub.has_grade && (
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              )}
                              <p className="text-xs font-black text-[#002068] uppercase tracking-tight mb-1">{sub.student_name}</p>
                              <p className="text-[10px] font-bold text-slate-400">ID: <span className="font-mono">{sub.student_code}</span></p>
                            </td>
                            <td className="py-4 px-6">
                              <p className="text-[11px] font-medium text-slate-600 line-clamp-2 leading-relaxed max-w-sm italic">"{sub.thesis_title}"</p>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <Badge className="bg-slate-100 text-slate-500 pointer-events-none hover:bg-slate-100 border-none font-black text-[9px] uppercase tracking-widest rounded-lg">
                                {sub.proposal_type === 'BCTT' ? 'BCTT REPORT' : `ROUND ${sub.round_number}`}
                              </Badge>
                            </td>
                            <td className="py-4 px-6 text-center">
                              {sub.has_grade ? (
                                <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50 pointer-events-none border-emerald-200 font-black text-[9px] uppercase tracking-widest rounded-lg">ĐÃ CHẤM: {sub.grade_score?.toFixed(1)}</Badge>
                              ) : (
                                <Badge className="bg-amber-50 text-amber-600 hover:bg-amber-50 pointer-events-none border-amber-200 font-black text-[9px] uppercase tracking-widest rounded-lg">CHỜ CHẤM</Badge>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <Button variant={sub.has_grade ? "outline" : "default"}
                                className={cn("h-9 px-4 rounded-xl font-black text-[10px] transition-all",
                                  !sub.has_grade && "bg-[#002068] hover:bg-[#001a4d] text-white shadow-md active:scale-95",
                                  sub.has_grade && "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700")}
                                onClick={() => setSelectedSubmission(sub)}>
                                {sub.has_grade ? 'XEM LẠI' : 'KIỂM DUYỆT'}
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* POST-DEFENSE TAB */}
          {activeTab === 'post_defense' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {postDefensePending.length === 0 ? (
                <div className="bg-white/80 rounded-3xl border border-slate-200 p-16 text-center">
                  <span className="material-symbols-outlined text-4xl text-slate-300 block mb-3">check_circle</span>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Không có hồ sơ nào chờ xét duyệt sau bảo vệ</p>
                </div>
              ) : (
                postDefensePending.map((item: any) => (
                  <div key={item.id} className="bg-white rounded-3xl border border-violet-100 shadow-ambient-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex flex-col md:flex-row">
                      <div className="p-6 flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mã SV: {item.student_code}</p>
                        <h4 className="text-lg font-black text-[#002068] mb-1">{item.student_name}</h4>
                        <p className="text-xs text-slate-500 italic mb-4">"{item.thesis_title}"</p>
                        <div className="flex flex-wrap gap-3">
                          {item.council_minutes && (
                            <a href={item.council_minutes} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-[10px] font-black hover:bg-blue-100 transition-colors">
                              <span className="material-symbols-outlined text-sm">description</span>Biên bản HĐ
                            </a>
                          )}
                          {item.editing_file_url && (
                            <a href={item.editing_file_url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-700 rounded-xl text-[10px] font-black hover:bg-violet-100 transition-colors">
                              <span className="material-symbols-outlined text-sm">edit_document</span>Bài chỉnh sửa
                            </a>
                          )}
                          {item.explanation_letter_url && (
                            <a href={item.explanation_letter_url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-xl text-[10px] font-black hover:bg-amber-100 transition-colors">
                              <span className="material-symbols-outlined text-sm">mail</span>Thư giải trình
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="p-6 flex flex-col justify-center gap-3 border-t md:border-t-0 md:border-l border-slate-100 min-w-[220px] bg-slate-50/50">
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] h-10 rounded-xl shadow-lg shadow-emerald-900/10 transition-all active:scale-95"
                          onClick={() => handlePostDefenseReview(item.id, 'approved')}
                          disabled={isReviewingPostDefense === item.id}>
                          {isReviewingPostDefense === item.id
                            ? <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                            : <><span className="material-symbols-outlined text-sm mr-1">check_circle</span>ĐỒNG Ý</>}
                        </Button>
                        <Button variant="outline"
                          className="w-full border-2 border-red-100 text-red-600 hover:bg-red-50 font-black text-[11px] h-10 rounded-xl transition-all active:scale-95"
                          onClick={() => handlePostDefenseReview(item.id, 'rejected')}
                          disabled={isReviewingPostDefense === item.id}>
                          <span className="material-symbols-outlined text-sm mr-1">history_edu</span>YÊU CẦU LẠI
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* View 2: Detailed Grading Interface (Appears when selectedSubmission is set) */}
      {selectedSubmission && (
        <div className="flex flex-col h-full animate-in slide-in-from-right-8 duration-500">
          {/* Detail Top Navigation */}
          <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 py-4 px-6 md:px-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-16 z-30 shadow-sm">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-100 transition-colors" onClick={() => setSelectedSubmission(null)}>
                <span className="material-symbols-outlined text-slate-500 text-xl">arrow_back</span>
              </Button>
              <div>
                <h2 className="text-xl font-black text-[#002068] tracking-tight uppercase leading-none mb-1.5">{selectedSubmission.student_name}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SV: {selectedSubmission.student_code} <span className="mx-2 opacity-50">|</span> ROUND {selectedSubmission.round_number}</p>
              </div>
            </div>

            <Button
              className="h-12 px-8 rounded-2xl font-black bg-[#002068] text-white hover:bg-[#001a4d] shadow-lg shadow-blue-900/20 active:scale-95 transition-all outline-none"
              onClick={() => setIsViewerOpen(true)}
            >
              <span className="material-symbols-outlined mr-2">subject</span> XEM BÀI NỘP
            </Button>
          </div>

          {/* Detail Main Content Wrapper - Error/Success Messages */}
          <div className="flex-1 overflow-auto bg-slate-50/50 p-6 md:p-10">
            <div className="max-w-6xl mx-auto space-y-8 pb-32">

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                  <span className="material-symbols-outlined text-red-500">error</span>
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                  <span className="material-symbols-outlined text-emerald-500 font-bold">check_circle</span>
                  <p className="text-sm font-bold tracking-tight">✓ Đã lưu điểm thành công!</p>
                </div>
              )}

              {/* Spreadsheet Workspace Card */}
              <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
                <Card className="bg-gradient-to-br from-[#002068] via-[#003399] to-blue-900 border-none rounded-[2rem] shadow-ambient-lg overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32 blur-3xl group-hover:bg-white/10 transition-all duration-1000" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/10 rounded-full translate-y-24 -translate-x-12 blur-2xl" />

                  <CardContent className="p-8 md:p-10 relative z-10">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                      <div className="bg-white/10 backdrop-blur-md w-20 h-20 rounded-3xl flex items-center justify-center border border-white/20 shadow-inner group-hover:scale-105 transition-transform duration-500">
                        <span className="material-symbols-outlined text-4xl text-white">table_chart</span>
                      </div>

                      <div className="flex-1 text-center md:text-left">
                        <h3 className="text-white text-2xl font-black font-headline tracking-tight uppercase mb-2">QUY TRÌNH CHẤM ĐIỂM SPREADSHEET AI</h3>
                        <p className="text-blue-100/80 font-medium text-sm max-w-xl">
                          Tải file mẫu đã điền sẵn danh sách sinh viên, nhập điểm nhanh trong Google Sheets hoặc Excel, sau đó đồng bộ ngược lại hệ thống chỉ với 1 cú click.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
                        <Button
                          onClick={async () => {
                            const supabase = createClient()
                            const { data: { session } } = await supabase.auth.getSession()
                            const res = await fetch('/api/lecturer/grades/spreadsheet-sync', {
                              headers: { 'Authorization': `Bearer ${session?.access_token}` }
                            })
                            const blob = await res.blob()
                            const url = window.URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `grading_template_${Date.now()}.csv`
                            a.click()
                          }}
                          className="bg-white text-[#002068] hover:bg-white/90 font-black px-6 py-6 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 group/btn"
                        >
                          <span className="material-symbols-outlined font-bold group-hover/btn:animate-bounce">download</span>
                          XUẤT FILE MẪU
                        </Button>

                        <div className="relative">
                          <input
                            type="file"
                            accept=".csv"
                            id="csv-upload"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              Papa.parse(file, {
                                header: true,
                                complete: async (results) => {
                                  const data = results.data as any[]
                                  const grades = data.filter(row => row['Submission ID']).map(row => ({
                                    submission_id: row['Submission ID'],
                                    scores: {
                                      slide: parseFloat(row['Slide (1.0)']) || 0,
                                      presentation: parseFloat(row['Presentation (1.5)']) || 0,
                                      timing: parseFloat(row['Timing (0.5)']) || 0,
                                      content: parseFloat(row['Content (4.0)']) || 0,
                                      qa: parseFloat(row['Q&A (2.0)']) || 0,
                                      innovation: parseFloat(row['Innovation (1.0)']) || 0,
                                      bonus: parseFloat(row['Bonus (2.0)']) || 0
                                    },
                                    feedback: row['Feedback'] || ''
                                  }))

                                  setIsLoading(true)
                                  try {
                                    const supabase = createClient()
                                    const { data: { session } } = await supabase.auth.getSession()
                                    await fetch('/api/lecturer/grades/spreadsheet-sync', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${session?.access_token}`
                                      },
                                      body: JSON.stringify({ grades })
                                    })
                                    setSuccess(true)
                                    await fetchSubmissions()
                                  } catch (err) {
                                    setError('Không thể đồng bộ dữ liệu. Vui lòng kiểm tra định dạng file.')
                                  } finally {
                                    setIsLoading(false)
                                  }
                                }
                              })
                            }}
                          />
                          <Button
                            asChild
                            className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 font-black px-6 py-6 rounded-2xl transition-all flex items-center gap-2"
                          >
                            <label htmlFor="csv-upload" className="cursor-pointer">
                              <span className="material-symbols-outlined font-bold">cloud_upload</span>
                              UPLOAD & ĐỒNG BỘ
                            </label>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top section: Info + Student Theme Title */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200/60 shadow-ambient-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">TÊN ĐỀ TÀI</p>
                <p className="text-lg text-slate-700 font-medium italic leading-relaxed">"{selectedSubmission.thesis_title}"</p>
              </div>

              {/* The Grading Panel - Round 6 = GradingPanel (with scores), other rounds = SupervisorPanel (approve/reject) */}
              {selectedSubmission.round_number === 6 ? (
                <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-ambient-lg p-1 md:p-2">
                  <GradingPanel
                    submission={selectedSubmission}
                    criteria={GRADING_CRITERIA}
                    scores={scores}
                    onScoreChange={(key: string, val: string) => setScores(prev => ({ ...prev, [key]: val }))}
                    feedback={feedback}
                    onFeedbackChange={setFeedback}
                    onSubmit={handleSubmitGrade}
                    isPublishing={isPublishing}
                    isGeneratingAi={isGeneratingAi}
                    aiSuggestions={aiSuggestions}
                    onGenerateAiSuggestion={handleGenerateAiSuggestion}
                    submissionSummary={submissionSummary}
                    isGeneratingSummary={isGeneratingSummary}
                    onGenerateSummary={handleGenerateSummary}
                    plagiarismReport={plagiarismReport}
                    isCheckingPlagiarism={isCheckingPlagiarism}
                    onCheckPlagiarism={handleCheckPlagiarism}
                    onShowTurnitin={() => setShowTurnitinUpload(true)}
                    calculateTotal={calculateTotal}
                  />
                </div>
              ) : (
                <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-ambient-lg p-1 md:p-2">
                  <SupervisorPanel
                    submission={selectedSubmission}
                    feedback={feedback}
                    onFeedbackChange={setFeedback}
                    onSubmit={handleSubmitGrade}
                    isPublishing={isPublishing}
                    isGeneratingSummary={isGeneratingSummary}
                    submissionSummary={submissionSummary}
                    onGenerateSummary={handleGenerateSummary}
                    isCheckingPlagiarism={isCheckingPlagiarism}
                    plagiarismReport={plagiarismReport}
                    onCheckPlagiarism={handleCheckPlagiarism}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Background Modal file viewer */}
      {selectedSubmission && (
        <SubmissionViewerModal
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          url={selectedSubmission.file_url}
          fileName={selectedSubmission.file_name}
          fileSize={selectedSubmission.file_size}
          onContentExtracted={(content: string) => { (window as any).__currentSubmissionContent = content }}
        />
      )}

      {/* Turnitin Overlay */}
      {showTurnitinUpload && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-[#002068] p-6 text-white">
              <h3 className="font-black uppercase tracking-widest text-sm">Báo Cáo Turnitin</h3>
            </div>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase">Điểm đạo văn (%)</p>
                <input id="t-score" type="number" className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-black" placeholder="00" />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase">File báo cáo (PDF)</p>
                <input id="t-file" type="file" className="w-full" accept=".pdf" />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1 rounded-xl" onClick={() => setShowTurnitinUpload(false)}>Hủy</Button>
                <Button className="flex-1 bg-[#002068] text-white rounded-xl font-black" onClick={() => {
                  const s = (document.getElementById('t-score') as any).value
                  const f = (document.getElementById('t-file') as any).files[0]
                  if (f && s) handleUploadTurnitin(f, s)
                }}>Nộp</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Shell>
  )
}

export default withLecturer(LecturerGradingPage)
