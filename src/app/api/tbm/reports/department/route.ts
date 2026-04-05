import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
)

/**
 * GET /api/tbm/reports
 * Aggregate department-wide statistics
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify TBM role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, is_tbm')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'lecturer' || !profile?.is_tbm) {
      return NextResponse.json({ error: 'Forbidden - TBM only' }, { status: 403 })
    }

    // 1. Fetch all registrations for current semester
    const { data: registrations, error: regError } = await supabaseAdmin
      .from('registrations')
      .select('id, student_name, student_code, proposal_type, status, final_score, supervisor_name:reviewed_by_name, reviewer_name, post_defense_edit_status, submissions')
      .eq('proposal_type', 'KLTN')
      .order('created_at', { ascending: false })

    if (regError) throw regError

    // 2. Fetch all lecturers for slot summary
    const { data: lecturers, error: lecError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, bctt_slots, kltn_slots')
      .eq('role', 'lecturer')

    if (lecError) throw lecError

    // 3. Compute Stats
    const totalStudents = registrations.length
    const bcttCount = registrations.filter(r => r.proposal_type === 'BCTT').length
    const kltnCount = registrations.filter(r => r.proposal_type === 'KLTN').length
    const activeCount = registrations.filter(r => r.status === 'active' || r.status === 'approved').length
    const completedCount = registrations.filter(r => r.status === 'completed').length
    const failedCount = registrations.filter(r => r.status === 'failed' || r.status === 'rejected').length

    // Grade Distribution (e.g., A, B, C, D)
    const scores = registrations.filter(r => r.final_score !== null).map(r => Number(r.final_score))
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0

    // Distributions for Charts
    const grade_distribution = [
      { range: '0-5', count: scores.filter(s => s < 5).length, color: '#ef4444' },
      { range: '5-7', count: scores.filter(s => s >= 5 && s < 7).length, color: '#f59e0b' },
      { range: '7-8.5', count: scores.filter(s => s >= 7 && s < 8.5).length, color: '#3b82f6' },
      { range: '8.5-10', count: scores.filter(s => s >= 8.5).length, color: '#10b981' }
    ]

    const workloadMap: Record<string, number> = {}
    registrations.forEach(r => {
      const name = r.supervisor_name || 'Hệ thống'
      workloadMap[name] = (workloadMap[name] || 0) + 1
    })
    const lecturer_workload = Object.entries(workloadMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    const roundMap: Record<number, number> = {}
    registrations.forEach(r => {
      // Logic: Get the latest submission round
      const subs = r.submissions || []
      const latestRound = subs.length > 0 ? Math.max(...subs.map((s: any) => s.round_number)) : 0
      if (latestRound > 0) {
        roundMap[latestRound] = (roundMap[latestRound] || 0) + 1
      }
    })
    const round_distribution = [1, 2, 3, 4].map(num => ({
      round: `Vòng ${num}`,
      count: roundMap[num] || 0
    }))

    const summary = {
      total: totalStudents,
      bctt: bcttCount,
      kltn: kltnCount,
      active: activeCount,
      completed: completedCount,
      failed: failedCount,
      avg_score: avgScore.toFixed(2),
      lecturer_count: lecturers.length,
      grade_distribution,
      lecturer_workload,
      round_distribution
    }

    return NextResponse.json({
      summary,
      registrations: (registrations || []).map(r => ({
        ...r,
        type: r.proposal_type,
        final_grade: r.final_score,
        supervisor_name: r.supervisor_name || 'Hệ thống'
      }))
    })

  } catch (error: any) {
    console.error('TBM Reports GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
