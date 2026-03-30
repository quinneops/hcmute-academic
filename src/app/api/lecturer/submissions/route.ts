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
 * GET /api/lecturer/submissions
 * Returns submissions that need grading for lecturer's students
 * Uses NoSQL schema - submissions are embedded in registrations.submissions[]
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

    // Fetch registrations for this lecturer (denormalized - no joins needed)
    const { data: registrations } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('proposal_supervisor_id', userId)

    // Extract submissions from embedded data
    const pendingSubmissions: any[] = []
    const gradedSubmissions: any[] = []

    ;(registrations || []).forEach((reg: any) => {
      const submissions = reg.submissions || []
      submissions.forEach((sub: any) => {
        const grades = sub.grades || []
        const hasGrade = grades.some((g: any) => g.grader_id === userId)
        const myGrade = grades.find((g: any) => g.grader_id === userId)

        const submission = {
          id: sub.id,
          registration_id: reg.id,
          student_id: reg.student_id,
          student_name: reg.student_name || 'Unknown',
          student_code: reg.student_code || '',
          thesis_title: reg.proposal_title || 'Unknown',
          round_number: sub.round_number,
          round_name: sub.round_name || `Round ${sub.round_number}`,
          file_url: sub.file_url,
          file_name: sub.file_name,
          file_size: sub.file_size,
          submitted_at: sub.submitted_at,
          status: sub.status,
          has_grade: !!hasGrade,
          grade_score: myGrade?.total_score,
          grade_feedback: myGrade?.feedback,
        }

        if (hasGrade) {
          gradedSubmissions.push(submission)
        } else {
          pendingSubmissions.push(submission)
        }
      })
    })

    // Sort by submitted_at descending
    pendingSubmissions.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
    gradedSubmissions.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())

    return NextResponse.json({
      pendingSubmissions,
      gradedSubmissions,
    })

  } catch (error: any) {
    console.error('Submissions API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
