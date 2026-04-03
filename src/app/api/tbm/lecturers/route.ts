import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
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

    // Fetch all lecturers
    const { data: lecturers, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, specialization, bctt_slots, kltn_slots')
      .eq('role', 'lecturer')
      .order('full_name')

    if (error) throw error

    // Fetch current counts for each lecturer (approved registrations)
    const { data: registrations } = await supabaseAdmin
      .from('registrations')
      .select('proposal_supervisor_id, proposal_type')
      .in('status', ['approved', 'active'])

    const countsMap = new Map()
    registrations?.forEach(r => {
      const gvId = r.proposal_supervisor_id
      if (!countsMap.has(gvId)) countsMap.set(gvId, { bctt: 0, kltn: 0 })
      const counts = countsMap.get(gvId)
      if (r.proposal_type === 'BCTT') counts.bctt++
      if (r.proposal_type === 'KLTN') counts.kltn++
    })

    const transformed = (lecturers || []).map(l => ({
      ...l,
      current_bctt: countsMap.get(l.id)?.bctt || 0,
      current_kltn: countsMap.get(l.id)?.kltn || 0,
      bctt_slots: l.bctt_slots || 5,
      kltn_slots: l.kltn_slots || 5,
    }))

    return NextResponse.json({ lecturers: transformed })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
