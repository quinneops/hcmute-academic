'use client'

import * as React from 'react'
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
  thesis_title: string
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

  if (isLoading) {
    return (
      <Shell role="lecturer" user={{ name: '...', email: '...', avatar: '' }} breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Sinh viên' }]}>
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
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/lecturer' }, { label: 'Sinh viên' }]}
      notifications={0}
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-display-sm font-headline font-extrabold text-primary tracking-tight">
            Danh Sách Sinh Viên
          </h2>
          <p className="text-body-md text-on-surface-variant font-medium">
            Quản lý sinh viên đang hướng dẫn
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-primary-fixed text-primary">
            <span className="material-symbols-outlined text-sm mr-2">download</span>
            Xuất danh sách
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg text-error">
          <p className="font-bold">Lỗi: {error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-surface-container-lowest border-l-4 border-primary shadow-ambient-lg">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-primary-fixed text-primary rounded-lg">
                <span className="material-symbols-outlined text-xl">group</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-headline-lg font-headline font-black text-on-surface">{stats.total}</div>
            <p className="text-label-md text-secondary mt-1">Tổng số sinh viên</p>
          </CardContent>
        </Card>

        <Card className="bg-surface-container-lowest border-l-4 border-emerald-500 shadow-ambient-lg">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <span className="material-symbols-outlined text-xl">check_circle</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-headline-lg font-headline font-black text-on-surface">
              {stats.active}
            </div>
            <p className="text-label-md text-secondary mt-1">Đang thực hiện</p>
          </CardContent>
        </Card>

        <Card className="bg-surface-container-lowest border-l-4 border-blue-500 shadow-ambient-lg">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <span className="material-symbols-outlined text-xl">school</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-headline-lg font-headline font-black text-on-surface">
              {stats.defended}
            </div>
            <p className="text-label-md text-secondary mt-1">Đã bảo vệ</p>
          </CardContent>
        </Card>
      </div>

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
                  <th className="px-6 py-4 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Sinh viên
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Mã SV
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Đề tài
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Tiến độ
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Điểm
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
                    <tr key={student.id} className="hover:bg-surface-container-low/50 transition-all">
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
                        <span className="text-sm text-on-surface">{student.thesis_title || 'Chưa có'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${student.progress_percentage}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-on-surface w-8">
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
                            : 'bg-slate-100 text-slate-600'
                        )}>
                          {student.registration_status === 'approved' || student.registration_status === 'active'
                            ? 'Đang làm'
                            : student.registration_status === 'completed' || student.defense_status === 'completed'
                            ? 'Đã bảo vệ'
                            : 'Chờ duyệt'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        {student.final_score ? (
                          <div className="text-center">
                            <p className="text-sm font-bold text-primary">{student.final_score.toFixed(1)}</p>
                            {student.final_grade && (
                              <p className="text-[10px] text-secondary">{student.final_grade}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-secondary">Chưa có</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
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
