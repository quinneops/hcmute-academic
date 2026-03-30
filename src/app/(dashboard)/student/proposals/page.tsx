'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  const [showRegisterDialog, setShowRegisterDialog] = React.useState<string | null>(null)
  const [motivationLetter, setMotivationLetter] = React.useState('')
  const [pageError, setPageError] = React.useState<string | null>(null)
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
        avatar: profile.avatar_url || '',
      }
    : {
        name: 'Sinh viên',
        email: '',
        avatar: '',
      }

  const handleRegister = async (proposalId: string) => {
    // Check if student already has an active registration
    if (myRegistrations && myRegistrations.length > 0) {
      const activeReg = myRegistrations.find(r => r.status === 'pending' || r.status === 'approved')
      if (activeReg) {
        setPageError('Bạn chỉ được đăng ký 1 đề tài duy nhất. Bạn đã có đề tài đang đăng ký.')
        setShowRegisterDialog(null)
        return
      }
    }

    const result = await registerForProposal(proposalId, motivationLetter)
    if (result.success) {
      setShowRegisterDialog(null)
      setMotivationLetter('')
    }
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
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/student' }, { label: 'Đề cương' }]}
      notifications={0}
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-display-sm font-headline font-extrabold text-primary tracking-tight">
            Đề Cương Khóa Luận
          </h2>
          <p className="text-body-md text-on-surface-variant font-medium">
            Quản lý và theo dõi đề cương đã đăng ký
          </p>
        </div>
        <Button
          variant="outline"
          className="border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100"
          onClick={handleLoadRecommendations}
          disabled={isLoadingRecommendations}
        >
          {isLoadingRecommendations ? (
            <><span className="material-symbols-outlined text-sm mr-1 animate-spin">progress_activity</span>Đang phân tích...</>
          ) : (
            <><span className="material-symbols-outlined text-sm mr-1">auto_awesome</span>Gợi ý cho bạn</>
          )}
        </Button>
      </div>

      {/* Warning Banner for students with active registration */}
      {hasActiveRegistration && (
        <Card className="bg-amber-50 border-amber-200 mb-8">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <div>
                <h4 className="font-bold text-amber-800 mb-1">Bạn đã đăng ký đề tài</h4>
                <p className="text-sm text-amber-700 leading-relaxed">
                  Mỗi sinh viên chỉ được đăng ký <strong>1 đề tài duy nhất</strong>. Bạn cần hủy đăng ký hiện tại để đăng ký đề tài mới.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Recommendations */}
      {aiRecommendations.length > 0 && (
        <Card className="bg-purple-50 border-purple-200 mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-sm">psychology</span>
              </div>
              <CardTitle className="font-headline font-bold text-purple-900 text-lg">Đề tài phù hợp với bạn</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiRecommendations.map((rec, index) => (
                <div
                  key={rec.proposal_id}
                  className="p-4 bg-white rounded-lg border border-purple-100 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setShowRegisterDialog(rec.proposal_id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-on-surface mb-1">{rec.title}</h3>
                      <p className="text-xs text-secondary">{rec.supervisor}</p>
                    </div>
                    <Badge className="bg-purple-100 text-purple-700 font-bold">
                      {rec.match_score}% match
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {rec.match_reasons.slice(0, 3).map((reason, i) => (
                      <span key={i} className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Registrations */}
      {myRegistrations.length > 0 && (
        <Card className="bg-surface-container-lowest shadow-ambient-lg border-none mb-8">
          <CardHeader>
            <CardTitle className="font-headline font-bold text-primary text-lg">
              Đăng ký của tôi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {myRegistrations.map((reg) => (
                <div
                  key={reg.id}
                  className="p-6 bg-surface-container-low rounded-lg border border-transparent hover:border-primary-fixed/30 transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-title-md font-headline font-bold text-on-surface">
                          {reg.proposal_title}
                        </h3>
                        <Badge className={cn(
                          reg.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          reg.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          reg.status === 'rejected' ? 'bg-error-container text-error' :
                          'bg-slate-100 text-slate-600'
                        )}>
                          {reg.status === 'approved' ? 'Đã duyệt' :
                           reg.status === 'pending' ? 'Chờ duyệt' :
                           reg.status === 'rejected' ? 'Bị từ chối' : 'Đã hủy'}
                        </Badge>
                      </div>
                      {reg.supervisor_name && (
                        <p className="text-sm text-secondary flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">person</span>
                          {reg.supervisor_name}
                        </p>
                      )}
                      {reg.review_notes && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800 flex items-start gap-2">
                            <span className="material-symbols-outlined text-sm">feedback</span>
                            {reg.review_notes}
                          </p>
                        </div>
                      )}
                    </div>
                    {reg.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-error border-error"
                        onClick={() => handleWithdraw(reg.id)}
                      >
                        Hủy đăng ký
                      </Button>
                    )}
                  </div>
                  <div className="text-xs text-secondary">
                    Đăng ký ngày: {new Date(reg.submitted_at).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Proposals */}
      <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
        <CardHeader>
          <CardTitle className="font-headline font-bold text-primary text-lg">
            Đề tài khả dụng
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availableProposals.length === 0 ? (
            <p className="text-secondary text-sm text-center py-8">
              Không có đề tài nào khả dụng
            </p>
          ) : (
            <div className="space-y-4">
              {availableProposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className="p-6 bg-surface-container-low rounded-lg hover:bg-surface-container-low/80 transition-all border border-transparent hover:border-primary-fixed/30"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-title-md font-headline font-bold text-on-surface mb-2">
                        {proposal.title}
                      </h3>
                      {proposal.description && (
                        <p className="text-sm text-secondary mb-3">{proposal.description}</p>
                      )}
                      {proposal.supervisor_name && (
                        <p className="text-sm text-secondary flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">person</span>
                          Giảng viên: {proposal.supervisor_name}
                        </p>
                      )}
                    </div>
                    <Button
                      className="bg-primary hover:bg-primary/90 text-white"
                      onClick={() => setShowRegisterDialog(proposal.id)}
                      disabled={isRegistering === proposal.id || hasActiveRegistration}
                    >
                      {isRegistering === proposal.id ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm mr-1">login</span>
                          Đăng ký
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {proposal.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="rounded-full border-slate-200 text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-secondary">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        {proposal.views_count} lượt xem
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">group</span>
                        {proposal.current_students}/{proposal.max_students} sinh viên
                      </span>
                    </div>
                    <span>Đăng ngày: {new Date(proposal.created_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registration Dialog */}
      {showRegisterDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Đăng ký đề tài</h3>
            <p className="text-sm text-secondary mb-4">
              Bạn có chắc chắn muốn đăng ký đề tài này?
            </p>
            <textarea
              className="w-full p-3 border border-outline-variant rounded-lg mb-4 text-sm"
              rows={4}
              placeholder="Thư động lực (tùy chọn)..."
              value={motivationLetter}
              onChange={(e) => setMotivationLetter(e.target.value)}
            />
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRegisterDialog(null)
                  setMotivationLetter('')
                }}
              >
                Hủy
              </Button>
              <Button
                className="bg-primary text-white"
                onClick={() => handleRegister(showRegisterDialog)}
                disabled={isRegistering === showRegisterDialog}
              >
                Xác nhận đăng ký
              </Button>
            </div>
          </div>
        </div>
      )}

      {(pageError || error) && (
        <div className="fixed bottom-4 right-4 p-4 bg-error-container text-error rounded-lg flex items-center gap-3 shadow-lg">
          <span className="material-symbols-outlined">error</span>
          <p className="text-sm">{pageError || error}</p>
        </div>
      )}
    </Shell>
  )
}
