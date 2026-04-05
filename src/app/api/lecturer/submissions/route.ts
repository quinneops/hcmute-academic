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

    const searchParams = request.nextUrl.searchParams
    const role = searchParams.get('role')

    let registrationIds: string[] | null = null

    if (role === 'council') {
      const { data: memberCouncils } = await supabaseAdmin
        .from('councils')
        .select('*')
        .or(`chair_id.eq.${userId},secretary_id.eq.${userId}`)
      
      const { data: moreCouncils } = await supabaseAdmin
        .from('councils')
        .select('*')
        .filter('members', 'cs', `["${userId}"]`)

      const allCouncils = [...(memberCouncils || []), ...(moreCouncils || [])]
      registrationIds = []
      allCouncils.forEach(c => {
         const defs = c.defenses || []
         defs.forEach((d: any) => {
            if (d.registration_id) registrationIds!.push(d.registration_id)
            else if (d.student_id) registrationIds!.push(d.student_id)
         })
      })
    }

    let query = supabaseAdmin.from('registrations').select('*')
    if (role === 'supervisor') {
       query = query.eq('proposal_supervisor_id', userId)
    } else if (role === 'reviewer') {
       query = query.eq('reviewer_id', userId)
    } else if (role === 'council') {
       if (registrationIds && registrationIds.length > 0) {
           // Some records use registration_id, some use student_id.
           // To be safe, we query by both if needed. Usually, 'id' is registration_id and 'student_id' is user_id.
           query = query.or(`id.in.(${registrationIds.join(',')}),student_id.in.(${registrationIds.join(',')})`)
       } else {
           query = query.eq('id', 'NO_DATA_DUMMY')
       }
    } else {
       // If no role specified, return empty to prevent data leaking into wrong UI
       query = query.eq('id', 'MISSING_ROLE_DUMMY')
    }

    // Fetch registrations
    const { data: registrations } = await query

    // Extract submissions from embedded data
    const pendingSubmissions: any[] = []
    const gradedSubmissions: any[] = []

    ;(registrations || []).forEach((reg: any) => {
      const submissions = reg.submissions || []
      submissions.forEach((sub: any) => {
        const grades = sub.grades || []
        const hasGrade = grades.some((g: any) => g.grader_id === userId && (!role || g.grader_role === role))
        const myGrade = grades.find((g: any) => g.grader_id === userId && (!role || g.grader_role === role))

        if (role === 'council') {
          const hasSupervisorGrade = grades.some((g: any) => g.grader_role === 'supervisor')
          const hasReviewerGrade = grades.some((g: any) => g.grader_role === 'reviewer')
          if (!hasSupervisorGrade || !hasReviewerGrade) {
            return // Skip this submission since it hasn't passed GVHD and GVPB yet.
          }
        }

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
          defense_time: reg.defense_session?.scheduled_time || null,
          defense_room: reg.defense_session?.room || null,
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
