'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useAdminReports } from '@/hooks/admin/use-admin-reports'
import { useAuth } from '@/hooks/use-auth'

export default function AdminReportsPage() {
  const { user } = useAuth()
  const {
    overview,
    thesisByStatus,
    registrationsByStatus,
    defensesByStatus,
    currentSemester,
    departmentStats,
    isLoading,
    error,
    fetchOverview,
  } = useAdminReports()

  const [reportType, setReportType] = React.useState<'all' | 'semester' | 'monthly' | 'annual'>('all')

  React.useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  // Mock reports data - would come from API in full implementation
  const mockReports = [
    { id: 1, name: `Báo cáo tổng kết ${currentSemester?.name || 'HK2 2024-2025'}`, type: 'semester' as const, generatedAt: '28/03/2025', downloads: 124, status: 'available' },
    { id: 2, name: 'Thống kê tiến độ khóa luận tháng 3', type: 'monthly' as const, generatedAt: '25/03/2025', downloads: 89, status: 'available' },
    { id: 3, name: 'Danh sách sinh viên bảo vệ tháng 3', type: 'defense' as const, generatedAt: '20/03/2025', downloads: 256, status: 'available' },
    { id: 4, name: 'Báo cáo chất lượng khóa luận 2024', type: 'annual' as const, generatedAt: '15/01/2025', downloads: 412, status: 'available' },
  ]

  const filteredReports = mockReports.filter(r => reportType === 'all' || r.type === reportType)

  const mockUser = {
    name: 'Admin User',
    email: 'admin@university.edu.vn',
    avatar: '',
  }

  return (
    <Shell
      role="admin"
      user={user ? { name: user.full_name || user.email, email: user.email, avatar: '' } : mockUser}
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/admin' }, { label: 'Báo cáo' }]}
      notifications={5}
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-display-sm font-headline font-extrabold text-primary tracking-tight">
            Báo Cáo & Thống Kê
          </h2>
          <p className="text-body-md text-on-surface-variant font-medium">
            Tổng hợp báo cáo và thống kê khóa luận tốt nghiệp
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-primary-fixed text-primary" onClick={() => fetchOverview()}>
            <span className="material-symbols-outlined text-sm mr-2">refresh</span>
            Làm mới
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-white shadow-glow-primary">
            <span className="material-symbols-outlined text-sm mr-2">add_chart</span>
            Tạo báo cáo mới
          </Button>
        </div>
      </div>

      {isLoading && !overview ? (
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
          {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <Card className="bg-surface-container-lowest border-l-4 border-primary shadow-ambient-lg">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-primary-fixed text-primary rounded-lg">
                <span className="material-symbols-outlined text-xl">group</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-headline-lg font-headline font-black text-on-surface">{overview?.totalStudents || 0}</div>
            <p className="text-label-md text-secondary mt-1">Sinh viên</p>
          </CardContent>
        </Card>

        <Card className="bg-surface-container-lowest border-l-4 border-blue-500 shadow-ambient-lg">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <span className="material-symbols-outlined text-xl">description</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-headline-lg font-headline font-black text-on-surface">{overview?.totalTheses || 0}</div>
            <p className="text-label-md text-secondary mt-1">Đề tài</p>
          </CardContent>
        </Card>

        <Card className="bg-surface-container-lowest border-l-4 border-purple-500 shadow-ambient-lg">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <span className="material-symbols-outlined text-xl">people</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-headline-lg font-headline font-black text-on-surface">{overview?.totalLecturers || 0}</div>
            <p className="text-label-md text-secondary mt-1">Giảng viên</p>
          </CardContent>
        </Card>

        <Card className="bg-surface-container-lowest border-l-4 border-emerald-500 shadow-ambient-lg">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <span className="material-symbols-outlined text-xl">assignment_turned_in</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-headline-lg font-headline font-black text-on-surface">{overview?.totalRegistrations || 0}</div>
            <p className="text-label-md text-secondary mt-1">Đăng ký</p>
          </CardContent>
        </Card>

        <Card className="bg-surface-container-lowest border-l-4 border-amber-500 shadow-ambient-lg">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <span className="material-symbols-outlined text-xl">security</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-headline-lg font-headline font-black text-on-surface">{overview?.totalDefenses || 0}</div>
            <p className="text-label-md text-secondary mt-1">Bảo vệ</p>
          </CardContent>
        </Card>
      </div>

      {currentSemester && (
        <div className="mb-6">
          <Badge className="bg-primary-fixed text-primary px-3 py-1">
            <span className="material-symbols-outlined text-sm mr-1">calendar_today</span>
            Học kỳ hiện tại: {currentSemester.name} ({currentSemester.academic_year})
          </Badge>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Reports List */}
        <div className="lg:col-span-2">
          <Card className="bg-surface-container-lowest shadow-ambient-lg border-none mb-8">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="font-headline font-bold text-primary text-lg">
                  Báo cáo đã tạo
                </CardTitle>
                <div className="flex gap-2">
                  {(['all', 'semester', 'monthly', 'annual'] as const).map((type) => (
                    <Button
                      key={type}
                      variant={reportType === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setReportType(type)}
                      className={reportType === type ? 'bg-primary text-white' : 'border-slate-200 text-secondary'}
                    >
                      {type === 'all' ? 'Tất cả' :
                       type === 'semester' ? 'Học kỳ' :
                       type === 'monthly' ? 'Tháng' : 'Năm'}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 bg-surface-container-low rounded-lg hover:bg-surface-container-low/80 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined">description</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-on-surface">{report.name}</h4>
                        <p className="text-xs text-secondary">Tạo: {report.generatedAt} • {report.downloads} lượt tải</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="border-primary-fixed text-primary">
                        <span className="material-symbols-outlined text-sm">download</span>
                      </Button>
                      <Button variant="outline" size="sm" className="border-slate-200 text-secondary">
                        <span className="material-symbols-outlined text-sm">visibility</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Department Stats */}
          <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
            <CardHeader>
              <CardTitle className="font-headline font-bold text-primary text-lg">
                Thống kê theo khoa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {departmentStats.map((dept) => (
                  <div key={dept.name} className="p-4 bg-surface-container-low rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-bold text-on-surface">{dept.name}</h4>
                      <div className="flex items-center gap-4 text-xs text-secondary">
                        <span>{dept.theses} đề tài</span>
                        <span>Điểm TB: {dept.avgScore}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-secondary w-16">Hoàn thành</span>
                      <Progress value={dept.completion} className="flex-1 h-2" indicatorClassName="bg-primary" />
                      <span className="text-xs font-bold text-primary w-10 text-right">{dept.completion}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Quick Actions */}
        <div>
          <Card className="bg-primary text-white shadow-xl shadow-primary/10 sticky top-24">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-4">Tạo báo cáo nhanh</h3>
              <div className="space-y-3">
                <Button className="w-full bg-white/10 hover:bg-white/20 text-white justify-start border border-white/20">
                  <span className="material-symbols-outlined text-sm mr-2">description</span>
                  Báo cáo học kỳ
                </Button>
                <Button className="w-full bg-white/10 hover:bg-white/20 text-white justify-start border border-white/20">
                  <span className="material-symbols-outlined text-sm mr-2">calendar_month</span>
                  Báo cáo tháng
                </Button>
                <Button className="w-full bg-white/10 hover:bg-white/20 text-white justify-start border border-white/20">
                  <span className="material-symbols-outlined text-sm mr-2">analytics</span>
                  Thống kê tiến độ
                </Button>
                <Button className="w-full bg-white/10 hover:bg-white/20 text-white justify-start border border-white/20">
                  <span className="material-symbols-outlined text-sm mr-2">grading</span>
                  Điểm trung bình
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
        </>
      )}
    </Shell>
  )
}
