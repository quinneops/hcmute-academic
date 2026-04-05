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
 * GET /api/student/proposals
 * Returns proposals created by the student
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const studentId = user.id

    const { data: proposals, error } = await supabaseAdmin
      .from('proposals')
      .select('*')
      .eq('created_by', studentId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ proposals: proposals || [] })
  } catch (error: any) {
    console.error('Student Proposals GET error:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}

/**
 * POST /api/student/proposals
 * Creates a new proposal and a corresponding registration
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const studentId = user.id

    const body = await request.json()
    const { title, description, category, type, supervisor_id, motivation_letter } = body

    if (!title || !supervisor_id || !type) {
      return NextResponse.json(
        { error: 'title, supervisor_id, and type are required' },
        { status: 400 }
      )
    }

    // Get active semester
    const { data: currentSemester } = await supabaseAdmin
      .from('semesters')
      .select('id, name')
      .eq('is_current', true)
      .single()

    // Get supervisor details
    const { data: supervisor } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', supervisor_id)
      .single()

    if (!supervisor) {
      return NextResponse.json({ error: 'Supervisor not found' }, { status: 404 })
    }

    // Get student details
    const { data: student } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, student_code')
      .eq('id', studentId)
      .single()

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Check if student already has active registration
    const { data: activeRegs } = await supabaseAdmin
      .from('registrations')
      .select('id')
      .eq('student_id', studentId)
      .in('status', ['pending', 'approved'])

    if (activeRegs && activeRegs.length > 0) {
      return NextResponse.json(
        { error: 'You already have an active registration' },
        { status: 400 }
      )
    }

    // 1. Create the Proposal
    const { data: newProposal, error: proposalError } = await supabaseAdmin
      .from('proposals')
      .insert({
        title,
        description: description || null,
        category: category || null,
        type: type,
        status: 'pending', // explicitly marked depending on instructor approval
        created_by: studentId,
        supervisor_id: supervisor_id,
        supervisor_name: supervisor.full_name,
        supervisor_email: supervisor.email,
        semester_id: currentSemester?.id,
        semester_name: currentSemester?.name,
        max_students: 1, // Student-proposed topics are usually for 1 student
      })
      .select()
      .single()

    if (proposalError) {
      throw new Error('Failed to create proposal: ' + proposalError.message)
    }

    // 2. Create the Registration for the student
    const registrationData = {
      proposal_id: newProposal.id,
      student_id: studentId,
      student_name: student.full_name,
      student_code: student.student_code || '',
      student_email: student.email,
      proposal_title: newProposal.title,
      proposal_supervisor_id: newProposal.supervisor_id,
      proposal_type: newProposal.type,
      status: 'pending',
      motivation_letter: motivation_letter || null,
      submitted_at: new Date().toISOString()
    }

    // Create the registration
    const { data: newReg, error: regError } = await supabaseAdmin
      .from('registrations')
      .insert(registrationData)
      .select()
      .single()

    if (regError) {
      // Rollback proposal if registration fails (not a true transaction but best effort)
      await supabaseAdmin.from('proposals').delete().eq('id', newProposal.id)
      throw new Error('Failed to create registration: ' + regError.message)
    }

    // 3. Update the proposal's registrations_summary to include this new registration
    const initialSummary = [{
      id: newReg.id,
      student_id: studentId,
      student_name: student.full_name,
      student_code: student.student_code || '',
      email: student.email, // Some places use email, some student_email
      student_email: student.email,
      status: 'pending',
      motivation_letter: motivation_letter || null,
      submitted_at: new Date().toISOString()
    }]

    await supabaseAdmin
      .from('proposals')
      .update({
        registrations_summary: initialSummary,
        registrations_count: 1
      })
      .eq('id', newProposal.id)

    return NextResponse.json({
      success: true,
      proposal: newProposal,
      registration: newReg
    })

  } catch (error: any) {
    console.error('Student Proposals API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
