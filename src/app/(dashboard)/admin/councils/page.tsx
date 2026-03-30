'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAdminCouncils } from '@/hooks/admin/use-admin-councils'
import { useAuth } from '@/hooks/use-auth'

export default function AdminCouncilsPage() {
  const { user } = useAuth()
  const {
    councils,
    selectedCouncil,
    isLoading,
    error,
    fetchCouncils,
    selectCouncil,
  } = useAdminCouncils()

  React.useEffect(() => {
    fetchCouncils()
  }, [fetchCouncils])

  const currentCouncil = selectedCouncil || (councils.length > 0 ? councils[0] : null)

  const mockUser = {
    name: 'Admin User',
    email: 'admin@university.edu.vn',
    avatar: '',
  }

  return (
    <Shell
      role="admin"
      user={user ? { name: user.full_name || user.email, email: user.email, avatar: '' } : mockUser}
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/admin' }, { label: 'Hội đồng' }]}
      notifications={5}
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-display-sm font-headline font-extrabold text-primary tracking-tight">
            Quản Lý Hội Đồng
          </h2>
          <p className="text-body-md text-on-surface-variant font-medium">
            Quản lý hội đồng bảo vệ khóa luận tốt nghiệp
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-white shadow-glow-primary">
          <span className="material-symbols-outlined text-sm mr-2">add</span>
          Tạo hội đồng mới
        </Button>
      </div>

      {isLoading && councils.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="py-6">
            <p className="text-red-600 text-center">{error}</p>
          </CardContent>
        </Card>
      ) : councils.length === 0 ? (
        <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
          <CardContent className="py-12 text-center">
            <span className="material-symbols-outlined text-4xl text-secondary mb-4">groups</span>
            <p className="text-body-md text-secondary">Chưa có hội đồng nào</p>
            <p className="text-label-md text-secondary mt-2">Tạo hội đồng mới để bắt đầu</p>
          </CardContent>
        </Card>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Councils List */}
        <div className="lg:col-span-1">
          <Card className="bg-surface-container-lowest shadow-ambient-lg border-none sticky top-24">
            <CardHeader>
              <CardTitle className="font-headline font-bold text-primary text-lg">
                Danh sách hội đồng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {councils.map((council) => (
                <button
                  key={council.id}
                  onClick={() => selectCouncil(council)}
                  className={cn(
                    "w-full p-4 rounded-lg text-left transition-all border",
                    selectedCouncil?.id === council.id
                      ? 'bg-primary-fixed/20 border-primary'
                      : 'bg-surface-container-low hover:bg-surface-container-low/80 border-transparent'
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-bold text-on-surface">{council.name}</p>
                      <p className="text-xs text-secondary">{council.semester_id ? 'Học kỳ ' + council.semester_id : 'Chưa xác định'}</p>
                    </div>
                    <Badge className={cn(
                      council.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-amber-100 text-amber-700'
                    )}>
                      {council.status === 'active' ? 'Hoạt động' : 'Chờ lập'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-secondary">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">event</span>
                      {council.scheduled_at ? new Date(council.scheduled_at).toLocaleDateString('vi-VN') : 'Chưa xác định'}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">group</span>
                      {council.theses_count || 0} SV
                    </span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Council Detail */}
        <div className="lg:col-span-2">
          {currentCouncil ? (
          <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="font-headline font-bold text-primary text-xl">
                      {currentCouncil.name}
                    </CardTitle>
                    <Badge className={cn(
                      currentCouncil.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-amber-100 text-amber-700'
                    )}>
                      {currentCouncil.status === 'active' ? 'Đang hoạt động' : 'Chờ lập'}
                    </Badge>
                  </div>
                  <p className="text-sm text-secondary">Học kỳ {currentCouncil.semester_id}</p>
                </div>
                <Button variant="outline" className="border-primary-fixed text-primary">
                  <span className="material-symbols-outlined text-sm mr-2">edit</span>
                  Chỉnh sửa
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Info Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-surface-container-low rounded-lg text-center">
                  <p className="text-[10px] font-bold text-secondary uppercase mb-1">Ngày bảo vệ</p>
                  <p className="text-lg font-bold text-on-surface">
                    {currentCouncil.scheduled_at ? new Date(currentCouncil.scheduled_at).toLocaleDateString('vi-VN') : 'Chưa xác định'}
                  </p>
                </div>
                <div className="p-4 bg-surface-container-low rounded-lg text-center">
                  <p className="text-[10px] font-bold text-secondary uppercase mb-1">Địa điểm</p>
                  <p className="text-lg font-bold text-on-surface">{currentCouncil.room || 'Chưa xác định'}</p>
                </div>
                <div className="p-4 bg-surface-container-low rounded-lg text-center">
                  <p className="text-[10px] font-bold text-secondary uppercase mb-1">Số lượng</p>
                  <p className="text-lg font-bold text-on-surface">{currentCouncil.theses_count || 0} SV</p>
                </div>
                <div className="p-4 bg-surface-container-low rounded-lg text-center">
                  <p className="text-[10px] font-bold text-secondary uppercase mb-1">Thành viên</p>
                  <p className="text-lg font-bold text-on-surface">{currentCouncil.member_count || 0}</p>
                </div>
              </div>

              {/* Members List */}
              <div>
                <h4 className="text-sm font-bold text-secondary uppercase tracking-widest mb-4">
                  Thành viên hội đồng
                </h4>
                <div className="space-y-3">
                  {currentCouncil.chair_name ? (
                  <div className="p-4 bg-primary-fixed/20 rounded-lg border border-primary-fixed/30">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                          {currentCouncil.chair_name.split(' ').pop()?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">{currentCouncil.chair_name}</p>
                          <p className="text-xs text-secondary">Chủ tịch hội đồng</p>
                        </div>
                      </div>
                      <Badge className="bg-primary text-white text-[10px]">Chủ tịch</Badge>
                    </div>
                  </div>
                  ) : (
                    <p className="text-sm text-secondary text-center py-4">Chưa có chủ tịch</p>
                  )}

                  {currentCouncil.secretary_name ? (
                  <div className="p-4 bg-surface-container-low rounded-lg">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                          {currentCouncil.secretary_name.split(' ').pop()?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">{currentCouncil.secretary_name}</p>
                          <p className="text-xs text-secondary">Thư ký hội đồng</p>
                        </div>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 text-[10px]">Thư ký</Badge>
                    </div>
                  </div>
                  ) : (
                    <p className="text-sm text-secondary text-center py-4">Chưa có thư ký</p>
                  )}

                  {currentCouncil.member_count === 0 && !currentCouncil.chair_name && !currentCouncil.secretary_name && (
                    <p className="text-sm text-secondary text-center py-4">Chưa có thành viên nào</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-outline-variant/15">
                <Button className="bg-primary text-white">
                  <span className="material-symbols-outlined text-sm mr-2">assignment</span>
                  Phân công đề tài
                </Button>
                <Button variant="outline" className="border-primary-fixed text-primary">
                  <span className="material-symbols-outlined text-sm mr-2">print</span>
                  In quyết định
                </Button>
              </div>
            </CardContent>
          </Card>
          ) : (
            <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
              <CardContent className="py-12 text-center">
                <span className="material-symbols-outlined text-4xl text-secondary mb-4">assignment</span>
                <p className="text-body-md text-secondary">Chọn một hội đồng để xem chi tiết</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      )}
    </Shell>
  )
}
