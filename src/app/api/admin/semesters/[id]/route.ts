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
 * PUT /api/admin/semesters/:id
 * Updates a semester
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

    const semesterId = params.id
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
      is_active,
    } = body

    // If setting as current, unset others
    if (is_current) {
      await supabaseAdmin
        .from('semesters')
        .update({ is_current: false })
        .neq('id', semesterId)
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (academic_year !== undefined) updateData.academic_year = academic_year
    if (semester_number !== undefined) updateData.semester_number = semester_number
    if (start_date !== undefined) updateData.start_date = start_date
    if (end_date !== undefined) updateData.end_date = end_date
    if (registration_start !== undefined) updateData.registration_start = registration_start
    if (registration_end !== undefined) updateData.registration_end = registration_end
    if (is_current !== undefined) updateData.is_current = is_current
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: updatedSemester, error: updateError } = await supabaseAdmin
      .from('semesters')
      .update(updateData)
      .eq('id', semesterId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json(updatedSemester)

  } catch (error: any) {
    console.error('Semester update API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/semesters/:id
 * Deletes a semester (only if no data)
 */
export async function DELETE(
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

    const semesterId = params.id

    // Check if semester has proposals
    const { count: proposalsCount } = await supabaseAdmin
      .from('proposals')
      .select('*', { count: 'exact', head: true })
      .eq('semester_id', semesterId)

    if (proposalsCount && proposalsCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete semester with proposals' },
        { status: 400 }
      )
    }

    // Delete semester
    const { error: deleteError } = await supabaseAdmin
      .from('semesters')
      .delete()
      .eq('id', semesterId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Semester delete API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
