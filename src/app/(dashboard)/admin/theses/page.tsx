'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useAdminTheses } from '@/hooks/admin/use-admin-theses'
import { useAuth } from '@/hooks/use-auth'

export default function AdminThesesPage() {
  const { user } = useAuth()
  const {
    theses,
    stats,
    isLoading,
    error,
    fetchTheses,
  } = useAdminTheses()

  const [searchTerm, setSearchTerm] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'draft' | 'pending' | 'approved' | 'active' | 'completed' | 'rejected'>('all')

  const mockUser = {
    name: 'Admin User',
    email: 'admin@university.edu.vn',
    avatar: '',
  }

  React.useEffect(() => {
    fetchTheses()
  }, [fetchTheses])

  const filteredTheses = theses.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.students.some(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            s.code?.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <Shell
      role="admin"
      user={user ? { name: user.full_name || user.email, email: user.email, avatar: '' } : mockUser}
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/admin' }, { label: 'Khóa luận' }]}
      notifications={5}
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-display-sm font-headline font-extrabold text-primary tracking-tight">
            Quản Lý Khóa Luận
          </h2>
          <p className="text-body-md text-on-surface-variant font-medium">
            Theo dõi và quản lý tất cả khóa luận tốt nghiệp
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-primary-fixed text-primary">
            <span className="material-symbols-outlined text-sm mr-2">download</span>
            Xuất báo cáo
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-white shadow-glow-primary">
            <span className="material-symbols-outlined text-sm mr-2">add</span>
            Tạo khóa luận mới
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-surface-container-lowest border-l-4 border-primary shadow-ambient-lg">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-primary-fixed text-primary rounded-lg">
                <span className="material-symbols-outlined text-xl">description</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-headline-lg font-headline font-black text-on-surface">{stats.total}</div>
            <p className="text-label-md text-secondary mt-1">Tổng số</p>
          </CardContent>
        </Card>

        <Card className="bg-surface-container-lowest border-l-4 border-blue-500 shadow-ambient-lg">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <span className="material-symbols-outlined text-xl">schedule</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-headline-lg font-headline font-black text-on-surface">
              {stats.inProgress}
            </div>
            <p className="text-label-md text-secondary mt-1">Đang làm</p>
          </CardContent>
        </Card>

        <Card className="bg-surface-container-lowest border-l-4 border-amber-500 shadow-ambient-lg">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <span className="material-symbols-outlined text-xl">pending_actions</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-headline-lg font-headline font-black text-on-surface">
              {stats.pendingReview}
            </div>
            <p className="text-label-md text-secondary mt-1">Chờ duyệt</p>
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
              {stats.completed}
            </div>
            <p className="text-label-md text-secondary mt-1">Hoàn thành</p>
          </CardContent>
        </Card>
      </div>

      {isLoading && theses.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="py-6">
            <p className="text-red-600 text-center">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters */}
          <Card className="bg-surface-container-lowest shadow-ambient-lg border-none mb-6">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <span className="material-symbols-outlined text-secondary absolute left-3 top-1/2 -translate-y-1/2">search</span>
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tên đề tài hoặc sinh viên..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex gap-2">
                  {(['all', 'draft', 'pending', 'approved', 'active', 'completed', 'rejected'] as const).map((status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter(status)}
                      className={statusFilter === status ? 'bg-primary text-white' : 'border-slate-200 text-secondary'}
                    >
                      {status === 'all' ? 'Tất cả' :
                       status === 'draft' ? 'Nháp' :
                       status === 'pending' ? 'Chờ duyệt' :
                       status === 'approved' ? 'Đã duyệt' :
                       status === 'active' ? 'Đang làm' :
                       status === 'completed' ? 'Hoàn thành' : 'Từ chối'}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Theses List */}
          <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
            <CardContent className="p-0">
              <div className="space-y-4 divide-y divide-outline-variant/10">
                {filteredTheses.length === 0 ? (
                  <div className="py-12 text-center">
                    <span className="material-symbols-outlined text-4xl text-secondary mb-4">description</span>
                    <p className="text-body-md text-secondary">Không tìm thấy khóa luận nào</p>
                  </div>
                ) : (
                  filteredTheses.map((thesis) => (
                    <div key={thesis.id} className="p-6 hover:bg-surface-container-low/50 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-title-md font-headline font-bold text-on-surface">
                              {thesis.title}
                            </h3>
                            <Badge className={cn(
                              thesis.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                              thesis.status === 'active' || thesis.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                              thesis.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              thesis.status === 'draft' ? 'bg-slate-100 text-slate-600' :
                              'bg-red-100 text-red-700'
                            )}>
                              {thesis.status === 'completed' ? 'Hoàn thành' :
                               thesis.status === 'active' || thesis.status === 'approved' ? 'Đang làm' :
                               thesis.status === 'pending' ? 'Chờ duyệt' :
                               thesis.status === 'draft' ? 'Nháp' : 'Từ chối'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-secondary">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">person</span>
                              {thesis.students.map(s => s.name || s.code).join(', ') || 'Chưa có sinh viên'}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">menu_book</span>
                              GVHD: {thesis.supervisor?.full_name || 'Chưa xác định'}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">calendar_today</span>
                              {thesis.semester?.name || thesis.semester_id}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="border-primary-fixed text-primary">
                            <span className="material-symbols-outlined text-sm">visibility</span>
                          </Button>
                          <Button variant="outline" size="sm" className="border-primary-fixed text-primary">
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Progress value={thesis.progress} className="flex-1 h-2" indicatorClassName={cn(
                          thesis.progress === 100 ? 'bg-emerald-500' : 'bg-primary'
                        )} />
                        <span className="text-sm font-bold text-on-surface w-12 text-right">{thesis.progress}%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </Shell>
  )
}
