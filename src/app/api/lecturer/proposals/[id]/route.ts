import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import { RegistrationStatusEmail } from '@/emails/templates/registration-status'
import * as React from 'react'

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
    console.log(`[Review] Action: ${action}, Proposal: ${proposalId}, Reg: ${registration_id || 'Batch'}`)

    if (registration_id) {
      const { error: regError, data: updatedRegs } = await supabaseAdmin
        .from('registrations')
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId,
          review_notes: review_notes || null,
        })
        .eq('id', registration_id)
        .eq('proposal_id', proposalId)
        .select()

      if (regError) {
        console.error('[Review] Registration update error:', regError)
        return NextResponse.json({ error: regError.message }, { status: 500 })
      }
      console.log(`[Review] Updated ${updatedRegs?.length || 0} registration(s)`)
    } else {
      // Update all pending registrations for this proposal
      const { error: regError, data: updatedRegs } = await supabaseAdmin
        .from('registrations')
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId,
          review_notes: review_notes || null,
        })
        .eq('proposal_id', proposalId)
        .eq('status', 'pending')
        .select()

      if (regError) {
        console.error('[Review] Batch registration update error:', regError)
        return NextResponse.json({ error: regError.message }, { status: 500 })
      }
      console.log(`[Review] Updated ${updatedRegs?.length || 0} pending registration(s)`)
    }

    // Send Email Notifications (Async)
    notifyStudentsOfReview(proposalId, registration_id, newStatus, review_notes)

    // Sync denormalized data in proposals table
    const { data: allRegistrations } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('proposal_id', proposalId)

    if (!allRegistrations) {
      console.error('[Review] Failed to fetch all registrations for sync')
      return NextResponse.json({ error: 'Failed to sync registrations' }, { status: 500 })
    }

    // Rebuild registrations_summary JSONB
    const updatedSummary = allRegistrations.map((reg: any) => ({
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
    }))

    // Direct status update
    const finalProposalStatus = newStatus

    const { error: propUpdateError, data: updatedProposal } = await supabaseAdmin
      .from('proposals')
      .update({
        status: finalProposalStatus,
        registrations_summary: updatedSummary,
        updated_at: new Date().toISOString()
      })
      .eq('id', proposalId)
      .select()
      .single()

    if (propUpdateError) {
      console.error('[Review] Proposal sync error:', propUpdateError)
    } else {
      console.log(`[Review] Proposal status updated to: ${updatedProposal.status}`)
    }

    return NextResponse.json({
      success: true,
      action,
      registration_id,
      proposal_status: finalProposalStatus,
      updated_registrations: allRegistrations.length
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
 * Send email notifications to student(s) after review
 */
async function notifyStudentsOfReview(
  proposalId: string,
  registrationId: string | undefined,
  status: 'approved' | 'rejected',
  reviewNotes?: string
) {
  try {
    // Get proposal title
    const { data: proposal } = await supabaseAdmin
      .from('proposals')
      .select('title')
      .eq('id', proposalId)
      .single()

    if (!proposal) return

    // Get target registration(s)
    let query = supabaseAdmin
      .from('registrations')
      .select('student_name, student_email')
      .eq('proposal_id', proposalId)

    if (registrationId) {
      query = query.eq('id', registrationId)
    } else {
      // If batch, we only notify those that were just updated (this is a bit tricky, but usually batch means all was pending)
      query = query.eq('status', status)
    }

    const { data: regs } = await query

    if (!regs || regs.length === 0) return

    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/student/registrations`

    // Send emails in parallel
    await Promise.all(regs.map(async (reg) => {
      if (!reg.student_email) return

      await sendEmail({
        to: reg.student_email,
        subject: `[Academic Nexus] Kết quả đăng ký đề tài: ${proposal.title}`,
        react: React.createElement(RegistrationStatusEmail, {
          studentName: reg.student_name,
          proposalTitle: proposal.title,
          status: status,
          reviewNotes: reviewNotes,
          actionUrl: dashboardUrl,
        }) as React.ReactElement,
      })
    }))
  } catch (err) {
    console.error('Failed to notify students via email:', err)
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
