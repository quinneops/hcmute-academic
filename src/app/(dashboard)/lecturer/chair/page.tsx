'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { withLecturer } from '@/hocs/with-role-check'
import { useAuthUser } from '@/hooks/use-auth-user'

import { api } from '@/lib/api/client'

interface FinalCheck {
  id: string
  student_name: string
  student_code: string
  thesis_title: string
  defense_score: number
  edit_status: string
  editing_file_url: string | null
  submitted_at: string
}

function LecturerChairPage() {
  const { user } = useAuthUser()
  const [finalChecks, setFinalChecks] = React.useState<FinalCheck[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null)

  const fetchSubmissions = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await api.lecturer.chair.submissions()
      setFinalChecks(data)
    } catch (error: any) {
      console.error('Fetch chair submissions error:', error)
      alert('Không thể tải danh sách xét duyệt. Vui lòng thử lại sau.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  const handleReview = async (registrationId: string, action: 'approved' | 'rejected') => {
    let notes = ''
    if (action === 'rejected') {
      const input = prompt('Vui lòng nhập lý do yêu cầu chỉnh sửa lại:')
      if (input === null) return
      notes = input
    } else {
      if (!confirm('Bạn có chắc chắn muốn duyệt bản chỉnh sửa này?')) return
    }

    try {
      setIsProcessing(registrationId)
      await api.lecturer.chair.review(registrationId, { action, notes })
      alert(action === 'approved' ? 'Đã duyệt thành công!' : 'Đã gửi yêu cầu chỉnh sửa lại.')
      await fetchSubmissions()
    } catch (error: any) {
      console.error('Review error:', error)
      alert('Lỗi: ' + (error.message || 'Không thể thực hiện xét duyệt'))
    } finally {
      setIsProcessing(null)
    }
  }

  if (isLoading) {
    return (
      <Shell role="lecturer" user={{ name: user?.full_name || '...', email: '...', avatar: '' }} breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Vai trò Chủ tịch' }]}>
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
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Vai trò Chủ tịch' }]}
    >
      <div className="mb-8">
        <h2 className="text-display-sm font-headline font-extrabold text-primary tracking-tight">
          Nhiệm Vụ Chủ Tịch Hội Đồng
        </h2>
        <p className="text-body-md text-on-surface-variant font-medium">
          Xét duyệt kết quả cuối cùng và sửa đổi sau bảo vệ
        </p>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-bold font-headline text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">pending_actions</span>
          Cần xét duyệt chỉnh sửa ({finalChecks.length})
        </h3>
        
        {finalChecks.length === 0 ? (
          <Card className="p-12 text-center text-on-surface-variant bg-surface-container-lowest border-2 border-dashed border-outline-variant/30 rounded-3xl">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-20">check_circle</span>
            <p className="font-medium">Không có yêu cầu xét duyệt nào</p>
          </Card>
        ) : (
          finalChecks.map((item) => (
            <Card key={item.id} className="bg-surface-container-lowest shadow-ambient-lg border-none rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-outline-variant/10">
                <CardHeader className="flex-1 p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Mã SV: {item.student_code}</p>
                      <CardTitle className="text-xl font-headline font-bold text-primary">{item.student_name}</CardTitle>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 font-bold px-3 py-1 rounded-full text-[10px]">ĐANG CHỜ DUYỆT</Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      <span className="font-black text-primary uppercase text-[10px] tracking-tight">Đề tài:</span> {item.thesis_title}
                    </p>
                    <div className="flex items-center gap-4">
                       <p className="text-sm text-on-surface-variant">
                        <span className="font-bold">Điểm bảo vệ:</span> <span className="text-primary font-black">{item.defense_score?.toFixed(1) || '0.0'}</span>
                      </p>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                      <p className="text-xs text-slate-600 font-bold">Nộp lúc: {new Date(item.submitted_at).toLocaleDateString('vi-VN', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</p>
                    </div>
                  </div>
                </CardHeader>
                <div className="p-6 flex flex-col justify-center gap-3 min-w-[280px] bg-slate-50/50">
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] h-10 rounded-xl shadow-lg shadow-emerald-900/10 transition-all active:scale-95"
                      onClick={() => handleReview(item.id, 'approved')}
                      disabled={!!isProcessing}
                    >
                      {isProcessing === item.id ? (
                        <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                      ) : (
                        <><span className="material-symbols-outlined text-sm mr-1">check_circle</span>DUYỆT SỬA ĐỔI</>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 border-2 border-red-100 text-red-600 hover:bg-red-50 font-bold text-[11px] h-10 rounded-xl transition-all active:scale-95"
                      onClick={() => handleReview(item.id, 'rejected')}
                      disabled={!!isProcessing}
                    >
                      <span className="material-symbols-outlined text-sm mr-1">history_edu</span>
                      YÊU CẦU LẠI
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    className="w-full text-primary hover:bg-primary/5 font-black text-[10px] tracking-widest h-10 rounded-xl transition-all"
                    onClick={() => item.editing_file_url && window.open(item.editing_file_url, '_blank')}
                    disabled={!item.editing_file_url}
                  >
                    <span className="material-symbols-outlined text-sm mr-1">visibility</span>
                    XEM BẢN CHỈNH SỬA
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-surface-container-lowest shadow-ambient-sm border-none rounded-3xl p-6">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined">analytics</span>
             </div>
             <div>
               <p className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] mb-1">Cần xử lý</p>
               <p className="text-2xl font-black text-primary font-headline">{finalChecks.length}</p>
             </div>
          </div>
        </Card>

        <Card className="md:col-span-2 bg-gradient-to-br from-primary-fixed/30 to-surface-container-lowest border border-primary-fixed/20 rounded-3xl p-6 flex items-center gap-6">
           <div className="w-16 h-16 rounded-3xl bg-white shadow-ambient-sm flex items-center justify-center flex-shrink-0 animate-pulse">
              <span className="material-symbols-outlined text-3xl text-primary">verified</span>
           </div>
           <div>
              <h4 className="font-headline font-bold text-primary mb-1">Quyền hạn Chủ tịch</h4>
              <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
                Chủ tịch là người ký kết sau cùng các biên bản họp và xác nhận sinh viên đã hoàn thành sửa đổi đề tài theo đúng góp ý của hội đồng. Mọi quyết định của bạn sẽ trực tiếp hoàn tất hồ sơ cho sinh viên.
              </p>
           </div>
        </Card>
      </div>
    </Shell>
  )
}

export default withLecturer(LecturerChairPage)
