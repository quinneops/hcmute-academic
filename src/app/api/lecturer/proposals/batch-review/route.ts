import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { registration_ids, action, notes } = await request.json()

    if (!Array.isArray(registration_ids) || registration_ids.length === 0 || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Fetch all registrations to get proposal IDs and verify ownership
    const { data: registrations, error: fetchError } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .in('id', registration_ids)
      .eq('proposal_supervisor_id', user.id)

    if (fetchError || !registrations || registrations.length === 0) {
      return NextResponse.json({ error: 'No valid registrations found or unauthorized' }, { status: 403 })
    }

    const now = new Date().toISOString()
    const status = action === 'approve' ? 'approved' : 'rejected'

    // 2. Perform batch update on registrations
    const { error: updateError } = await supabaseAdmin
      .from('registrations')
      .update({
        status,
        reviewed_at: now,
        reviewed_by: user.id,
        review_notes: notes || (action === 'approve' ? 'Approved in batch' : 'Rejected in batch'),
        approved_at: action === 'approve' ? now : null
      })
      .in('id', registrations.map(r => r.id))

    if (updateError) throw updateError

    // 3. Update proposals summary (this is more complex because it's denormalized JSONB)
    // For simplicity in this nosql-style schema, we should update each parent proposal
    const proposalIds = Array.from(new Set(registrations.map(r => r.proposal_id)))
    
    for (const proposalId of proposalIds) {
      const { data: proposal } = await supabaseAdmin
        .from('proposals')
        .select('registrations_summary, approved_count, rejected_count')
        .eq('id', proposalId)
        .single()

      if (proposal) {
        const updatedSummary = proposal.registrations_summary.map((item: any) => {
          if (registration_ids.includes(item.id)) {
            return { ...item, status, reviewed_at: now }
          }
          return item
        })

        const approvedCount = updatedSummary.filter((s: any) => s.status === 'approved').length
        const rejectedCount = updatedSummary.filter((s: any) => s.status === 'rejected').length

        await supabaseAdmin
          .from('proposals')
          .update({
            registrations_summary: updatedSummary,
            approved_count: approvedCount,
            rejected_count: rejectedCount
          })
          .eq('id', proposalId)
      }
    }

    return NextResponse.json({ success: true, count: registrations.length })

  } catch (error: any) {
    console.error('Batch Review API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
