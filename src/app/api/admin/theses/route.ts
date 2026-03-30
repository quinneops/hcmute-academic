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
 * GET /api/admin/theses
 * Returns list of all theses with filters
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
    const status = searchParams.get('status')
    const semester = searchParams.get('semester_id')
    const supervisor = searchParams.get('supervisor_id')

    let query = supabaseAdmin
      .from('proposals')
      .select(`
        *,
        semesters (
          id,
          name,
          academic_year
        ),
        profiles (
          id,
          full_name,
          email
        ),
        registrations (
          id,
          student_id,
          status,
          final_score,
          final_grade,
          profiles (
            id,
            full_name,
            student_code
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (semester) {
      query = query.eq('semester_id', semester)
    }

    if (supervisor) {
      query = query.eq('supervisor_id', supervisor)
    }

    const { data: theses } = await query

    const transformedTheses = (theses || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      semester: t.semesters,
      supervisor: t.profiles,
      students: (t.registrations || []).map((r: any) => ({
        id: r.id,
        student_id: r.student_id,
        name: r.profiles?.full_name,
        code: r.profiles?.student_code,
        status: r.status,
        final_score: r.final_score,
        final_grade: r.final_grade,
      })),
    }))

    return NextResponse.json({ theses: transformedTheses })

  } catch (error: any) {
    console.error('Admin Theses API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/theses/:id
 * Updates thesis status or council assignment
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const thesisId = params.id
    const body = await request.json()
    const { status, council_id } = body

    const updateData: any = {}
    if (status !== undefined) updateData.status = status

    const { data: updatedThesis, error: updateError } = await supabaseAdmin
      .from('proposals')
      .update(updateData)
      .eq('id', thesisId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Assign to council if provided
    if (council_id) {
      await supabaseAdmin
        .from('registrations')
        .update({ council_id })
        .eq('proposal_id', thesisId)
    }

    return NextResponse.json(updatedThesis)

  } catch (error: any) {
    console.error('Thesis update API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
