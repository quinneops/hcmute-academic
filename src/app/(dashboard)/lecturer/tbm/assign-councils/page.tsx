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

interface CouncilStudent {
  id: string
  student_name: string
  student_code: string
  thesis_title: string
  supervisor_name: string
  reviewer_name: string
}

interface Council {
  id: string
  name: string
  chair_name: string
  secretary_name: string
  room?: string
  scheduled_time?: string
  scheduled_date?: string
  members_count: number
  students: CouncilStudent[]
}

function AssignCouncilsPage() {
  const { user } = useAuthUser()
  const [councils, setCouncils] = React.useState<Council[]>([])
  const [unassignedStudents, setUnassignedStudents] = React.useState<CouncilStudent[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        const [councilsData, studentsData] = await Promise.all([
          api.lecturer.tbm.councils.list(),
          api.lecturer.tbm.assignments.reviewer.list()
        ])

        const formattedCouncils = (councilsData || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          chair_name: c.chair_name,
          secretary_name: c.secretary_name,
          room: c.room,
          scheduled_time: c.scheduled_time,
          scheduled_date: c.scheduled_date,
          members_count: (c.members || []).length,
          students: (c.defenses || []).map((d: any) => ({
            id: d.student_id,
            student_name: d.student_name,
            student_code: d.student_code,
            thesis_title: d.thesis_title,
            supervisor_name: d.supervisor_name,
            reviewer_name: d.reviewer_name
          }))
        }))

        setCouncils(formattedCouncils)

        const assignedStudentIds = new Set(formattedCouncils.flatMap((c: any) => c.students.map((s: any) => s.id)))
        const unassigned = (studentsData || [])
          .filter((s: any) => !assignedStudentIds.has(s.id) && s.status === 'approved')
          .map((s: any) => ({
            id: s.id,
            student_name: s.student_name,
            student_code: s.student_code,
            thesis_title: s.proposal_title,
            supervisor_name: s.supervisor_name || 'GVHD',
            reviewer_name: s.reviewer_name || 'GVPB'
          }))
        
        setUnassignedStudents(unassigned)
      } catch (err: any) {
        setError(err.message || 'Không thể tải dữ liệu')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const assignToCouncil = async (studentId: string, councilId: string) => {
    if (!councilId) return
    const student = unassignedStudents.find(s => s.id === studentId)
    if (!student) return
    
    try {
      const council = councils.find(c => c.id === councilId)
      if (!council) return

      const updatedDefenses = [
        ...council.students.map(s => ({ 
          student_id: s.id, 
          student_name: s.student_name, 
          student_code: s.student_code, 
          thesis_title: s.thesis_title, 
          supervisor_name: s.supervisor_name, 
          reviewer_name: s.reviewer_name 
        })),
        { 
          student_id: student.id, 
          student_name: student.student_name, 
          student_code: student.student_code, 
          thesis_title: student.thesis_title, 
          supervisor_name: student.supervisor_name, 
          reviewer_name: student.reviewer_name 
        }
      ]

      await api.lecturer.tbm.councils.update(councilId, { defenses: updatedDefenses })

      setCouncils(prev => prev.map(c => c.id === councilId ? { ...c, students: [...c.students, student] } : c))
      setUnassignedStudents(prev => prev.filter(s => s.id !== studentId))
    } catch (err: any) {
      setError(err.message || 'Phân công hội đồng thất bại')
    }
  }

  const removeFromCouncil = async (studentId: string, councilId: string) => {
    try {
      const council = councils.find(c => c.id === councilId)
      if (!council) return

      const studentToRemove = council.students.find(s => s.id === studentId)
      if (!studentToRemove) return

      const updatedDefenses = council.students
        .filter(s => s.id !== studentId)
        .map(s => ({ 
          student_id: s.id, 
          student_name: s.student_name, 
          student_code: s.student_code, 
          thesis_title: s.thesis_title, 
          supervisor_name: s.supervisor_name, 
          reviewer_name: s.reviewer_name 
        }))

      await api.lecturer.tbm.councils.update(councilId, { defenses: updatedDefenses })

      setCouncils(prev => prev.map(c => c.id === councilId ? { ...c, students: c.students.filter(s => s.id !== studentId) } : c))
      setUnassignedStudents(prev => [...prev, studentToRemove])
    } catch (err: any) {
      setError(err.message || 'Xóa sinh viên khỏi hội đồng thất bại')
    }
  }

  const [isCreating, setIsCreating] = React.useState(false)
  const [newCouncil, setNewCouncil] = React.useState({ name: '', chair_id: '', secretary_id: '' })
  const [lecturers, setLecturers] = React.useState<any[]>([])
  
  // AI States
  const [isAiLoading, setIsAiLoading] = React.useState(false)
  const [showAiModal, setShowAiModal] = React.useState(false)
  const [aiResult, setAiResult] = React.useState<{ suggestions: any[], reasoning: string } | null>(null)

  React.useEffect(() => {
    api.lecturer.tbm.lecturers.list().then(res => setLecturers(res.lecturers || []))
  }, [])

  const handleAutoAssign = async () => {
    try {
      setIsAiLoading(true)
      const res = await api.lecturer.tbm.councils.autoAssign()
      setAiResult(res)
      setShowAiModal(true)
    } catch (err: any) {
      setError(err.message || 'AI Phân công thất bại')
    } finally {
      setIsAiLoading(false)
    }
  }

  const handleApplySuggestions = async () => {
    if (!aiResult) return
    setIsLoading(true)
    try {
      // For each suggestion, create a new council
      for (const sug of aiResult.suggestions) {
        const studentsToAssign = unassignedStudents.filter(s => sug.student_ids.includes(s.id))
        
        await api.lecturer.tbm.councils.create({
          name: sug.council_name,
          chair_id: sug.chair_id,
          chair_name: sug.chair_name,
          secretary_id: sug.secretary_id,
          secretary_name: sug.secretary_name,
          room: sug.room,
          scheduled_time: sug.scheduled_time,
          defenses: studentsToAssign.map(s => ({
            student_id: s.id,
            student_name: s.student_name,
            student_code: s.student_code,
            thesis_title: s.thesis_title,
            supervisor_name: s.supervisor_name,
            reviewer_name: s.reviewer_name
          }))
        })
      }
      
      // Refresh data
      window.location.reload()
    } catch (err: any) {
      setError(err.message || 'Lỗi khi áp dụng gợi ý AI')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCouncil = async () => {
    try {
      const chair = lecturers.find(l => l.id === newCouncil.chair_id)
      const secretary = lecturers.find(l => l.id === newCouncil.secretary_id)
      
      const res = await api.lecturer.tbm.councils.create({
        name: newCouncil.name,
        chair_id: newCouncil.chair_id,
        chair_name: chair?.full_name || '',
        secretary_id: newCouncil.secretary_id,
        secretary_name: secretary?.full_name || '',
        members: []
      })

      const created = res.council
      setCouncils(prev => [...prev, {
        id: created.id,
        name: created.name,
        chair_name: created.chair_name,
        secretary_name: created.secretary_name,
        members_count: 0,
        students: []
      }])
      setIsCreating(false)
      setNewCouncil({ name: '', chair_id: '', secretary_id: '' })
    } catch (err: any) {
      setError(err.message || 'Tạo hội đồng thất bại')
    }
  }

  return (
    <Shell
      role="lecturer"
      isTbm={true}
      user={{ name: user?.full_name || 'TBM', email: user?.email || '...', avatar: user?.avatar_url || '' }}
      breadcrumb={[{ label: 'TBM', href: '/lecturer' }, { label: 'Quản lý Hội đồng' }]}
    >
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-display-sm font-headline font-extrabold text-primary tracking-tight">
            Tổ Chức Hội Đồng Bảo Vệ
          </h2>
          <p className="text-body-md text-on-surface-variant font-medium">
            Thành lập hội đồng và phân công sinh viên bảo vệ (Sắp tới 15/06 - 30/06)
          </p>
        </div>
        <Button 
          className="bg-purple-600 text-white font-bold gap-2 hover:bg-purple-700 h-10 px-6 rounded-xl"
          onClick={handleAutoAssign}
          disabled={isAiLoading || unassignedStudents.length === 0}
        >
          {isAiLoading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <span className="material-symbols-outlined text-sm">psychology</span>
          )}
          Tự động phân công (AI)
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Unassigned Students */}
        <div className="lg:col-span-1 border-r border-outline-variant/10 pr-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold font-headline text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">person_add</span>
              SV chưa có hội đồng ({unassignedStudents.length})
            </h3>
          </div>
          <div className="space-y-3">
            {unassignedStudents.map((s) => (
              <Card key={s.id} className="bg-surface-container-low border-none p-4 hover:shadow-ambient-md transition-shadow">
                <div className="mb-2">
                  <p className="text-xs font-bold text-secondary uppercase italic">SV: {s.student_name}</p>
                  <CardTitle className="text-sm font-bold text-primary line-clamp-2 mt-1">{s.thesis_title}</CardTitle>
                </div>
                <div className="text-[10px] text-secondary space-y-1 mb-3">
                  <p>GVHD: {s.supervisor_name}</p>
                  <p>GVPB: {s.reviewer_name}</p>
                </div>
                <div className="flex gap-2">
                  <select 
                    className="flex-1 text-[10px] p-1.5 border rounded-lg bg-white"
                    onChange={(e) => assignToCouncil(s.id, e.target.value)}
                  >
                    <option value="">Chọn hội đồng...</option>
                    {councils.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Right: Existing Councils */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold font-headline text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">groups</span>
              Danh sách hội đồng hiện có ({councils.length})
            </h3>
            <Button 
              size="sm" 
              className="bg-primary text-white font-bold gap-1 text-[10px] h-8"
              onClick={() => setIsCreating(true)}
            >
              <span className="material-symbols-outlined text-sm">add</span> Thêm Hội đồng
            </Button>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {councils.map((c) => (
              <Card key={c.id} className="bg-surface-container-lowest shadow-ambient-lg border-none overflow-hidden">
                <CardHeader className="bg-surface-container-low/50 py-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-md font-bold font-headline text-primary">
                        {c.name}
                        {c.room && c.scheduled_time && (
                          <span className="text-secondary text-xs font-normal ml-2 tracking-wide">
                            ({c.room} - {c.scheduled_time})
                          </span>
                        )}
                        {(!c.room || !c.scheduled_time) && (
                          <span className="text-error/70 text-[10px] font-normal italic ml-2">
                            (Chưa cập nhật Lịch/Phòng)
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1 text-slate-600">
                        <span className="font-semibold text-slate-800">Chủ tịch:</span> {c.chair_name} &nbsp;•&nbsp; <span className="font-semibold text-slate-800">Thư ký:</span> {c.secretary_name}
                      </CardDescription>
                    </div>
                    <Badge className="bg-primary-fixed/20 text-primary text-[10px]">{c.students.length} Sinh viên</Badge>
                  </div>
                </CardHeader>
                <CardContent className="py-4">
                  {c.students.length === 0 ? (
                    <div className="text-sm text-secondary text-center py-4 italic border-2 border-dashed border-outline-variant/10 rounded-lg">
                      Chưa có sinh viên bảo vệ trong hội đồng này
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {c.students.map((s, i) => (
                        <div key={s.id} className="flex justify-between items-center p-3 bg-white rounded-lg border border-outline-variant/5">
                          <div className="flex-1">
                            <p className="text-xs font-bold text-on-surface">{s.student_name} ({s.student_code})</p>
                            <p className="text-[10px] text-secondary line-clamp-1">{s.thesis_title}</p>
                          </div>
                          <div className="flex gap-2">
                             <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-error h-7 w-7 p-0"
                              onClick={() => removeFromCouncil(s.id, c.id)}
                             >
                               <span className="material-symbols-outlined text-sm">remove_circle</span>
                             </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {showAiModal && aiResult && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-4xl bg-white p-8 shadow-2xl rounded-3xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black font-headline text-primary">Gợi ý Phân công từ AI</h3>
                <p className="text-secondary text-sm">Groq Llama-3 đã phân tích chuyên môn và đề tài</p>
              </div>
              <Button variant="ghost" onClick={() => setShowAiModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
              <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 italic text-purple-800 text-sm leading-relaxed">
                <span className="font-bold flex items-center gap-1 mb-1 text-purple-900 not-italic">
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                  Phân tích của AI:
                </span>
                {aiResult.reasoning}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiResult.suggestions.map((sug, idx) => (
                  <div key={idx} className="p-4 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest hover:border-primary/30 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-primary text-sm">{sug.council_name}</h4>
                      <Badge className="bg-primary-fixed/10 text-primary text-[9px] uppercase tracking-tighter">
                        {sug.room} • {sug.scheduled_time}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="bg-blue-50/50 p-2 rounded-xl">
                        <p className="text-[8px] font-black text-blue-400 uppercase">Chủ tịch</p>
                        <p className="text-[10px] font-bold text-blue-800">{sug.chair_name}</p>
                      </div>
                      <div className="bg-emerald-50/50 p-2 rounded-xl">
                        <p className="text-[8px] font-black text-emerald-400 uppercase">Thư ký</p>
                        <p className="text-[10px] font-bold text-emerald-800">{sug.secretary_name}</p>
                      </div>
                    </div>

                    <div className="space-y-1 mt-3">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Sinh viên ({sug.student_ids.length})</p>
                      {unassignedStudents.filter(st => sug.student_ids.includes(st.id)).map(st => (
                        <div key={st.id} className="text-[10px] flex items-center gap-1 text-slate-600">
                          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                          {st.student_name}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
              <Button variant="ghost" onClick={() => setShowAiModal(false)} className="font-bold">Hủy</Button>
              <Button 
                className="bg-primary text-white px-8 font-black rounded-xl shadow-lg shadow-primary/20"
                onClick={handleApplySuggestions}
                disabled={isLoading}
              >
                {isLoading ? 'Đang thực hiện...' : 'Áp dụng tất cả gợi ý'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {isCreating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold font-headline text-primary mb-6">Tạo Hội đồng Bảo vệ Mới</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-secondary uppercase mb-1 block">Tên Hội đồng</label>
                <input 
                  className="w-full p-2 border rounded-lg" 
                  placeholder="Hội đồng..." 
                  value={newCouncil.name}
                  onChange={e => setNewCouncil(v => ({ ...v, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-secondary uppercase mb-1 block">Chủ tịch Hội đồng</label>
                <select 
                  className="w-full p-2 border rounded-lg"
                  value={newCouncil.chair_id}
                  onChange={e => setNewCouncil(v => ({ ...v, chair_id: e.target.value }))}
                >
                  <option value="">Chọn giảng viên...</option>
                  {lecturers.map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-secondary uppercase mb-1 block">Thư ký Hội đồng</label>
                <select 
                  className="w-full p-2 border rounded-lg"
                  value={newCouncil.secretary_id}
                  onChange={e => setNewCouncil(v => ({ ...v, secretary_id: e.target.value }))}
                >
                  <option value="">Chọn giảng viên...</option>
                  {lecturers.map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <Button variant="ghost" onClick={() => setIsCreating(false)}>Hủy</Button>
              <Button 
                className="bg-primary text-white px-6"
                onClick={handleCreateCouncil}
                disabled={!newCouncil.name || !newCouncil.chair_id || !newCouncil.secretary_id}
              >
                Tạo Hội đồng
              </Button>
            </div>
          </Card>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 p-4 bg-error-container text-error rounded-lg flex items-center gap-3 shadow-lg z-[60]">
          <p className="text-sm">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>×</Button>
        </div>
      )}
    </Shell>
  )
}

export default withLecturer(AssignCouncilsPage)
