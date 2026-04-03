'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { withLecturer } from '@/hocs/with-role-check'
import { useAuthUser } from '@/hooks/use-auth-user'

import { api } from '@/lib/api/client'

interface StudentDefense {
  registration_id: string
  student_name: string
  student_code: string
  thesis_title: string
  current_score: number | null
  current_notes: string
  status: string
  detailed_scores?: Record<string, number>
  supervisor_score?: number | null
  reviewer_score?: number | null
  reviewer_feedback?: string
}

interface CouncilMeeting {
  id: string
  name: string
  code: string | null
  date: string
  location: string
  status: string
  students: StudentDefense[]
}

const CRITERIA = [
  { id: 'slide', label: 'Slide trình chiếu', max: 1.0 },
  { id: 'style', label: 'Phong thái', max: 1.5 },
  { id: 'time', label: 'Thời gian', max: 0.5 },
  { id: 'content', label: 'Nội dung', max: 4.0 },
  { id: 'qa', label: 'Trả lời', max: 2.0 },
  { id: 'innovation', label: 'Sáng tạo', max: 1.0 },
  { id: 'english', label: 'Tiếng Anh', max: 1.0 },
  { id: 'paper', label: 'Bài báo', max: 1.0 },
]

function LecturerSecretaryPage() {
  const { user } = useAuthUser()
  const [meetings, setMeetings] = React.useState<CouncilMeeting[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedMeeting, setSelectedMeeting] = React.useState<CouncilMeeting | null>(null)
  const [editScores, setEditScores] = React.useState<Record<string, any>>({})
  const [councilFiles, setCouncilFiles] = React.useState({ excel: '', docs: '' })
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState<string | null>(null)

  const fetchMeetings = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await api.lecturer.secretary.meetings()
      setMeetings(data)
    } catch (error: any) {
      console.error('Fetch secretary meetings error:', error)
      alert('Không thể tải danh sách hội đồng. Vui lòng thử lại sau.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

  const handleOpenReport = (meeting: CouncilMeeting) => {
    setSelectedMeeting(meeting)
    const initialScores: Record<string, any> = {}
    meeting.students.forEach(s => {
      const detailed = s.detailed_scores || {}
      
      // PRE-FILL LOGIC: If no current notes but reviewer feedback exists, use feedback
      let notes = s.current_notes || ''
      if (!notes && s.reviewer_feedback) {
        notes = `[Ý KIẾN PHẢN BIỆN]:\n${s.reviewer_feedback}`
      }

      initialScores[s.registration_id] = {
        notes: notes,
        slide: detailed.slide?.toString() || '',
        style: detailed.style?.toString() || '',
        time: detailed.time?.toString() || '',
        content: detailed.content?.toString() || '',
        qa: detailed.qa?.toString() || '',
        innovation: detailed.innovation?.toString() || '',
        english: detailed.english?.toString() || '',
        paper: detailed.paper?.toString() || '',
      }
    })
    setEditScores(initialScores)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'excel' | 'docs') => {
    const file = e.target.files?.[0]
    if (!file || !selectedMeeting) return

    try {
      setIsUploading(type)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      formData.append('council_id', selectedMeeting.id)

      const result = await api.lecturer.secretary.upload(formData)
      setCouncilFiles(prev => ({ ...prev, [type]: result.url }))
      alert(`Đã tải lên ${type === 'excel' ? 'Biên bản' : 'Nội dung'} thành công!`)
    } catch (error: any) {
      alert('Lỗi tải file: ' + error.message)
    } finally {
      setIsUploading(null)
    }
  }

  const calculateTotal = (regId: string) => {
    const s = editScores[regId]
    if (!s) return "0.00"
    return (
      (parseFloat(s.slide) || 0) +
      (parseFloat(s.style) || 0) +
      (parseFloat(s.time) || 0) +
      (parseFloat(s.content) || 0) +
      (parseFloat(s.qa) || 0) +
      (parseFloat(s.innovation) || 0) +
      (parseFloat(s.english) || 0) +
      (parseFloat(s.paper) || 0)
    ).toFixed(2)
  }

  const handleSubmitResults = async () => {
    if (!selectedMeeting) return
    
    if (!councilFiles.excel || !councilFiles.docs) {
       if (!confirm('Bạn chưa tải lên đủ 2 file (Excel và Docs). Bạn có chắc muốn nộp không?')) return
    }

    const results = Object.entries(editScores).map(([regId, data]) => ({
      registration_id: regId,
      score: calculateTotal(regId),
      notes: data.notes,
      detailed_scores: {
        slide: parseFloat(data.slide) || 0,
        style: parseFloat(data.style) || 0,
        time: parseFloat(data.time) || 0,
        content: parseFloat(data.content) || 0,
        qa: parseFloat(data.qa) || 0,
        innovation: parseFloat(data.innovation) || 0,
        english: parseFloat(data.english) || 0,
        paper: parseFloat(data.paper) || 0,
      }
    }))

    if (!confirm('Bạn có chắc chắn muốn nộp biên bản họp này?')) return

    try {
      setIsSubmitting(true)
      await api.lecturer.secretary.submitResults(selectedMeeting.id, results, councilFiles.excel, councilFiles.docs)
      alert('Đã nộp biên bản hội đồng thành công!')
      setSelectedMeeting(null)
      await fetchMeetings()
    } catch (error: any) {
      alert('Lỗi: ' + (error.message || 'Không thể nộp biên bản'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <Shell role="lecturer" user={{ name: user?.full_name || '...', email: '...', avatar: '' }} breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Vai trò Thư ký' }]}>
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
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Vai trò Thư ký' }]}
    >
      <div className="mb-8">
        <h2 className="text-display-sm font-headline font-extrabold text-primary tracking-tight">
          Nhiệm Vụ Thư Ký Hội Đồng
        </h2>
        <p className="text-body-md text-on-surface-variant font-medium">
          Quản lý quản lý biên bản và lập kết quả bảo vệ
        </p>
      </div>

      {!selectedMeeting ? (
        <div className="grid grid-cols-1 gap-6">
          {meetings.length === 0 ? (
            <Card className="p-16 text-center bg-surface-container-lowest border-2 border-dashed border-outline-variant/30 rounded-3xl">
              <span className="material-symbols-outlined text-4xl mb-4 opacity-20">event_busy</span>
              <p className="text-lg font-bold text-on-surface-variant">Bạn chưa được phân công thư ký hội đồng nào</p>
            </Card>
          ) : (
            meetings.map((meeting) => (
              <Card key={meeting.id} className="bg-surface-container-lowest shadow-ambient-lg border-none overflow-hidden rounded-3xl animate-in fade-in slide-in-from-bottom-4 transition-all hover:shadow-ambient-xl">
                <div className="flex flex-col md:flex-row">
                  <div className="p-8 flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <Badge className={cn(
                        "font-bold px-3 py-1 rounded-full text-[10px] tracking-widest",
                        meeting.status === 'completed' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-amber-100 text-amber-700 animate-pulse'
                      )}>
                        {meeting.status === 'completed' ? 'ĐÃ HOÀN THÀNH' : 'SẮP DIỄN RA'}
                      </Badge>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {meeting.id.split('-')[0]}</span>
                    </div>
                    <CardTitle className="text-2xl font-black font-headline text-primary mb-4">
                      {meeting.name}
                    </CardTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-medium text-slate-600">
                      <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
                        <span className="material-symbols-outlined text-primary">calendar_today</span>
                        <div>
                          <p className="text-[10px] uppercase font-black text-slate-400">Thời gian</p>
                          {new Date(meeting.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} lúc {new Date(meeting.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
                        <span className="material-symbols-outlined text-primary">location_on</span>
                        <div>
                          <p className="text-[10px] uppercase font-black text-slate-400">Địa điểm</p>
                          {meeting.location}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 px-3">
                       <span className="material-symbols-outlined text-sm text-primary">group</span>
                       <span className="text-sm font-bold text-slate-700">{meeting.students?.length || 0} sinh viên tham gia bảo vệ</span>
                    </div>
                  </div>
                  <div className="p-8 bg-slate-50/50 border-l border-outline-variant/10 flex flex-col justify-center items-center gap-3 min-w-[240px]">
                    <Button 
                      className="w-full bg-primary hover:bg-primary/90 text-white font-black text-[11px] h-12 rounded-2xl shadow-lg shadow-blue-900/10 transition-all active:scale-95 gap-2"
                      onClick={() => handleOpenReport(meeting)}
                    >
                      <span className="material-symbols-outlined text-sm">edit_note</span>
                      LẬP BIÊN BẢN HỌP
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full text-slate-500 font-bold text-[11px] hover:bg-slate-200/50 h-12 rounded-2xl transition-all"
                    >
                      <span className="material-symbols-outlined text-sm mr-1">history</span>
                      LỊCH SỬ THAY ĐỔI
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
           <Button variant="ghost" className="text-primary font-black text-xs gap-2 px-0" onClick={() => setSelectedMeeting(null)}>
             <span className="material-symbols-outlined text-sm">arrow_back</span> QUAY LẠI DANH SÁCH
           </Button>

           <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 bg-white p-8 rounded-[32px] shadow-ambient-sm">
              <div className="flex-1">
                <h3 className="text-2xl font-black font-headline text-primary mb-2">Lập Biên Bản & Kết Quả</h3>
                <p className="text-sm text-slate-500 font-medium mb-6">{selectedMeeting.name}</p>
                <div className="flex flex-wrap gap-4">
                   <div className="relative group">
                      <input type="file" id="excel" className="hidden" accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e, 'excel')} />
                      <label htmlFor="excel" className={cn(
                        "flex items-center gap-2 px-4 h-11 rounded-xl cursor-pointer font-bold text-[11px] transition-all",
                        councilFiles.excel ? "bg-emerald-50 text-emerald-600 border-2 border-emerald-100" : "bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200"
                      )}>
                        {isUploading === 'excel' ? <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span> : <span className="material-symbols-outlined text-sm">{councilFiles.excel ? 'check_circle' : 'upload_file'}</span>}
                        {councilFiles.excel ? "ĐÃ TẢI EXCEL" : "TẢI BIÊN BẢN (EXCEL)"}
                      </label>
                   </div>
                   <div className="relative group">
                      <input type="file" id="docs" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => handleFileUpload(e, 'docs')} />
                      <label htmlFor="docs" className={cn(
                        "flex items-center gap-2 px-4 h-11 rounded-xl cursor-pointer font-bold text-[11px] transition-all",
                        councilFiles.docs ? "bg-emerald-50 text-emerald-600 border-2 border-emerald-100" : "bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200"
                      )}>
                        {isUploading === 'docs' ? <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span> : <span className="material-symbols-outlined text-sm">{councilFiles.docs ? 'check_circle' : 'upload_file'}</span>}
                        {councilFiles.docs ? "ĐÃ TẢI DOCS" : "TẢI NỘI DUNG (DOCS)"}
                      </label>
                   </div>
                </div>
              </div>
              <Button 
                className="bg-primary hover:bg-primary/90 text-white font-black px-10 h-14 rounded-2xl shadow-2xl shadow-blue-900/20"
                onClick={handleSubmitResults}
                disabled={isSubmitting}
              >
                {isSubmitting ? <span className="animate-spin material-symbols-outlined">progress_activity</span> : "NỘP BIÊN BẢN TỔNG HỢP"}
              </Button>
           </div>

           <div className="space-y-6">
              {selectedMeeting.students.map((student) => (
                <Card key={student.registration_id} className="bg-surface-container-lowest shadow-ambient-sm border-none rounded-[32px] overflow-hidden p-8 ring-1 ring-slate-100">
                   <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                      <div className="xl:col-span-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mã SV: {student.student_code}</p>
                        <h4 className="text-xl font-bold text-primary mb-3 leading-tight">{student.student_name}</h4>
                        <div className="bg-slate-50 p-4 rounded-2xl min-h-[80px] mb-4">
                           <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Tên đề tài</p>
                           <p className="text-xs text-slate-700 italic font-medium leading-relaxed">"{student.thesis_title}"</p>
                        </div>
                        
                        {/* Reference Scores */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                           <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                              <p className="text-[9px] font-black text-blue-400 uppercase tracking-tighter mb-1">Điểm HD</p>
                              <p className="text-lg font-black text-blue-700">{student.supervisor_score || '--'}</p>
                           </div>
                           <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100/50">
                              <p className="text-[9px] font-black text-purple-400 uppercase tracking-tighter mb-1">Điểm PB</p>
                              <p className="text-lg font-black text-purple-700">{student.reviewer_score || '--'}</p>
                           </div>
                        </div>

                        <div className="mt-6">
                           <div className="flex justify-between items-end mb-2">
                              <span className="text-[10px] font-black text-primary uppercase">Tổng điểm HĐ</span>
                              <span className="text-3xl font-black text-primary font-headline">{calculateTotal(student.registration_id)}<span className="text-sm font-bold opacity-30 ml-1">/12.0</span></span>
                           </div>
                           <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className="bg-primary h-full transition-all duration-500" 
                                style={{ width: `${(parseFloat(calculateTotal(student.registration_id)) / 12) * 100}%` }}
                              />
                           </div>
                        </div>
                      </div>

                      <div className="xl:col-span-5 grid grid-cols-2 gap-4">
                        {CRITERIA.map(c => (
                          <div key={c.id}>
                            <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5 ml-1">{c.label} <span className="text-slate-300 ml-1">(Max {c.max})</span></label>
                            <input 
                              type="number"
                              step="0.1"
                              placeholder="0.0"
                              value={editScores[student.registration_id]?.[c.id] || ''}
                              onChange={(e) => setEditScores({
                                ...editScores,
                                [student.registration_id]: { ...editScores[student.registration_id], [c.id]: e.target.value }
                              })}
                              className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-4 h-11 text-sm font-bold text-primary focus:border-primary transition-all outline-none"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="xl:col-span-4 flex flex-col">
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5 ml-1">Nhận xét hội đồng</label>
                        <textarea 
                           placeholder="Nhập nhận xét chung..."
                           value={editScores[student.registration_id]?.notes || ''}
                           onChange={(e) => setEditScores({
                            ...editScores,
                            [student.registration_id]: { ...editScores[student.registration_id], notes: e.target.value }
                          })}
                           className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl p-4 flex-1 min-h-[160px] text-sm font-medium focus:border-primary transition-all outline-none resize-none"
                        />
                      </div>
                   </div>
                </Card>
              ))}
           </div>
        </div>
      )}

      {!selectedMeeting && (
        <Card className="mt-12 bg-gradient-to-br from-blue-600 to-[#002068] text-white border-none rounded-[40px] p-10 relative overflow-hidden shadow-2xl shadow-blue-900/30 ring-8 ring-white/5">
          <div className="relative z-10 flex gap-8 items-start">
            <div className="w-16 h-16 rounded-[24px] bg-white/10 backdrop-blur-xl flex items-center justify-center flex-shrink-0 border border-white/20">
              <span className="material-symbols-outlined text-4xl text-white">grading</span>
            </div>
            <div className="max-w-2xl">
              <h4 className="text-2xl font-black font-headline mb-4 tracking-tight">Quy trình ghi điểm mới (12.0)</h4>
              <p className="text-blue-100 text-lg leading-relaxed font-medium">
                Vui lòng nhập đầy đủ các trường tiểu chuẩn đánh giá theo mẫu của khóa học. Các trường bao gồm cả điểm cộng cho Bài báo khoa học và Viết bằng tiếng Anh. Tổng điểm tối đa là 12.0 điểm.
              </p>
            </div>
          </div>
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse" />
        </Card>
      )}
    </Shell>
  )
}

export default withLecturer(LecturerSecretaryPage)
