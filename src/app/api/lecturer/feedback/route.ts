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
 * GET /api/lecturer/feedback
 * Returns feedback history from embedded feedback_thread data
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

    // Fetch registrations for this lecturer
    const { data: registrations } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('proposal_supervisor_id', userId)

    // Extract feedback from embedded feedback_thread
    const feedbacks: any[] = []
    const studentsSet = new Set<string>()
    const students: any[] = []

    ;(registrations || []).forEach((reg: any) => {
      const feedbackThread = reg.feedback_thread || []

      feedbackThread.forEach((fb: any) => {
        if (fb.lecturer_id === userId) {
          feedbacks.push({
            id: fb.id,
            registration_id: reg.id,
            student_id: reg.student_id,
            student_name: reg.student_name,
            student_code: reg.student_code,
            thesis_title: reg.proposal_title,
            content: fb.content,
            type: fb.type || 'written',
            attachment_url: fb.attachment_url,
            attachment_name: fb.attachment_name,
            is_read: fb.is_read,
            read_at: fb.read_at,
            created_at: fb.created_at,
            updated_at: fb.updated_at,
          })
        }
      })

      // Add student to list (include registration_id for feedback creation)
      if (!studentsSet.has(reg.student_id)) {
        studentsSet.add(reg.student_id)
        students.push({
          id: reg.id,  // This is registration_id
          registration_id: reg.id,  // Add explicit registration_id field
          student_id: reg.student_id,
          student_name: reg.student_name || 'Unknown',
          student_code: reg.student_code || '',
          thesis_title: reg.proposal_title || 'Chưa có đề tài',
        })
      }
    })

    // Sort feedbacks by created_at descending
    feedbacks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({
      feedbacks,
      students,
    })

  } catch (error: any) {
    console.error('Feedback API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/lecturer/feedback
 * Create new feedback embedded in registration.feedback_thread
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
    const { registration_id, content, type = 'written', attachment_url, attachment_name } = body

    if (!registration_id || !content) {
      return NextResponse.json(
        { error: 'registration_id and content are required' },
        { status: 400 }
      )
    }

    // Get registration to verify lecturer can give feedback
    const { data: registration } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('id', registration_id)
      .single()

    console.log('[Feedback API] Check access:', {
      userId,
      registrationId: registration_id,
      proposalSupervisorId: registration?.proposal_supervisor_id,
      match: registration?.proposal_supervisor_id === userId,
    })

    if (!registration || registration.proposal_supervisor_id !== userId) {
      console.error('[Feedback API] Access denied:', {
        hasRegistration: !!registration,
        expected: userId,
        actual: registration?.proposal_supervisor_id,
      })
      return NextResponse.json(
        { error: 'You can only give feedback to your own students' },
        { status: 403 }
      )
    }

    // Get lecturer profile for denormalization
    const { data: lecturerProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single()

    // Get existing feedback thread
    const feedbackThread = registration.feedback_thread || []

    // Create new feedback
    const newFeedback = {
      id: `fb-${Date.now()}`,
      lecturer_id: userId,
      lecturer_name: lecturerProfile?.full_name || '',
      round_number: body.round_number,
      content,
      type,
      attachment_url: attachment_url || null,
      attachment_name: attachment_name || null,
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      replies: [],
    }

    feedbackThread.push(newFeedback)

    // Update registration with new feedback thread
    const { error: updateError } = await supabaseAdmin
      .from('registrations')
      .update({ feedback_thread: feedbackThread })
      .eq('id', registration_id)

    if (updateError) {
      console.error('Feedback create error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      feedback: newFeedback,
    })

  } catch (error: any) {
    console.error('Feedback API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
