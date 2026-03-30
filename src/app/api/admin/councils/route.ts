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
 * GET /api/admin/councils
 * Returns list of defense councils
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
    const semester = searchParams.get('semester_id')

    let query = supabaseAdmin
      .from('councils')
      .select(`
        *,
        semesters (
          id,
          name,
          academic_year
        ),
        council_members (
          id,
          role,
          profiles (
            id,
            full_name,
            email,
            faculty
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (semester) {
      query = query.eq('semester_id', semester)
    }

    const { data: councils } = await query

    return NextResponse.json({ councils: councils || [] })

  } catch (error: any) {
    console.error('Admin Councils API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/councils
 * Creates a new defense council
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
      code,
      semester_id,
      chair_id,
      secretary_id,
      members,
      scheduled_at,
      room,
    } = body

    // Validate required fields
    if (!name || !semester_id) {
      return NextResponse.json(
        { error: 'name and semester_id are required' },
        { status: 400 }
      )
    }

    // Create council
    const { data: newCouncil, error: councilError } = await supabaseAdmin
      .from('councils')
      .insert({
        name,
        code: code || null,
        semester_id,
        status: 'draft',
        scheduled_at: scheduled_at || null,
        room: room || null,
      })
      .select()
      .single()

    if (councilError) {
      return NextResponse.json({ error: councilError.message }, { status: 500 })
    }

    // Add council members
    if (members && Array.isArray(members)) {
      const memberData = members.map((m: any) => ({
        council_id: newCouncil.id,
        lecturer_id: m.lecturer_id,
        role: m.role || 'member',
      }))

      // Add chair if provided
      if (chair_id) {
        memberData.push({ council_id: newCouncil.id, lecturer_id: chair_id, role: 'chair' })
      }

      // Add secretary if provided
      if (secretary_id) {
        memberData.push({ council_id: newCouncil.id, lecturer_id: secretary_id, role: 'secretary' })
      }

      const { error: membersError } = await supabaseAdmin
        .from('council_members')
        .insert(memberData)

      if (membersError) {
        // Rollback council
        await supabaseAdmin.from('councils').delete().eq('id', newCouncil.id)
        return NextResponse.json({ error: membersError.message }, { status: 500 })
      }
    }

    return NextResponse.json(newCouncil, { status: 201 })

  } catch (error: any) {
    console.error('Council create API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
