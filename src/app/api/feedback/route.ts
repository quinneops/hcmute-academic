import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role for bypassing RLS
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

// GET /api/feedback?student_id=xxx
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

    // Fetch registrations for this student
    const { data: registrations } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('student_id', studentId)

    // Extract feedback from embedded feedback_thread
    const feedbacks: any[] = []
    ;(registrations || []).forEach((reg: any) => {
      const feedbackThread = reg.feedback_thread || []
      feedbackThread.forEach((fb: any) => {
        feedbacks.push({
          id: fb.id,
          registration_id: reg.id,
          subject: `Feedback Round ${fb.round_number || 1}`,
          content: fb.content,
          is_read: fb.is_read,
          is_from_student: false,
          created_at: fb.created_at,
          lecturer_name: fb.lecturer_name || '',
          type: fb.type || 'written',
          attachment_url: fb.attachment_url,
        })
      })
    })

    // Sort by created_at descending
    feedbacks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json(feedbacks)
  } catch (error: any) {
    console.error('API feedback GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/feedback
export async function POST(request: Request) {
  try {
    // Validate auth header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { student_id, lecturer_id, registration_id, content, is_from_student } = body

    if (!student_id || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get registration to verify student ownership
    const { data: registration } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('id', registration_id)
      .single()

    if (!registration || registration.student_id !== student_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get student profile for denormalization
    const { data: studentProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', student_id)
      .single()

    // Get existing feedback thread
    const feedbackThread = registration.feedback_thread || []

    // Create new feedback
    const newFeedback = {
      id: `fb-${Date.now()}`,
      student_id,
      student_name: studentProfile?.full_name || '',
      lecturer_id,
      round_number: body.round_number || 1,
      content,
      type: 'student_message',
      is_read: false,
      created_at: new Date().toISOString(),
      replies: [],
    }

    feedbackThread.push(newFeedback)

    // Update registration with new feedback thread
    const { error: updateError } = await supabaseAdmin
      .from('registrations')
      .update({ feedback_thread: feedbackThread })
      .eq('id', registration_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json(newFeedback, { status: 201 })
  } catch (error: any) {
    console.error('API feedback POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
