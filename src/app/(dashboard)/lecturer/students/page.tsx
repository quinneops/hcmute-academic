'use client'

import * as React from 'react'
import { FlowMetricGrid } from '@/components/flow/FlowMetricGrid'
import { FlowPageIntro } from '@/components/flow/FlowPageIntro'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api/client'
import { useRouter } from 'next/navigation'
import { withLecturer } from '@/hocs/with-role-check'
import { useAuthUser } from '@/hooks/use-auth-user'

interface Student {
  id: string
  student_id: string
  student_name: string
  student_code: string
  student_email: string
  avatar_url: string | null
  proposal_type: string
  registration_status: string
  progress_percentage: number
  total_submissions: number
  last_submission_at: string | null
  defense_date: string | null
  defense_status: string | null
  final_score: number | null
  final_grade: string | null
}

function LecturerStudentsPage() {
  const router = useRouter()
  const { user } = useAuthUser()
  const [searchTerm, setSearchTerm] = React.useState('')
  const [students, setStudents] = React.useState<Student[]>([])
  const [stats, setStats] = React.useState({ total: 0, active: 0, defended: 0 })
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [isUpdating, setIsUpdating] = React.useState(false)

  React.useEffect(() => {
    async function fetchStudents() {
      try {
        setIsLoading(true)
        const data = await api.lecturer.students()
        setStudents(data.students || [])
        setStats(data.stats || { total: 0, active: 0, defended: 0 })
      } catch (err: any) {
        console.error('Students fetch error:', err)
        setError(err.message || 'Không thể tải danh sách sinh viên')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStudents()
  }, [])

  const filteredStudents = students.filter(s =>
    s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.student_code.includes(searchTerm)
  )

  const handleBulkReview = async (action: 'approve' | 'reject') => {
    if (selectedIds.length === 0) return
    setIsUpdating(true)
    setError(null)
    try {
      // In a real app, this would be a single bulk API call
      // For now, we'll loop to match existing API capability
      await Promise.all(selectedIds.map(async (id) => {
        const student = students.find(s => s.id === id)
        if (student) {
          await api.lecturer.proposals.review(
            'any', // proposalId is not strictly needed if registrationId is provided
            action,
            `Bulk ${action} by supervisor`,
            id
          )
        }
      }))
      
      // Refresh
      const data = await api.lecturer.students()
      setStudents(data.students || [])
      setSelectedIds([])
    } catch (err: any) {
      setError(err.message || 'Không thể cập nhật hàng loạt')
    } finally {
      setIsUpdating(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredStudents.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredStudents.map(s => s.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  if (isLoading) {
    return (
      <Shell 
        role="lecturer" 
        isTbm={user?.is_tbm}
        user={{ 
          name: '...', 
          email: '...', 
          avatar: '',
          is_tbm: user?.is_tbm,
          is_secretary: user?.is_secretary
        }} 
        breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Sinh viên' }]}
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
      user={{ 
        name: user?.full_name || 'Giảng viên', 
        email: user?.email || '...', 
        avatar: user?.avatar_url || '',
        is_tbm: user?.is_tbm,
        is_secretary: user?.is_secretary
      }}
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Sinh viên' }]}
      notifications={0}
    >
      <FlowPageIntro
        eyebrow="Lecturer / students"
        title="Danh sách sinh viên"
        description="Quản lý nhóm sinh viên đang hướng dẫn, theo dõi tiến độ và lọc nhanh theo nhu cầu làm việc hàng ngày."
        actions={
          <Button variant="outline" className="bg-white/80 border-outline-variant/40">
            <span className="material-symbols-outlined text-sm mr-2">download</span>
            Xuất danh sách
          </Button>
        }
      />

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="mb-6 p-4 bg-primary-fixed text-primary rounded-xl flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-4">
            <span className="font-bold">Đã chọn {selectedIds.length} sinh viên</span>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold"
              onClick={() => handleBulkReview('approve')}
              disabled={isUpdating}
            >
              Đồng ý hướng dẫn (Bulk)
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="bg-white border-error text-error hover:bg-error/10 font-bold"
              onClick={() => handleBulkReview('reject')}
              disabled={isUpdating}
            >
              Từ chối hướng dẫn (Bulk)
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg text-error">
          <p className="font-bold">Lỗi: {error}</p>
        </div>
      )}

      <FlowMetricGrid
        className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3"
        items={[
          { label: 'Tổng số sinh viên', value: `${stats.total}`, hint: 'Toàn bộ sinh viên bạn đang phụ trách.', accent: 'primary', icon: 'group' },
          { label: 'Đang thực hiện', value: `${stats.active}`, hint: 'Các đề tài còn đang triển khai.', accent: 'emerald', icon: 'check_circle' },
          { label: 'Đã bảo vệ', value: `${stats.defended}`, hint: 'Sinh viên đã hoàn tất bảo vệ.', accent: 'violet', icon: 'school' },
        ]}
      />

      {/* Search and Filter */}
      <Card className="bg-surface-container-lowest shadow-ambient-lg border-none mb-6">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined text-secondary absolute left-3 top-1/2 -translate-y-1/2">search</span>
              <input
                type="text"
                placeholder="Tìm kiếm theo tên hoặc mã sinh viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-container-low border-b border-outline-variant/15">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                      checked={selectedIds.length === filteredStudents.length && filteredStudents.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Sinh viên
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Mã SV
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Loại đề tài
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Tiến độ
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-secondary uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-secondary">
                      <span className="material-symbols-outlined text-4xl mb-2">group_off</span>
                      <p>Không tìm thấy sinh viên nào</p>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className={cn(
                      "transition-all border-b border-outline-variant/5",
                      selectedIds.includes(student.id) ? "bg-primary-fixed/5" : "hover:bg-surface-container-low/50"
                    )}>
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                          checked={selectedIds.includes(student.id)}
                          onChange={() => toggleSelect(student.id)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-fixed text-primary flex items-center justify-center text-xs font-bold">
                            {student.student_name.split(' ').pop()?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-on-surface">{student.student_name}</p>
                            <p className="text-xs text-secondary">{student.student_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-on-surface font-mono">{student.student_code}</span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={cn(
                          student.proposal_type === 'BCTT' 
                            ? "bg-amber-100 text-amber-700 border-amber-200" 
                            : "bg-indigo-100 text-indigo-700 border-indigo-200",
                          "font-bold"
                        )}>
                          {student.proposal_type === 'BCTT' ? 'Thực tập (BCTT)' : 'Khóa luận (KLTN)'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                student.progress_percentage > 80 ? "bg-emerald-500" :
                                student.progress_percentage > 40 ? "bg-primary" : "bg-amber-400"
                              )}
                              style={{ width: `${student.progress_percentage}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-on-surface w-8">
                            {student.progress_percentage}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={cn(
                          student.registration_status === 'approved' || student.registration_status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : student.registration_status === 'completed' || student.defense_status === 'completed'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        )}>
                          {student.registration_status === 'approved' || student.registration_status === 'active'
                            ? 'Đang hướng dẫn'
                            : student.registration_status === 'completed' || student.defense_status === 'completed'
                            ? 'Đã bảo vệ'
                            : 'Chờ duyệt'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-tertiary hover:bg-tertiary/10"
                            title="Tải lên báo cáo Turnitin"
                            onClick={() => router.push(`/lecturer/grading?student=${student.student_id}&action=turnitin`)}
                          >
                            <span className="material-symbols-outlined text-[18px]">verified_user</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-secondary hover:text-primary"
                            onClick={() => router.push(`/lecturer/grading?student=${student.student_id}`)}
                          >
                            <span className="material-symbols-outlined text-sm">grading</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-secondary hover:text-primary"
                            onClick={() => router.push(`/lecturer/feedback?student=${student.student_id}`)}
                          >
                            <span className="material-symbols-outlined text-sm">message</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </Shell>
  )
}

export default withLecturer(LecturerStudentsPage)
