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
 * GET /api/tbm/assignments/reviewer
 * List all approved registrations that need or have a reviewer assigned
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

    // Fetch approved registrations
    const { data: registrations, error } = await supabaseAdmin
      .from('registrations')
      .select(`
        id,
        student_name,
        student_code,
        proposal_title,
        status,
        proposal_supervisor_id,
        reviewer_id,
        reviewer_name,
        proposal_type
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(registrations)

  } catch (error: any) {
    console.error('TBM Assignments GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/tbm/assignments/reviewer
 * Assign a reviewer to a registration
 */
export async function POST(request: NextRequest) {
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

    const { registration_id, reviewer_id } = await request.json()

    if (!registration_id || !reviewer_id) {
      return NextResponse.json({ error: 'registration_id and reviewer_id are required' }, { status: 400 })
    }

    // Get reviewer profile for denormalization
    const { data: reviewerProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', reviewer_id)
      .single()

    const { data, error } = await supabaseAdmin
      .from('registrations')
      .update({
        reviewer_id,
        reviewer_name: reviewerProfile?.full_name || '',
      })
      .eq('id', registration_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, registration: data })

  } catch (error: any) {
    console.error('TBM Assignments POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
