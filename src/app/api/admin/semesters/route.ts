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
 * GET /api/admin/semesters
 * Returns list of academic semesters
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
    const includeArchived = searchParams.get('include_archived') === 'true'

    let query = supabaseAdmin
      .from('semesters')
      .select('*')
      .order('is_current', { ascending: false })
      .order('start_date', { ascending: false })

    if (!includeArchived) {
      query = query.eq('is_active', true)
    }

    const { data: semesters } = await query

    return NextResponse.json({ semesters: semesters || [] })

  } catch (error: any) {
    console.error('Admin Semesters API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/semesters
 * Creates a new academic semester
 */
export async function POST(request: NextRequest) {
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
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      academic_year,
      semester_number,
      start_date,
      end_date,
      registration_start,
      registration_end,
      is_current,
    } = body

    // Validate required fields
    if (!name || !academic_year || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'name, academic_year, start_date, and end_date are required' },
        { status: 400 }
      )
    }

    // If this is current semester, unset others
    if (is_current) {
      await supabaseAdmin
        .from('semesters')
        .update({ is_current: false })
        .neq('id', body.id) // Exclude current if updating
    }

    // Create semester
    const { data: newSemester, error: semesterError } = await supabaseAdmin
      .from('semesters')
      .insert({
        name,
        academic_year,
        semester_number: semester_number || 1,
        start_date,
        end_date,
        registration_start: registration_start || null,
        registration_end: registration_end || null,
        is_current: is_current || false,
        is_active: true,
      })
      .select()
      .single()

    if (semesterError) {
      return NextResponse.json({ error: semesterError.message }, { status: 500 })
    }

    return NextResponse.json(newSemester, { status: 201 })

  } catch (error: any) {
    console.error('Semester create API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
