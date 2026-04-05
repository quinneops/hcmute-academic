'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthUser } from '@/hooks/use-auth-user'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface GradingRow {
  submission_id: string
  registration_id: string
  student_code: string
  student_name: string
  scores: {
    slide: number
    presentation: number
    timing: number
    content: number
    qa: number
    innovation: number
    bonus: number
  }
  total: number
  feedback: string
  isDirty?: boolean
}

const CRITERIA_CONFIG = [
  { key: 'slide', label: 'Slide', max: 1, weight: 1 },
  { key: 'presentation', label: 'Presentation', max: 1.5, weight: 1.5 },
  { key: 'timing', label: 'Timing', max: 0.5, weight: 0.5 },
  { key: 'content', label: 'Content', max: 4, weight: 4 },
  { key: 'qa', label: 'Q&A', max: 3, weight: 3 },
  { key: 'innovation', label: 'Innovation', max: 1, weight: 1 },
  { key: 'bonus', label: 'Bonus', max: 2, weight: 2 },
]

export default function GradingGridPage() {
  const router = useRouter()
  const { user } = useAuthUser()
  const [data, setData] = React.useState<GradingRow[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null)
  const [searchTerm, setSearchTerm] = React.useState('')

  // 1. Fetch Data
  const fetchData = React.useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data: registrations, error } = await supabase
        .from('registrations')
        .select(`
          *,
          submissions:submissions(*)
        `)
        .or(`proposal_supervisor_id.eq.${user.id},reviewer_id.eq.${user.id}`)

      if (error) throw error

      const rows: GradingRow[] = []
        ; (registrations as any[] || []).forEach((reg: any) => {
          const submissions = reg.submissions || []
          submissions.forEach((sub: any) => {
            if (sub.status === 'submitted') {
              const myGrade = (sub.grades || []).find((g: any) => g.grader_id === user.id)
              const scores = myGrade?.criteria_scores || {
                slide: 0, presentation: 0, timing: 0, content: 0, qa: 0, innovation: 0, bonus: 0
              }

              rows.push({
                submission_id: sub.id,
                registration_id: reg.id,
                student_code: reg.student_code || 'N/A',
                student_name: reg.student_name || 'N/A',
                scores,
                total: myGrade?.total_score || 0,
                feedback: myGrade?.feedback || '',
              })
            }
          })
        })

      setData(rows)
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  // 2. Inline Edit Handler
  const handleCellChange = (rowIndex: number, key: string, value: string | number) => {
    setData(prev => {
      const newData = [...prev]
      const row = { ...newData[rowIndex] }

      if (key === 'feedback') {
        row.feedback = value as string
      } else {
        const scoreKey = key as keyof GradingRow['scores']
        const numValue = Math.max(0, Math.min(
          CRITERIA_CONFIG.find(c => c.key === key)?.max || 10,
          parseFloat(value as string) || 0
        ))
        row.scores = { ...row.scores, [scoreKey]: numValue }

        // Recalculate total
        row.total = Object.values(row.scores).reduce((a, b) => a + b, 0)
        if (row.total > 12) row.total = 12
      }

      row.isDirty = true
      newData[rowIndex] = row
      return newData
    })
  }

  // 3. Batch Save (Autosave)
  const saveDirtyRows = React.useCallback(async () => {
    const dirtyRows = data.filter(r => r.isDirty)
    if (dirtyRows.length === 0) return

    setIsSaving(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch('/api/lecturer/grades/spreadsheet-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          csvData: dirtyRows.map(r => ({
            'Student ID': `${r.submission_id}:${r.registration_id}`,
            'Slide': r.scores.slide,
            'Presentation': r.scores.presentation,
            'Timing': r.scores.timing,
            'Content': r.scores.content,
            'Q&A': r.scores.qa,
            'Innovation': r.scores.innovation,
            'Bonus': r.scores.bonus,
            'Feedback': r.feedback
          }))
        })
      })

      if (response.ok) {
        setData(prev => prev.map(r => ({ ...r, isDirty: false })))
        setLastSaved(new Date())
      }
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }, [data])

  // Autosave interval (every 30 seconds)
  React.useEffect(() => {
    const interval = setInterval(() => {
      saveDirtyRows()
    }, 30000)
    return () => clearInterval(interval)
  }, [saveDirtyRows])

  const filteredData = data.filter(r =>
    r.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.student_code.includes(searchTerm)
  )

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-12 w-1/4" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans">
      {/* Header Panel */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-slate-100 rounded-full w-10 h-10 p-0"
            onClick={() => router.push('/lecturer/grading')}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Button>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              Grading Grid Workspace
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-bold text-[10px]">INTERNAL BETA</Badge>
            </h1>
            <p className="text-xs text-slate-400 font-medium">Bản đồ điểm thành phần - Tự động đồng bộ hóa & tính toán</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              {isSaving && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
              <p className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                isSaving ? "text-blue-500" : "text-slate-400"
              )}>
                {isSaving ? 'ĐANG LƯU...' : 'ĐÃ ĐỒNG BỘ'}
              </p>
            </div>
            {lastSaved && (
              <p className="text-[9px] text-slate-300 font-medium">
                Lần cuối: {lastSaved.toLocaleTimeString()}
              </p>
            )}
          </div>

          <div className="h-8 w-[1px] bg-slate-200" />

          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <Input
              placeholder="Tìm sinh viên..."
              className="h-9 pl-9 w-64 bg-slate-50 border-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Button
            className="bg-blue-600 hover:bg-blue-700 shadow-md font-black text-xs px-6 h-9 transition-all active:scale-95"
            onClick={saveDirtyRows}
            disabled={isSaving || !data.some(r => r.isDirty)}
          >
            FORCE SYNC
          </Button>
        </div>
      </div>

      {/* Grid Workspace */}
      <div className="flex-1 overflow-auto p-4 bg-slate-100/50">
        <Card className="border-none shadow-xl overflow-hidden rounded-xl bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left bg-white">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="sticky left-0 bg-slate-50 z-20 p-4 font-black text-[10px] text-slate-500 uppercase tracking-widest border-r w-[80px]">Mã SV</th>
                  <th className="sticky left-[80px] bg-slate-50 z-20 p-4 font-black text-[10px] text-slate-500 uppercase tracking-widest border-r w-[200px]">Họ và Tên</th>

                  {CRITERIA_CONFIG.map(c => (
                    <th key={c.key} className="p-4 font-black text-[10px] text-slate-500 uppercase tracking-widest text-center border-r min-w-[100px]">
                      {c.label}
                      <span className="block text-[8px] text-slate-400 font-medium mt-0.5">MAX {c.max}</span>
                    </th>
                  ))}

                  <th className="p-4 font-black text-[10px] text-blue-600 uppercase tracking-widest text-center border-r min-w-[80px] bg-blue-50/50">TỔNG</th>
                  <th className="p-4 font-black text-[10px] text-slate-500 uppercase tracking-widest border-r min-w-[300px]">PHẢN HỒI</th>
                  <th className="p-4 font-black text-[10px] text-slate-500 uppercase tracking-widest w-[80px]">TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((row, rowIndex) => (
                  <tr key={row.submission_id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="sticky left-0 bg-white group-hover:bg-slate-50/50 z-10 p-4 text-[11px] font-bold text-slate-500 border-r">{row.student_code}</td>
                    <td className="sticky left-[80px] bg-white group-hover:bg-slate-50/50 z-10 p-4 text-[12px] font-black text-slate-800 border-r">{row.student_name}</td>

                    {CRITERIA_CONFIG.map(c => (
                      <td key={c.key} className="p-2 border-r focus-within:bg-blue-50/30 transition-all">
                        <Input
                          type="number"
                          step="0.1"
                          max={c.max}
                          min="0"
                          value={row.scores[c.key as keyof GradingRow['scores']] || ''}
                          onChange={(e) => handleCellChange(rowIndex, c.key, e.target.value)}
                          className="h-8 border-none focus-visible:ring-0 text-center font-bold text-[13px] bg-transparent hover:bg-slate-100 focus:bg-white rounded p-0"
                          placeholder="0"
                        />
                      </td>
                    ))}

                    <td className="p-2 border-r bg-blue-50/30 text-center">
                      <span className={cn(
                        "text-[14px] font-black",
                        row.total >= 10 ? "text-emerald-600" : row.total >= 5 ? "text-blue-600" : "text-amber-600"
                      )}>
                        {row.total.toFixed(1)}
                      </span>
                    </td>

                    <td className="p-2 border-r focus-within:bg-blue-50/30 transition-all">
                      <Input
                        value={row.feedback}
                        onChange={(e) => handleCellChange(rowIndex, 'feedback', e.target.value)}
                        className="h-8 border-none focus-visible:ring-0 text-[11px] font-medium bg-transparent hover:bg-slate-100 focus:bg-white rounded"
                        placeholder="Nhập nhận xét..."
                      />
                    </td>

                    <td className="p-4 text-center">
                      {row.isDirty ? (
                        <div className="w-2 h-2 rounded-full bg-amber-400 mx-auto" title="Có thay đổi chưa lưu" />
                      ) : (
                        <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Footer Info */}
      <div className="bg-slate-800 text-slate-400 px-6 py-2 flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-6">
          <p className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[12px]">info</span> Enter scores and labels update instantly.</p>
          <p className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[12px]">keyboard</span> Use Tab/Shift-Tab to navigate between cells.</p>
        </div>
        <p className="font-bold text-slate-500 uppercase tracking-tighter">Academic Nexus v3.4.1 — Grading Module Edition</p>
      </div>
    </div>
  )
}
