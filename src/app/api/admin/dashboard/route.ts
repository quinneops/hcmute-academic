import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Client for auth token verification
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Client with service role for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

/**
 * GET /api/admin/dashboard
 * Returns dashboard stats, recent activity, theses, and upcoming defenses
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    let userId: string | null = null

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    userId = user.id

    // Verify user is admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Get stats
    const { data: statsData } = await supabaseAdmin
      .from('profiles')
      .select('role', { count: 'exact' })
      .eq('is_active', true)

    const totalStudents = statsData?.filter(p => p.role === 'student').length || 0
    const totalLecturers = statsData?.filter(p => p.role === 'lecturer').length || 0
    const totalAdmins = statsData?.filter(p => p.role === 'admin').length || 0

    // Get thesis count
    const { count: thesesCount } = await supabaseAdmin
      .from('proposals')
      .select('*', { count: 'exact', head: true })
      .in('status', ['approved', 'active'])

    // Get upcoming defenses count
    const { count: defensesCount } = await supabaseAdmin
      .from('defense_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'scheduled')
      .gte('scheduled_at', new Date().toISOString())

    // Get current semester
    const { data: currentSemester } = await supabaseAdmin
      .from('semesters')
      .select('id, name, academic_year')
      .eq('is_current', true)
      .single()

    // Get recent activity (registrations + submissions)
    const { data: recentRegistrations } = await supabaseAdmin
      .from('registrations')
      .select(`
        id,
        submitted_at,
        status,
        student_id,
        profiles (
          full_name
        ),
        proposals (
          title
        )
      `)
      .order('submitted_at', { ascending: false })
      .limit(5)

    const { data: recentSubmissions } = await supabaseAdmin
      .from('submissions')
      .select(`
        id,
        submitted_at,
        status,
        registration_id,
        profiles (
          full_name
        ),
        registrations (
          proposals (
            title
          )
        )
      `)
      .order('submitted_at', { ascending: false })
      .limit(5)

    // Combine and sort activity
    const activity = [
      ...(recentRegistrations || []).map((r: any) => ({
        id: r.id,
        type: 'registration' as const,
        user: r.profiles?.full_name || 'Unknown',
        action: 'Đăng ký khóa luận',
        thesis: r.proposals?.title || 'Unknown',
        time: r.submitted_at,
        status: r.status,
      })),
      ...(recentSubmissions || []).map((s: any) => ({
        id: s.id,
        type: 'submission' as const,
        user: s.profiles?.full_name || 'Unknown',
        action: 'Nộp sản phẩm',
        thesis: s.registrations?.proposals?.title || 'Unknown',
        time: s.submitted_at,
        status: s.status,
      })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10)

    // Get recent theses
    const { data: recentTheses } = await supabaseAdmin
      .from('proposals')
      .select(`
        id,
        title,
        status,
        created_at,
        supervisor_id,
        profiles (
          full_name
        ),
        registrations (
          student_id,
          profiles (
            full_name
          ),
          final_score
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    const theses = (recentTheses || []).map((t: any) => {
      const registration = t.registrations?.[0]
      return {
        id: t.id,
        title: t.title,
        student: registration?.profiles?.full_name || 'Chưa có SV',
        supervisor: t.profiles?.full_name || 'Unknown',
        status: mapThesisStatus(t.status),
        progress: registration?.final_score ? 100 : t.status === 'approved' ? 50 : 20,
      }
    })

    // Get upcoming defenses
    const { data: upcomingDefenses } = await supabaseAdmin
      .from('defense_sessions')
      .select(`
        id,
        scheduled_at,
        room,
        councils (
          name
        ),
        registrations (
          student_id,
          proposals (
            title
          ),
          profiles (
            full_name
          )
        )
      `)
      .eq('status', 'scheduled')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(5)

    const defenses = (upcomingDefenses || []).map((d: any) => {
      const registration = d.registrations?.[0]
      return {
        id: d.id,
        student: registration?.profiles?.full_name || 'Unknown',
        title: registration?.proposals?.title || 'Unknown',
        date: formatDate(d.scheduled_at),
        time: formatTime(d.scheduled_at),
        room: d.room || 'TBA',
        council: d.councils?.name || 'Unknown',
      }
    })

    return NextResponse.json({
      stats: {
        students: totalStudents,
        theses: thesesCount || 0,
        lecturers: totalLecturers,
        defenses: defensesCount || 0,
        admins: totalAdmins,
        currentSemester: currentSemester || null,
      },
      activity,
      recentTheses: theses,
      upcomingDefenses: defenses,
    })

  } catch (error: any) {
    console.error('Admin Dashboard API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

function mapThesisStatus(status: string): string {
  switch (status) {
    case 'approved':
    case 'active':
      return 'in-progress'
    case 'pending':
      return 'pending-review'
    case 'completed':
      return 'completed'
    case 'rejected':
      return 'rejected'
    default:
      return 'draft'
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}
