import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const lecturerId = params.id
    if (!lecturerId) return NextResponse.json({ error: 'Missing lecturer ID' }, { status: 400 })

    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
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
    const { bctt_slots, kltn_slots, specialization } = body

    const updateData: any = {}
    if (bctt_slots !== undefined) updateData.bctt_slots = bctt_slots
    if (kltn_slots !== undefined) updateData.kltn_slots = kltn_slots
    if (specialization !== undefined) updateData.specialization = specialization

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', lecturerId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, lecturer: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
