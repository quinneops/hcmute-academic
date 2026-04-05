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
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Sector,
  AreaChart, Area
} from 'recharts'

interface DeptStats {
  id: string
  student_name: string
  student_code: string
  type: 'BCTT' | 'KLTN'
  status: 'active' | 'completed' | 'failed'
  supervisor_name: string
  reviewer_name: string | null
  final_grade: number | null
  post_defense_edit_status?: string | null
}

function TbmStatsPage() {
  const { user } = useAuthUser()
  const [stats, setStats] = React.useState<DeptStats[]>([])
  const [summary, setSummary] = React.useState<any>({ 
    total: 0, 
    bctt: 0, 
    kltn: 0, 
    active: 0, 
    completed: 0, 
    failed: 0, 
    avg_score: '0.00', 
    lecturer_count: 0,
    grade_distribution: [],
    lecturer_workload: [],
    round_distribution: []
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
        setError(err.message || 'Lỗi tải báo cáo')
      } finally {
        setIsLoading(false)
      }
    }
    fetchStats()
  }, [])

  const handleExport = () => {
    if (stats.length === 0) return
    
    const headers = ['MSSV', 'Student Name', 'Type', 'Status', 'Supervisor', 'Reviewer', 'Grade', 'Post Defense Status']
    const csvRows = stats.map(s => [
      s.student_code,
      s.student_name,
      s.type,
      s.status,
      s.supervisor_name,
      s.reviewer_name || 'N/A',
      s.final_grade || 'N/A',
      s.post_defense_edit_status || 'N/A'
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
      <Shell 
        role="lecturer" 
        isTbm={true} 
        user={{ 
          name: '...', 
          email: '...', 
          avatar: '',
          is_tbm: user?.is_tbm,
          is_secretary: user?.is_secretary
        }} 
        breadcrumb={[{ label: 'TBM', href: '#' }, { label: 'Thống kê' }]}
      >
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
      user={{ 
        name: user?.full_name || 'Giảng viên', 
        email: user?.email || '...', 
        avatar: user?.avatar_url || '',
        is_tbm: user?.is_tbm,
        is_secretary: user?.is_secretary
      }}
      breadcrumb={[{ label: 'TBM', href: '#' }, { label: 'Thống kê' }]}
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
            className="bg-[#002068] text-white font-bold gap-2 px-6 rounded-xl shadow-lg border-none"
            onClick={handleExport}
            disabled={stats.length === 0}
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Xuất Báo cáo (Excel)
          </Button>
        </div>
      </div>

      {/* Quick Insights Banner */}
      <div className="mb-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 bg-gradient-to-br from-[#002068] to-blue-900 border-none rounded-[2rem] shadow-ambient-lg overflow-hidden group">
          <CardContent className="p-10 relative">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32 blur-3xl group-hover:bg-white/10 transition-all duration-1000" />
             <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                <div className="bg-white/10 backdrop-blur-md w-24 h-24 rounded-3xl flex items-center justify-center border border-white/20 shadow-inner group-hover:rotate-6 transition-transform duration-500">
                   <span className="material-symbols-outlined text-5xl text-white">auto_awesome</span>
                </div>
                <div>
                   <h3 className="text-white text-2xl font-black font-headline tracking-tight uppercase mb-2">NHẬN ĐỊNH BỘ MÔN (AI)</h3>
                   <p className="text-blue-100/80 font-medium text-sm leading-relaxed max-w-xl italic">
                     "Hệ thống ghi nhận tỷ lệ hoàn thành đạt {((summary.completed/summary.total)*100).toFixed(0)}%. Điểm trung bình bộ môn đang ổn định ở mức {summary.avg_score}. Khối lượng công việc đang tập trung nhiều vào tốp 5 giảng viên hướng dẫn."
                   </p>
                </div>
             </div>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-[2rem] border-none shadow-ambient-lg overflow-hidden relative group">
           <div className="absolute top-0 right-0 p-4">
              <span className="material-symbols-outlined text-slate-100 text-6xl group-hover:scale-110 group-hover:text-amber-50 transition-all duration-500">star</span>
           </div>
           <CardContent className="p-10">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ĐIỂM TRUNG BÌNH</p>
              <h3 className="text-6xl font-black text-[#002068] tracking-tighter mb-2">{summary.avg_score}</h3>
              <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-tight">
                 <span className="material-symbols-outlined text-[14px]">trending_up</span>
                 Tăng 0.4 so với kỳ trước
              </div>
           </CardContent>
        </Card>
      </div>

      {/* Primary Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Chart 1: Grade Distribution */}
        <Card className="bg-white rounded-[2.5rem] border-none shadow-ambient-lg overflow-hidden flex flex-col">
           <CardHeader className="px-10 pt-10 pb-0">
              <CardTitle className="text-lg font-black font-headline text-[#002068] uppercase tracking-tight">Phổ điểm Bộ môn</CardTitle>
              <CardDescription className="text-slate-400 font-medium">Tỷ lệ sinh viên theo các khung điểm (A, B, C, D)</CardDescription>
           </CardHeader>
           <CardContent className="p-6 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={summary.grade_distribution} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 800 }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={50}>
                       {summary.grade_distribution.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                       ))}
                    </Bar>
                 </BarChart>
              </ResponsiveContainer>
           </CardContent>
        </Card>

        {/* Chart 2: Lecturer Workload */}
        <Card className="bg-white rounded-[2.5rem] border-none shadow-ambient-lg overflow-hidden flex flex-col">
           <CardHeader className="px-10 pt-10 pb-0 border-none">
              <CardTitle className="text-lg font-black font-headline text-[#002068] uppercase tracking-tight">Tải trọng Giảng viên</CardTitle>
              <CardDescription className="text-slate-400 font-medium">Số lượng đề tài hướng dẫn trên từng giảng viên</CardDescription>
           </CardHeader>
           <CardContent className="p-6 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={summary.lecturer_workload} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700 }} width={80} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 800 }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={20} />
                 </BarChart>
              </ResponsiveContainer>
           </CardContent>
        </Card>

        {/* Chart 3: Progress Funnel (Full Width below) */}
        <Card className="lg:col-span-2 bg-white rounded-[2.5rem] border-none shadow-ambient-lg overflow-hidden">
           <CardHeader className="px-10 pt-10 pb-2">
              <CardTitle className="text-lg font-black font-headline text-[#002068] uppercase tracking-tight">Tiến độ theo Vòng (Pipeline)</CardTitle>
              <CardDescription className="text-slate-400 font-medium">Phân bổ sinh viên theo các giai đoạn thực hiện đề tài</CardDescription>
           </CardHeader>
           <CardContent className="px-6 pb-6 h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={summary.round_distribution} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                       <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#002068" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#002068" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <XAxis dataKey="round" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 800 }} />
                    <Area type="monotone" dataKey="count" stroke="#002068" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                 </AreaChart>
              </ResponsiveContainer>
           </CardContent>
        </Card>
      </div>

      {/* Summary Stats Grid (Mini) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Tổng Đề tài', value: summary.total.toString(), icon: 'rocket_launch', color: 'bg-indigo-50 text-indigo-600' },
          { label: 'BCTT/KLTN', value: `${summary.bctt}/${summary.kltn}`, icon: 'folder_open', color: 'bg-blue-50 text-blue-600' },
          { label: 'Đã hoàn tất', value: summary.completed.toString(), icon: 'verified', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Tỉ trọng GVPB', value: `${summary.lecturer_count} GV`, icon: 'person_search', color: 'bg-violet-50 text-violet-600' },
        ].map((stat, i) => (
          <Card key={i} className="bg-white border-none shadow-ambient-sm rounded-[1.5rem] hover:translate-y-[-4px] transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center gap-3">
                <div className={cn("p-3 rounded-2xl", stat.color)}>
                  <span className="material-symbols-outlined">{stat.icon}</span>
                </div>
                <div>
                  <p className="text-2xl font-black font-headline text-on-surface tracking-tighter">{stat.value}</p>
                  <p className="text-[10px] text-secondary font-black uppercase tracking-widest">{stat.label}</p>
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
                  <th className="px-6 py-4 text-center text-xs font-bold text-secondary uppercase">Sau BV</th>
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
                    <td className="px-6 py-4 text-center">
                      {s.post_defense_edit_status ? (
                        <Badge className={cn(
                          s.post_defense_edit_status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          s.post_defense_edit_status === 'rejected' ? 'bg-error-container text-error' :
                          'bg-amber-100 text-amber-700'
                        )}>
                          {s.post_defense_edit_status === 'approved' ? 'Hoàn tất' : s.post_defense_edit_status === 'rejected' ? 'Yêu cầu lại' : 'Đang sửa'}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-300 italic">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-[#002068]">
                      {s.final_grade ? s.final_grade.toFixed(1) : <span className="text-slate-300">--</span>}
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
