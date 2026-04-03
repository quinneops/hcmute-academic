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
 * GET /api/tbm/councils
 * List all councils
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

    // Fetch all councils
    const { data: councils, error } = await supabaseAdmin
      .from('councils')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(councils)

  } catch (error: any) {
    console.error('TBM Councils GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/tbm/councils
 * Create a new council
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

    const body = await request.json()
    const { name, chair_id, chair_name, secretary_id, secretary_name, members, room, scheduled_date, scheduled_time, defenses } = body

    if (!name || !chair_id || !secretary_id) {
      return NextResponse.json({ error: 'Missing required council fields' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('councils')
      .insert({
        name,
        chair_id,
        chair_name,
        secretary_id,
        secretary_name,
        members: members || [],
        room,
        scheduled_date: scheduled_date || '2026-06-25',
        scheduled_time,
        defenses: defenses || [],
        status: 'draft'
      })
      .select()
      .single()

    if (error) throw error

    // Sync defense_session to registrations table
    if (defenses && Array.isArray(defenses)) {
      for (const defense of defenses) {
        if (defense.student_id) {
          await supabaseAdmin
            .from('registrations')
            .update({
              defense_session: {
                council_id: data.id,
                council_name: data.name,
                room: data.room,
                scheduled_date: data.scheduled_date,
                scheduled_time: data.scheduled_time,
                type: defense.type || 'defense'
              }
            })
            // student_id passed from frontend is actually the registration ID in this context
            .eq('id', defense.student_id)
        }
      }
    }

    return NextResponse.json({ success: true, council: data })

  } catch (error: any) {
    console.error('TBM Councils POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/tbm/councils
 * Update council (members, students)
 */
export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const { id, defenses, members, room, scheduled_date, scheduled_time, status } = body

    if (!id) return NextResponse.json({ error: 'Council ID is required' }, { status: 400 })

    const updateData: any = {}
    if (defenses !== undefined) updateData.defenses = defenses
    if (members !== undefined) updateData.members = members
    if (room !== undefined) updateData.room = room
    if (scheduled_date !== undefined) updateData.scheduled_date = scheduled_date
    if (scheduled_time !== undefined) updateData.scheduled_time = scheduled_time
    if (status !== undefined) updateData.status = status

    const { data, error } = await supabaseAdmin
      .from('councils')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // If students (defenses) were updated, we should also update the registrations table's defense_session
    if (defenses && Array.isArray(defenses)) {
      for (const defense of defenses) {
        if (defense.student_id) {
          await supabaseAdmin
            .from('registrations')
            .update({
              defense_session: {
                council_id: id,
                council_name: data.name,
                room: data.room,
                scheduled_date: data.scheduled_date,
                scheduled_time: data.scheduled_time,
                type: defense.type || 'defense'
              }
            })
            // student_id passed from frontend is actually the registration ID in this context
            .eq('id', defense.student_id)
        }
      }
    }

    return NextResponse.json({ success: true, council: data })

  } catch (error: any) {
    console.error('TBM Councils PATCH error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
