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
 * GET /api/lecturer/grades
 * Returns pending grading list from embedded submissions data
 */
export async function GET(request: NextRequest) {
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

    // Fetch registrations for this lecturer (denormalized)
    const { data: registrations } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('proposal_supervisor_id', userId)

    // Extract submissions that need grading from embedded data
    const pendingGrading: any[] = []

    ;(registrations || []).forEach((reg: any) => {
      const submissions = reg.submissions || []
      submissions.forEach((sub: any) => {
        // Check if submission needs grading (no grade from this lecturer)
        const grades = sub.grades || []
        const hasMyGrade = grades.some((g: any) => g.grader_id === userId)

        if (!hasMyGrade && sub.status === 'submitted') {
          pendingGrading.push({
            submission_id: sub.id,
            round_id: sub.round_id,
            round_number: sub.round_number,
            round_name: sub.round_name || `Round ${sub.round_number}`,
            registration_id: reg.id,
            student_id: reg.student_id,
            student_name: reg.student_name,
            student_code: reg.student_code,
            proposal_title: reg.proposal_title,
            file_url: sub.file_url,
            file_name: sub.file_name,
            submitted_at: sub.submitted_at,
            status: sub.status,
          })
        }
      })
    })

    // Get graded submissions history
    const gradedHistory: any[] = []

    ;(registrations || []).forEach((reg: any) => {
      const submissions = reg.submissions || []
      submissions.forEach((sub: any) => {
        const grades = sub.grades || []
        grades.forEach((grade: any) => {
          if (grade.grader_id === userId) {
            gradedHistory.push({
              id: grade.id || `${sub.id}-${userId}`,
              submission_id: sub.id,
              grade_id: grade.id,
              submission: {
                id: sub.id,
                round_number: sub.round_number,
                file_url: sub.file_url,
                file_name: sub.file_name,
              },
              registration: {
                student_id: reg.student_id,
                student_name: reg.student_name,
                student_code: reg.student_code,
                proposal_title: reg.proposal_title,
              },
              grader_id: grade.grader_id,
              grader_role: grade.grader_role,
              criteria_scores: grade.criteria_scores,
              total_score: grade.total_score,
              feedback: grade.feedback,
              is_published: grade.is_published,
              graded_at: grade.graded_at,
            })
          }
        })
      })
    })

    return NextResponse.json({
      pendingGrading,
      gradedHistory,
    })

  } catch (error: any) {
    console.error('Grades API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/lecturer/grades
 * Create or update a grade embedded in submission
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
    const {
      submission_id,
      registration_id,
      criteria_scores,
      total_score,
      feedback,
      is_published = false,
    } = body

    if (!submission_id || !registration_id) {
      return NextResponse.json(
        { error: 'submission_id and registration_id are required' },
        { status: 400 }
      )
    }

    // Get registration to verify lecturer can grade
    const { data: registration } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('id', registration_id)
      .single()

    if (!registration || registration.proposal_supervisor_id !== userId) {
      return NextResponse.json(
        { error: 'You can only grade your own students\' submissions' },
        { status: 403 }
      )
    }

    // Get lecturer profile for denormalization
    const { data: lecturerProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single()

    // Find the submission in embedded data
    const submissions = registration.submissions || []
    const submissionIndex = submissions.findIndex((s: any) => s.id === submission_id)

    if (submissionIndex === -1) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    const submission = submissions[submissionIndex]
    const grades = submission.grades || []

    // Check if grade already exists from this lecturer
    const existingGradeIndex = grades.findIndex((g: any) => g.grader_id === userId)

    const newGrade = {
      id: existingGradeIndex >= 0 ? grades[existingGradeIndex].id : `grade-${Date.now()}`,
      grader_id: userId,
      grader_name: lecturerProfile?.full_name || '',
      grader_role: 'supervisor',
      criteria_scores: criteria_scores || {},
      total_score,
      feedback,
      is_published,
      graded_at: new Date().toISOString(),
    }

    if (existingGradeIndex >= 0) {
      grades[existingGradeIndex] = newGrade
    } else {
      grades.push(newGrade)
    }

    // Update submission with new grades
    submissions[submissionIndex] = {
      ...submission,
      grades,
      graded_at: new Date().toISOString(),
      status: 'graded',
    }

    // Update registration with new submissions array
    const { error: updateError } = await supabaseAdmin
      .from('registrations')
      .update({ submissions })
      .eq('id', registration_id)

    if (updateError) {
      console.error('Grade update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      grade: newGrade,
    })

  } catch (error: any) {
    console.error('Grade API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/lecturer/grades
 * Update an existing grade
 */
export async function PATCH(request: NextRequest) {
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
    const { grade_id, submission_id, registration_id, criteria_scores, total_score, feedback, is_published } = body

    if (!registration_id) {
      return NextResponse.json({ error: 'registration_id is required' }, { status: 400 })
    }

    // Get registration
    const { data: registration } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('id', registration_id)
      .single()

    if (!registration || registration.proposal_supervisor_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Find submission and grade
    const submissions = registration.submissions || []
    const submission = submissions.find((s: any) =>
      s.id === submission_id ||
      (s.grades || []).some((g: any) => g.id === grade_id)
    )

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    const grades = submission.grades || []
    const gradeIndex = grades.findIndex((g: any) => g.id === grade_id || g.grader_id === userId)

    if (gradeIndex === -1) {
      return NextResponse.json({ error: 'Grade not found' }, { status: 404 })
    }

    // Update grade
    grades[gradeIndex] = {
      ...grades[gradeIndex],
      criteria_scores: criteria_scores || grades[gradeIndex].criteria_scores,
      total_score: total_score !== undefined ? total_score : grades[gradeIndex].total_score,
      feedback: feedback !== undefined ? feedback : grades[gradeIndex].feedback,
      is_published: is_published !== undefined ? is_published : grades[gradeIndex].is_published,
      graded_at: new Date().toISOString(),
    }

    // Update registration
    const { error: updateError } = await supabaseAdmin
      .from('registrations')
      .update({ submissions })
      .eq('id', registration_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Grade update API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
