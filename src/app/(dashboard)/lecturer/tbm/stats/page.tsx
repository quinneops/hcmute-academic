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

interface DeptStats {
  id: string
  student_name: string
  student_code: string
  type: 'BCTT' | 'KLTN'
  status: 'active' | 'completed' | 'failed'
  supervisor_name: string
  reviewer_name: string | null
  final_grade: number | null
}

function TbmStatsPage() {
  const { user } = useAuthUser()
  const [stats, setStats] = React.useState<DeptStats[]>([])
  const [summary, setSummary] = React.useState({ 
    total: 0, 
    bctt: 0, 
    kltn: 0, 
    active: 0, 
    completed: 0, 
    failed: 0, 
    avg_score: '0.00', 
    lecturer_count: 0 
  })
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchStats() {
      try {
        setIsLoading(true)
        const data = await api.lecturer.tbm.reports.department()
        setStats(data.registrations || [])
        setSummary(data.summary || summary)
      } catch (err: any) {
        setError(err.message || 'Không thể tải báo cáo')
      } finally {
        setIsLoading(false)
      }
    }
    fetchStats()
  }, [])

  const handleExport = () => {
    if (stats.length === 0) return
    
    const headers = ['MSSV', 'Student Name', 'Type', 'Status', 'Supervisor', 'Reviewer', 'Grade']
    const csvRows = stats.map(s => [
      s.student_code,
      s.student_name,
      s.type,
      s.status,
      s.supervisor_name,
      s.reviewer_name || 'N/A',
      s.final_grade || 'N/A'
    ].join(','))
    
    const csvContent = [headers.join(','), ...csvRows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `department_report_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isLoading) {
    return (
      <Shell role="lecturer" isTbm={true} user={{ name: '...', email: '...', avatar: '' }} breadcrumb={[{ label: 'TBM', href: '#' }, { label: 'Thống kê' }]}>
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
      breadcrumb={[{ label: 'Quản lý Bộ môn', href: '/lecturer' }, { label: 'Báo cáo & Thống kê' }]}
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-display-sm font-headline font-extrabold text-primary tracking-tight">
            Báo Cáo Học Thuật Bộ Môn
          </h2>
          <p className="text-body-md text-on-surface-variant font-medium">
            Thống kê tiến độ và kết quả bảo vệ của toàn bộ môn
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            className="bg-primary text-white font-bold gap-2"
            onClick={handleExport}
            disabled={stats.length === 0}
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Xuất Báo cáo (Excel)
          </Button>
          <Button variant="outline" className="border-secondary text-secondary gap-2">
            <span className="material-symbols-outlined text-sm">print</span>
            In Báo cáo
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Tổng Sinh viên', value: summary.total.toString(), icon: 'group', color: 'bg-primary-fixed text-primary' },
          { label: 'Đang hướng dẫn', value: summary.active.toString(), icon: 'pending_actions', color: 'bg-amber-100 text-amber-700' },
          { label: 'Đã hoàn thành', value: summary.completed.toString(), icon: 'check_circle', color: 'bg-emerald-100 text-emerald-700' },
          { label: 'Điểm TB Bộ môn', value: summary.avg_score, icon: 'analytics', color: 'bg-blue-100 text-blue-700' },
        ].map((stat, i) => (
          <Card key={i} className="bg-surface-container-lowest shadow-ambient-lg border-none">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-xl", stat.color)}>
                  <span className="material-symbols-outlined">{stat.icon}</span>
                </div>
                <div>
                  <p className="text-display-xs font-headline font-black text-on-surface">{stat.value}</p>
                  <p className="text-xs text-secondary font-bold uppercase">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Stats Table */}
      <Card className="bg-surface-container-lowest shadow-ambient-lg border-none">
        <CardHeader className="py-6 border-b border-outline-variant/10">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-bold font-headline text-primary">Danh sách Kết quả Sinh viên</CardTitle>
            <div className="flex gap-4">
               <input 
                 type="text" 
                 placeholder="Tìm kiếm sinh viên..." 
                 className="px-3 py-1.5 bg-surface-container-low border border-outline-variant/30 rounded-lg text-sm"
               />
               <select className="px-3 py-1.5 bg-surface-container-low border border-outline-variant/30 rounded-lg text-sm">
                 <option>Tất cả loại</option>
                 <option>KLTN</option>
                 <option>BCTT</option>
               </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-container-low/50 border-b border-outline-variant/10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-secondary uppercase">Sinh viên</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-secondary uppercase">Loại</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-secondary uppercase">GVHD</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-secondary uppercase">GVPB</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-secondary uppercase">Trạng thái</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-secondary uppercase">Điểm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {stats.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-container-low/30 transition-all">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-on-surface">{s.student_name}</p>
                      <p className="text-xs text-secondary font-mono">{s.student_code}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge className={s.type === 'KLTN' ? 'bg-primary-fixed/20 text-primary' : 'bg-blue-100 text-blue-700'}>
                        {s.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface">{s.supervisor_name}</td>
                    <td className="px-6 py-4 text-sm text-secondary italic">
                      {s.reviewer_name || <span className="text-slate-300">Chưa có</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge className={cn(
                        s.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        s.status === 'failed' ? 'bg-error-container text-error' :
                        'bg-amber-100 text-amber-700'
                      )}>
                        {s.status === 'completed' ? 'Đã hoàn thành' : s.status === 'failed' ? 'Cần thi lại' : 'Đang thực hiện'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-primary">
                      {s.final_grade?.toFixed(1) || '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </Shell>
  )
}

export default withLecturer(TbmStatsPage)
