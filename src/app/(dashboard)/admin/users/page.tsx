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
import { useAuthUser } from '@/hooks/use-auth-user'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  full_name: string | null
  role: 'student' | 'lecturer' | 'admin'
  student_code?: string | null
  faculty?: string | null
  department?: string | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
}

interface UserStats {
  total: number
  students: number
  lecturers: number
  admins: number
  active: number
}

export default function AdminUsersPage() {
  const router = useRouter()
  const { user } = useAuthUser()
  const [users, setUsers] = React.useState<User[]>([])
  const [stats, setStats] = React.useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState<'all' | 'student' | 'lecturer' | 'admin'>('all')
  const [pagination, setPagination] = React.useState({ page: 1, limit: 20, total: 0 })

  const fetchUsers = React.useCallback(async (
    page = 1,
    limit = 20,
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const filters: any = {}
      if (roleFilter !== 'all') filters.role = roleFilter
      if (searchTerm) filters.search = searchTerm

      const data = await api.admin.users.list(page, limit, filters)
      setUsers(data.users || [])
      setStats(data.stats)
      setPagination({
        page: data.page || page,
        limit: data.limit || limit,
        total: data.total || 0,
      })
    } catch (err: any) {
      console.error('Users fetch error:', err)
      setError(err.message || 'Không thể tải danh sách người dùng')
    } finally {
      setIsLoading(false)
    }
  }, [roleFilter, searchTerm])

  React.useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const filteredUsers = users

  const mockUser = {
    name: user?.full_name || 'Quản trị viên',
    email: user?.email || 'admin@ute.edu.vn',
    avatar: user?.avatar_url || '',
  }

  const formatLastLogin = (lastLoginAt: string | null): string => {
    if (!lastLoginAt) return 'Chưa bao giờ'
    const date = new Date(lastLoginAt)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (hours < 1) return 'Hiện tại'
    if (hours < 24) return `${hours} giờ trước`
    if (hours < 24 * 7) return `${Math.floor(hours / 24)} ngày trước`
    return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' })
  }

  if (isLoading) {
    return (
      <Shell
        role="admin"
        user={{ name: '...', email: '...', avatar: '' }}
        breadcrumb={[{ label: 'Bảng điều khiển', href: '/admin' }, { label: 'Người dùng' }]}
        notifications={5}
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell
      role="admin"
      user={mockUser}
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/admin' }, { label: 'Người dùng' }]}
      notifications={5}
    >
      <FlowPageIntro
        eyebrow="Admin / users"
        title="Quản lý người dùng"
        description="Quản lý tài khoản sinh viên, giảng viên và quản trị viên với bộ lọc, thống kê và tác vụ chính trong cùng một layout nhất quán."
        actions={
          <>
            <Button variant="outline" className="bg-white/80 border-outline-variant/40">
              <span className="material-symbols-outlined text-sm mr-2">download</span>
              Xuất danh sách
            </Button>
            <Button onClick={() => router.push('/admin/users/import')}>
              <span className="material-symbols-outlined text-sm mr-2">person_add</span>
              Thêm người dùng
            </Button>
          </>
        }
      />

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg text-error">
          <p className="font-bold">Lỗi: {error}</p>
        </div>
      )}

      <FlowMetricGrid
        className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4"
        items={[
          { label: 'Sinh viên', value: `${stats?.students ?? 0}`, hint: 'Tài khoản sinh viên trong hệ thống.', accent: 'primary', icon: 'group' },
          { label: 'Giảng viên', value: `${stats?.lecturers ?? 0}`, hint: 'Tài khoản giảng viên hiện có.', accent: 'violet', icon: 'menu_book' },
          { label: 'Quản trị', value: `${stats?.admins ?? 0}`, hint: 'Tài khoản quản trị viên.', accent: 'emerald', icon: 'admin_panel_settings' },
          { label: 'Đang hoạt động', value: `${stats?.active ?? 0}`, hint: 'Người dùng đang active.', accent: 'amber', icon: 'check_circle' },
        ]}
      />

      {/* Filters */}
      <Card className="bg-surface-container-lowest shadow-ambient-lg border-none mb-6">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined text-secondary absolute left-3 top-1/2 -translate-y-1/2">search</span>
              <input
                type="text"
                placeholder="Tìm kiếm theo tên hoặc email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'student', 'lecturer', 'admin'] as const).map((role) => (
                <Button
                  key={role}
                  variant={roleFilter === role ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setRoleFilter(role); setTimeout(() => fetchUsers(1, 20), 0) }}
                  className={roleFilter === role ? 'bg-primary text-white' : 'border-slate-200 text-secondary capitalize'}
                >
                  {role === 'all' ? 'Tất cả' : role === 'lecturer' ? 'Giảng viên' : role === 'admin' ? 'Quản trị' : 'Sinh viên'}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-container-low border-b border-outline-variant/15">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Người dùng
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Vai trò
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Khoa
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Lần cuối
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-secondary uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-secondary">
                      <span className="material-symbols-outlined text-4xl mb-2">group_off</span>
                      <p>Không tìm thấy người dùng nào</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-surface-container-low/50 transition-all">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center text-sm font-bold">
                            {(user.full_name || user.email).split(' ').pop()?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-on-surface">{user.full_name || user.email}</p>
                            <p className="text-xs text-secondary">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={cn(
                          user.role === 'student' ? 'bg-blue-100 text-blue-700' :
                          user.role === 'lecturer' ? 'bg-purple-100 text-purple-700' :
                          'bg-emerald-100 text-emerald-700'
                        )}>
                          {user.role === 'student' ? 'Sinh viên' :
                           user.role === 'lecturer' ? 'Giảng viên' : 'Quản trị'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-on-surface">{user.faculty || user.department || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={cn(
                          user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        )}>
                          {user.is_active ? 'Hoạt động' : 'Khóa'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-secondary">{formatLastLogin(user.last_login_at)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" className="text-secondary hover:text-primary" onClick={() => router.push(`/admin/users/${user.id}`)}>
                            <span className="material-symbols-outlined text-sm">visibility</span>
                          </Button>
                          <Button variant="ghost" size="sm" className="text-secondary hover:text-primary">
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-secondary hover:text-error"
                            onClick={async () => {
                              if (confirm(`Xóa người dùng ${user.email}?`)) {
                                try {
                                  await api.admin.users.delete(user.id)
                                  fetchUsers()
                                } catch (err: any) {
                                  alert(err.message)
                                }
                              }
                            }}
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
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
