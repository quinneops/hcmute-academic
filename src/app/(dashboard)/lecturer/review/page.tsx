'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { withLecturer } from '@/hocs/with-role-check'
import { useAuthUser } from '@/hooks/use-auth-user'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api/client'

interface AssignedReview {
  id: string
  student_id: string
  student_name: string
  student_code: string
  proposal_title: string
  status: string
  reviewer_score?: number
  reviewer_feedback?: string
  reviewer_deadline?: string
  submissions?: any[]
}

function LecturerReviewPage() {
  const router = useRouter()
  const { user } = useAuthUser()
  const [reviews, setReviews] = React.useState<AssignedReview[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        const data = await api.lecturer.review.list()
        setReviews(data || [])
      } catch (err: any) {
        setError(err.message || 'Không thể tải danh sách phản biện')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const completedCount = reviews.filter(r => r.reviewer_score !== null && r.reviewer_score !== undefined).length
  const totalCount = reviews.length

  if (isLoading) {
    return (
      <Shell role="lecturer" isTbm={user?.is_tbm} user={{ name: '...', email: '...', avatar: '' }} breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Vai trò Phản biện' }]}>
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
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Vai trò Phản biện' }]}
    >
      <div className="p-0 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <nav className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant mb-2 uppercase tracking-[0.2em]">
              <span>Học kỳ II</span>
              <span className="material-symbols-outlined text-[12px]">chevron_right</span>
              <span>2024 - 2025</span>
            </nav>
            <h2 className="text-3xl font-extrabold font-headline text-primary tracking-tight">
              Quản lý Phản biện Khóa luận
            </h2>
          </div>
          <div className="flex gap-3">
            <div className="bg-surface-container-lowest p-4 rounded-xl shadow-ambient-sm flex items-center gap-4 border border-outline-variant/10">
              <div className="w-10 h-10 rounded-lg bg-tertiary-fixed flex items-center justify-center text-tertiary shadow-sm">
                <span className="material-symbols-outlined shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>fact_check</span>
              </div>
              <div>
                <p className="text-[10px] text-secondary font-bold uppercase tracking-wider mb-0.5">Đã hoàn thành</p>
                <p className="text-xl font-black font-headline text-on-surface leading-none">
                  {String(completedCount).padStart(2, '0')}/{String(totalCount).padStart(2, '0')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="space-y-6">
          <div className="bg-surface-container-lowest rounded-xl shadow-ambient-lg overflow-hidden border border-outline-variant/10">
            <div className="px-8 py-6 border-b border-outline-variant/10 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-lg font-bold font-headline text-primary">Danh sách Sinh viên Phản biện</h3>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button variant="outline" className="flex-1 sm:flex-none flex items-center gap-2 border-outline-variant/30 text-on-surface-variant font-bold">
                  <span className="material-symbols-outlined text-lg">filter_list</span>
                  Bộ lọc
                </Button>
                <Button className="flex-1 sm:flex-none flex items-center gap-2 bg-primary text-white font-bold hover:shadow-glow-primary transition-all">
                  <span className="material-symbols-outlined text-sm">download</span>
                  Xuất báo cáo
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/50">
                    <th className="px-8 py-4 text-[10px] font-bold text-secondary uppercase tracking-widest w-16">STT</th>
                    {/* <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-widest">MSSV</th> */}
                    <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-widest">Họ tên</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-widest">Tên đề tài</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-widest text-center">Tài liệu</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-secondary uppercase tracking-widest text-right">Trạng thái</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-secondary uppercase tracking-widest text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 font-body">
                  {reviews.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-8 py-12 text-center text-secondary italic">
                        Chưa có sinh viên nào được phân công phản biện cho bạn
                      </td>
                    </tr>
                  ) : (
                    reviews.map((review, idx) => {
                      const isGraded = review.reviewer_score !== null && review.reviewer_score !== undefined
                      return (
                        <tr key={review.id} className="hover:bg-surface-bright transition-colors group">
                          <td className="px-8 py-6 font-headline font-bold text-slate-300">
                            {String(idx + 1).padStart(2, '0')}
                          </td>

                          <td className="px-6 py-6">
                            <div className="font-bold text-on-surface text-sm">{review.student_name}</div>
                            <p className="text-[10px] text-secondary uppercase tracking-wider font-medium">Sinh viên</p>
                          </td>
                          <td className="px-6 py-6 max-w-xs">
                            <p className="text-xs font-medium text-on-surface-variant line-clamp-2 leading-relaxed">
                              {review.proposal_title}
                            </p>
                          </td>
                          <td className="px-6 py-6 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-10 h-10 rounded-lg bg-error/5 text-error hover:bg-error/10 transition-colors"
                              disabled={!review.submissions?.length}
                            >
                              <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
                            </Button>
                          </td>
                          <td className="px-8 py-6 text-right">
                            {isGraded ? (
                              <span className="px-3 py-1 rounded-full bg-primary text-white text-[11px] font-black uppercase tracking-wider min-w-[2.5rem] inline-block text-center border border-primary-fixed/20 shadow-md">
                                {review.reviewer_score}
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-full bg-surface-container-high text-secondary text-[10px] font-bold uppercase tracking-wider border border-outline-variant/20">
                                Đang chờ
                              </span>
                            )}
                          </td>
                          <td className="px-8 py-6 text-right">
                            <Button
                              size="sm"
                              className={cn(
                                "px-4 py-2 font-black text-[10px] uppercase tracking-widest rounded-lg transition-all active:scale-95 shadow-sm",
                                isGraded
                                  ? "bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
                                  : "bg-primary text-white hover:shadow-glow-primary"
                              )}
                              onClick={() => router.push(`/lecturer/grading?student=${review.student_id}&role=reviewer&registrationId=${review.id}`)}
                            >
                              {isGraded ? 'Xem chi tiết' : 'Chấm điểm'}
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Guidance / Instruction Bento Piece */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-primary p-7 rounded-xl text-white relative overflow-hidden group shadow-ambient-lg">
              <div className="relative z-10">
                <h4 className="text-lg font-black font-headline mb-3 tracking-tight">Quy định chấm điểm</h4>
                <p className="text-xs text-primary-fixed/80 font-medium leading-relaxed mb-6">
                  Điểm phản biện chiếm 30% tổng số điểm khóa luận. Vui lòng hoàn thành đánh giá trước ngày 20/06 dựa trên tiêu chí học thuật.
                </p>
                <button className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 group-hover:gap-3 transition-all">
                  Xem chi tiết <span className="material-symbols-outlined text-sm font-black">arrow_forward</span>
                </button>
              </div>
              <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-9xl opacity-10 rotate-12 transition-transform group-hover:rotate-0">gavel</span>
            </div>

            <Card className="bg-surface-container-lowest p-7 rounded-xl shadow-ambient-sm border border-outline-variant/10 flex flex-col justify-between">
              <div>
                <h4 className="text-[10px] font-black text-secondary mb-5 uppercase tracking-widest">Tài liệu Hội đồng</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer group">
                    <div className="p-2 bg-tertiary/10 text-tertiary rounded-lg group-hover:bg-tertiary group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-sm">description</span>
                    </div>
                    <span className="text-xs font-bold text-on-surface">Mẫu phiếu nhận xét.docx</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer group">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                    </div>
                    <span className="text-xs font-bold text-on-surface">Lịch bảo vệ chi tiết.pdf</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-surface-container-lowest p-7 rounded-xl shadow-ambient-sm border border-outline-variant/10 flex flex-col">
              <h4 className="text-[10px] font-black text-secondary mb-5 uppercase tracking-widest">Hỗ trợ nhanh</h4>
              <div className="flex items-center gap-4 mb-auto">
                <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary shadow-inner">
                  <span className="material-symbols-outlined text-xl">support_agent</span>
                </div>
                <div>
                  <p className="text-xs font-black text-on-surface tracking-tight">Thư ký Hội đồng</p>
                  <p className="text-[10px] text-secondary font-medium italic">Văn phòng Khoa CNTT</p>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-6 py-5 bg-surface-container-low text-on-surface border-none text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-surface-container-high transition-all active:scale-95">
                Liên hệ ngay
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  )
}

export default withLecturer(LecturerReviewPage)
