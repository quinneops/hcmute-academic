'use client'

import * as React from 'react'
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
  key: string
  maxScore: number
  score: number | null
}

const GRADING_CRITERIA = [
  { name: 'Nội dung', key: 'content', maxScore: 3 },
  { name: 'Phương pháp', key: 'methodology', maxScore: 2 },
  { name: 'Trình bày', key: 'presentation', maxScore: 2 },
  { name: 'Tài liệu tham khảo', key: 'qna', maxScore: 1 },
  { name: 'Sáng tạo', key: 'creativity', maxScore: 2 },
]

function LecturerGradingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuthUser()
  const [pendingSubmissions, setPendingSubmissions] = React.useState<Submission[]>([])
  const [gradedSubmissions, setGradedSubmissions] = React.useState<Submission[]>([])
  const [selectedSubmission, setSelectedSubmission] = React.useState<Submission | null>(null)
  const [scores, setScores] = React.useState<Record<string, number | null>>({})
  const [feedback, setFeedback] = React.useState('')
  const [isPublishing, setIsPublishing] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)
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
      const firstPending = data.pendingSubmissions?.[0]
      const firstGraded = data.gradedSubmissions?.[0]

      if (submissionId) {
        const found = [...(data.pendingSubmissions || []), ...(data.gradedSubmissions || [])].find(
          (s: Submission) => s.id === submissionId
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
      // For now, just reset
      setScores({})
      setFeedback(selectedSubmission.grade_feedback || '')
    } else {
      setScores({})
      setFeedback('')
    }
    setSuccess(false)
  }, [selectedSubmission])

  const calculateTotal = () => {
    return Object.values(scores).reduce((sum, score) => sum + (score || 0), 0)
  }

  const handleScoreChange = (key: string, value: number) => {
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
        total_score: calculateTotal(),
        feedback: feedback,
        is_published: publish,
      })

      setSuccess(true)
      await fetchSubmissions()

      // Move to next pending submission
      const nextPending = pendingSubmissions.find(s => s.id !== selectedSubmission.id)
      if (nextPending) {
        setSelectedSubmission(nextPending)
      }
    } catch (err: any) {
      console.error('Submit grade error:', err)
      setError(err.message || 'Không thể lưu điểm')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleGenerateAiSuggestion = async () => {
    if (!selectedSubmission) return

    // Check file size limit for AI (5MB)
    const MAX_SIZE_FOR_AI = 5 * 1024 * 1024 // 5MB
    if (selectedSubmission.file_size && selectedSubmission.file_size > MAX_SIZE_FOR_AI) {
      setError('File quá lớn (>5MB) để AI chấm điểm. Vui lòng tải xuống và chấm thủ công.')
      return
    }

    // Get extracted content from PDF viewer
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
          submission_content: extractedContent,
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

      const newScores: Record<string, number | null> = {}
      Object.entries(data.criteria_scores).forEach(([key, value]: [string, any]) => {
        const criterionKey = GRADING_CRITERIA.find(c => {
          const criterionNames = {
            content: 'criteria_1',
            methodology: 'criteria_2',
            presentation: 'criteria_3',
            qna: 'criteria_4',
            creativity: 'criteria_4',
          }
          return criterionNames[c.key as keyof typeof criterionNames] === key
        })?.key
        if (criterionKey) {
          newScores[criterionKey] = Math.min(
            GRADING_CRITERIA.find(c => c.key === criterionKey)?.maxScore || 10,
            value.score
          )
        }
      })
      setScores(newScores)
    } catch (err: any) {
      console.error('AI suggestion error:', err)
      setError(err.message || 'Không thể tạo gợi ý từ AI')
    } finally {
      setIsGeneratingAi(false)
    }
  }

  const handleGenerateSubmissionSummary = async () => {
    if (!selectedSubmission) return

    // Check file size limit for AI (5MB)
    const MAX_SIZE_FOR_AI = 5 * 1024 * 1024 // 5MB
    if (selectedSubmission.file_size && selectedSubmission.file_size > MAX_SIZE_FOR_AI) {
      setError('File quá lớn (>5MB) để AI tóm tắt. Vui lòng tải xuống để đọc.')
      return
    }

    // Get extracted content from PDF viewer
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
          submission_content: extractedContent,
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

    // Check file size limit for AI (5MB)
    const MAX_SIZE_FOR_AI = 5 * 1024 * 1024 // 5MB
    if (selectedSubmission.file_size && selectedSubmission.file_size > MAX_SIZE_FOR_AI) {
      setError('File quá lớn (>5MB) để AI kiểm tra đạo văn. Vui lòng tải xuống và kiểm tra thủ công.')
      return
    }

    // Get extracted content from PDF viewer
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
          submission_content: extractedContent,
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
      <Shell role="lecturer" user={{ name: '...', email: '...', avatar: '' }} breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Chấm điểm' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell
      role="lecturer"
      user={{ name: user?.full_name || 'Giảng viên', email: user?.email || '...', avatar: user?.avatar_url || '' }}
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Chấm điểm' }]}
      notifications={0}
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-display-sm font-headline font-extrabold text-primary tracking-tight">
            Chấm Điểm Sản Phẩm
          </h2>
          <p className="text-body-md text-on-surface-variant font-medium">
            Đánh giá và chấm điểm sản phẩm sinh viên nộp
          </p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-amber-100 text-amber-700 text-[10px] font-bold uppercase">
            {pendingSubmissions.length} Chờ chấm
          </Badge>
          <Badge className="bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">
            {gradedSubmissions.length} Đã chấm
          </Badge>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg text-error">
          <p className="font-bold">Lỗi: {error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800">
          <p className="font-bold">✓ Đã lưu điểm thành công!</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Submissions List */}
        <div className="lg:col-span-1">
          <Card className="bg-surface-container-lowest shadow-ambient-lg border-none sticky top-24">
            <CardHeader>
              <CardTitle className="font-headline font-bold text-primary text-lg">
                Bài cần chấm
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingSubmissions.length === 0 && gradedSubmissions.length === 0 ? (
                <div className="text-center py-8 text-secondary">
                  <span className="material-symbols-outlined text-4xl mb-2">check_circle</span>
                  <p>Không có bài cần chấm</p>
                </div>
              ) : (
                <>
                  {pendingSubmissions.map((submission) => (
                    <button
                      key={submission.id}
                      onClick={() => setSelectedSubmission(submission)}
                      className={cn(
                        "w-full p-4 rounded-lg text-left transition-all border",
                        selectedSubmission?.id === submission.id
                          ? 'bg-primary-fixed/20 border-primary'
                          : 'bg-surface-container-low hover:bg-surface-container-low/80 border-transparent',
                        'border-l-4 border-l-amber-500'
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-sm">description</span>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-on-surface">{submission.student_name}</p>
                            <p className="text-[10px] text-secondary">{submission.student_code}</p>
                          </div>
                        </div>
                        <Badge className="bg-amber-100 text-amber-700 text-[10px]">Mới</Badge>
                      </div>
                      <p className="text-xs text-on-surface-variant line-clamp-1">{submission.thesis_title}</p>
                      <p className="text-[10px] text-secondary mt-1">{formatDate(submission.submitted_at)}</p>
                    </button>
                  ))}

                  {gradedSubmissions.length > 0 && (
                    <>
                      <div className="py-2">
                        <p className="text-xs font-bold text-secondary uppercase">Đã chấm</p>
                      </div>
                      {gradedSubmissions.map((submission) => (
                        <button
                          key={submission.id}
                          onClick={() => setSelectedSubmission(submission)}
                          className={cn(
                            "w-full p-4 rounded-lg text-left transition-all border",
                            selectedSubmission?.id === submission.id
                              ? 'bg-primary-fixed/20 border-primary'
                              : 'bg-surface-container-low hover:bg-surface-container-low/80 border-transparent'
                          )}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                              </div>
                              <div>
                                <p className="text-xs font-bold text-on-surface">{submission.student_name}</p>
                                <p className="text-[10px] text-secondary">{submission.student_code}</p>
                              </div>
                            </div>
                            <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
                              {submission.grade_score?.toFixed(1)}
                            </Badge>
                          </div>
                          <p className="text-xs text-on-surface-variant line-clamp-1">{submission.thesis_title}</p>
                          <p className="text-[10px] text-secondary mt-1">{formatDate(submission.submitted_at)}</p>
                        </button>
                      ))}
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Grading Form */}
        <div className="lg:col-span-2">
          {!selectedSubmission ? (
            <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
              <CardContent className="py-12 text-center text-secondary">
                <span className="material-symbols-outlined text-4xl mb-2">assignment</span>
                <p>Chọn một bài từ danh sách để chấm</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="font-headline font-bold text-primary text-lg mb-2">
                      {selectedSubmission.thesis_title}
                    </CardTitle>
                    <CardDescription className="text-secondary">
                      {selectedSubmission.student_name} ({selectedSubmission.student_code}) • {selectedSubmission.file_name}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    className="border-primary-fixed text-primary"
                    onClick={() => window.open(selectedSubmission.file_url, '_blank')}
                  >
                    <span className="material-symbols-outlined text-sm mr-2">download</span>
                    Tải xuống
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* File Viewer - supports PDF, images, video, audio, text, Office */}
                <FileViewer
                  url={selectedSubmission.file_url}
                  fileName={selectedSubmission.file_name}
                  fileSize={selectedSubmission.file_size}
                  onContentExtracted={(content) => {
                    // Store extracted content for AI features
                    ;(window as any).__currentSubmissionContent = content
                  }}
                  onError={(error) => {
                    console.error('PDF Viewer error:', error)
                  }}
                />

                {/* AI Tools Bar */}
                {!selectedSubmission.has_grade && (
                  <div className="flex gap-2 mb-4">
                    <Button
                      variant="outline"
                      className="border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 text-xs h-9"
                      onClick={handleGenerateSubmissionSummary}
                      disabled={isGeneratingSummary}
                    >
                      {isGeneratingSummary ? (
                        <><span className="material-symbols-outlined text-sm mr-1 animate-spin">progress_activity</span>Đang tóm tắt...</>
                      ) : (
                        <><span className="material-symbols-outlined text-sm mr-1">auto_awesome</span>Tóm tắt AI</>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100 text-xs h-9"
                      onClick={handleCheckPlagiarism}
                      disabled={isCheckingPlagiarism}
                    >
                      {isCheckingPlagiarism ? (
                        <><span className="material-symbols-outlined text-sm mr-1 animate-spin">progress_activity</span>Đang kiểm tra...</>
                      ) : (
                        <><span className="material-symbols-outlined text-sm mr-1">security</span>Kiểm tra đạo văn</>
                      )}
                    </Button>
                  </div>
                )}

                {/* Submission Summary Card */}
                {submissionSummary && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                          <span className="material-symbols-outlined text-sm">description</span>
                        </div>
                        <CardTitle className="text-base font-bold text-blue-900">Tóm tắt bài nộp</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-blue-800 leading-relaxed">{submissionSummary.executive_summary}</p>
                      <div>
                        <p className="text-xs font-bold text-blue-700 uppercase mb-1">Đóng góp chính:</p>
                        <ul className="text-xs text-blue-800 list-disc list-inside space-y-1">
                          {submissionSummary.key_contributions.map((c, i) => <li key={i}>{c}</li>)}
                        </ul>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <div>
                          <p className="font-bold text-blue-700">Phương pháp:</p>
                          <p className="text-blue-800">{submissionSummary.methodology_used}</p>
                        </div>
                        <div>
                          <p className="font-bold text-blue-700">Độ tin cậy:</p>
                          <p className={cn(
                            submissionSummary.confidence_level === 'high' ? 'text-emerald-600 font-bold' :
                            submissionSummary.confidence_level === 'medium' ? 'text-amber-600' :
                            'text-orange-600'
                          )}>{submissionSummary.confidence_level === 'high' ? 'Cao' : submissionSummary.confidence_level === 'medium' ? 'Trung bình' : 'Thấp'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Plagiarism Report Card */}
                {plagiarismReport && (
                  <Card className={cn(
                    "border-2",
                    plagiarismReport.originality_score >= 80 ? "bg-emerald-50 border-emerald-200" :
                    plagiarismReport.originality_score >= 50 ? "bg-amber-50 border-amber-200" :
                    "bg-red-50 border-red-200"
                  )}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            plagiarismReport.originality_score >= 80 ? "bg-emerald-100 text-emerald-600" :
                            plagiarismReport.originality_score >= 50 ? "bg-amber-100 text-amber-600" :
                            "bg-red-100 text-red-600"
                          )}>
                            <span className="material-symbols-outlined text-sm">{plagiarismReport.originality_score >= 80 ? 'check_circle' : plagiarismReport.originality_score >= 50 ? 'warning' : 'error'}</span>
                          </div>
                          <CardTitle className={cn(
                            "text-base font-bold",
                            plagiarismReport.originality_score >= 80 ? "text-emerald-900" :
                            plagiarismReport.originality_score >= 50 ? "text-amber-900" :
                            "text-red-900"
                          )}>Kết quả kiểm tra đạo văn</CardTitle>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            "text-2xl font-black",
                            plagiarismReport.originality_score >= 80 ? "text-emerald-600" :
                            plagiarismReport.originality_score >= 50 ? "text-amber-600" :
                            "text-red-600"
                          )}>{plagiarismReport.originality_score}%</p>
                          <p className="text-xs text-secondary">Độ nguyên bản</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className={cn(
                        "text-sm",
                        plagiarismReport.originality_score >= 80 ? "text-emerald-800" :
                        plagiarismReport.originality_score >= 50 ? "text-amber-800" :
                        "text-red-800"
                      )}>{plagiarismReport.overall_assessment}</p>
                      {plagiarismReport.flagged_sections.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-secondary uppercase mb-2">Các đoạn cần xem xét ({plagiarismReport.flagged_sections.length}):</p>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {plagiarismReport.flagged_sections.map((section, i) => (
                              <div key={i} className={cn(
                                "p-2 rounded text-xs",
                                section.severity === 'high' ? "bg-red-100 text-red-800" :
                                section.severity === 'medium' ? "bg-amber-100 text-amber-800" :
                                "bg-slate-100 text-slate-700"
                              )}>
                                <p className="font-bold">{section.reason}</p>
                                <p className="mt-1 line-clamp-2">{section.text}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {plagiarismReport.recommendations.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-secondary uppercase mb-2">Đề xuất:</p>
                          <ul className="text-xs text-on-surface-variant list-disc list-inside space-y-1">
                            {plagiarismReport.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Grading Criteria */}
                {selectedSubmission.has_grade ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                      <span className="material-symbols-outlined text-4xl">check_circle</span>
                    </div>
                    <h3 className="text-headline-md font-bold text-on-surface mb-2">Đã chấm điểm</h3>
                    <p className="text-secondary mb-4">Bài này đã được chấm vào {formatDate(selectedSubmission.submitted_at)}</p>
                    <div className="inline-flex items-center gap-4 p-6 bg-emerald-50 rounded-lg">
                      <div className="text-center">
                        <p className="text-4xl font-black text-emerald-600">{selectedSubmission.grade_score?.toFixed(1)}</p>
                        <p className="text-xs text-emerald-700 uppercase">Điểm số</p>
                      </div>
                    </div>
                    {selectedSubmission.grade_feedback && (
                      <div className="mt-6 p-4 bg-white rounded-lg text-left">
                        <p className="text-sm font-bold text-secondary mb-2">Nhận xét:</p>
                        <p className="text-sm text-on-surface">{selectedSubmission.grade_feedback}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-bold text-secondary uppercase tracking-widest">
                        Tiêu chí chấm điểm
                      </h4>
                      <Button
                        variant="outline"
                        className="border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100"
                        onClick={handleGenerateAiSuggestion}
                        disabled={isGeneratingAi}
                      >
                        {isGeneratingAi ? (
                          <>
                            <span className="material-symbols-outlined text-sm mr-2 animate-spin">progress_activity</span>
                            Đang tạo...
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-sm mr-2">auto_awesome</span>
                            Gợi ý chấm bằng AI
                          </>
                        )}
                      </Button>
                    </div>

                    {aiSuggestions && (
                      <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-sm">psychology</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-purple-900 mb-2">Gợi ý từ AI:</p>
                            <p className="text-sm text-purple-800 mb-3">{aiSuggestions.overall_feedback}</p>
                            {aiSuggestions.strengths.length > 0 && (
                              <div className="mb-2">
                                <p className="text-xs font-bold text-purple-700 uppercase mb-1">Điểm mạnh:</p>
                                <ul className="text-xs text-purple-800 list-disc list-inside space-y-1">
                                  {aiSuggestions.strengths.map((s, i) => (
                                    <li key={i}>{s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {aiSuggestions.areas_for_improvement.length > 0 && (
                              <div>
                                <p className="text-xs font-bold text-purple-700 uppercase mb-1">Cải thiện:</p>
                                <ul className="text-xs text-purple-800 list-disc list-inside space-y-1">
                                  {aiSuggestions.areas_for_improvement.map((a, i) => (
                                    <li key={i}>{a}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      {GRADING_CRITERIA.map((criterion) => {
                        const aiJustification = aiSuggestions?.criteria_scores[
                          ({
                            content: 'criteria_1',
                            methodology: 'criteria_2',
                            presentation: 'criteria_3',
                            qna: 'criteria_4',
                            creativity: 'criteria_4',
                          }[criterion.key]
                        )]?.justification

                        return (
                          <div key={criterion.key} className={cn(
                            "p-4 rounded-lg transition-all",
                            aiJustification ? "bg-purple-50/50 border border-purple-100" : "bg-surface-container-low"
                          )}>
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-sm font-bold text-on-surface">{criterion.name}</span>
                              <span className="text-xs text-secondary">
                                Tối đa: {criterion.maxScore} điểm
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <input
                                type="number"
                                min="0"
                                max={criterion.maxScore}
                                step="0.25"
                                value={scores[criterion.key] ?? ''}
                                onChange={(e) => handleScoreChange(criterion.key, parseFloat(e.target.value) || 0)}
                                className="w-24 px-3 py-2 bg-white rounded-lg border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="0"
                              />
                              <input
                                type="range"
                                min="0"
                                max={criterion.maxScore}
                                step="0.25"
                                value={scores[criterion.key] ?? 0}
                                onChange={(e) => handleScoreChange(criterion.key, parseFloat(e.target.value))}
                                className="flex-1 accent-primary"
                              />
                              <span className="text-sm font-bold text-primary w-12 text-right">
                                {scores[criterion.key] ?? 0}
                              </span>
                            </div>
                            {aiJustification && (
                              <div className="mt-3 pt-3 border-t border-purple-100">
                                <p className="text-xs text-purple-700">
                                  <span className="font-bold">AI gợi ý:</span> {aiJustification}
                                </p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Total Score */}
                    <div className="p-6 bg-primary-fixed/20 rounded-lg border border-primary-fixed">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-secondary uppercase">Tổng điểm</span>
                        <div className="text-right">
                          <span className="text-3xl font-black text-primary">{calculateTotal()}</span>
                          <span className="text-sm text-secondary ml-1">/ 10</span>
                        </div>
                      </div>
                      <Progress value={(calculateTotal() / 10) * 100} className="h-3 mt-4" indicatorClassName="bg-primary" />
                    </div>

                    {/* Feedback */}
                    <div>
                      <label className="text-sm font-bold text-secondary uppercase tracking-widest block mb-2">
                        Nhận xét
                      </label>
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="w-full px-4 py-3 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary min-h-[120px]"
                        placeholder="Nhập nhận xét cho sinh viên..."
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-outline-variant/15">
                      <Button
                        className="flex-1 bg-primary hover:bg-primary/90 text-white shadow-glow-primary"
                        onClick={() => handleSubmitGrade(true)}
                        disabled={isPublishing}
                      >
                        <span className="material-symbols-outlined text-sm mr-2">check_circle</span>
                        Lưu và nộp điểm
                      </Button>
                      <Button
                        variant="outline"
                        className="border-slate-200 text-secondary"
                        onClick={() => handleSubmitGrade(false)}
                        disabled={isPublishing}
                      >
                        <span className="material-symbols-outlined text-sm mr-2">save</span>
                        Lưu nháp
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
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
