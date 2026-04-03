'use client'

import * as React from 'react'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { withLecturer } from '@/hocs/with-role-check'
import { useAuthUser } from '@/hooks/use-auth-user'
import { api } from '@/lib/api/client'

interface LecturerSlots {
  id: string
  full_name: string
  email: string
  specialization: string | null
  bctt_slots: number
  kltn_slots: number
  current_bctt: number
  current_kltn: number
}

function TbmSlotsPage() {
  const { user } = useAuthUser()
  const [lecturers, setLecturers] = React.useState<LecturerSlots[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editValues, setEditValues] = React.useState({ bctt: 0, kltn: 0, spec: '' })

  React.useEffect(() => {
    async function fetchLecturers() {
      try {
        setIsLoading(true)
        const data = await api.lecturer.tbm.lecturers.list()
        setLecturers(data.lecturers || [])
      } catch (err: any) {
        console.error('Fetch lecturers error:', err)
        setError(err.message || 'Không thể tải danh lấy danh sách giảng viên')
      } finally {
        setIsLoading(false)
      }
    }
    fetchLecturers()
  }, [])

  const handleUpdate = async (id: string) => {
    try {
      await api.lecturer.tbm.lecturers.updateSlots(id, {
        bctt_slots: editValues.bctt,
        kltn_slots: editValues.kltn,
        specialization: editValues.spec
      })
      // Sync local state
      setLecturers(prev => prev.map(l => l.id === id ? { 
        ...l, 
        bctt_slots: editValues.bctt, 
        kltn_slots: editValues.kltn,
        specialization: editValues.spec
      } : l))
      setEditingId(null)
    } catch (err: any) {
      setError(err.message || 'Không thể cập nhật chỉ tiêu')
    }
  }

  if (isLoading) {
    return (
      <Shell role="lecturer" isTbm={true} user={{ name: '...', email: '...', avatar: '' }} breadcrumb={[{ label: 'TBM', href: '#' }, { label: 'Chỉ tiêu' }]}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell
      role="lecturer"
      isTbm={true}
      user={{ name: user?.full_name || 'TBM', email: user?.email || '...', avatar: user?.avatar_url || '' }}
      breadcrumb={[{ label: 'Quản lý Bộ môn', href: '/lecturer' }, { label: 'Quản lý Chỉ tiêu' }]}
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-display-sm font-headline font-extrabold text-primary tracking-tight">
            Phân Bổ Chỉ Tiêu Hướng Dẫn
          </h2>
          <p className="text-body-md text-on-surface-variant font-medium">
            Thiết lập số lượng sinh viên tối đa cho mỗi giảng viên (Học kỳ 2, 2024-2025)
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            className="bg-primary-fixed text-primary font-bold gap-2"
            onClick={() => {
              // Simulated import
              alert('Tính năng nhập dữ liệu từ Excel đang được khởi tạo...')
            }}
          >
            <span className="material-symbols-outlined text-sm">upload_file</span>
            Nhập danh sách GV
          </Button>
        </div>
      </div>

      <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-container-low border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-secondary uppercase tracking-wider">Giảng viên</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-secondary uppercase tracking-wider">Chuyên môn</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-secondary uppercase tracking-wider">Slots BCTT (Thực tập)</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-secondary uppercase tracking-wider">Slots KLTN (Khóa luận)</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-secondary uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {lecturers.map((lecturer) => (
                  <tr key={lecturer.id} className="hover:bg-surface-container-low/30 transition-all">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-fixed text-primary flex items-center justify-center text-xs font-bold">
                          {lecturer.full_name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">{lecturer.full_name}</p>
                          <p className="text-xs text-secondary">{lecturer.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface">
                      {editingId === lecturer.id ? (
                        <textarea 
                          value={editValues.spec}
                          onChange={(e) => setEditValues(v => ({ ...v, spec: e.target.value }))}
                          className="w-[300px] lg:w-[400px] p-2 border border-slate-300 rounded-lg resize-y min-h-[100px] text-sm focus:ring-2 focus:ring-primary shadow-sm"
                          placeholder="Nhập chuyên môn..."
                        />
                      ) : (
                        <div className="whitespace-pre-wrap max-w-[300px] lg:max-w-[400px] text-justify text-slate-700">{lecturer.specialization || <span className="text-slate-300 italic">Chưa đăng ký chuyên môn</span>}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {editingId === lecturer.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <input 
                            type="number"
                            value={editValues.bctt}
                            onChange={(e) => setEditValues(v => ({ ...v, bctt: parseInt(e.target.value) }))}
                            className="w-16 p-1 border rounded text-center"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-on-surface">{lecturer.current_bctt}/{lecturer.bctt_slots}</span>
                          <div className="w-16 h-1 bg-slate-100 rounded-full mt-1">
                            <div 
                              className="h-full bg-blue-500 rounded-full" 
                              style={{ width: `${Math.min(100, (lecturer.current_bctt / lecturer.bctt_slots) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {editingId === lecturer.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <input 
                            type="number"
                            value={editValues.kltn}
                            onChange={(e) => setEditValues(v => ({ ...v, kltn: parseInt(e.target.value) }))}
                            className="w-16 p-1 border rounded text-center"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-on-surface">{lecturer.current_kltn}/{lecturer.kltn_slots}</span>
                          <div className="w-16 h-1 bg-slate-100 rounded-full mt-1">
                            <div 
                              className="h-full bg-primary rounded-full" 
                              style={{ width: `${Math.min(100, (lecturer.current_kltn / lecturer.kltn_slots) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {editingId === lecturer.id ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" className="bg-emerald-600 text-white" onClick={() => handleUpdate(lecturer.id)}>Lưu</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Hủy</Button>
                        </div>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-primary"
                          onClick={() => {
                            setEditingId(lecturer.id)
                            setEditValues({ bctt: lecturer.bctt_slots, kltn: lecturer.kltn_slots, spec: lecturer.specialization || '' })
                          }}
                        >
                          <span className="material-symbols-outlined text-sm mr-1">edit</span>
                          Sửa
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="fixed bottom-4 right-4 p-4 bg-error-container text-error rounded-lg flex items-center gap-3 shadow-lg">
          <span className="material-symbols-outlined">error</span>
          <p className="text-sm">{error}</p>
        </div>
      )}
    </Shell>
  )
}

export default withLecturer(TbmSlotsPage)
