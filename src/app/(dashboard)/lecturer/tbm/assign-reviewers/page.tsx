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

interface PendingAssignment {
  id: string
  student_name: string
  student_code: string
  thesis_title: string
  supervisor_name: string
  supervisor_id: string
  specialization: string | null
  reviewer_id: string | null
  reviewer_name: string | null
}

interface Lecturer {
  id: string
  full_name: string
  specialization: string | null
}

function AssignReviewersPage() {
  const { user } = useAuthUser()
  const [pending, setPending] = React.useState<PendingAssignment[]>([])
  const [lecturers, setLecturers] = React.useState<Lecturer[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isUpdating, setIsUpdating] = React.useState<string | null>(null)

  // AI States
  const [isAiLoading, setIsAiLoading] = React.useState(false)
  const [showAiModal, setShowAiModal] = React.useState(false)
  const [aiResult, setAiResult] = React.useState<{ suggestions: any[], reasoning: string } | null>(null)

  React.useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        const [assignments, lecData] = await Promise.all([
          api.lecturer.tbm.assignments.reviewer.list(),
          api.lecturer.tbm.lecturers.list()
        ])

        const lecMap = new Map<string, string>(lecData.lecturers?.map((l: any) => [l.id, l.full_name]) || [])

        // Map API response to Component Interface
        const pendingData = (assignments || []).map((reg: any) => ({
          id: reg.id,
          student_name: reg.student_name,
          student_code: reg.student_code,
          thesis_title: reg.proposal_title,
          supervisor_name: lecMap.get(reg.proposal_supervisor_id) || 'Chưa xác định',
          supervisor_id: reg.proposal_supervisor_id,
          specialization: reg.proposal_type === 'KLTN' ? 'Khóa luận' : 'Thực tập',
          reviewer_id: reg.reviewer_id,
          reviewer_name: reg.reviewer_name || (reg.reviewer_id ? lecMap.get(reg.reviewer_id) : null)
        }))

        setPending(pendingData)
        setLecturers(lecData.lecturers || [])
      } catch (err: any) {
        setError(err.message || 'Không thể tải dữ liệu')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleAssign = async (registrationId: string, reviewerId: string) => {
    if (!reviewerId) return
    setIsUpdating(registrationId)
    try {
      await api.lecturer.tbm.assignments.reviewer.assign(registrationId, reviewerId)
      // Update local state
      const reviewer = lecturers.find(l => l.id === reviewerId)
      setPending(prev => prev.map(p => p.id === registrationId ? {
        ...p,
        reviewer_id: reviewerId,
        reviewer_name: reviewer?.full_name || 'Đã phân công'
      } : p))
    } catch (err: any) {
      setError(err.message || 'Phân công thất bại')
    } finally {
      setIsUpdating(null)
    }
  }

  const handleAutoAssign = async () => {
    try {
      setIsAiLoading(true)
      const res = await api.lecturer.tbm.assignments.reviewer.autoAssign()
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
      // Execute all assignments in parallel
      const assignPromises = aiResult.suggestions.map((sug: any) =>
        api.lecturer.tbm.assignments.reviewer.assign(sug.registration_id, sug.reviewer_id)
      )
      await Promise.all(assignPromises)

      // Update local state bulk
      const newPending = [...pending]
      for (const sug of aiResult.suggestions) {
        const itemIndex = newPending.findIndex(p => p.id === sug.registration_id)
        if (itemIndex > -1) {
          const reviewer = lecturers.find(l => l.id === sug.reviewer_id)
          newPending[itemIndex] = {
            ...newPending[itemIndex],
            reviewer_id: sug.reviewer_id,
            reviewer_name: reviewer?.full_name || sug.reviewer_name
          }
        }
      }
      setPending(newPending)
      setShowAiModal(false)
    } catch (err: any) {
      setError(err.message || 'Lỗi khi áp dụng gợi ý AI')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Shell
      role="lecturer"
      isTbm={true}
      user={{ name: user?.full_name || 'TBM', email: user?.email || '...', avatar: user?.avatar_url || '' }}
      breadcrumb={[{ label: 'Quản lý Bộ môn', href: '/lecturer' }, { label: 'Quản lý Hội đồng' }]}
    >
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-display-sm font-headline font-extrabold text-primary tracking-tight">
            Phân Công Giảng Viên Phản Biện
          </h2>
          <p className="text-body-md text-on-surface-variant font-medium">
            Chỉ định giảng viên phản biện cho các đề tài đã được duyệt (Học kỳ 2, 2024-2025)
          </p>
        </div>
        <Button
          className="bg-purple-600 text-white font-bold gap-2 hover:bg-purple-700 h-10 px-6 rounded-xl"
          onClick={handleAutoAssign}
          disabled={isAiLoading || pending.filter(p => !p.reviewer_id).length === 0}
        >
          {isAiLoading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <span className="material-symbols-outlined text-sm">psychology</span>
          )}
          Tự động phân công (AI)
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {pending.length === 0 ? (
          <Card className="p-12 text-center text-secondary">
            <p>Tất cả đề tài đã được phân công phản biện</p>
          </Card>
        ) : (
          pending.map((item) => (
            <Card key={item.id} className="bg-surface-container-lowest shadow-ambient-lg border-none overflow-hidden hover:shadow-ambient-xl transition-shadow">
              <div className="flex flex-col md:flex-row">
                <CardHeader className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-primary border-primary-fixed bg-primary-fixed/10">
                      {item.specialization || 'Chưa xác định'}
                    </Badge>
                    <span className="text-xs text-secondary italic">GVHD: <span className="font-semibold text-slate-700">{item.supervisor_name}</span></span>
                  </div>
                  <CardTitle className="text-xl font-bold font-headline text-primary mb-2 leading-tight">
                    {item.thesis_title}
                  </CardTitle>
                  <p className="text-sm font-bold text-on-surface">SV: {item.student_name} <span className="text-secondary font-normal">({item.student_code})</span></p>
                </CardHeader>
                <div className="p-6 bg-surface-container-low md:border-l border-t md:border-t-0 border-outline-variant/10 flex flex-col justify-center gap-4 min-w-[320px]">
                  <div>
                    <label className="text-xs font-black text-slate-500 tracking-wider uppercase block mb-3">Phân công Phản biện</label>
                    <select
                      className="w-full p-3 bg-white border border-outline-variant/50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:border-primary shadow-sm transition-all"
                      value={item.reviewer_id || ''}
                      onChange={(e) => handleAssign(item.id, e.target.value)}
                      disabled={isUpdating === item.id || isLoading}
                    >
                      <option value="">-- Chọn Giảng viên --</option>
                      {lecturers
                        .filter(l => l.id !== item.supervisor_id) // Exclude supervisor
                        .map(l => (
                          <option key={l.id} value={l.id}>
                            {l.full_name}
                          </option>
                        ))}
                    </select>
                  </div>
                  {item.reviewer_name && (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100/50">
                      <span className="material-symbols-outlined text-base">check_circle</span>
                      <span className="text-xs font-bold">Đã chọn: {item.reviewer_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="mt-8 p-6 bg-primary-fixed/20 rounded-xl border border-primary-fixed flex gap-4">
        <div className="w-12 h-12 rounded-full bg-primary-fixed text-primary flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-2xl">lightbulb</span>
        </div>
        <div>
          <h4 className="font-bold text-primary mb-1">Gợi ý từ hệ thống</h4>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Hệ thống tự động lọc các giảng viên không phải là giảng viên hướng dẫn. Tính năng <strong>AI Tự động phân công</strong> sẽ ưu tiên khớp chuyên môn của giảng viên với tên đề tài và cân bằng khối lượng sinh viên.
          </p>
        </div>
      </div>

      {showAiModal && aiResult && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-4xl bg-white p-6 shadow-2xl rounded-3xl max-h-[90vh] flex flex-col border border-white/50">
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
              <div>
                <h3 className="text-2xl font-black font-headline text-primary">Phân công Phản Biện bằng AI</h3>
                <p className="text-slate-500 text-sm mt-1">Đề xuất dựa trên chuyên môn và quy tắc tránh trùng lặp GVHD</p>
              </div>
              <Button variant="ghost" className="rounded-full w-10 h-10 p-0" onClick={() => setShowAiModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-2xl border border-purple-100/50 text-sm leading-relaxed text-indigo-900 shadow-inner">
                <span className="font-bold flex items-center gap-1.5 mb-2 text-purple-900">
                  <span className="material-symbols-outlined text-base">auto_awesome</span>
                  Chiến lược của AI:
                </span>
                <span className="italic">{aiResult.reasoning}</span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {aiResult.suggestions.map((sug, idx) => (
                  <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:border-primary/40 hover:bg-white transition-all shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                      <div className="flex-1">
                        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">Đề tài</p>
                        <h4 className="font-bold text-primary text-sm leading-snug">{sug.thesis_title}</h4>
                      </div>

                      <div className="flex items-center gap-3 md:min-w-[300px]">
                        <span className="material-symbols-outlined text-slate-300">arrow_right_alt</span>
                        <div className="flex-1 bg-white p-3 rounded-xl border border-emerald-100 shadow-sm">
                          <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">Giảng viên Phản biện</p>
                          <p className="text-sm font-bold text-emerald-800">{sug.reviewer_name}</p>
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setShowAiModal(false)} className="font-bold rounded-xl px-6">Hủy</Button>
              <Button
                className="bg-primary text-white px-8 font-black rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90"
                onClick={handleApplySuggestions}
                disabled={isLoading}
              >
                {isLoading ? 'Đang thực hiện...' : 'Áp dụng tất cả gợi ý'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Shell>
  )
}

export default withLecturer(AssignReviewersPage)
