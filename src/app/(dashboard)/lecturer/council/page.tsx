'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { withLecturer } from '@/hocs/with-role-check'
import { useAuthUser } from '@/hooks/use-auth-user'
import { createClient } from '@/lib/supabase/client'
import Papa from 'papaparse'

// Sub-components
import { GradingPanel } from '../reviewer/components/GradingPanel'
import { SubmissionViewerModal } from '../grading/components/SubmissionViewerModal'
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
}

const COUNCIL_CRITERIA = [
   {
      name: 'Slide', sub: 'Trình bày & Thẩm mỹ', key: 'slide', maxScore: 1.0,
      levels: {
         'yếu': { score: '0.2', text: 'Thiếu hoặc quá sơ sài.' },
         'tb': { score: '0.5', text: 'Chưa đẹp, bố cục lộn xộn.' },
         'khá': { score: '0.8', text: 'Đẹp, rõ ràng, minh họa tốt.' },
         'giỏi': { score: '1.0', text: 'Rất đẹp, chuyên nghiệp, thu hút.' }
      }
   },
   {
      name: 'Thuyết trình', sub: 'Phong thái & Diễn đạt', key: 'presentation', maxScore: 1.5,
      levels: {
         'yếu': { score: '0.5', text: 'Đọc slide, thiếu tự tin.' },
         'tb': { score: '1.0', text: 'Rõ ràng nhưng phụ thuộc tài liệu.' },
         'khá': { score: '1.2', text: 'Lưu loát, làm chủ nội dung.' },
         'giỏi': { score: '1.5', text: 'Lôi cuốn, chuyên nghiệp.' }
      }
   },
   {
      name: 'Thời gian', sub: 'Phân bổ & Tuân thủ', key: 'timing', maxScore: 0.5,
      levels: {
         'yếu': { score: '0', text: 'Quá > 5 phút.' },
         'tb': { score: '0.1', text: 'Quá 1-3 phút.' },
         'khá': { score: '0.3', text: 'Đúng giờ (+/- 1m).' },
         'giỏi': { score: '0.5', text: 'Phân bổ hợp lý từng phần.' }
      }
   },
   {
      name: 'Sáng tạo', sub: 'Tính mới & Giải pháp', key: 'innovation', maxScore: 1.0,
      levels: {
         'yếu': { score: '0.2', text: 'Không có tính mới.' },
         'tb': { score: '0.5', text: 'Có nỗ lực nhưng chưa rõ.' },
         'khá': { score: '0.8', text: 'Sáng tạo, giải pháp tốt.' },
         'giỏi': { score: '1.0', text: 'Rất sáng tạo, tính ứng dụng cao.' }
      }
   },
   {
      name: 'Điểm cộng', sub: 'Tiếng Anh/Bài báo', key: 'bonus', maxScore: 2.0,
      levels: {
         'không': { score: '0', text: 'Không có điểm cộng.' },
         'có': { score: '1.0-2.0', text: 'Có viết tiếng Anh hoặc bài báo khoa học đã đăng.' }
      }
   }
]

function LecturerCouncilPage() {
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

   const fetchSubmissions = React.useCallback(async () => {
      try {
         setIsLoading(true)
         setError(null)
         const data = await api.lecturer.submissions({ role: 'council' })
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

   React.useEffect(() => {
      fetchSubmissions()
   }, [fetchSubmissions])

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
         await api.lecturer.grades.submit({
            submission_id: selectedSubmission.id,
            registration_id: selectedSubmission.registration_id,
            criteria_scores: scores,
            total_score: parseFloat(calculateTotal),
            feedback: feedback,
            is_published: publish,
            grader_role: 'council',
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
            Object.entries(data.criteria_scores).forEach(([key, val]: [string, any]) => {
               const scoreVal = parseFloat(val.score) || 0
               if (key === 'criteria_1') newScores['content'] = Math.min(4.0, scoreVal).toString()
               if (key === 'criteria_2') newScores['slide'] = Math.min(1.0, scoreVal).toString()
               if (key === 'criteria_3') newScores['presentation'] = Math.min(1.5, scoreVal).toString()
               if (key === 'criteria_4') newScores['qa'] = Math.min(2.0, scoreVal).toString()
            })
         }
         setScores(prev => ({ ...prev, ...newScores }))
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
            [{ label: 'Chấm Hội Đồng', href: '/lecturer/council' }, { label: selectedSubmission.student_name }] :
            [{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Chấm Hội Đồng' }]}
      >
         {/* View 1: Main Dashboard List */}
         {!selectedSubmission && (
            <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500">
               {/* Header Area */}
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200/60">
                  <div>
                     <h1 className="text-3xl font-black font-headline text-[#002068] tracking-tight uppercase mb-2">CHẤM ĐIỂM HỘI ĐỒNG</h1>
                     <p className="text-slate-500 font-medium">Đánh giá sinh viên trực tiếp tại Phiên hội đồng bảo vệ.</p>
                  </div>
               </div>

               {/* Stats Overview */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
               </div>

               {/* Lists Table Area */}
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
                                 <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Không có bài nộp nào</td>
                                 </tr>
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
                                          <Badge className="bg-slate-100 text-slate-500 pointer-events-none hover:bg-slate-100 border-none font-black text-[9px] uppercase tracking-widest rounded-lg">ROUND {sub.round_number}</Badge>
                                       </td>
                                       <td className="py-4 px-6 text-center">
                                          {sub.has_grade ? (
                                             <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50 pointer-events-none border-emerald-200 font-black text-[9px] uppercase tracking-widest rounded-lg">ĐÃ CHẤM: {sub.grade_score?.toFixed(1)}</Badge>
                                          ) : (
                                             <Badge className="bg-amber-50 text-amber-600 hover:bg-amber-50 pointer-events-none border-amber-200 font-black text-[9px] uppercase tracking-widest rounded-lg">CHỜ CHẤM</Badge>
                                          )}
                                       </td>
                                       <td className="py-4 px-6 text-right">
                                          <Button
                                             variant={sub.has_grade ? "outline" : "default"}
                                             className={cn(
                                                "h-9 px-4 rounded-xl font-black text-[10px] transition-all",
                                                !sub.has_grade && "bg-[#002068] hover:bg-[#001a4d] text-white shadow-md active:scale-95",
                                                sub.has_grade && "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                             )}
                                             onClick={() => setSelectedSubmission(sub)}
                                          >
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

                     {/* Top section: Info + Student Theme Title */}
                     <div className="bg-white rounded-3xl p-8 border border-slate-200/60 shadow-ambient-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">TÊN ĐỀ TÀI</p>
                        <p className="text-lg text-slate-700 font-medium italic leading-relaxed">"{selectedSubmission.thesis_title}"</p>
                     </div>

                     {/* The Council Grading Panel */}
                     <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-ambient-lg p-1 md:p-2">
                        <GradingPanel
                           submission={selectedSubmission}
                           criteria={COUNCIL_CRITERIA}
                           scores={scores}
                           onScoreChange={(key: string, val: string) => setScores(prev => ({ ...prev, [key]: val }))}
                           onShowTurnitin={() => setShowTurnitinUpload(true)}
                           feedback={feedback}
                           onFeedbackChange={setFeedback}
                           onSubmit={handleSubmitGrade}
                           isPublishing={isPublishing}
                           calculateTotal={calculateTotal}
                           isGeneratingAi={isGeneratingAi}
                           aiSuggestions={aiSuggestions}
                           onGenerateAiSuggestion={handleGenerateAiSuggestion}
                           isGeneratingSummary={isGeneratingSummary}
                           submissionSummary={submissionSummary}
                           onGenerateSummary={handleGenerateSummary}
                           isCheckingPlagiarism={isCheckingPlagiarism}
                           plagiarismReport={plagiarismReport}
                           onCheckPlagiarism={handleCheckPlagiarism}
                        />
                     </div>
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

export default withLecturer(LecturerCouncilPage)
