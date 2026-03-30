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
 * GET /api/lecturer/schedule
 * Returns upcoming defense sessions and appointments for lecturer
 * Uses NoSQL schema - defense sessions are embedded in registrations.defense_session
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    let userId: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user }, error } = await supabaseAuth.auth.getUser(token)
      if (error || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = user.id
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date().toISOString()
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = today.toISOString()
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)
    const todayEndStr = todayEnd.toISOString()

    // Fetch registrations for this lecturer (denormalized - no joins needed)
    const { data: registrations } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('proposal_supervisor_id', userId)

    // Extract defense sessions from embedded data
    const appointments: any[] = []
    ;(registrations || []).forEach((reg: any) => {
      if (reg.defense_session) {
        const endAt = reg.defense_session.scheduled_at && reg.defense_session.duration_minutes
          ? new Date(new Date(reg.defense_session.scheduled_at).getTime() + reg.defense_session.duration_minutes * 60 * 1000).toISOString()
          : null

        appointments.push({
          id: reg.id,
          type: 'defense' as const,
          student_id: reg.student_id,
          student_name: reg.student_name || 'Unknown',
          student_code: reg.student_code || '',
          thesis_title: reg.proposal_title || 'Unknown',
          scheduled_at: reg.defense_session.scheduled_at,
          end_at: endAt,
          location: reg.defense_session.room || 'TBA',
          room: reg.defense_session.room,
          status: mapDefenseStatus(reg.defense_session.status),
          notes: reg.defense_session.notes,
          council_name: reg.defense_session.council_name,
        })
      }
    })

    // Sort by scheduled_at ascending
    appointments.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())

    // Calculate stats
    const stats = {
      today: appointments.filter(a =>
        a.scheduled_at >= todayStart && a.scheduled_at <= todayEndStr
      ).length,
      upcoming: appointments.filter(a =>
        a.status === 'upcoming' && a.scheduled_at >= now
      ).length,
      completed: appointments.filter(a =>
        a.status === 'completed'
      ).length,
      this_week: appointments.filter(a =>
        a.scheduled_at >= now && a.scheduled_at <= weekFromNow
      ).length,
    }

    return NextResponse.json({
      appointments,
      stats,
    })

  } catch (error: any) {
    console.error('Schedule API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

function mapDefenseStatus(status: string): 'upcoming' | 'completed' | 'cancelled' | 'postponed' {
  switch (status) {
    case 'scheduled':
      return 'upcoming'
    case 'completed':
      return 'completed'
    case 'cancelled':
      return 'cancelled'
    case 'postponed':
      return 'postponed'
    default:
      return 'upcoming'
  }
}
