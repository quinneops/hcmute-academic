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
 * POST /api/lecturer/proposals/bulk-review
 * Approve all pending registrations for the lecturer's proposals
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    let userId: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user }, error } = await supabaseAuth.auth.getUser(token)
      if (error || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = user.id
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action } = await request.json()
    if (action !== 'approve') {
        return NextResponse.json({ error: 'Only bulk approve is supported' }, { status: 400 })
    }

    const reviewNotes = "Hồ sơ đề cương đã được phê duyệt hàng loạt."
    const now = new Date().toISOString()

    console.log(`[Bulk-Review] Starting for lecturer: ${userId}`)

    // 1. Identify all pending registrations for this lecturer's proposals
    const { data: pendingRegistrations, error: fetchError } = await supabaseAdmin
      .from('registrations')
      .select('id, proposal_id, student_email, student_name, proposal_title')
      .eq('proposal_supervisor_id', userId)
      .eq('status', 'pending')

    if (fetchError) {
      console.error('[Bulk-Review] Fetch error:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!pendingRegistrations || pendingRegistrations.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No pending registrations found',
        count: 0 
      })
    }

    const affectedProposalIds = Array.from(new Set(pendingRegistrations.map(r => r.proposal_id)))
    console.log(`[Bulk-Review] Found ${pendingRegistrations.length} registrations across ${affectedProposalIds.length} proposals`)

    // 2. Bulk update registrations
    const { error: regUpdateError } = await supabaseAdmin
      .from('registrations')
      .update({
        status: 'approved',
        reviewed_at: now,
        reviewed_by: userId,
        review_notes: reviewNotes
      })
      .eq('proposal_supervisor_id', userId)
      .eq('status', 'pending')

    if (regUpdateError) {
      console.error('[Bulk-Review] Registration update error:', regUpdateError)
      return NextResponse.json({ error: regUpdateError.message }, { status: 500 })
    }

    // 3. Update each affected proposal's status and registrations_summary
    for (const proposalId of affectedProposalIds) {
      const { data: allRegs } = await supabaseAdmin
        .from('registrations')
        .select('*')
        .eq('proposal_id', proposalId)

      if (allRegs) {
        const updatedSummary = allRegs.map((reg: any) => ({
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

        // For bulk-review, we set the proposal to approved directly
        await supabaseAdmin
          .from('proposals')
          .update({
            status: 'approved',
            registrations_summary: updatedSummary,
            updated_at: now
          })
          .eq('id', proposalId)
      }
    }

    // 4. Send Email Notifications (Async)
    // We don't want to block the response for emails
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/student/registrations`
    
    // Fire and forget email sending
    Promise.all(pendingRegistrations.map(async (reg) => {
      if (!reg.student_email) return

      try {
        await sendEmail({
          to: reg.student_email,
          subject: `[Academic Nexus] Kết quả đăng ký đề tài: ${reg.proposal_title}`,
          react: React.createElement(RegistrationStatusEmail, {
            studentName: reg.student_name,
            proposalTitle: reg.proposal_title,
            status: 'approved',
            reviewNotes: reviewNotes,
            actionUrl: dashboardUrl,
          }) as React.ReactElement,
        })
      } catch (err) {
        console.error(`[Bulk-Review] Email failed for ${reg.student_email}:`, err)
      }
    }))

    return NextResponse.json({
      success: true,
      count: pendingRegistrations.length,
      proposals_affected: affectedProposalIds.length
    })

  } catch (error: any) {
    console.error('[Bulk-Review] API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
