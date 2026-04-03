import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key to bypass RLS (we'll validate auth manually)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/registrations?student_id=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('student_id')

    if (!studentId) {
      return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
    }

    // Validate auth header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is student
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'student') {
      return NextResponse.json({ error: 'Forbidden - students only' }, { status: 403 })
    }

    // Only allow students to view their own registrations
    if (user.id !== studentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch registrations
    const { data, error } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false })

    if (error) throw error

    // Get unique proposal IDs to fetch supervisor info
    const proposalIds = Array.from(new Set((data || []).map((r: any) => r.proposal_id).filter(Boolean)))
    const supervisorIds = Array.from(new Set((data || []).map((r: any) => r.proposal_supervisor_id).filter(Boolean)))

    // Fetch proposals to get supervisor info
    let proposalsMap = new Map()
    if (proposalIds.length > 0) {
      const { data: proposals } = await supabaseAdmin
        .from('proposals')
        .select('id, supervisor_id, supervisor_name, supervisor_email, category, tags')
        .in('id', proposalIds)

      if (proposals) {
        proposals.forEach((p: any) => {
          proposalsMap.set(p.id, {
            supervisor_id: p.supervisor_id,
            supervisor_name: p.supervisor_name,
            supervisor_email: p.supervisor_email,
            category: p.category,
            tags: p.tags || [],
          })
        })
      }
    }

    // Fetch profiles to get lecturer_code
    let lecturersMap = new Map()
    if (supervisorIds.length > 0) {
      const { data: lecturers } = await supabaseAdmin
        .from('profiles')
        .select('id, lecturer_code')
        .in('id', supervisorIds)

      if (lecturers) {
        lecturers.forEach((l: any) => {
          lecturersMap.set(l.id, { lecturer_code: l.lecturer_code })
        })
      }
    }

    // Transform registrations to include embedded data and supervisor info
    const transformedData = (data || []).map((reg: any) => {
      const proposalInfo = proposalsMap.get(reg.proposal_id) || {}
      const lecturerInfo = lecturersMap.get(proposalInfo.supervisor_id) || {}
      return ({
        id: reg.id,
        proposal_id: reg.proposal_id,
        proposal_title: reg.proposal_title,
        proposal_category: proposalInfo.category || null,
        proposal_tags: proposalInfo.tags || [],
        proposal_supervisor_id: reg.proposal_supervisor_id,
        status: reg.status,
        motivation_letter: reg.motivation_letter,
        proposed_title: reg.proposed_title,
        submitted_at: reg.submitted_at,
        reviewed_at: reg.reviewed_at,
        review_notes: reg.review_notes,
        final_score: reg.final_score,
        final_grade: reg.final_grade,
        supervisor_name: proposalInfo.supervisor_name || null,
        supervisor_email: proposalInfo.supervisor_email || null,
        lecturer_code: lecturerInfo.lecturer_code || null,
        // Embedded submissions
        submissions: reg.submissions || [],
        // Embedded feedback
        feedback_thread: reg.feedback_thread || [],
        // Embedded defense session
        defense_session: reg.defense_session,
      })
    })

    return NextResponse.json(transformedData)
  } catch (error: any) {
    console.error('API registrations GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/registrations
export async function POST(request: Request) {
  try {
    // Validate auth header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is student
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'student') {
      return NextResponse.json({ error: 'Forbidden - students only' }, { status: 403 })
    }

    const body = await request.json()
    const { student_id, proposal_id, motivation_letter, proposed_title } = body

    if (!student_id || !proposal_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Ensure student can only create registration for themselves
    if (user.id !== student_id) {
      return NextResponse.json({ error: 'Forbidden - can only register yourself' }, { status: 403 })
    }

    // Check if already registered for ANY proposal (each student can only register 1 proposal)
    const { data: existingRegistrations } = await supabaseAdmin
      .from('registrations')
      .select('id, proposal_id, status')
      .eq('student_id', student_id)
      .in('status', ['pending', 'approved'])

    if (existingRegistrations && existingRegistrations.length > 0) {
      const activeReg = existingRegistrations[0]
      return NextResponse.json({
        error: 'Bạn chỉ được đăng ký 1 đề tài duy nhất',
        detail: `Bạn đã đăng ký đề tài ID ${activeReg.proposal_id} (trạng thái: ${activeReg.status})`,
        existing_registration_id: activeReg.id,
        existing_proposal_id: activeReg.proposal_id,
      }, { status: 409 })
    }

    // Get student profile for denormalization
    const { data: studentProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, student_code')
      .eq('id', student_id)
      .single()

    // Get proposal info for denormalization
    const { data: proposal } = await supabaseAdmin
      .from('proposals')
      .select('title, supervisor_id, supervisor_name, supervisor_email')
      .eq('id', proposal_id)
      .single()

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    // Create registration (data is denormalized - no FK needed)
    const { data: registration, error: insertError } = await supabaseAdmin
      .from('registrations')
      .insert({
        student_id,
        student_name: studentProfile?.full_name || '',
        student_email: studentProfile?.email || '',
        student_code: studentProfile?.student_code || '',
        proposal_id,
        proposal_title: proposal.title,
        proposal_supervisor_id: proposal.supervisor_id,
        motivation_letter,
        proposed_title,
        status: 'pending',
        submissions: [],
        feedback_thread: [],
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Update proposal's registrations_summary
    const { data: propData } = await supabaseAdmin
      .from('proposals')
      .select('registrations_summary, registrations_count')
      .eq('id', proposal_id)
      .single()

    const currentSummary = propData?.registrations_summary || []
    const newSummary = [
      ...currentSummary,
      {
        id: registration.id,
        student_id: registration.student_id,
        student_name: registration.student_name,
        student_code: registration.student_code,
        status: 'pending',
        submitted_at: registration.submitted_at,
        motivation_letter,
        proposed_title,
      },
    ]

    await supabaseAdmin
      .from('proposals')
      .update({
        registrations_summary: newSummary,
        registrations_count: (propData?.registrations_count || 0) + 1,
      })
      .eq('id', proposal_id)

    return NextResponse.json(registration, { status: 201 })
  } catch (error: any) {
    console.error('API registrations POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
