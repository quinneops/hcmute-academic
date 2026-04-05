'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { StudentPageIntro } from '@/components/student/StudentPageIntro'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useStudentProposals } from '@/hooks/student/use-student-proposals'
import { useStudentProfile } from '@/hooks/student/use-student-profile'
import { getAuthClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ProposalsPage() {
  const router = useRouter()
  const [userId, setUserId] = React.useState<string | null>(null)
  const [pageError, setPageError] = React.useState<string | null>(null)
  const [selectedLecturer, setSelectedLecturer] = React.useState('all')
  const [selectedCategory, setSelectedCategory] = React.useState('all')
  const [aiRecommendations, setAiRecommendations] = React.useState<Array<{
    proposal_id: string
    title: string
    supervisor: string
    match_score: number
    match_reasons: string[]
    category: string
  }>>([])
  const [isLoadingRecommendations, setIsLoadingRecommendations] = React.useState(false)

  React.useEffect(() => {
    const getUser = async () => {
      const supabase = getAuthClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUserId(session.user.id)
      }
    }
    getUser()
  }, [])

  const { profile } = useStudentProfile(userId || '')
  const {
    availableProposals,
    myRegistrations,
    hasCompletedBctt,
    isLoading,
    error,
    isRegistering,
    registerForProposal,
    withdrawRegistration,
  } = useStudentProposals(userId || '')

  const user = profile
    ? {
        name: profile.full_name || profile.email.split('@')[0],
        email: profile.email,
        avatar: profile.avatar_url || 'https://lh3.googleusercontent.com/aida-static/aida-image-placeholder',
      }
    : {
        name: 'Sinh viên',
        email: '',
        avatar: '',
      }

  const handleSelectProposal = (proposalId: string) => {
    router.push(`/student/proposals/${proposalId}/register`)
  }

  const handleWithdraw = async (registrationId: string) => {
    if (confirm('Bạn có chắc chắn muốn hủy đăng ký này?')) {
      await withdrawRegistration(registrationId)
    }
  }

  const handleLoadRecommendations = async () => {
    if (!userId) return

    setIsLoadingRecommendations(true)
    setAiRecommendations([])

    try {
      const supabase = getAuthClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/ai/proposal-recommend?student_id=${userId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Không thể tải gợi ý')
      }

      const data = await response.json()
      setAiRecommendations(data.recommendations || [])
    } catch (err: any) {
      console.error('AI recommendation error:', err)
    } finally {
      setIsLoadingRecommendations(false)
    }
  }

  const hasActiveRegistration = myRegistrations.some(r => r.status === 'pending' || r.status === 'approved')

  // Get featured proposals (first 2 for hero banners)
  const featuredProposalsList = React.useMemo(() => {
    return availableProposals.slice(0, 2)
  }, [availableProposals])

  // Filter proposals
  const filteredProposals = React.useMemo(() => {
    return availableProposals.filter(proposal => {
      if (selectedLecturer !== 'all' && proposal.supervisor_name !== selectedLecturer) return false
      if (selectedCategory !== 'all' && !proposal.tags.some(tag => tag.toLowerCase().includes(selectedCategory.toLowerCase()))) return false
      return true
    })
  }, [availableProposals, selectedLecturer, selectedCategory])

  // Get unique lecturers and categories for filters
  const lecturers = React.useMemo(() => {
    const set = new Set(availableProposals.map(p => p.supervisor_name).filter(Boolean))
    return Array.from(set)
  }, [availableProposals])

  const categories = React.useMemo(() => {
    const set = new Set(availableProposals.flatMap(p => p.tags))
    return Array.from(set)
  }, [availableProposals])

  if (isLoading || !userId) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-secondary text-sm">Đang tải...</p>
        </div>
      </div>
    )
  }

  return (
    <Shell
      role="student"
      user={user}
      breadcrumb={[{ label: 'Sinh viên' }, { label: 'Gợi ý đề tài' }]}
      notifications={0}
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">Khám phá Đề tài</h2>
          <p className="text-sm text-on-surface-variant">Chọn một đề tài từ giảng viên hoặc tự đề xuất ý tưởng của bạn.</p>
        </div>
        <Button 
          className="bg-primary text-white font-bold h-11 px-6 shadow-md hover:shadow-lg transition-all"
          onClick={() => router.push('/student/proposals/create')}
        >
          <span className="material-symbols-outlined mr-2">add_circle</span>
          Tự đề xuất đề tài
        </Button>
      </div>

      {/* Hero Banners Section */}
      {featuredProposalsList.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {featuredProposalsList.map((proposal, index) => {
            const isDisabled = hasActiveRegistration
            return (
              <div
                key={proposal.id}
                className={cn(
                  "relative h-48 rounded-xl overflow-hidden group",
                  !isDisabled && "cursor-pointer"
                )}
                onClick={() => !isDisabled && handleSelectProposal(proposal.id)}
              >
              <div className={cn(
                "absolute inset-0 opacity-90 transition-opacity group-hover:opacity-100",
                index === 0
                  ? "bg-gradient-to-r from-primary to-primary-container"
                  : "bg-gradient-to-r from-[#004e92] to-[#000428]"
              )}></div>
              <img
                className="absolute inset-0 w-full h-full object-cover mix-blend-overlay"
                src={index === 0
                  ? "https://lh3.googleusercontent.com/aida-public/AB6AXuBENOa2wHo90_wG8lxVy7bWxElCxh3LSExWEe7FIwnjAlPL6iWz0FNWGkvLkL4FnDIbYfsRWn4vsgrMpjKOQrN3LrcpRhqGjFsue6FI9TaNVAzW94gE5SY-Ii2qx6-i8pvPF69rjwaXLp-__0a84OSD2vc3wgFGokgm4B-zAWpJzyULkFSofky_uB4NN4FAipXfSBYs3O-IJdhoNFm4zBHte6qKEzlO5q2bJxXLvZoa6ZLrMWKV3a5PtvZLruITGfGQFqufMXdUmA"
                  : "https://lh3.googleusercontent.com/aida-public/AB6AXuCGiqlP5El_5yoc1Dgzk_rNfKk69O3574ZeoVqcoEhaBLLJoat6LbG3NwPpx5-AgaUAvxCvUENq4ktbRW60FuWz6JKak5U-8y4mu5t4PY-8-trpz2uqrV1G0HOfqruozRewD0YOUCJ7slE2UVN0VjIs0La1860fWAE_upbWBmVzS38EeMHPyLJF1Qr9JoT1UHXSy4gbeVL54K0dYXiAHmbSMYzqEYU63hwHFZeZJUBtYD0U1RCGFflR4mi2j6ihlORhqHx6YZRv6Q"
                }
                alt={proposal.title}
              />
              <div className="relative h-full p-6 flex flex-col justify-center">
                <span className={cn(
                  "text-[10px] uppercase tracking-widest font-bold mb-2 w-fit",
                  index === 0
                    ? "bg-tertiary-container/20 text-tertiary-fixed-dim"
                    : "bg-emerald-500/20 text-emerald-300"
                )}>
                  {index === 0 ? 'Nổi bật' : 'Đề tài mới'}
                </span>
                <h3 className="text-white text-xl font-bold font-headline mb-2 leading-tight">{proposal.title}</h3>
                <div className="flex gap-2 items-center">
                  <p className="text-blue-100/80 text-sm">
                    {proposal.category || 'Đề tài khóa luận'}
                  </p>
                  <span className="w-1 h-1 bg-blue-100/40 rounded-full"></span>
                  <span className="text-white/95 text-[10px] font-bold px-2 py-0.5 bg-white/10 rounded uppercase">
                    {proposal.type}
                  </span>
                </div>
              </div>
            </div>
          )})}
        </div>
      )}

      {/* AI Recommendations */}
      {aiRecommendations.length > 0 && (
        <Card className="bg-purple-50 border-purple-200 mb-6">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                <span className="material-symbols-outlined">psychology</span>
              </div>
              <h3 className="text-lg font-bold font-headline text-purple-900">Đề tài phù hợp với bạn</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {aiRecommendations.map((rec) => (
                <div
                  key={rec.proposal_id}
                  className="p-4 bg-white rounded-lg border border-purple-100 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleSelectProposal(rec.proposal_id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-bold text-on-surface flex-1">{rec.title}</h3>
                    <Badge className="bg-purple-100 text-purple-700 font-bold text-xs ml-2">
                      {rec.match_score}%
                    </Badge>
                  </div>
                  <p className="text-xs text-secondary mb-2">{rec.supervisor}</p>
                  <div className="flex flex-wrap gap-1">
                    {rec.match_reasons.slice(0, 2).map((reason, i) => (
                      <span key={i} className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Filter Section */}
      <div className="bg-surface-container-low p-4 sm:p-6 rounded-xl mb-6 flex flex-wrap items-end gap-4 sm:gap-6">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-2 font-label">Giảng viên hướng dẫn</label>
          <select
            className="w-full bg-surface-container-lowest border-none rounded-lg text-sm p-3 focus:ring-2 focus:ring-primary shadow-sm shadow-blue-900/5"
            value={selectedLecturer}
            onChange={(e) => setSelectedLecturer(e.target.value)}
          >
            <option value="all">Tất cả giảng viên</option>
            {lecturers.map((lecturer) => (
              <option key={lecturer} value={lecturer}>{lecturer}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-2 font-label">Lĩnh vực đề tài</label>
          <select
            className="w-full bg-surface-container-lowest border-none rounded-lg text-sm p-3 focus:ring-2 focus:ring-primary shadow-sm shadow-blue-900/5"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">Tất cả lĩnh vực</option>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          {(selectedLecturer !== 'all' || selectedCategory !== 'all') && (
            <Button
              variant="outline"
              className="h-[46px] px-4 sm:px-6 border-slate-300 text-slate-600 font-bold text-sm hover:bg-slate-100 transition-all"
              onClick={() => {
                setSelectedLecturer('all')
                setSelectedCategory('all')
              }}
            >
              <span className="material-symbols-outlined text-sm">clear_all</span>
              Xóa bộ lọc
            </Button>
          )}
          <Button className="h-[46px] px-4 sm:px-6 bg-primary text-white font-bold text-sm hover:bg-primary-container transition-all active:scale-95 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">filter_list</span>
            Lọc đề tài ({filteredProposals.length})
          </Button>
        </div>
      </div>

      {/* My Registrations */}
      {myRegistrations.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold font-headline text-primary mb-4">Đăng ký của tôi</h2>
          <div className="space-y-4">
            {myRegistrations.map((reg) => (
              <div
                key={reg.id}
                className="bg-surface-container-lowest p-4 sm:p-6 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 hover:bg-surface-bright transition-colors shadow-sm shadow-blue-900/5 border-l-4 border-primary"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className={cn(
                      reg.status === 'completed' ? 'bg-blue-500 text-white shadow-blue-200' :
                      reg.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      reg.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      reg.status === 'rejected' ? 'bg-error-container text-error' :
                      'bg-slate-100 text-slate-600'
                    )}>
                      {reg.status === 'completed' ? 'Đã hoàn thành' :
                       reg.status === 'approved' ? 'Đã duyệt' :
                       reg.status === 'pending' ? 'Chờ duyệt' :
                       reg.status === 'rejected' ? 'Bị từ chối' : 'Đã hủy'}
                    </Badge>
                    <span className="text-on-surface-variant text-xs font-medium">Mã: {reg.id.slice(0, 8)}</span>
                  </div>
                  <h3 className="text-lg font-bold text-on-surface font-headline mb-2 truncate">{reg.proposal_title}</h3>
                  <div className="flex flex-wrap items-center gap-4 mb-3">
                    {reg.proposal_category && (
                      <span className="inline-flex items-center gap-1 text-xs text-on-surface-variant">
                        <span className="material-symbols-outlined text-sm">category</span>
                        Lĩnh vực: {reg.proposal_category}
                      </span>
                    )}
                    {reg.proposal_tags && reg.proposal_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {reg.proposal_tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="text-[10px] bg-primary-fixed text-primary px-2 py-0.5 rounded font-medium">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reg.supervisor_name && (
                      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                        <span className="material-symbols-outlined text-sm">person</span>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">GVHD</p>
                          <p className="font-medium">{reg.supervisor_name}</p>
                        </div>
                      </div>
                    )}
                    {reg.supervisor_email && (
                      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                        <span className="material-symbols-outlined text-sm">email</span>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Email</p>
                          <p className="font-medium">{reg.supervisor_email}</p>
                        </div>
                      </div>
                    )}
                    {reg.motivation_letter && (
                      <div className="md:col-span-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="material-symbols-outlined text-sm text-primary">menu_book</span>
                          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Thư động lực</p>
                        </div>
                        <div className="p-3 bg-surface-container-low rounded-lg border border-slate-100">
                          <p className="text-sm text-on-surface italic line-clamp-3">{reg.motivation_letter}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {reg.review_notes && (
                    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg inline-block">
                      <p className="text-xs text-blue-800 flex items-start gap-1">
                        <span className="material-symbols-outlined text-sm">feedback</span>
                        {reg.review_notes}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-1">Đăng ký ngày</p>
                    <p className="text-sm font-bold text-primary font-headline">{new Date(reg.submitted_at).toLocaleDateString('vi-VN')}</p>
                  </div>
                  {reg.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-error border-error hover:bg-error-container"
                      onClick={() => handleWithdraw(reg.id)}
                    >
                      Hủy đăng ký
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Proposals List */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">Danh sách đề tài</h2>
          <span className="text-sm text-on-surface-variant">Hiển thị {filteredProposals.length} đề tài</span>
        </div>

        <div className="space-y-4">
          {filteredProposals.length === 0 ? (
            <Card className="p-12 text-center">
              <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">search_off</span>
              <p className="text-on-surface-variant font-medium">Không có đề tài nào phù hợp với bộ lọc</p>
            </Card>
          ) : (
            filteredProposals.map((proposal) => {
              const slotsRemaining = proposal.max_students - proposal.current_students
              const isFull = slotsRemaining <= 0
              const isRegistered = myRegistrations.some(r => r.proposal_id === proposal.id)
              const hasAnyActiveRegistration = myRegistrations.some(r => r.status === 'pending' || r.status === 'approved')
              const isDisabled = isFull || isRegistered || hasAnyActiveRegistration

              return (
                <div
                  key={proposal.id}
                  className={cn(
                    "p-6 rounded-xl flex items-center justify-between gap-6 transition-all shadow-sm",
                    isDisabled
                      ? "bg-surface-container-low opacity-70 border-l-4 border-slate-300"
                      : "bg-surface-container-lowest hover:bg-surface-bright border-l-4 border-primary"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={cn(
                        isFull
                          ? "bg-error-container/20 text-error"
                          : "bg-emerald-500/10 text-emerald-700"
                      )}>
                        {isFull ? 'Đã đủ SV' : 'Mở đăng ký'}
                      </Badge>
                      <Badge variant="outline" className={cn(
                        proposal.type === 'BCTT' 
                          ? "border-blue-200 text-blue-700 bg-blue-50"
                          : "border-primary-fixed text-primary bg-primary-fixed/10"
                      )}>
                        {proposal.type}
                      </Badge>
                      {proposal.type === 'KLTN' && !hasCompletedBctt && (
                        <Badge variant="destructive" className="bg-error/10 text-error border-error/20 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[10px]">warning</span>
                          Yêu cầu hoàn thành BCTT
                        </Badge>
                      )}
                      <span className="text-on-surface-variant text-xs font-medium">Mã số: {proposal.id.slice(0, 8)}</span>
                    </div>
                    <h3 className={cn(
                      "text-lg font-bold text-on-surface font-headline mb-1 truncate",
                      !isDisabled && "group-hover:text-primary transition-colors"
                    )}>{proposal.title}</h3>
                    <div className="flex items-center gap-6 text-on-surface-variant">
                      {proposal.supervisor_name && (
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">person</span>
                          <span className="text-sm font-medium">GVHD: {proposal.supervisor_name}</span>
                        </div>
                      )}
                      {proposal.tags.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">category</span>
                          <span className="text-sm">Lĩnh vực: {proposal.tags.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-on-surface-variant text-[10px] uppercase font-bold tracking-widest mb-1">Số lượng còn</p>
                      <p className={cn(
                        "text-2xl font-bold font-headline",
                        isFull ? "text-slate-400" : "text-primary"
                      )}>{slotsRemaining}<span className="text-sm text-on-surface-variant font-normal">/{proposal.max_students}</span></p>
                    </div>
                    <Button
                      className={cn(
                        "px-6 py-3 rounded-lg font-bold text-sm transition-all active:scale-95 whitespace-nowrap",
                        isDisabled
                          ? "bg-surface-container text-slate-400 cursor-not-allowed"
                          : "bg-secondary-container text-on-secondary-fixed hover:bg-primary-container hover:text-white"
                      )}
                      onClick={() => !isDisabled && handleSelectProposal(proposal.id)}
                      disabled={isDisabled || isRegistering === proposal.id}
                    >
                      {isRegistering === proposal.id ? (
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : isRegistered ? (
                        'Đã đăng ký'
                      ) : hasAnyActiveRegistration ? (
                        ''
                      ) : (
                        'Chọn đề tài'
                      )}
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {(pageError || error) && (
        <div className="fixed bottom-4 right-4 p-4 bg-error-container text-error rounded-lg flex items-center gap-3 shadow-lg">
          <span className="material-symbols-outlined">error</span>
          <p className="text-sm">{pageError || error}</p>
        </div>
      )}
    </Shell>
  )
}
