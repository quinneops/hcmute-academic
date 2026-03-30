'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useAdminSemesters } from '@/hooks/admin/use-admin-semesters'
import { useAuth } from '@/hooks/use-auth'

export default function AdminSemestersPage() {
  const { user } = useAuth()
  const {
    semesters,
    currentSemester,
    isLoading,
    error,
    fetchSemesters,
    createSemester,
    updateSemester,
    deleteSemester,
  } = useAdminSemesters()

  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [selectedSemester, setSelectedSemester] = React.useState<any>(null)
  const [includeArchived, setIncludeArchived] = React.useState(false)

  const [formData, setFormData] = React.useState({
    name: '',
    academic_year: '',
    semester_number: 1,
    start_date: '',
    end_date: '',
    registration_start: '',
    registration_end: '',
    is_current: false,
  })

  React.useEffect(() => {
    fetchSemesters(includeArchived)
  }, [fetchSemesters, includeArchived])

  const resetForm = () => {
    setFormData({
      name: '',
      academic_year: '',
      semester_number: 1,
      start_date: '',
      end_date: '',
      registration_start: '',
      registration_end: '',
      is_current: false,
    })
  }

  const handleCreate = async () => {
    try {
      await createSemester(formData)
      resetForm()
      setIsCreateOpen(false)
    } catch (err) {
      console.error('Failed to create semester:', err)
    }
  }

  const handleEdit = async () => {
    if (!selectedSemester) return
    try {
      await updateSemester(selectedSemester.id, formData)
      resetForm()
      setSelectedSemester(null)
      setIsEditOpen(false)
    } catch (err) {
      console.error('Failed to update semester:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa học kỳ này?')) return
    try {
      await deleteSemester(id)
    } catch (err) {
      console.error('Failed to delete semester:', err)
      alert('Không thể xóa học kỳ đã có dữ liệu')
    }
  }

  const openEdit = (semester: any) => {
    setSelectedSemester(semester)
    setFormData({
      name: semester.name,
      academic_year: semester.academic_year,
      semester_number: semester.semester_number,
      start_date: semester.start_date,
      end_date: semester.end_date,
      registration_start: semester.registration_start || '',
      registration_end: semester.registration_end || '',
      is_current: semester.is_current,
    })
    setIsEditOpen(true)
  }

  return (
    <Shell
      role="admin"
      user={user ? { name: user.full_name || user.email, email: user.email, avatar: '' } : { name: 'Loading...', email: '', avatar: '' }}
      breadcrumb={[{ label: 'Bảng điều khiển', href: '/admin' }, { label: 'Học kỳ' }]}
      notifications={5}
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-display-sm font-headline font-extrabold text-primary tracking-tight">
            Quản Lý Học Kỳ
          </h2>
          <p className="text-body-md text-on-surface-variant font-medium">
            Quản lý học kỳ academic year
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={includeArchived}
              onCheckedChange={setIncludeArchived}
              id="include-archived"
            />
            <Label htmlFor="include-archived" className="text-sm">Bao gồm đã lưu trữ</Label>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white shadow-glow-primary">
                <span className="material-symbols-outlined text-sm mr-2">add</span>
                Tạo học kỳ
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Tạo học kỳ mới</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Tên học kỳ</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="HK2 2024-2025"
                  />
                </div>
                <div>
                  <Label htmlFor="academic_year">Năm học</Label>
                  <Input
                    id="academic_year"
                    value={formData.academic_year}
                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    placeholder="2024-2025"
                  />
                </div>
                <div>
                  <Label htmlFor="semester_number">Số học kỳ</Label>
                  <Input
                    id="semester_number"
                    type="number"
                    value={formData.semester_number}
                    onChange={(e) => setFormData({ ...formData, semester_number: parseInt(e.target.value) })}
                    min="1"
                    max="3"
                  />
                </div>
                <div>
                  <Label htmlFor="start_date">Ngày bắt đầu</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">Ngày kết thúc</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="registration_start">Bắt đầu đăng ký</Label>
                  <Input
                    id="registration_start"
                    type="date"
                    value={formData.registration_start}
                    onChange={(e) => setFormData({ ...formData, registration_start: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="registration_end">Kết thúc đăng ký</Label>
                  <Input
                    id="registration_end"
                    type="date"
                    value={formData.registration_end}
                    onChange={(e) => setFormData({ ...formData, registration_end: e.target.value })}
                  />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <Switch
                    id="is_current"
                    checked={formData.is_current}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_current: checked })}
                  />
                  <Label htmlFor="is_current">Đặt làm học kỳ hiện tại</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
                <Button onClick={handleCreate}>Tạo học kỳ</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading && semesters.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="py-6">
            <p className="text-red-600 text-center">{error}</p>
          </CardContent>
        </Card>
      ) : semesters.length === 0 ? (
        <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
          <CardContent className="py-12 text-center">
            <span className="material-symbols-outlined text-4xl text-secondary mb-4">calendar_month</span>
            <p className="text-body-md text-secondary">Chưa có học kỳ nào</p>
            <p className="text-label-md text-secondary mt-2">Tạo học kỳ mới để bắt đầu</p>
          </CardContent>
        </Card>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {semesters.map((semester) => (
          <Card
            key={semester.id}
            className={cn(
              "bg-surface-container-lowest shadow-ambient-lg border-2 transition-all hover:shadow-xl",
              semester.is_current ? 'border-primary border-dashed' : 'border-transparent'
            )}
          >
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-title-md font-headline font-bold text-on-surface">
                    {semester.name}
                  </h3>
                  <p className="text-sm text-secondary mt-1">{semester.academic_year}</p>
                </div>
                {semester.is_current && (
                  <Badge className="bg-primary text-white">Hiện tại</Badge>
                )}
              </div>

              <div className="space-y-2 text-sm text-secondary mb-4">
                <div className="flex justify-between">
                  <span>Bắt đầu:</span>
                  <span className="font-medium text-on-surface">
                    {new Date(semester.start_date).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Kết thúc:</span>
                  <span className="font-medium text-on-surface">
                    {new Date(semester.end_date).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                {semester.registration_start && (
                  <div className="flex justify-between">
                    <span>Đăng ký:</span>
                    <span className="font-medium text-on-surface">
                      {new Date(semester.registration_start).toLocaleDateString('vi-VN')} - {new Date(semester.registration_end || semester.end_date).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mb-4">
                <Badge variant={semester.is_active ? 'default' : 'secondary'} className={
                  semester.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }>
                  {semester.is_active ? 'Đang hoạt động' : 'Đã lưu trữ'}
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-primary-fixed text-primary"
                  onClick={() => openEdit(semester)}
                >
                  <span className="material-symbols-outlined text-sm mr-1">edit</span>
                  Sửa
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-red-200 text-red-600"
                  onClick={() => handleDelete(semester.id)}
                >
                  <span className="material-symbols-outlined text-sm mr-1">delete</span>
                  Xóa
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa học kỳ</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <Label htmlFor="edit-name">Tên học kỳ</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-academic_year">Năm học</Label>
              <Input
                id="edit-academic_year"
                value={formData.academic_year}
                onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-semester_number">Số học kỳ</Label>
              <Input
                id="edit-semester_number"
                type="number"
                value={formData.semester_number}
                onChange={(e) => setFormData({ ...formData, semester_number: parseInt(e.target.value) })}
                min="1"
                max="3"
              />
            </div>
            <div>
              <Label htmlFor="edit-start_date">Ngày bắt đầu</Label>
              <Input
                id="edit-start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-end_date">Ngày kết thúc</Label>
              <Input
                id="edit-end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-registration_start">Bắt đầu đăng ký</Label>
              <Input
                id="edit-registration_start"
                type="date"
                value={formData.registration_start}
                onChange={(e) => setFormData({ ...formData, registration_start: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-registration_end">Kết thúc đăng ký</Label>
              <Input
                id="edit-registration_end"
                type="date"
                value={formData.registration_end}
                onChange={(e) => setFormData({ ...formData, registration_end: e.target.value })}
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Switch
                id="edit-is_current"
                checked={formData.is_current}
                onCheckedChange={(checked) => setFormData({ ...formData, is_current: checked })}
              />
              <Label htmlFor="edit-is_current">Đặt làm học kỳ hiện tại</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Hủy</Button>
            <Button onClick={handleEdit}>Lưu thay đổi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  )
}
