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
 * GET /api/admin/reports/overview
 * Returns general statistics for reporting
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

    const { searchParams } = new URL(request.url)
    const semesterId = searchParams.get('semester_id')

    // Get total students by role
    const { data: studentsData } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('is_active', true)

    const totalStudents = studentsData?.filter(p => p.role === 'student').length || 0
    const totalLecturers = studentsData?.filter(p => p.role === 'lecturer').length || 0

    // Get thesis stats
    let thesisQuery = supabaseAdmin.from('proposals').select('status')
    if (semesterId) thesisQuery = thesisQuery.eq('semester_id', semesterId)
    const { data: thesisData } = await thesisQuery

    const thesisByStatus = {
      pending: thesisData?.filter(t => t.status === 'pending').length || 0,
      approved: thesisData?.filter(t => t.status === 'approved').length || 0,
      active: thesisData?.filter(t => t.status === 'active').length || 0,
      completed: thesisData?.filter(t => t.status === 'completed').length || 0,
      rejected: thesisData?.filter(t => t.status === 'rejected').length || 0,
    }

    // Get registration stats
    let registrationQuery = supabaseAdmin.from('registrations').select('status')
    if (semesterId) {
      registrationQuery = registrationQuery
        .select('status, proposals!inner(semester_id)')
        .eq('proposals.semester_id', semesterId)
    }
    const { data: registrationData } = await registrationQuery

    const registrationsByStatus = {
      pending: registrationData?.filter(r => r.status === 'pending').length || 0,
      approved: registrationData?.filter(r => r.status === 'approved').length || 0,
      active: registrationData?.filter(r => r.status === 'active').length || 0,
      completed: registrationData?.filter(r => r.status === 'completed').length || 0,
    }

    // Get defense stats
    let defenseQuery = supabaseAdmin.from('defense_sessions').select('status')
    if (semesterId) {
      defenseQuery = defenseQuery
        .select('status, registrations!inner(proposal_id), registrations!inner(proposals(semester_id))')
        .eq('registrations.proposals.semester_id', semesterId)
    }
    const { data: defenseData } = await defenseQuery

    const defensesByStatus = {
      scheduled: defenseData?.filter(d => d.status === 'scheduled').length || 0,
      completed: defenseData?.filter(d => d.status === 'completed').length || 0,
      cancelled: defenseData?.filter(d => d.status === 'cancelled').length || 0,
    }

    // Get current semester
    const { data: currentSemester } = await supabaseAdmin
      .from('semesters')
      .select('id, name, academic_year')
      .eq('is_current', true)
      .single()

    return NextResponse.json({
      overview: {
        totalStudents,
        totalLecturers,
        totalTheses: Object.values(thesisByStatus).reduce((a, b) => a + b, 0),
        totalRegistrations: Object.values(registrationsByStatus).reduce((a, b) => a + b, 0),
        totalDefenses: Object.values(defensesByStatus).reduce((a, b) => a + b, 0),
      },
      thesisByStatus,
      registrationsByStatus,
      defensesByStatus,
      currentSemester,
    })

  } catch (error: any) {
    console.error('Admin Reports API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
