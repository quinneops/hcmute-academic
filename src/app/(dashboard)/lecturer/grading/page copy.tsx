'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  defense_time: string | null
  defense_room: string | null
}

const GRADING_CRITERIA = [
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

function GradingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const submissionId = searchParams.get('id')
  const studentId = searchParams.get('student')
  const { user } = useAuthUser()
  const supabase = createClient()

  const [submission, setSubmission] = useState<Submission | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPublishing, setIsPublishing] = useState(false)
  const [criteriaScores, setCriteriaScores] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [showTurnitinUpload, setShowTurnitinUpload] = useState(false)
  const [isUploadingTurnitin, setIsUploadingTurnitin] = useState(false)
  const [turnitinReport, setTurnitinReport] = useState<{ similarity_score: number | null, file_url: string | null }>({
    similarity_score: null,
    file_url: null
  })

  useEffect(() => {
    if (submissionId || studentId) {
      fetchSubmission()
    } else {
      setIsLoading(false)
      setError('Thiếu thông tin bài nộp (ID) hoặc mã sinh viên. Vui lòng quay lại danh sách.')
    }
  }, [submissionId, studentId])

  const fetchSubmission = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Fixed: calling the correct API method from the client
      const data = await api.lecturer.submissions()
      const subs = [...(data.pendingSubmissions || []), ...(data.gradedSubmissions || [])]
      
      let current;
      if (submissionId) {
        current = subs.find(s => s.id === submissionId)
      } else if (studentId) {
        // Find most recent submission for this student
        current = subs.find(s => s.student_id === studentId)
      }
      
      if (current) {
        setSubmission(current)
        if (current.grade_feedback) setFeedback(current.grade_feedback)
      } else {
        setError('Không tìm thấy bài nộp tương ứng cho sinh viên này.')
      }
    } catch (err: any) {
      console.error('Fetch submission error:', err)
      setError('Không thể tải thông tin bài nộp. Vui lòng kiểm tra lại kết nối.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleScoreChange = (key: string, value: string) => {
    setCriteriaScores(prev => ({ ...prev, [key]: value }))
  }

  const totalScore = useMemo(() => {
    const sum = Object.values(criteriaScores).reduce((acc, val) => acc + (parseFloat(val) || 0), 0)
    return Math.min(10, Math.max(0, sum)).toFixed(1)
  }, [criteriaScores])

  const handleSubmitGrade = async (isFinal: boolean) => {
    if (!submission) return
    setIsPublishing(true)
    setError(null)
    
    try {
      await api.lecturer.grades.submit({
        submission_id: submission.id,
        registration_id: submission.registration_id,
        total_score: parseFloat(totalScore),
        feedback,
        criteria_scores: criteriaScores,
        is_published: isFinal,
        // The API currently doesn't persist Turnitin scores in the grades object, 
        // but we'll keep sending them in case the backend is updated.
        turnitin_score: turnitinReport.similarity_score,
        turnitin_file: turnitinReport.file_url
      })
      setSuccess(true)
      if (isFinal) router.push('/lecturer/students')
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi lưu điểm')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleUploadTurnitin = async (file: File, score: string) => {
    setIsUploadingTurnitin(true)
    try {
      const fileName = `${submissionId}_turnitin_${Date.now()}.pdf`
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002068]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* LEFT SIDEBAR - STUDENT INFO */}
          <aside className="w-full lg:w-[380px] space-y-6">
            <Card className="shadow-ambient-lg overflow-hidden border-none animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="bg-gradient-to-br from-[#002068] to-[#003399] p-8 text-white relative">
                <div className="absolute top-4 right-4 bg-emerald-500/20 backdrop-blur-md rounded-full px-3 py-1 flex items-center gap-1.5 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] font-bold tracking-widest uppercase">ĐANG THỰC HIỆN</span>
                </div>
                
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-28 h-28 rounded-full border-4 border-white/20 p-1 mb-4">
                    <div className="w-full h-full rounded-full bg-slate-200 flex items-center justify-center overflow-hidden text-slate-400">
                      <span className="material-symbols-outlined text-5xl">person</span>
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold font-headline mb-1 uppercase tracking-tight">{submission?.student_name}</h2>
                  <p className="text-white/70 text-sm font-medium tracking-wide">MSSV: {submission?.student_code}</p>
                </div>
              </div>

              <CardContent className="p-8 space-y-8 bg-white">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 block">Đề tài khóa luận</label>
                  <p className="text-slate-700 font-medium italic leading-relaxed text-[15px]">
                    &quot;{submission?.thesis_title}&quot;
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 block">Thời gian bảo vệ</label>
                    <div className="flex items-center gap-2 text-slate-700">
                      <span className="material-symbols-outlined text-[#002068] text-xl">schedule</span>
                      <span className="font-bold text-sm tracking-tight">{submission?.defense_time || '08:30 - 09:15'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 block">Phòng</label>
                    <div className="flex items-center gap-2 text-slate-700">
                      <span className="material-symbols-outlined text-[#002068] text-xl">location_on</span>
                      <span className="font-bold text-sm tracking-tight">{submission?.defense_room || 'A1-402'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50/50 border-none p-6 space-y-4 animate-in fade-in slide-in-from-left-4 delay-100 duration-500 shadow-none">
              <div className="flex items-center gap-2 text-blue-700">
                <span className="material-symbols-outlined text-xl">info</span>
                <p className="text-xs font-bold uppercase tracking-wider">Quy định chấm điểm Hội đồng</p>
              </div>
              <ul className="space-y-3">
                {[
                  'Chấm điểm dựa trên phần thuyết trình và trả lời của sinh viên.',
                  'Thang điểm tối đa cho từng tiêu chí được ghi rõ trong bảng.',
                  'Ghi rõ nhận xét cho từng tiêu chí nếu cần thiết.'
                ].map((rule, idx) => (
                  <li key={idx} className="flex gap-3 text-xs text-blue-600/80 leading-relaxed">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-blue-400 shrink-0" />
                    {rule}
                  </li>
                ))}
              </ul>
            </Card>
          </aside>

          {/* MAIN AREA - GRADING TABLE */}
          <main className="flex-1 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-1">
                <nav className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Chấm điểm</span>
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  <span className="text-slate-600">Thành viên Hội đồng</span>
                </nav>
                <h1 className="text-3xl font-black font-headline text-[#002068] tracking-tight">Phiếu Chấm điểm Khóa luận</h1>
                <p className="text-sm font-medium text-slate-500">Vai trò: <span className="text-orange-600 font-bold">Thành viên Hội đồng</span></p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="bg-white border-2 border-slate-100 h-11 px-6 rounded-xl font-bold flex items-center gap-2 shadow-sm text-[#002068]">
                  <span className="material-symbols-outlined text-sm">description</span>
                  Biểu mẫu 03/TVHD
                </Button>
              </div>
            </div>

            <Card className="bg-white rounded-3xl border-none shadow-ambient-lg overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#002068] rounded-xl flex items-center justify-center text-white">
                      <span className="material-symbols-outlined">assignment</span>
                    </div>
                    <h3 className="text-lg font-bold font-headline text-[#002068]">Tiêu chí đánh giá dành cho Thành viên Hội đồng</h3>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 italic">Căn cứ theo Biểu mẫu số 3</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-left">
                        <th className="pb-4 pr-4">Tiêu chí</th>
                        <th className="pb-4 px-4 text-center">Yếu</th>
                        <th className="pb-4 px-4 text-center">Trung bình</th>
                        <th className="pb-4 px-4 text-center">Khá</th>
                        <th className="pb-4 px-4 text-center">Giỏi</th>
                        <th className="pb-4 pl-4 text-right">Nhập điểm</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {GRADING_CRITERIA.map((item) => (
                        <tr key={item.key} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-8 pr-4 max-w-[220px]">
                            <p className="font-bold text-slate-800 mb-1 leading-tight">{item.name}</p>
                            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{item.sub}</p>
                          </td>
                          {Object.entries(item.levels).map(([level, data]) => (
                            <td key={level} className="py-8 px-4 text-center align-top max-w-[140px]">
                              <div className="space-y-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                <p className="text-[11px] font-bold text-slate-600">{data.score}</p>
                                <p className="text-[10px] leading-relaxed text-slate-400 font-medium">{data.text}</p>
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
                              value={criteriaScores[item.key] || ''}
                              onChange={(e) => handleScoreChange(item.key, e.target.value)}
                              className="w-20 h-16 bg-white border-2 border-slate-200 rounded-xl text-center font-bold text-lg focus:ring-4 focus:ring-blue-100 focus:border-[#002068] transition-all outline-none"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-12 pt-8 border-t-2 border-slate-100 flex items-center justify-between">
                  <h4 className="text-xl font-black font-headline text-[#002068] tracking-widest uppercase">TỔNG ĐIỂM (HỆ 10) :</h4>
                  <div className="flex items-center gap-3">
                    <span className="text-6xl font-black text-[#002068] tabular-nums">{totalScore}</span>
                    <div className="w-[2px] h-12 bg-slate-200 mx-2" />
                    <div className="text-left">
                      <Badge className="bg-[#002068] text-white rounded-lg px-4 py-1.5 font-bold tracking-tight">XẾP LOẠI: GIỎI</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/50 p-8 border-t border-slate-100">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 block">Nhận xét của Hội đồng</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full h-40 p-6 rounded-2xl border-none bg-white text-sm text-slate-700 shadow-inner focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                  placeholder="Nhập ý kiến đánh giá chi tiết của quý thầy/cô về bài làm của sinh viên..."
                />
              </div>
            </Card>

            {/* ACTION FOOTER */}
            <div className="flex items-center justify-end gap-4 pt-6">
              <Button
                variant="outline"
                className="h-12 px-8 border-2 border-slate-200 bg-white rounded-xl font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                onClick={() => handleSubmitGrade(false)}
                disabled={isPublishing}
              >
                <span className="material-symbols-outlined text-xl">save</span>
                Lưu tạm
              </Button>
              <Button
                className="h-12 px-10 bg-[#002068] hover:bg-[#001a4d] text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20"
                onClick={() => handleSubmitGrade(true)}
                disabled={isPublishing}
              >
                <span className="material-symbols-outlined text-xl">send</span>
                {isPublishing ? 'Đang gửi...' : 'Gửi kết quả chấm điểm'}
              </Button>
            </div>
          </main>
        </div>
      </div>

      {(error || success) && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-md animate-in fade-in slide-in-from-bottom-5">
           {error && (
            <div className="bg-red-600 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3">
              <span className="material-symbols-outlined">error</span>
              <div>
                <p className="text-sm font-bold">CÓ LỖI XẢY RA</p>
                <p className="text-xs opacity-90">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="ml-auto opacity-50 hover:opacity-100">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          )}
          {success && (
            <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3">
              <span className="material-symbols-outlined">check_circle</span>
              <div>
                <p className="text-sm font-bold">THÀNH CÔNG</p>
                <p className="text-xs opacity-90">Kết quả chấm điểm đã được lưu thành công.</p>
              </div>
              <button onClick={() => setSuccess(false)} className="ml-auto opacity-50 hover:opacity-100">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Turnitin Dialog */}
      {showTurnitinUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-2xl rounded-3xl border-none">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-bold font-headline text-[#002068]">Báo cáo Turnitin</CardTitle>
                <button onClick={() => setShowTurnitinUpload(false)} className="text-slate-400 hover:text-slate-600">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <CardDescription className="text-xs">
                Tải lên bản đối chiếu đạo văn từ hệ thống Turnitin (PDF)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Tỷ lệ tương đồng (%)</label>
                <input 
                  type="number" 
                  id="similarity_score_val"
                  className="w-full h-12 px-4 border-2 border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-[#002068] outline-none transition-all" 
                  placeholder="Ví dụ: 15"
                  defaultValue={turnitinReport.similarity_score || ''}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">File báo cáo (PDF)</label>
                <input 
                  type="file" 
                  id="turnitin_file_val"
                  accept=".pdf"
                  className="w-full p-2 border-2 border-dashed border-slate-200 rounded-xl text-sm" 
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button 
                  className="flex-1 bg-[#002068] text-white font-bold h-12 rounded-xl"
                  disabled={isUploadingTurnitin}
                  onClick={() => {
                    const fileInput = document.getElementById('turnitin_file_val') as HTMLInputElement
                    const scoreInput = document.getElementById('similarity_score_val') as HTMLInputElement
                    if (fileInput.files?.[0] && scoreInput.value) {
                      handleUploadTurnitin(fileInput.files[0], scoreInput.value)
                    } else if (turnitinReport.file_url && scoreInput.value) {
                       setTurnitinReport(prev => ({ ...prev, similarity_score: parseInt(scoreInput.value) }))
                       setShowTurnitinUpload(false)
                    }
                  }}
                >
                  {isUploadingTurnitin ? 'ĐANG TẢI...' : 'XÁC NHẬN'}
                </Button>
                <Button variant="ghost" onClick={() => setShowTurnitinUpload(false)} className="h-12 font-bold text-slate-500">HỦY</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default withLecturer(function LecturerGradingPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen animate-pulse text-[#002068] font-bold">Đang tải trang chấm điểm...</div>}>
      <GradingContent />
    </Suspense>
  )
})
