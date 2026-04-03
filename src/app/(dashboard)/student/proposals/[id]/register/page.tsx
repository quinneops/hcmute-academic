'use client'

import * as React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api/client'
import { useStudentProfile } from '@/hooks/student/use-student-profile'
import { getAuthClient } from '@/lib/supabase/client'
import { useStudentProposals } from '@/hooks/student/use-student-proposals'

export default function RegisterProposalPage() {
  const router = useRouter()
  const params = useParams()
  const proposalId = params.id as string
  
  const [userId, setUserId] = React.useState<string | null>(null)
  const [motivation, setMotivation] = React.useState('')
  const [proposedTitle, setProposedTitle] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isImproving, setIsImproving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [proposal, setProposal] = React.useState<any>(null)
  const [isLoading, setIsLoading] = React.useState(true)

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
  const { hasCompletedBctt, refresh } = useStudentProposals(userId || '')

  React.useEffect(() => {
    const fetchProposal = async () => {
      try {
        setIsLoading(true)
        // Note: Using a single proposal fetch if available, or finding in list
        const proposals = await api.proposals.list()
        const found = (proposals as any[]).find(p => p.id === proposalId)
        if (!found) {
          setError('Không tìm thấy đề tài')
          return
        }
        setProposal(found)
        setProposedTitle(found.title)
      } catch (err: any) {
        setError(err.message || 'Lỗi khi tải thông tin đề tài')
      } finally {
        setIsLoading(false)
      }
    }
    if (proposalId) fetchProposal()
  }, [proposalId])

  const handleImproveWithAi = async () => {
    if (!motivation.trim() || !userId) return
    setIsImproving(true)
    try {
      const result = await api.ai.improveMotivation(proposalId, userId, motivation)
      if (result.improved) {
        setMotivation(result.improved)
      }
    } catch (err) {
      console.error('AI Improvement error:', err)
    } finally {
      setIsImproving(false)
    }
  }

  const handleSubmit = async () => {
    if (!userId || !proposal) return
    
    // Prerequisite Check
    if (proposal.type === 'KLTN' && !hasCompletedBctt) {
      setError('Bạn cần hoàn thành BCTT trước khi đăng ký KLTN.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await api.registrations.submit({
        student_id: userId,
        proposal_id: proposalId,
        motivation_letter: motivation,
        proposed_title: proposedTitle
      })

      if (result.error) throw new Error(result.error)
      
      await refresh()
      router.push('/student/proposals')
    } catch (err: any) {
      setError(err.message || 'Lỗi khi gửi đăng ký')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading || !userId) {
    return <div className="flex items-center justify-center min-h-screen">Đang tải...</div>
  }

  if (error && !proposal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-error font-bold">{error}</p>
        <Button onClick={() => router.back()}>Quay lại</Button>
      </div>
    )
  }

  return (
    <Shell
      role="student"
      user={{
        name: profile?.full_name || '...',
        email: profile?.email || '...',
        avatar: profile?.avatar_url || ''
      }}
      breadcrumb={[{ label: 'Sinh viên' }, { label: 'Đề tài', href: '/student/proposals' }, { label: 'Đăng ký' }]}
    >
      <div className="max-w-4xl mx-auto py-8">
        <div className="mb-8">
          <Badge className={cn(
            "mb-2",
            proposal.type === 'BCTT' ? 'bg-blue-100 text-blue-700' : 'bg-primary-fixed text-primary'
          )}>
            {proposal.type}
          </Badge>
          <h1 className="text-3xl font-extrabold text-primary font-headline tracking-tight mb-2">
            Đăng ký đề tài: {proposal.title}
          </h1>
          <p className="text-secondary">Giảng viên hướng dẫn: <span className="font-bold text-on-surface">{proposal.supervisor_name}</span></p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Details Sidebar */}
          <div className="md:col-span-1 space-y-6">
            <Card className="bg-surface-container-low border-none shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-sm font-bold text-secondary uppercase tracking-widest mb-4">Chi tiết đề tài</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Lĩnh vực</p>
                    <p className="text-sm font-medium">{proposal.category || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Thẻ</p>
                    <div className="flex flex-wrap gap-1">
                      {proposal.tags?.map((tag: string) => (
                        <span key={tag} className="text-[10px] bg-white/50 px-2 py-0.5 rounded">#{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {proposal.type === 'KLTN' && !hasCompletedBctt && (
              <div className="p-4 bg-error-container/20 border border-error/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-error">warning</span>
                  <div>
                    <p className="text-sm font-bold text-error">Chưa đủ điều kiện</p>
                    <p className="text-xs text-error/80">Bạn cần hoàn thành Thực tập (BCTT) trước khi đăng ký Khóa luận.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Registration Form */}
          <div className="md:col-span-2 space-y-6">
            <Card className="bg-white border-none shadow-ambient-lg overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-primary to-primary-container"></div>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-on-surface mb-2">Tên đề tài (Bạn có thể đề xuất điều chỉnh)</label>
                    <input
                      type="text"
                      className="w-full p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30 focus:ring-2 focus:ring-primary outline-none transition-all"
                      value={proposedTitle}
                      onChange={(e) => setProposedTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-bold text-on-surface">Thư động lực / Giới thiệu bản thân</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary font-bold flex items-center gap-1 hover:bg-primary/5"
                        onClick={handleImproveWithAi}
                        disabled={isImproving || !motivation.trim()}
                      >
                        {isImproving ? (
                          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span className="material-symbols-outlined text-sm">auto_fix_high</span>
                        )}
                        Tối ưu bằng AI
                      </Button>
                    </div>
                    <textarea
                      rows={6}
                      className="w-full p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30 focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
                      placeholder="Hãy nêu lý do bạn quan tâm đến đề tài này và các kỹ năng liên quan của bạn..."
                      value={motivation}
                      onChange={(e) => setMotivation(e.target.value)}
                    />
                    <p className="text-[10px] text-secondary mt-2">
                      * AI sẽ giúp bạn chuyên nghiệp hóa thư động lực dựa trên hồ sơ và yêu cầu đề tài.
                    </p>
                  </div>

                  {error && (
                    <div className="p-4 bg-error-container/10 border border-error/20 rounded-lg text-error text-sm">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-4 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1 py-6 rounded-xl font-bold border-slate-200"
                      onClick={() => router.back()}
                    >
                      Hủy bỏ
                    </Button>
                    <Button
                      className="flex-1 py-6 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
                      onClick={handleSubmit}
                      disabled={isSubmitting || (proposal.type === 'KLTN' && !hasCompletedBctt)}
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Gửi đăng ký ngay'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  )
}
