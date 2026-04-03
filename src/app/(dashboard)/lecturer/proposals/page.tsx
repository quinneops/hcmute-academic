'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api/client'
import { withLecturer } from '@/hocs/with-role-check'
import { useAuthUser } from '@/hooks/use-auth-user'

interface Proposal {
  id: string
  title: string
  description: string | null
  category: string | null
  tags: string[]
  status: string
  student_name: string
  student_code: string
  student_id: string
  registration_id: string
  registration_status: string
  type: 'BCTT' | 'KLTN'
  submitted_at: string
  reviewed_at: string | null
  review_notes: string | null
  motivation_letter: string | null
  proposed_title: string | null
  auto_approve?: boolean
  created_by?: string | null
}

function LecturerProposalsPage() {
  const [proposals, setProposals] = React.useState<Proposal[]>([])
  const [selectedProposal, setSelectedProposal] = React.useState<Proposal | null>(null)
  const { user } = useAuthUser()
  const [stats, setStats] = React.useState({ pending: 0, approved: 0, rejected: 0 })
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [reviewNotes, setReviewNotes] = React.useState('')
  const [showReviewForm, setShowReviewForm] = React.useState(false)
  const [aiScreeningResult, setAiScreeningResult] = React.useState<any>(null)

  React.useEffect(() => {
    setAiScreeningResult(null)
    setReviewNotes('')
    setShowReviewForm(false)
  }, [selectedProposal])

  const handleAI_Screening = async () => {
    if (!selectedProposal?.registration_id) return
    setIsUpdating(true)
    setError(null)
    try {
      const res = await api.ai.screenRegistration(selectedProposal.registration_id)
      setAiScreeningResult(res)
    } catch (err: any) {
      setError(err.message || 'Lỗi khi AI đánh giá')
    } finally {
      setIsUpdating(false)
    }
  }

  const fetchProposals = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await api.lecturer.proposals.list()
      setProposals(data.proposals || [])
      setStats(data.stats || { pending: 0, approved: 0, rejected: 0 })

      // Select first pending or first available
      const firstPending = data.proposals?.find((p: Proposal) => p.status === 'pending')
      setSelectedProposal(firstPending || data.proposals?.[0] || null)
    } catch (err: any) {
      console.error('Proposals fetch error:', err)
      setError(err.message || 'Không thể tải danh sách đề cương')
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchProposals()
  }, [fetchProposals])

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!selectedProposal) return

    setIsUpdating(true)
    setError(null)

    try {
      await api.lecturer.proposals.review(
        selectedProposal.id,
        action,
        reviewNotes || undefined,
        selectedProposal.registration_id || undefined
      )
      setReviewNotes('')
      setShowReviewForm(false)
      await fetchProposals()
    } catch (err: any) {
      console.error('Proposal review error:', err)
      setError(err.message || 'Không thể duyệt đề cương')
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <Shell 
        role="lecturer" 
        isTbm={user?.is_tbm}
        user={{ name: '...', email: '...', avatar: '' }} 
        breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Đề cương' }]}
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
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Đề cương' }]}
      notifications={0}
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-display-sm font-headline font-extrabold text-primary tracking-tight">
            Xét Duyệt Đề Cương
          </h2>
          <p className="text-body-md text-on-surface-variant font-medium">
            Review và phê duyệt đề cương sinh viên
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={() => window.location.href = '/lecturer/proposals/create'}
          >
            <span className="material-symbols-outlined text-sm mr-2">add</span>
            Tạo đề cương
          </Button>
          {proposals.some(p => p.registration_status === 'pending') && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              onClick={async () => {
                const pending = proposals.filter(p => p.registration_status === 'pending');
                if (window.confirm(`Bạn có chắc chắn muốn duyệt tất cả ${pending.length} đề cương đang chờ?`)) {
                  setIsUpdating(true);
                  try {
                    for (const p of pending) {
                      await api.lecturer.proposals.review(p.id, 'approve', 'Đã duyệt hàng loạt', p.registration_id);
                    }
                    await fetchProposals();
                  } catch (err: any) {
                    setError(err.message || 'Lỗi khi duyệt hàng loạt');
                  } finally {
                    setIsUpdating(false);
                  }
                }
              }}
              disabled={isUpdating}
            >
              <span className="material-symbols-outlined text-sm mr-2">done_all</span>
              Duyệt tất cả
            </Button>
          )}
          <Badge className="bg-amber-100 text-amber-700 text-[10px] font-bold uppercase">
            {stats.pending} Chờ duyệt
          </Badge>
          <Badge className="bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">
            {stats.approved} Đã duyệt
          </Badge>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg text-error">
          <p className="font-bold">Lỗi: {error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Proposals List */}
        <div className="lg:col-span-1">
          <Card className="bg-surface-container-lowest shadow-ambient-lg border-none sticky top-24">
            <CardHeader>
              <CardTitle className="font-headline font-bold text-primary text-lg">
                Danh sách đề cương
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {proposals.length === 0 ? (
                <div className="text-center py-8 text-secondary">
                  <span className="material-symbols-outlined text-4xl mb-2">description</span>
                  <p>Chưa có đề cương nào</p>
                </div>
              ) : (
                proposals.map((proposal) => (
                  <button
                    key={proposal.id}
                    onClick={() => setSelectedProposal(proposal)}
                    className={cn(
                      "w-full p-4 rounded-lg text-left transition-all border",
                      selectedProposal?.id === proposal.id
                        ? 'bg-primary-fixed/20 border-primary'
                        : 'bg-surface-container-low hover:bg-surface-container-low/80 border-transparent'
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-bold text-on-surface">{proposal.student_name || 'Chưa có sinh viên'}</p>
                          {proposal.created_by && (
                            <span className="material-symbols-outlined text-[12px] text-amber-600" title="Sinh viên tự đề xuất">campaign</span>
                          )}
                        </div>
                        <p className="text-[10px] text-secondary">{proposal.student_code}</p>
                      </div>
                      <Badge className={cn(
                        proposal.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        proposal.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      )}>
                        {proposal.status === 'approved' ? '✓' : proposal.status === 'rejected' ? '✗' : '⏳'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-on-surface-variant line-clamp-1 flex-1">{proposal.title}</p>
                      <Badge className={cn(
                        "ml-2 text-[8px] px-1.5 py-0 min-w-fit",
                        proposal.type === 'BCTT' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                      )}>
                        {proposal.type}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-secondary mt-1">{formatDate(proposal.submitted_at)}</p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Proposal Detail */}
        <div className="lg:col-span-2">
          {!selectedProposal ? (
            <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
              <CardContent className="py-12 text-center text-secondary">
                <span className="material-symbols-outlined text-4xl mb-2">description</span>
                <p>Chọn một đề cương từ danh sách để xem</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="font-headline font-bold text-primary text-xl">
                        {selectedProposal.title}
                      </CardTitle>
                      <Badge className={cn(
                        selectedProposal.type === 'BCTT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      )}>
                        {selectedProposal.type}
                      </Badge>
                      {selectedProposal.created_by && (
                        <Badge className="bg-amber-100 text-amber-700 border border-amber-200">
                          <span className="material-symbols-outlined text-[10px] mr-1">campaign</span>
                          SV tự đề xuất
                        </Badge>
                      )}
                      <Badge className={cn(
                        selectedProposal.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        selectedProposal.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      )}>
                        {selectedProposal.status === 'approved' ? 'Đã duyệt' : selectedProposal.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                      </Badge>
                    </div>
                    <p className="text-sm text-secondary">
                      {selectedProposal.student_name || 'Chưa có sinh viên'} ({selectedProposal.student_code}) • Nộp: {formatDate(selectedProposal.submitted_at)}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 bg-primary-container/20 text-primary hover:bg-primary-container/40 border-primary/20"
                      onClick={() => {
                        window.location.href = `/lecturer/ai-assistant?contextType=proposal&contextId=${selectedProposal.id}&contextTitle=${encodeURIComponent(selectedProposal.title)}`;
                      }}
                    >
                      <span className="material-symbols-outlined text-sm">smart_toy</span>
                      Hỏi AI
                    </Button>
                    <label className="flex items-center gap-2 text-sm text-secondary font-bold cursor-pointer border border-outline-variant/30 px-3 py-2 rounded-lg bg-surface-container-lowest hover:bg-surface-bright transition-colors select-none">
                      <input 
                        type="checkbox" 
                        checked={selectedProposal.auto_approve ?? false}
                        onChange={async (e) => {
                          const val = e.target.checked
                          try {
                            setIsUpdating(true)
                            await api.lecturer.proposals.update(selectedProposal.id, { auto_approve: val })
                            await fetchProposals() // Refresh to reflect change
                          } catch (err: any) {
                             setError(err.message || 'Lỗi khi cập nhật tự động duyệt')
                          } finally {
                             setIsUpdating(false)
                          }
                        }}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300"
                        disabled={isUpdating}
                      />
                      Duyệt Tự Động
                    </label>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Abstract */}
                {selectedProposal.description && (
                  <div>
                    <h4 className="text-sm font-bold text-secondary uppercase tracking-widest mb-2">
                      Mô tả
                    </h4>
                    <p className="text-sm text-on-surface leading-relaxed">{selectedProposal.description}</p>
                  </div>
                )}

                {/* Motivation Letter */}
                {selectedProposal.motivation_letter && (
                  <div>
                    <h4 className="text-sm font-bold text-secondary uppercase tracking-widest mb-2">
                      Động lực
                    </h4>
                    <p className="text-sm text-on-surface leading-relaxed">{selectedProposal.motivation_letter}</p>
                  </div>
                )}

                {/* Proposed Title */}
                {selectedProposal.proposed_title && (
                  <div>
                    <h4 className="text-sm font-bold text-secondary uppercase tracking-widest mb-2">
                      Đề xuất title
                    </h4>
                    <p className="text-sm text-on-surface">{selectedProposal.proposed_title}</p>
                  </div>
                )}

                {/* Review Notes (if already reviewed) */}
                {selectedProposal.review_notes && (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h4 className="text-sm font-bold text-secondary uppercase tracking-widest mb-2">
                      Nhận xét từ giảng viên
                    </h4>
                    <p className="text-sm text-on-surface">{selectedProposal.review_notes}</p>
                    <p className="text-xs text-secondary mt-2">Ngày: {formatDate(selectedProposal.reviewed_at || '')}</p>
                  </div>
                )}

                {/* Review Form & AI Screening */}
                {(selectedProposal.registration_status === 'pending' || selectedProposal.status === 'pending') && (
                  <div className="space-y-6 pt-4 border-t border-outline-variant/15">
                    {/* AI Screening Section */}
                    {selectedProposal.registration_id && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-secondary uppercase tracking-widest flex items-center gap-2">
                            <span className="material-symbols-outlined text-purple-600">psychology</span>
                            AI Đánh Giá Sự Phù Hợp
                          </h4>
                          <Button variant="outline" size="sm" onClick={handleAI_Screening} disabled={isUpdating} className="text-purple-700 border-purple-200 hover:bg-purple-50">
                            {isUpdating && !showReviewForm && !aiScreeningResult ? (
                              <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mr-2" />
                            ) : (
                              <span className="material-symbols-outlined text-sm mr-2">analytics</span>
                            )}
                            Đánh giá ngay
                          </Button>
                        </div>
                        
                        {aiScreeningResult && (
                          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between mb-3">
                               <span className="font-bold text-purple-900 flex items-center gap-2">
                                 Điểm phù hợp: 
                                 <span className="text-2xl">{aiScreeningResult.score}</span>/100
                               </span>
                               <Badge className={
                                 aiScreeningResult.recommendation === 'approve' ? 'bg-emerald-100 text-emerald-700' :
                                 aiScreeningResult.recommendation === 'reject' ? 'bg-error-container text-error' :
                                 'bg-amber-100 text-amber-700'
                               }>
                                 {aiScreeningResult.recommendation === 'approve' ? 'Khuyên duyệt' :
                                  aiScreeningResult.recommendation === 'reject' ? 'Khuyên từ chối' : 'Cần phỏng vấn'}
                               </Badge>
                            </div>
                            <p className="text-sm text-purple-800 leading-relaxed font-medium">{aiScreeningResult.summary}</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {showReviewForm ? (
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-bold text-secondary block mb-2">
                            Nhận xét (bắt buộc)
                          </label>
                          <textarea
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            className="w-full px-4 py-3 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                            placeholder="Nhập nhận xét cho sinh viên về đề cương này..."
                          />
                        </div>
                        <div className="flex gap-3 pt-4 border-t border-outline-variant/15">
                          <Button
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleReview('approve')}
                            disabled={isUpdating || !reviewNotes.trim()}
                          >
                            <span className="material-symbols-outlined text-sm mr-2">check_circle</span>
                            Phê duyệt
                          </Button>
                          <Button
                            className="flex-1 bg-error hover:bg-error/90 text-white"
                            onClick={() => handleReview('reject')}
                            disabled={isUpdating || !reviewNotes.trim()}
                          >
                            <span className="material-symbols-outlined text-sm mr-2">cancel</span>
                            Từ chối
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => { setShowReviewForm(false); setReviewNotes('') }}
                            disabled={isUpdating}
                          >
                            Hủy
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3 pt-6 border-t border-outline-variant/15">
                        <Button
                          className="flex-1 bg-primary hover:bg-primary/90 text-white"
                          onClick={() => setShowReviewForm(true)}
                        >
                          <span className="material-symbols-outlined text-sm mr-2">feedback</span>
                          Nhận xét & Duyệt
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Approved Status */}
                {(selectedProposal.registration_status === 'approved' || selectedProposal.status === 'approved') && (
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                      <div>
                        <p className="text-sm font-bold text-emerald-800">Đã phê duyệt</p>
                        <p className="text-xs text-emerald-600">Ngày: {formatDate(selectedProposal.reviewed_at || '')}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rejected Status */}
                {(selectedProposal.registration_status === 'rejected' || selectedProposal.status === 'rejected') && (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-red-600">cancel</span>
                      <div>
                        <p className="text-sm font-bold text-red-800">Đã từ chối</p>
                        <p className="text-xs text-red-600">Ngày: {formatDate(selectedProposal.reviewed_at || '')}</p>
                      </div>
                    </div>
                  </div>
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
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}

export default withLecturer(LecturerProposalsPage)
