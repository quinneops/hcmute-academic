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
 * GET /api/lecturer/dashboard
 * Returns dashboard stats, recent submissions, and upcoming defenses for lecturer
 * Uses NoSQL schema - no joins needed, data is denormalized
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

    // Get registrations for this lecturer (denormalized - proposal_supervisor_id stored directly)
    const { data: registrations } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('proposal_supervisor_id', userId)

    // Calculate stats from registrations
    const stats = {
      total_students: new Set(registrations?.map(r => r.student_id)).size || 0,
      pending_grading: registrations?.filter(r =>
        r.submissions?.some((s: any) => s.status === 'submitted' && !s.graded_at)
      ).length || 0,
      upcoming_defenses: registrations?.filter(r =>
        r.defense_session?.status === 'scheduled' &&
        new Date(r.defense_session.scheduled_at) > new Date()
      ).length || 0,
      pending_proposals: registrations?.filter(r => r.status === 'pending').length || 0,
    }

    // Get recent submissions from embedded data
    const recentSubmissionsRaw: any[] = []
    ;(registrations || []).forEach((reg: any) => {
      const submissions = reg.submissions || []
      submissions.forEach((sub: any) => {
        recentSubmissionsRaw.push({
          ...sub,
          registration: reg,
        })
      })
    })

    const recentSubmissions = recentSubmissionsRaw
      .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
      .slice(0, 5)
      .map((sub: any) => ({
        id: sub.id,
        student_name: sub.registration.student_name || 'Unknown',
        student_code: sub.registration.student_code || '',
        thesis_title: sub.registration.proposal_title || 'Unknown',
        submission_type: `Round ${sub.round_number}`,
        file_url: sub.file_url,
        file_name: sub.file_name,
        submitted_at: sub.submitted_at,
        status: sub.status,
        round_name: sub.round_name || `Round ${sub.round_number}`,
      }))

    // Get upcoming defenses from embedded data
    const upcomingDefensesRaw: any[] = []
    ;(registrations || []).forEach((reg: any) => {
      if (reg.defense_session) {
        upcomingDefensesRaw.push({
          ...reg.defense_session,
          registration: reg,
        })
      }
    })

    const upcomingDefenses = upcomingDefensesRaw
      .filter(d => d.status === 'scheduled' && new Date(d.scheduled_at) > new Date())
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
      .slice(0, 5)
      .map((d: any) => ({
        id: d.registration.id,
        student_name: d.registration.student_name || 'Unknown',
        student_code: d.registration.student_code || '',
        thesis_title: d.registration.proposal_title || 'Unknown',
        scheduled_at: d.scheduled_at,
        room: d.room || 'TBA',
        council_name: d.council_name || 'Unknown',
      }))

    return NextResponse.json({
      stats,
      recentSubmissions,
      upcomingDefenses,
    })

  } catch (error: any) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
