import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/submissions?student_id=xxx
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
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch registrations for this student
    const { data: registrations } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('student_id', studentId)

    // Extract submissions from embedded data
    const submissions: any[] = []
    const SUBMISSION_TYPES = ['proposal', 'draft', 'interim', 'final', 'slide', 'defense']
    ;(registrations || []).forEach((reg: any) => {
      const regSubmissions = reg.submissions || []
      regSubmissions.forEach((sub: any) => {
        submissions.push({
          id: sub.id,
          round_number: sub.round_number,
          round_name: sub.round_name || `Round ${sub.round_number}`,
          file_url: sub.file_url,
          file_name: sub.file_name,
          file_size: sub.file_size,
          status: sub.status,
          submitted_at: sub.submitted_at,
          graded_at: sub.graded_at,
          score: sub.grades?.[0]?.total_score || null,
          feedback: sub.grades?.[0]?.feedback || null,
          thesis_title: reg.proposal_title || 'Khóa luận tốt nghiệp',
          registration_id: reg.id,
          submission_type: sub.submission_type || SUBMISSION_TYPES[(sub.round_number - 1) % SUBMISSION_TYPES.length],
          document_number: sub.document_number || 1,
        })
      })
    })

    // Sort by submitted_at descending
    submissions.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())

    return NextResponse.json(submissions)
  } catch (error: any) {
    console.error('API submissions GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/submissions
export async function POST(request: Request) {
  try {
    // Validate auth header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { student_id, registration_id, round_number, file_url, file_name, file_size } = body

    if (!student_id || !registration_id || !round_number) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get registration to verify student ownership
    const { data: registration } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('id', registration_id)
      .single()

    if (!registration || registration.student_id !== student_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get round info from semesters if round_number provided
    const roundName = body.round_name || `Round ${round_number}`

    // Get existing submissions
    const submissions = registration.submissions || []

    // Create new submission
    const newSubmission = {
      id: `sub-${Date.now()}`,
      round_id: body.round_id || `round-${round_number}`,
      round_number,
      round_name: roundName,
      file_url,
      file_name,
      file_size,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      grades: [],
    }

    submissions.push(newSubmission)

    // Update registration with new submission
    const { error: updateError } = await supabaseAdmin
      .from('registrations')
      .update({ submissions })
      .eq('id', registration_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json(newSubmission, { status: 201 })
  } catch (error: any) {
    console.error('API submissions POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
