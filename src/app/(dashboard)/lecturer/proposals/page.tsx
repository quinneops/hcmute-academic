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
  submitted_at: string
  reviewed_at: string | null
  review_notes: string | null
  motivation_letter: string | null
  proposed_title: string | null
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

  const handleApproveAll = async () => {
    if (stats.pending === 0) return
    if (!window.confirm(`Bạn có chắc chắn muốn phê duyệt toàn bộ ${stats.pending} hồ sơ đang chờ không?`)) return

    setIsUpdating(true)
    setError(null)

    try {
      await api.lecturer.proposals.bulkReview('approve')
      await fetchProposals()
    } catch (err: any) {
      console.error('Bulk review error:', err)
      setError(err.message || 'Không thể phê duyệt hàng loạt')
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <Shell role="lecturer" user={{ name: '...', email: '...', avatar: '' }} breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Đề cương' }]}>
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
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Đề cương' }]}
      notifications={0}
    >
      <FlowPageIntro
        eyebrow="Lecturer flow / proposals"
        title="Xét duyệt đề cương"
        description="Review và phê duyệt đề cương sinh viên trong một không gian làm việc tập trung và nhất quán hơn."
        meta={
          <>
            <Badge className="bg-amber-100 text-amber-700 text-[10px] font-bold uppercase">
              {stats.pending} chờ duyệt
            </Badge>
            <Badge className="bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">
              {stats.approved} đã duyệt
            </Badge>
          </>
        }
        actions={
          <div className="flex gap-2">
            {stats.pending > 0 && (
              <Button
                variant="outline"
                className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                onClick={handleApproveAll}
                disabled={isUpdating}
              >
                <span className="material-symbols-outlined text-sm mr-2">done_all</span>
                Phê duyệt tất cả
              </Button>
            )}
            <Button
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={() => window.location.href = '/lecturer/proposals/create'}
            >
              <span className="material-symbols-outlined text-sm mr-2">add</span>
              Tạo đề cương
            </Button>
          </div>
        }
      />

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
                        <p className="text-xs font-bold text-on-surface">{proposal.student_name || 'Chưa có sinh viên'}</p>
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
                    <p className="text-xs text-on-surface-variant line-clamp-2">{proposal.title}</p>
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

                {/* Review Form */}
                {(selectedProposal.registration_status === 'pending' || selectedProposal.status === 'pending') && (
                  <>
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
                  </>
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
