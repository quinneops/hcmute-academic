'use client'

import * as React from 'react'
import { FlowPageIntro } from '@/components/flow/FlowPageIntro'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { FileViewer } from '@/components/ui/FileViewer'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { withLecturer } from '@/hocs/with-role-check'
import { useAuthUser } from '@/hooks/use-auth-user'
import { createClient } from '@/lib/supabase/client'

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
}

interface Criteria {
  name: string
  sub: string
  key: string
  maxScore: number
  levels: Record<string, { score: string; text: string }>
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
    maxScore: 4.5,
    levels: {
      'yếu': { score: '0.6 - 1.5', text: 'Nội dung sơ sài, chưa giải quyết được mục tiêu đề tài.' },
      'trung_binh': { score: '1.6 - 2.5', text: 'Nội dung đầy đủ nhưng chưa sâu, còn sai sót nhỏ.' },
      'kha': { score: '2.6 - 3.5', text: 'Nội dung tốt, giải quyết tốt các mục tiêu đề ra.' },
      'gioi': { score: '3.6 - 4.5', text: 'Nội dung xuất sắc, có tính mới hoặc ứng dụng cao.' }
    }
  },
  {
    name: 'Trả lời câu hỏi (Q&A)',
    sub: 'Bản lĩnh & Kiến thức',
    key: 'qa',
    maxScore: 2.5,
    levels: {
      'yếu': { score: '0 - 1.0', text: 'Không trả lời được các câu hỏi của Hội đồng.' },
      'trung_binh': { score: '1.1 - 1.5', text: 'Trả lời được một phần, còn lúng túng.' },
      'kha': { score: '1.6 - 2.0', text: 'Trả lời rõ ràng, đúng trọng tâm phần lớn câu hỏi.' },
      'gioi': { score: '2.1 - 2.5', text: 'Trả lời xuất sắc, bản lĩnh, thuyết phục hoàn toàn.' }
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
    similarity_score: null,
    file_url: null
  })

  const [isGeneratingAi, setIsGeneratingAi] = React.useState(false)
  const [aiSuggestions, setAiSuggestions] = React.useState<{
    criteria_scores: Record<string, { score: number; justification: string }>
    overall_feedback: string
    strengths: string[]
    areas_for_improvement: string[]
  } | null>(null)
  const [submissionSummary, setSubmissionSummary] = React.useState<{
    executive_summary: string
    key_contributions: string[]
    methodology_used: string
    data_sources: string[]
    limitations_identified: string[]
    confidence_level: string
  } | null>(null)
  const [isGeneratingSummary, setIsGeneratingSummary] = React.useState(false)
  const [plagiarismReport, setPlagiarismReport] = React.useState<{
    originality_score: number
    flagged_sections: Array<{ text: string; reason: string; severity: string }>
    overall_assessment: string
    recommendations: string[]
  } | null>(null)
  const [isCheckingPlagiarism, setIsCheckingPlagiarism] = React.useState(false)

  const fetchSubmissions = React.useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await api.lecturer.submissions()
      setPendingSubmissions(data.pendingSubmissions || [])
      setGradedSubmissions(data.gradedSubmissions || [])

      // Set selected submission from URL param or first pending
      const submissionId = searchParams.get('submission')
      const paramRegistrationId = searchParams.get('registrationId')
      const firstPending = data.pendingSubmissions?.[0]
      const firstGraded = data.gradedSubmissions?.[0]

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
      } else if (firstPending) {
        setSelectedSubmission(firstPending)
      } else if (firstGraded) {
        setSelectedSubmission(firstGraded)
      } else {
        setSelectedSubmission(null)
      }
    } catch (err: any) {
      console.error('Submissions fetch error:', err)
      setError(err.message || 'Không thể tải danh sách cần chấm')
    } finally {
      setIsLoading(false)
    }
  }, [searchParams])

  React.useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  // Reset scores when submission changes
  React.useEffect(() => {
    if (selectedSubmission?.has_grade && selectedSubmission.grade_score !== null) {
      // For already graded submissions, we could load the existing scores
      setScores({})
      setFeedback(selectedSubmission.grade_feedback || '')
    } else {
      setScores({})
      setFeedback('')
    }
    setSuccess(false)
    setAiSuggestions(null)
    setSubmissionSummary(null)
    setPlagiarismReport(null)
    setTurnitinReport({ similarity_score: null, file_url: null })
  }, [selectedSubmission])

  const calculateTotal = React.useMemo(() => {
    const sum = Object.values(scores).reduce((acc, val) => acc + (parseFloat(val) || 0), 0)
    return Math.min(10, Math.max(0, sum)).toFixed(1)
  }, [scores])

  const handleScoreChange = (key: string, value: string) => {
    setScores(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmitGrade = async (publish: boolean) => {
    if (!selectedSubmission) return

    setIsPublishing(true)
    setError(null)

    try {
      await api.lecturer.grades.submit({
        submission_id: selectedSubmission.id,
        registration_id: selectedSubmission.registration_id,
        criteria_scores: scores,
        total_score: parseFloat(calculateTotal),
        feedback: feedback,
        is_published: publish,
        turnitin_score: turnitinReport.similarity_score,
        turnitin_file: turnitinReport.file_url
      })

      setSuccess(true)
      await fetchSubmissions()

      // Reset turnitin after success
      setTurnitinReport({ similarity_score: null, file_url: null })

      if (publish) router.push('/lecturer/students')
    } catch (err: any) {
      console.error('Submit grade error:', err)
      setError(err.message || 'Không thể lưu điểm')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleUploadTurnitin = async (file: File, score: string) => {
    if (!selectedSubmission) return
    setIsUploadingTurnitin(true)
    try {
      const supabase = createClient()
      const fileName = `${selectedSubmission.id}_turnitin_${Date.now()}.pdf`
      const { data, error } = await supabase.storage.from('submissions').upload(fileName, file)
      if (error) throw error

      const { data: { publicUrl } } = supabase.storage.from('submissions').getPublicUrl(fileName)
      setTurnitinReport({ similarity_score: parseInt(score), file_url: publicUrl })
      setShowTurnitinUpload(false)
    } catch (err: any) {
      setError('Lỗi khi tải lên báo cáo Turnitin')
    } finally {
      setIsUploadingTurnitin(false)
    }
  }

  const handleGenerateAiSuggestion = async () => {
    if (!selectedSubmission) return

    const MAX_SIZE_FOR_AI = 5 * 1024 * 1024 // 5MB
    if (selectedSubmission.file_size && selectedSubmission.file_size > MAX_SIZE_FOR_AI) {
      setError('File quá lớn (>5MB) để AI chấm điểm. Vui lòng tải xuống và chấm thủ công.')
      return
    }

    const extractedContent = (window as any).__currentSubmissionContent
    if (!extractedContent) {
      setError('Chưa tải xong nội dung PDF. Vui lòng đợi ít giây...')
      return
    }

    setIsGeneratingAi(true)
    setError(null)
    setAiSuggestions(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Phiên đăng nhập đã hết hạn')
        setIsGeneratingAi(false)
        return
      }

      const response = await fetch('/api/ai/grade-suggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          proposal_title: selectedSubmission.thesis_title,
          submission_content: typeof extractedContent === 'string' ? extractedContent.substring(0, 200) : extractedContent,
          round_name: selectedSubmission.round_number === 1 ? 'Vòng 1' : 'Vòng 2',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Không thể tạo gợi ý AI')
      }

      const data = await response.json()
      setAiSuggestions({
        criteria_scores: data.criteria_scores,
        overall_feedback: data.overall_feedback,
        strengths: data.strengths,
        areas_for_improvement: data.areas_for_improvement,
      })

      const newScores: Record<string, string> = {}
      Object.entries(data.criteria_scores).forEach(([key, value]: [string, any]) => {
        const criterion = GRADING_CRITERIA.find(c => {
          if (key === 'criteria_1' && c.key === 'content') return true
          if (key === 'criteria_3' && c.key === 'presentation') return true
          if (key === 'criteria_4' && c.key === 'qa') return true
          if (key === 'criteria_2' && (c.key === 'timing' || c.key === 'slide')) return true
          return false
        })

        if (criterion) {
          newScores[criterion.key] = Math.min(criterion.maxScore, value.score).toString()
        }
      })
      setScores(prev => ({ ...prev, ...newScores }))
    } catch (err: any) {
      console.error('AI suggestion error:', err)
      setError(err.message || 'Không thể tạo gợi ý từ AI')
    } finally {
      setIsGeneratingAi(false)
    }
  }

  const handleGenerateSubmissionSummary = async () => {
    if (!selectedSubmission) return

    const MAX_SIZE_FOR_AI = 5 * 1024 * 1024 // 5MB
    if (selectedSubmission.file_size && selectedSubmission.file_size > MAX_SIZE_FOR_AI) {
      setError('File quá lớn (>5MB) để AI tóm tắt. Vui lòng tải xuống để đọc.')
      return
    }

    const extractedContent = (window as any).__currentSubmissionContent
    if (!extractedContent) {
      setError('Chưa tải xong nội dung PDF. Vui lòng đợi ít giây...')
      return
    }

    setIsGeneratingSummary(true)
    setError(null)
    setSubmissionSummary(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Phiên đăng nhập đã hết hạn')
        setIsGeneratingSummary(false)
        return
      }

      const response = await fetch('/api/ai/submission-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          proposal_title: selectedSubmission.thesis_title,
          submission_content: typeof extractedContent === 'string' ? extractedContent.substring(0, 200) : extractedContent,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Không thể tạo tóm tắt')
      }

      const data = await response.json()
      setSubmissionSummary({
        executive_summary: data.executive_summary,
        key_contributions: data.key_contributions,
        methodology_used: data.methodology_used,
        data_sources: data.data_sources,
        limitations_identified: data.limitations_identified,
        confidence_level: data.confidence_level,
      })
    } catch (err: any) {
      console.error('AI summary error:', err)
      setError(err.message || 'Không thể tạo tóm tắt từ AI')
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  const handleCheckPlagiarism = async () => {
    if (!selectedSubmission) return

    const MAX_SIZE_FOR_AI = 5 * 1024 * 1024 // 5MB
    if (selectedSubmission.file_size && selectedSubmission.file_size > MAX_SIZE_FOR_AI) {
      setError('File quá lớn (>5MB) để AI kiểm tra đạo văn. Vui lòng tải xuống và kiểm tra thủ công.')
      return
    }

    const extractedContent = (window as any).__currentSubmissionContent
    if (!extractedContent) {
      setError('Chưa tải xong nội dung PDF. Vui lòng đợi ít giây...')
      return
    }

    setIsCheckingPlagiarism(true)
    setError(null)
    setPlagiarismReport(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Phiên đăng nhập đã hết hạn')
        setIsCheckingPlagiarism(false)
        return
      }

      const response = await fetch('/api/ai/plagiarism-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          proposal_title: selectedSubmission.thesis_title,
          submission_content: typeof extractedContent === 'string' ? extractedContent.substring(0, 200) : extractedContent,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Không thể kiểm tra đạo văn')
      }

      const data = await response.json()
      setPlagiarismReport({
        originality_score: data.originality_score,
        flagged_sections: data.flagged_sections,
        overall_assessment: data.overall_assessment,
        recommendations: data.recommendations,
      })
    } catch (err: any) {
      console.error('AI plagiarism error:', err)
      setError(err.message || 'Không thể kiểm tra từ AI')
    } finally {
      setIsCheckingPlagiarism(false)
    }
  }

  if (isLoading) {
    return (
      <Shell role="lecturer" user={{ name: user?.full_name || '...', email: '...', avatar: '' }} breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Chấm điểm' }]}>
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
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Chấm điểm' }]}
      notifications={0}
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-display-sm font-headline font-extrabold text-[#002068] tracking-tight">
            Chấm Điểm Sản Phẩm
          </h2>
          <p className="text-body-md text-slate-500 font-medium tracking-tight">
            Đánh giá và chấm điểm dựa trên biểu mẫu Hội đồng
          </p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-amber-100 text-amber-700 text-[10px] font-bold uppercase py-1.5 px-3 rounded-lg border border-amber-200">
            {pendingSubmissions.length} CHỜ CHẤM
          </Badge>
          <Badge className="bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase py-1.5 px-3 rounded-lg border border-emerald-200">
            {gradedSubmissions.length} ĐÃ CHẤM
          </Badge>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <span className="material-symbols-outlined text-red-500">error</span>
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <span className="material-symbols-outlined text-emerald-500">check_circle</span>
          <p className="text-sm font-bold tracking-tight">✓ Đã lưu điểm thành công!</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column - Submissions List Sidebar */}
        <div className="lg:col-span-1">
          <Card className="bg-white shadow-ambient-lg border-none sticky top-24 rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-3">
              <CardTitle className="font-headline font-black text-[#002068] text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">list_alt</span>
                Tất cả bài nộp
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-2">
              {pendingSubmissions.length === 0 && gradedSubmissions.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <span className="material-symbols-outlined text-2xl mb-1 opacity-20">check_circle</span>
                  <p className="text-[9px] font-bold uppercase tracking-widest">Không có bài nộp</p>
                </div>
              ) : (
                <div className="max-h-[75vh] overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
                  {pendingSubmissions.map((submission) => (
                    <button
                      key={submission.id}
                      onClick={() => setSelectedSubmission(submission)}
                      className={cn(
                        "w-full p-2.5 rounded-xl text-left transition-all border group",
                        selectedSubmission?.id === submission.id
                          ? 'bg-blue-50 border-[#002068] shadow-inner'
                          : 'bg-white hover:bg-slate-50 border-slate-100',
                        'border-l-4 border-l-amber-500'
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                            selectedSubmission?.id === submission.id ? "bg-[#002068] text-white" : "bg-amber-50 text-amber-600 group-hover:bg-amber-100"
                          )}>
                            <span className="material-symbols-outlined text-[16px]">person</span>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-[#002068] uppercase tracking-tight">{submission.student_name}</p>
                            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{submission.student_code}</p>
                          </div>
                        </div>
                        <Badge className="bg-amber-500 text-white text-[7px] font-black tracking-widest border-none px-1 py-0 rounded-full h-4">NEW</Badge>
                      </div>
                      <p className="text-[9px] text-slate-600 font-medium line-clamp-1 italic px-1">"{submission.thesis_title}"</p>
                    </button>
                  ))}

                  {gradedSubmissions.length > 0 && (
                    <>
                      <div className="py-1 flex items-center gap-2 px-2">
                        <div className="h-[1px] flex-1 bg-slate-100" />
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Đã chấm</p>
                        <div className="h-[1px] flex-1 bg-slate-100" />
                      </div>
                      {gradedSubmissions.map((submission) => (
                        <button
                          key={submission.id}
                          onClick={() => setSelectedSubmission(submission)}
                          className={cn(
                            "w-full p-2.5 rounded-xl text-left transition-all border group",
                            selectedSubmission?.id === submission.id
                              ? 'bg-blue-50 border-[#002068] shadow-inner'
                              : 'bg-white hover:bg-slate-50 border-slate-100',
                            'border-l-4 border-l-emerald-500'
                          )}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                                selectedSubmission?.id === submission.id ? "bg-[#002068] text-white" : "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100"
                              )}>
                                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-[#002068] uppercase tracking-tight">{submission.student_name}</p>
                                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{submission.student_code}</p>
                              </div>
                            </div>
                            <div className="bg-[#002068] text-white text-[10px] font-black px-1.5 py-0 rounded h-4 shadow-sm">
                              {submission.grade_score?.toFixed(1)}
                            </div>
                          </div>
                          <p className="text-[9px] text-slate-600 font-medium line-clamp-1 italic px-1">"{submission.thesis_title}"</p>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Main Grading Workspace */}
        <div className="lg:col-span-3">
          {!selectedSubmission ? (
            <Card className="bg-white shadow-ambient-lg border-none rounded-3xl overflow-hidden py-24 text-center">
              <CardContent className="space-y-4">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-5xl text-slate-200">assignment_turned_in</span>
                </div>
                <div>
                  <h3 className="font-headline font-bold text-slate-400 text-xl tracking-tight">Sẵn sàng chấm điểm</h3>
                  <p className="text-slate-400 text-sm">Vui lòng chọn một bài nộp từ danh sách bên trái để bắt đầu đánh giá</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card className="bg-white shadow-ambient-lg border-none rounded-3xl overflow-hidden">
                <CardHeader className="bg-gradient-to-br from-white to-slate-50/50 border-b border-slate-100 p-8">
                  <div className="flex justify-between items-start">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-[#002068] text-white text-[10px] font-black tracking-widest px-3 py-1 bg-gradient-to-r from-[#002068] to-[#003399]">BÀI NỘP VÒNG {selectedSubmission.round_number}</Badge>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">schedule</span>
                          {formatDate(selectedSubmission.submitted_at)}
                        </span>
                      </div>
                      <CardTitle className="font-headline font-black text-[#002068] text-2xl tracking-tight leading-tight uppercase">
                        {selectedSubmission.thesis_title}
                      </CardTitle>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                            <span className="material-symbols-outlined text-xs text-slate-400">person</span>
                          </div>
                          <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{selectedSubmission.student_name}</span>
                        </div>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedSubmission.file_name} ({(selectedSubmission.file_size || 0) / 1024 < 1024 ? `${((selectedSubmission.file_size || 0) / 1024).toFixed(1)} KB` : `${((selectedSubmission.file_size || 0) / (1024 * 1024)).toFixed(1)} MB`})</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="border-2 border-slate-100 text-[#002068] font-bold h-11 px-6 rounded-xl hover:bg-slate-50 shadow-sm transition-all"
                      onClick={() => window.open(selectedSubmission.file_url, '_blank')}
                    >
                      <span className="material-symbols-outlined text-xl mr-2">download</span>
                      Tải xuống
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-8 space-y-8">
                  {/* File Viewer Section */}
                  <div className="rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-50/30">
                    <FileViewer
                      url={selectedSubmission.file_url}
                      fileName={selectedSubmission.file_name}
                      fileSize={selectedSubmission.file_size}
                      onContentExtracted={(content) => {
                        ; (window as any).__currentSubmissionContent = content
                      }}
                      onError={(error) => {
                        console.error('PDF Viewer error:', error)
                      }}
                    />
                  </div>

                  {/* AI Tools Bar */}
                  {!selectedSubmission.has_grade && (
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        className="border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100/50 text-xs font-bold h-10 px-5 rounded-xl border-dashed transition-all"
                        onClick={handleGenerateSubmissionSummary}
                        disabled={isGeneratingSummary}
                      >
                        {isGeneratingSummary ? (
                          <><span className="material-symbols-outlined text-sm mr-2 animate-spin">progress_activity</span>Đang phân tích...</>
                        ) : (
                          <><span className="material-symbols-outlined text-sm mr-2">auto_awesome_motion</span>Tóm tắt nội dung AI</>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="border-orange-200 text-orange-700 bg-orange-50/50 hover:bg-orange-100/50 text-xs font-bold h-10 px-5 rounded-xl border-dashed transition-all"
                        onClick={handleCheckPlagiarism}
                        disabled={isCheckingPlagiarism}
                      >
                        {isCheckingPlagiarism ? (
                          <><span className="material-symbols-outlined text-sm mr-2 animate-spin">progress_activity</span>Đang rà soát...</>
                        ) : (
                          <><span className="material-symbols-outlined text-sm mr-2">security</span>Kiểm soát tính chính danh</>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* AI Insights Display */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {submissionSummary && (
                      <Card className="bg-blue-50/30 border-blue-100 rounded-3xl shadow-none">
                        <CardHeader className="pb-3 px-6 pt-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                              <span className="material-symbols-outlined text-lg">clinical_notes</span>
                            </div>
                            <CardTitle className="text-sm font-black text-blue-900 tracking-tight uppercase">Tóm tắt Sản phẩm</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="px-6 pb-6 space-y-4">
                          <p className="text-xs text-blue-800 leading-relaxed italic">"{submissionSummary.executive_summary}"</p>
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Đóng góp tiêu biểu:</p>
                            <ul className="text-[10px] text-blue-800 space-y-1.5 font-medium">
                              {submissionSummary.key_contributions.map((c, i) => (
                                <li key={i} className="flex gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400/50 mt-1 flex-shrink-0" />
                                  {c}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {plagiarismReport && (
                      <Card className={cn(
                        "rounded-3xl shadow-none",
                        plagiarismReport.originality_score >= 80 ? "bg-emerald-50/30 border-emerald-100" :
                          plagiarismReport.originality_score >= 50 ? "bg-amber-50/30 border-amber-100" :
                            "bg-red-50/30 border-red-100"
                      )}>
                        <CardHeader className="pb-3 px-6 pt-6">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner",
                                plagiarismReport.originality_score >= 80 ? "bg-emerald-100 text-emerald-600" :
                                  plagiarismReport.originality_score >= 50 ? "bg-amber-100 text-amber-600" :
                                    "bg-red-100 text-red-600"
                              )}>
                                <span className="material-symbols-outlined text-lg">{plagiarismReport.originality_score >= 80 ? 'verified' : plagiarismReport.originality_score >= 50 ? 'warning' : 'dangerous'}</span>
                              </div>
                              <CardTitle className={cn(
                                "text-sm font-black tracking-tight uppercase",
                                plagiarismReport.originality_score >= 80 ? "text-emerald-900" :
                                  plagiarismReport.originality_score >= 50 ? "text-amber-900" :
                                    "text-red-900"
                              )}>Tính chính danh</CardTitle>
                            </div>
                            <div className="text-right">
                              <p className={cn(
                                "text-2xl font-black tabular-nums",
                                plagiarismReport.originality_score >= 80 ? "text-emerald-600" :
                                  plagiarismReport.originality_score >= 50 ? "text-amber-600" :
                                    "text-red-600"
                              )}>{plagiarismReport.originality_score}%</p>
                              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Originality</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="px-6 pb-6 space-y-4">
                          <p className={cn(
                            "text-xs leading-relaxed font-bold",
                            plagiarismReport.originality_score >= 80 ? "text-emerald-800" :
                              plagiarismReport.originality_score >= 50 ? "text-amber-800" :
                                "text-red-800"
                          )}>{plagiarismReport.overall_assessment}</p>
                          {plagiarismReport.flagged_sections.length > 0 && (
                            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 text-xs">
                              {plagiarismReport.flagged_sections.slice(0, 3).map((section, i) => (
                                <div key={i} className="p-2 bg-white/50 rounded-xl border border-slate-100 text-[10px]">
                                  <p className="font-black text-slate-600 mb-1 leading-tight">{section.reason}</p>
                                  <p className="text-slate-400 line-clamp-1 italic">"{section.text}"</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Grading Results or Form */}
                  {selectedSubmission.has_grade ? (
                    <div className="bg-slate-50/50 rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                        <span className="material-symbols-outlined text-4xl text-emerald-500">done_all</span>
                      </div>
                      <h3 className="text-2xl font-black font-headline text-[#002068] mb-2 uppercase tracking-tight">KẾT QUẢ ĐÃ GHI NHẬN</h3>
                      <p className="text-sm font-medium text-slate-400 mb-8 tracking-tight">Nhân xét & điểm số đã được đồng bộ hóa vào {formatDate(selectedSubmission.submitted_at || new Date().toISOString())}</p>

                      <div className="inline-flex items-center gap-6 p-8 bg-white rounded-3xl border border-slate-100 shadow-ambient-sm">
                        <div className="text-center px-4">
                          <p className="text-5xl font-black text-[#002068] tabular-nums tracking-tighter leading-none">{(selectedSubmission.grade_score || 0).toFixed(1)}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">ĐIỂM HỆ 10</p>
                        </div>
                        <div className="w-[1px] h-12 bg-slate-100" />
                        <div className="text-left px-4">
                          <Badge className="bg-[#002068] text-white font-black px-4 py-1.5 rounded-lg text-[10px] tracking-tight uppercase">XẾP LOẠI: {(selectedSubmission.grade_score || 0) >= 8 ? 'GIỎI' : (selectedSubmission.grade_score || 0) >= 6.5 ? 'KHÁ' : 'TRUNG BÌNH'}</Badge>
                        </div>
                      </div>

                      {selectedSubmission.grade_feedback && (
                        <div className="mt-10 max-w-xl mx-auto p-8 rounded-3xl bg-white border border-slate-100 text-left relative overflow-hidden shadow-sm">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#002068]" />
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">NHẬN XÉT CỦA GIẢNG VIÊN:</p>
                          <p className="text-sm text-slate-700 leading-relaxed font-medium italic opacity-90">"{selectedSubmission.grade_feedback}"</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between bg-slate-50/80 p-6 rounded-2xl border border-slate-100/50">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-[#002068] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-900/10">
                            <span className="material-symbols-outlined">analytics</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-black font-headline text-[#002068] tracking-tight uppercase">TIÊU CHÍ ĐÁNH GIÁ</h3>
                            <p className="text-[10px] font-bold text-slate-400 italic">Căn cứ theo Biểu mẫu Hội đồng 03/TVHD</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="border-purple-200 text-purple-700 bg-white hover:bg-purple-50 font-bold h-11 px-6 rounded-xl border-2 transition-all"
                            onClick={handleGenerateAiSuggestion}
                            disabled={isGeneratingAi}
                          >
                            {isGeneratingAi ? (
                              <><span className="material-symbols-outlined text-lg mr-2 animate-spin">progress_activity</span>ĐANG PHÂN TÍCH...</>
                            ) : (
                              <><span className="material-symbols-outlined text-lg mr-2 text-purple-500">auto_awesome</span>GỢI Ý CHẤM AI</>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            className="border-2 border-slate-100 bg-white h-11 px-6 rounded-xl font-bold flex items-center gap-2 shadow-sm text-[#002068] hover:bg-slate-50 transition-all"
                            onClick={() => setShowTurnitinUpload(true)}
                          >
                            <span className="material-symbols-outlined text-lg">verified_user</span>
                            TURNITIN
                          </Button>
                        </div>
                      </div>

                      {aiSuggestions && (
                        <div className="p-8 bg-gradient-to-br from-purple-50/50 to-blue-50/50 border border-purple-100/50 rounded-3xl animate-in fade-in duration-500">
                          <div className="flex items-start gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-ambient-sm flex-shrink-0">
                              <span className="material-symbols-outlined text-2xl text-purple-500">psychology</span>
                            </div>
                            <div className="flex-1 space-y-4">
                              <div>
                                <p className="text-[11px] font-black text-purple-900 uppercase tracking-[0.1em] mb-2">ĐỀ XUẤT TỪ AI TRỢ LÝ:</p>
                                <p className="text-xs text-purple-800 leading-relaxed font-medium opacity-80 italic">"{aiSuggestions.overall_feedback}"</p>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {aiSuggestions.strengths.length > 0 && (
                                  <div className="bg-white/40 p-4 rounded-2xl border border-purple-100/30">
                                    <p className="text-[10px] font-black text-purple-700 uppercase mb-2 tracking-widest">Điểm mạnh:</p>
                                    <ul className="text-[10px] text-purple-800 space-y-2">
                                      {aiSuggestions.strengths.slice(0, 3).map((s, i) => (
                                        <li key={i} className="flex gap-2 leading-tight">
                                          <span className="text-emerald-500 font-black">✓</span>
                                          {s}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {aiSuggestions.areas_for_improvement.length > 0 && (
                                  <div className="bg-white/40 p-4 rounded-2xl border border-purple-100/30">
                                    <p className="text-[10px] font-black text-orange-700 uppercase mb-2 tracking-widest">Cần lưu ý:</p>
                                    <ul className="text-[10px] text-purple-800 space-y-2">
                                      {aiSuggestions.areas_for_improvement.slice(0, 3).map((a, i) => (
                                        <li key={i} className="flex gap-2 leading-tight">
                                          <span className="text-orange-500 font-black">!</span>
                                          {a}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-left">
                              <th className="pb-4 pr-4">Tiêu chí</th>
                              <th className="pb-4 px-4 text-center">Yếu</th>
                              <th className="pb-4 px-4 text-center">Trung bình</th>
                              <th className="pb-4 px-4 text-center">Khá</th>
                              <th className="pb-4 px-4 text-center">Giỏi</th>
                              <th className="pb-4 pl-4 text-right">Điểm số</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {GRADING_CRITERIA.map((item) => {
                              const aiMatchingKey =
                                item.key === 'content' ? 'criteria_1' :
                                  item.key === 'presentation' ? 'criteria_3' :
                                    (item.key === 'qa' || item.key === 'creativity') ? 'criteria_4' :
                                      'criteria_2';
                              const aiScore = aiSuggestions?.criteria_scores[aiMatchingKey];

                              return (
                                <tr key={item.key} className="group hover:bg-slate-50/50 transition-colors">
                                  <td className="py-8 pr-4 max-w-[220px]">
                                    <p className="font-black text-[#002068] mb-1 leading-tight uppercase tracking-tight text-sm">{item.name}</p>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{item.sub}</p>
                                    {aiScore && (
                                      <div className="mt-3 bg-purple-50 p-2 rounded-xl border border-purple-100/50 animate-in fade-in zoom-in-95 duration-500">
                                        <p className="text-[9px] text-purple-700 leading-relaxed font-bold">
                                          <span className="font-black">AI: </span>{aiScore.justification}
                                        </p>
                                      </div>
                                    )}
                                  </td>
                                  {Object.entries(item.levels).map(([level, data]) => (
                                    <td key={level} className="py-8 px-4 text-center align-top max-w-[120px]">
                                      <div className="space-y-1.5 transition-all duration-300">
                                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{data.score}</p>
                                        <p className="text-[8px] leading-relaxed text-slate-500 font-bold italic">{data.text}</p>
                                      </div>
                                    </td>
                                  ))}
                                  <td className="py-8 pl-4 text-right">
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      max={item.maxScore}
                                      placeholder="0.0"
                                      value={scores[item.key] || ''}
                                      onChange={(e) => handleScoreChange(item.key, e.target.value)}
                                      className={cn(
                                        "w-20 h-16 bg-white border-2 border-slate-200 rounded-2xl text-center font-black text-lg focus:ring-8 focus:ring-blue-100 focus:border-[#002068] transition-all outline-none shadow-sm",
                                        aiScore ? "border-purple-300 ring-4 ring-purple-50 bg-purple-50/20" : "hover:border-slate-300"
                                      )}
                                    />
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-12 pt-10 border-t-2 border-slate-100 flex items-center justify-between">
                        <h4 className="text-lg font-black font-headline text-[#002068] tracking-[0.2em] uppercase">KẾT QUẢ ĐÁNH GIÁ :</h4>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className="text-6xl font-black text-[#002068] tracking-tighter tabular-nums leading-none">{calculateTotal}</span>
                            <span className="text-sm font-bold text-slate-400 ml-1">/ 10</span>
                          </div>
                          <div className="w-[1px] h-14 bg-slate-200" />
                          <Badge className={cn(
                            "text-white rounded-xl px-5 py-2 font-black text-[10px] tracking-widest shadow-lg uppercase",
                            parseFloat(calculateTotal) >= 8 ? "bg-emerald-600 shadow-emerald-900/10" :
                              parseFloat(calculateTotal) >= 6.5 ? "bg-[#002068] shadow-blue-900/10" :
                                "bg-amber-600 shadow-amber-900/10"
                          )}>
                            {parseFloat(calculateTotal) >= 8 ? 'XẾP LOẠI: GIỎI' :
                              parseFloat(calculateTotal) >= 6.5 ? 'XẾP LOẠI: KHÁ' : 'KHÁC'}
                          </Badge>
                        </div>
                      </div>

                      <div className="bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block">Nhận xét chi tiết (Bắt buộc)</label>
                        <textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          className="w-full h-40 p-6 rounded-2xl border-none bg-white text-sm text-slate-700 shadow-inner focus:ring-8 focus:ring-blue-100 transition-all outline-none font-medium placeholder:text-slate-300"
                          placeholder="Nhập ý kiến đánh giá học thuật, ưu điểm & hạn chế của đề tài..."
                        />
                      </div>

                      <div className="flex gap-4 pt-8">
                        <Button
                          variant="ghost"
                          className="px-8 font-black text-slate-400 hover:text-[#002068] hover:bg-slate-50 rounded-xl transition-all"
                          onClick={() => router.push('/lecturer/students')}
                        >
                          HỦY BỎ
                        </Button>
                        <div className="flex-1" />
                        <Button
                          variant="outline"
                          className="h-14 px-8 border-2 border-slate-100 bg-white rounded-2xl font-black text-slate-500 hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-all active:scale-95"
                          onClick={() => handleSubmitGrade(false)}
                          disabled={isPublishing}
                        >
                          <span className="material-symbols-outlined text-xl">save</span>
                          LƯU NHÁP PHIẾU
                        </Button>
                        <Button
                          className="h-14 px-12 bg-[#002068] hover:bg-[#001a4d] text-white rounded-2xl font-black flex items-center gap-2 shadow-xl shadow-blue-900/20 transition-all active:scale-95 bg-gradient-to-br from-[#002068] to-[#003399]"
                          onClick={() => handleSubmitGrade(true)}
                          disabled={isPublishing}
                        >
                          <span className="material-symbols-outlined text-xl">send</span>
                          {isPublishing ? 'ĐANG GỬI...' : 'GỬI ĐIỂM SỐ'}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Turnitin Analysis Dialog */}
      {showTurnitinUpload && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-md shadow-2xl rounded-[2.5rem] border-none overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="bg-gradient-to-br from-[#002068] to-[#013DA5] p-8 text-white text-center relative">
              <h3 className="text-2xl font-black font-headline mb-1 tracking-tight uppercase">Turnitin Analysis</h3>
              <p className="text-white/60 text-xs font-medium italic">Xác thực độ nguyên bản của sản phẩm</p>
              <Button
                variant="ghost"
                onClick={() => setShowTurnitinUpload(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors border-none p-0"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </Button>
            </div>
            <CardContent className="p-8 space-y-8 bg-white">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Tỷ lệ tương đồng (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    id="similarity_score_val"
                    className="w-full h-16 pl-6 pr-14 border-2 border-slate-100 rounded-2xl focus:ring-8 focus:ring-blue-100 focus:border-[#002068] outline-none transition-all font-black text-2xl text-[#002068] bg-slate-50/50"
                    placeholder="00"
                    defaultValue={turnitinReport.similarity_score || ''}
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-2xl text-slate-300">%</span>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Tệp chứng thực (PDF)</label>
                <div className="relative group">
                  <input
                    type="file"
                    id="turnitin_file_val"
                    accept=".pdf"
                    className="w-full p-4 border-2 border-dashed border-slate-200 rounded-2xl text-[11px] font-bold text-slate-400 bg-slate-50 group-hover:border-[#002068] group-hover:bg-blue-50 transition-all cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <Button
                  className="flex-1 bg-[#002068] text-white font-black h-14 rounded-2xl shadow-lg shadow-blue-900/20 active:scale-95 transition-all bg-gradient-to-br from-[#002068] to-[#013DA5]"
                  disabled={isUploadingTurnitin}
                  onClick={() => {
                    const fileInput = document.getElementById('turnitin_file_val') as HTMLInputElement
                    const scoreInput = document.getElementById('similarity_score_val') as HTMLInputElement
                    if (fileInput.files?.[0] && scoreInput.value) {
                      handleUploadTurnitin(fileInput.files[0], scoreInput.value)
                    } else if (turnitinReport.file_url) {
                      setShowTurnitinUpload(false)
                    }
                  }}
                >
                  {isUploadingTurnitin ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN DỮ LIỆU'}
                </Button>
                <Button variant="ghost" onClick={() => setShowTurnitinUpload(false)} className="h-14 font-black text-slate-400 hover:text-slate-600 px-6 transition-all">HỦY</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
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

export default withLecturer(LecturerGradingPage)
