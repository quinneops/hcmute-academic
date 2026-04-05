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
 * GET /api/lecturer/students
 * Returns list of students supervised by lecturer
 */
export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization')
    let userId: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      // Verify token and get user
      const { data: { user }, error } = await supabaseAuth.auth.getUser(token)
      if (error || !user) {
        console.error('Auth error:', error)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = user.id
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to verify lecturer role (bypass RLS)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('Profile error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile?.role !== 'lecturer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch students from registrations table (denormalized - no joins needed)
    const { data: registrations, error } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('proposal_supervisor_id', userId)

    if (error) {
      console.error('Students fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform registrations to student list with embedded submission data
    const students = (registrations || []).map((reg: any) => {
      const submissions = reg.submissions || []
      const lastSubmission = submissions.length > 0 ? submissions[submissions.length - 1] : null

      // Calculate final score from latest graded submission
      let calculatedFinalScore: number | null = null
      let calculatedFinalGrade: string | null = null

      // Find the latest submission with grades
      for (let i = submissions.length - 1; i >= 0; i--) {
        const sub = submissions[i]
        if (sub.grades && sub.grades.length > 0 && sub.grades[0].total_score) {
          calculatedFinalScore = sub.grades[0].total_score
          // Convert score to grade
          if (calculatedFinalScore >= 8.5) calculatedFinalGrade = 'A'
          else if (calculatedFinalScore >= 7.0) calculatedFinalGrade = 'B'
          else if (calculatedFinalScore >= 5.5) calculatedFinalGrade = 'C'
          else if (calculatedFinalScore >= 4.0) calculatedFinalGrade = 'D'
          else calculatedFinalGrade = 'F'
          break
        }
      }

      // Use calculated score if final_score not set, otherwise use stored value
      const finalScore = reg.final_score || calculatedFinalScore
      const finalGrade = reg.final_grade || calculatedFinalGrade

      // Calculate progress percentage based on submissions count and defense status
      let progressPercentage = 0
      if (submissions.length > 0) {
        progressPercentage = Math.min(100, (submissions.length / 6) * 100) // Assume 6 rounds max
      }
      if (reg.defense_session?.status === 'completed') {
        progressPercentage = 100
      }

      return {
        registration_id: reg.id,
        student_id: reg.student_id,
        student_name: reg.student_name || 'Unknown',
        student_code: reg.student_code || '',
        student_email: reg.student_email || '',
        proposal_id: reg.proposal_id,
        proposal_title: reg.proposal_title || 'Unknown',
        proposal_type: reg.proposal_type || 'KLTN',
        registration_status: reg.status,
        submitted_at: reg.submitted_at,
        reviewed_at: reg.reviewed_at,
        review_notes: reg.review_notes,
        final_score: finalScore,
        final_grade: finalGrade,
        defense_status: reg.defense_session?.status || null,
        defense_date: reg.defense_session?.scheduled_at || null,
        total_submissions: submissions.length,
        last_submission_at: lastSubmission?.submitted_at || null,
        last_submission_status: lastSubmission?.status || null,
        progress_percentage: Math.round(progressPercentage),
      }
    })

    // Calculate stats
    const stats = {
      total: students.length,
      active: students.filter((s: any) =>
        ['pending', 'approved', 'active'].includes(s.registration_status)
      ).length,
      defended: students.filter((s: any) =>
        ['completed', 'defended'].includes(s.registration_status) || s.defense_status === 'completed'
      ).length,
    }

    return NextResponse.json({
      students: students || [],
      stats,
    })

  } catch (error: any) {
    console.error('Students API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
