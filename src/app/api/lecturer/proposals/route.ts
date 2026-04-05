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
 * GET /api/lecturer/proposals
 * Returns proposals supervised by lecturer with registration info from JSONB
 */
export async function GET(request: NextRequest) {
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

    // Fetch proposals - registrations are now embedded in JSONB
    const { data: proposals } = await supabaseAdmin
      .from('proposals')
      .select('*')
      .eq('supervisor_id', userId)
      .order('created_at', { ascending: false })

    // Transform proposals with registrations from JSONB
    const transformedProposals: any[] = []

    ;(proposals || []).forEach((proposal: any) => {
      const registrations = proposal.registrations_summary || []

      if (registrations.length > 0) {
        registrations.forEach((reg: any) => {
          transformedProposals.push({
            ...proposal,
            student_name: reg.student_name || '',
            student_code: reg.student_code || '',
            student_id: reg.student_id,
            registration_id: reg.id,
            registration_status: reg.status,
            submitted_at: reg.submitted_at,
            reviewed_at: reg.reviewed_at,
            review_notes: reg.review_notes,
            motivation_letter: reg.motivation_letter,
            proposed_title: reg.proposed_title,
          })
        })
      } else {
        transformedProposals.push({
          ...proposal,
          student_name: '',
          student_code: '',
          student_id: '',
          registration_id: '',
          registration_status: '',
          submitted_at: proposal.created_at,
          reviewed_at: null,
          review_notes: null,
          motivation_letter: null,
          proposed_title: null,
        })
      }
    })

    const stats = {
      pending: transformedProposals.filter(p => p.registration_status === 'pending' || p.status === 'pending').length,
      approved: transformedProposals.filter(p => p.registration_status === 'approved' || p.status === 'approved').length,
      rejected: transformedProposals.filter(p => p.registration_status === 'rejected' || p.status === 'rejected').length,
    }

    return NextResponse.json({
      proposals: transformedProposals,
      stats,
    })

  } catch (error: any) {
    console.error('Proposals API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/lecturer/proposals
 * Create new proposal or review existing one
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

    const body = await request.json()
    const { action } = body

    // Handle proposal review
    if (action === 'approve' || action === 'reject') {
      const { proposal_id, review_notes } = body

      if (!proposal_id) {
        return NextResponse.json(
          { error: 'proposal_id is required' },
          { status: 400 }
        )
      }

      // Verify ownership
      const { data: proposal } = await supabaseAdmin
        .from('proposals')
        .select('supervisor_id')
        .eq('id', proposal_id)
        .single()

      if (proposal?.supervisor_id !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const newStatus = action === 'approve' ? 'approved' : 'rejected'

      // Update proposal
      const { error: proposalError } = await supabaseAdmin
        .from('proposals')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposal_id)

      if (proposalError) {
        return NextResponse.json({ error: proposalError.message }, { status: 500 })
      }

      // Update all pending registrations for this proposal
      const { data: pendingRegistrations } = await supabaseAdmin
        .from('registrations')
        .select('id')
        .eq('proposal_id', proposal_id)
        .eq('status', 'pending')

      // Update each registration and add to proposal's registrations_summary
      if (pendingRegistrations && pendingRegistrations.length > 0) {
        for (const reg of pendingRegistrations) {
          // Update registration
          await supabaseAdmin
            .from('registrations')
            .update({
              status: newStatus === 'approved' ? 'approved' : 'rejected',
              reviewed_at: new Date().toISOString(),
              reviewed_by: userId,
              review_notes,
            })
            .eq('id', reg.id)

          // Get registration data for updating summary
          const { data: regData } = await supabaseAdmin
            .from('registrations')
            .select('*')
            .eq('id', reg.id)
            .single()

          // Update proposal's registrations_summary
          const { data: propData } = await supabaseAdmin
            .from('proposals')
            .select('registrations_summary')
            .eq('id', proposal_id)
            .single()

          const summary = propData?.registrations_summary || []
          const updatedSummary = summary.map((s: any) =>
            s.id === reg.id ? { ...s, status: newStatus, reviewed_at: new Date().toISOString(), review_notes } : s
          )

          await supabaseAdmin
            .from('proposals')
            .update({ registrations_summary: updatedSummary })
            .eq('id', proposal_id)
        }

        // Send Email Notifications (Async)
        await notifyStudentsOfReview(proposal_id, newStatus, review_notes)
      }

      return NextResponse.json({
        success: true,
        status: newStatus,
      })
    }

    // Handle proposal creation
    const { title, description, category, tags, requirements, max_students } = body

    if (!title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      )
    }

    // Get current semester
    const { data: semester } = await supabaseAdmin
      .from('semesters')
      .select('id')
      .eq('is_current', true)
      .single()

    // Get supervisor profile for denormalization
    const { data: supervisorProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single()

    // Create proposal
    const { data: proposal, error: insertError } = await supabaseAdmin
      .from('proposals')
      .insert({
        title,
        description: description || null,
        category: category || null,
        tags: tags || [],
        requirements: requirements || null,
        max_students: max_students || 1,
        supervisor_id: userId,
        supervisor_name: supervisorProfile?.full_name || '',
        supervisor_email: supervisorProfile?.email || '',
        semester_id: semester?.id || null,
        type: body.type || 'KLTN',
        status: 'approved',
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      proposal,
    })
  } catch (error: any) {
    console.error('Proposals API error:', error)
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
    const { data: regs } = await supabaseAdmin
      .from('registrations')
      .select('student_name, student_email')
      .eq('proposal_id', proposalId)
      .eq('status', status)

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
