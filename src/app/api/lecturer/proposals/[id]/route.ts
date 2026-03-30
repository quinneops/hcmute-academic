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
 * GET /api/lecturer/proposals/:id
 * Returns detailed proposal info with registrations
 */
export async function GET(
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

    const proposalId = params.id

    // Get proposal with registrations - no joins, data is denormalized
    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .single()

    if (proposalError) {
      return NextResponse.json({ error: proposalError.message }, { status: 500 })
    }

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    // Verify ownership
    if (proposal.supervisor_id !== userId) {
      return NextResponse.json({ error: 'Forbidden: Not your proposal' }, { status: 403 })
    }

    // Get registrations from JSONB or fetch separately
    let registrations = []
    if (proposal.registrations_summary && Array.isArray(proposal.registrations_summary)) {
      registrations = proposal.registrations_summary.map((reg: any) => ({
        id: reg.id,
        student_id: reg.student_id,
        student_name: reg.student_name,
        student_code: reg.student_code,
        student_email: reg.email || reg.student_email,
        status: reg.status,
        submitted_at: reg.submitted_at,
        reviewed_at: reg.reviewed_at,
        review_notes: reg.review_notes,
        motivation_letter: reg.motivation_letter,
        proposed_title: reg.proposed_title,
        final_score: reg.final_score,
        final_grade: reg.final_grade,
      }))
    } else {
      // Fallback: fetch registrations separately
      const { data: regsData } = await supabaseAdmin
        .from('registrations')
        .select('*')
        .eq('proposal_id', proposalId)

      registrations = (regsData || []).map((reg: any) => ({
        id: reg.id,
        student_id: reg.student_id,
        student_name: reg.student_name,
        student_code: reg.student_code,
        student_email: reg.student_email,
        status: reg.status,
        submitted_at: reg.submitted_at,
        reviewed_at: reg.reviewed_at,
        review_notes: reg.review_notes,
        motivation_letter: reg.motivation_letter,
        proposed_title: reg.proposed_title,
        final_score: reg.final_score,
        final_grade: reg.final_grade,
      }))
    }

    return NextResponse.json({
      ...proposal,
      registrations,
    })

  } catch (error: any) {
    console.error('Proposal detail API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/lecturer/proposals/:id
 * Updates proposal data
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

    const proposalId = params.id
    const body = await request.json()
    const {
      title,
      description,
      category,
      tags,
      max_students,
      requirements,
      is_industrial,
    } = body

    // Verify ownership
    const { data: existingProposal } = await supabaseAdmin
      .from('proposals')
      .select('supervisor_id')
      .eq('id', proposalId)
      .single()

    if (!existingProposal || existingProposal.supervisor_id !== userId) {
      return NextResponse.json({ error: 'Forbidden: Not your proposal' }, { status: 403 })
    }

    // Update proposal
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category
    if (tags !== undefined) updateData.tags = tags
    if (max_students !== undefined) updateData.max_students = max_students
    if (requirements !== undefined) updateData.requirements = requirements
    if (is_industrial !== undefined) updateData.is_industrial = is_industrial

    const { data: updatedProposal, error: updateError } = await supabaseAdmin
      .from('proposals')
      .update(updateData)
      .eq('id', proposalId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json(updatedProposal)

  } catch (error: any) {
    console.error('Proposal update API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/lecturer/proposals/:id
 * Review proposal registration (approve/reject)
 */
export async function PATCH(
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

    const proposalId = params.id
    const body = await request.json()
    const { action, review_notes, registration_id } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    // Verify lecturer owns this proposal
    const { data: proposal } = await supabaseAdmin
      .from('proposals')
      .select('supervisor_id, status')
      .eq('id', proposalId)
      .single()

    if (!proposal || proposal.supervisor_id !== userId) {
      return NextResponse.json({ error: 'Forbidden: Not your proposal' }, { status: 403 })
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    // Update registration if registration_id provided
    if (registration_id) {
      const { error: regError } = await supabaseAdmin
        .from('registrations')
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId,
          review_notes: review_notes || null,
        })
        .eq('id', registration_id)
        .eq('proposal_id', proposalId)

      if (regError) {
        return NextResponse.json({ error: regError.message }, { status: 500 })
      }
    } else {
      // Update all pending registrations for this proposal
      const { error: regError } = await supabaseAdmin
        .from('registrations')
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId,
          review_notes: review_notes || null,
        })
        .eq('proposal_id', proposalId)
        .eq('status', 'pending')

      if (regError) {
        return NextResponse.json({ error: regError.message }, { status: 500 })
      }
    }

    // Update proposal status if all registrations are approved/rejected
    const { data: allRegistrations } = await supabaseAdmin
      .from('registrations')
      .select('status')
      .eq('proposal_id', proposalId)

    const hasApproved = allRegistrations?.some(r => r.status === 'approved')
    const hasRejected = allRegistrations?.some(r => r.status === 'rejected')
    const hasPending = allRegistrations?.some(r => r.status === 'pending')

    let newProposalStatus = proposal.status
    if (!hasPending && hasApproved && !hasRejected) {
      newProposalStatus = 'approved'
    } else if (!hasPending && hasRejected && !hasApproved) {
      newProposalStatus = 'rejected'
    } else if (hasPending) {
      newProposalStatus = 'pending'
    }

    await supabaseAdmin
      .from('proposals')
      .update({
        status: newProposalStatus,
        review_notes: review_notes || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', proposalId)

    return NextResponse.json({
      success: true,
      action,
      registration_id,
    })

  } catch (error: any) {
    console.error('Proposal review API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/lecturer/proposals/:id
 * Archives (soft deletes) a proposal
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

    const proposalId = params.id

    // Verify ownership
    const { data: existingProposal } = await supabaseAdmin
      .from('proposals')
      .select('supervisor_id, status')
      .eq('id', proposalId)
      .single()

    if (!existingProposal || existingProposal.supervisor_id !== userId) {
      return NextResponse.json({ error: 'Forbidden: Not your proposal' }, { status: 403 })
    }

    // Check if proposal has active registrations
    const { count: registrationCount } = await supabaseAdmin
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('proposal_id', proposalId)
      .in('status', ['pending', 'approved', 'active'])

    if (registrationCount && registrationCount > 0) {
      return NextResponse.json(
        { error: 'Cannot archive proposal with active registrations' },
        { status: 400 }
      )
    }

    // Archive proposal
    const { error: deleteError } = await supabaseAdmin
      .from('proposals')
      .update({ status: 'archived' })
      .eq('id', proposalId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Proposal delete API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
