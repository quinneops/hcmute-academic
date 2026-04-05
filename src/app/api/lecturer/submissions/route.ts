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

    // 1. Identify all roles and registrations for this user
    // Fetch registrations as supervisor or reviewer
    const { data: directRegistrations } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .or(`proposal_supervisor_id.eq.${userId},reviewer_id.eq.${userId}`)

    // Fetch councils where user is a member
    const { data: memberCouncils } = await supabaseAdmin
      .from('councils')
      .select('*')
      .or(`chair_id.eq.${userId},secretary_id.eq.${userId}`)
    
    const { data: memberCouncilsArray } = await supabaseAdmin
      .from('councils')
      .select('*')
      .filter('members', 'cs', `["${userId}"]`)
    
    const allCouncils = [...(memberCouncils || []), ...(memberCouncilsArray || [])]
    const councilRegistrationIds = new Set<string>()
    allCouncils.forEach(c => {
      const defs = c.defenses || []
      defs.forEach((d: any) => {
        if (d.registration_id) councilRegistrationIds.add(d.registration_id)
        else if (d.student_id) councilRegistrationIds.add(d.student_id)
      })
    })

    // Fetch registrations for council membership if not already fetched
    let allRegistrations = directRegistrations || []
    const existingIds = new Set(allRegistrations.map(r => r.id))
    const missingIds = Array.from(councilRegistrationIds).filter(id => !existingIds.has(id))
    
    if (missingIds.length > 0) {
      // Use direct IDs for council match
      const { data: councilRegs } = await supabaseAdmin
        .from('registrations')
        .select('*')
        .in('id', missingIds)
      if (councilRegs) allRegistrations = [...allRegistrations, ...councilRegs]
    }

    const registrations = allRegistrations

    console.log(`[LecturerSubmissions] Found ${(registrations || []).length} registrations for role: ${role}, user: ${userId}`)

    // Extract submissions from embedded data
    const pendingSubmissions: any[] = []
    const gradedSubmissions: any[] = []

    ;(registrations || []).forEach((reg: any) => {
      const submissions = reg.submissions || []
      console.log(`[LecturerSubmissions] Processing registration ${reg.id} for student ${reg.student_name}. Submissions count: ${submissions.length}`)
      
      submissions.forEach((sub: any) => {
        const roundNum = sub.round_number
        
        // Role-based round assignment
        let assignedInThisRole = false
        const type = sub.submission_type || ''
        
        const isSupervisor = role === 'supervisor' && (reg.proposal_supervisor_id === userId)
        const isReviewer = role === 'reviewer' && (reg.reviewer_id === userId)
        const isCouncil = role === 'council' && councilRegistrationIds.has(reg.id)

        if (isSupervisor && (roundNum === 1 || roundNum === 2 || type === 'proposal' || type === 'interim' || type === 'draft')) assignedInThisRole = true
        else if (isReviewer && (roundNum === 3 || type === 'final')) assignedInThisRole = true
        else if (isCouncil && (roundNum >= 4 || type === 'defense' || type === 'slide')) assignedInThisRole = true
        
        // Fallback for older data or if role is missing (though it shouldn't be with current logic)
        if (!role) assignedInThisRole = true 

        console.log(`[LecturerSubmissions] Checking sub ${sub.id}: round ${roundNum}, role ${role} -> assigned: ${assignedInThisRole}`)

        if (!assignedInThisRole) return

        const grades = sub.grades || []
        const hasGrade = grades.some((g: any) => g.grader_id === userId && (!role || g.grader_role === role))
        const myGrade = grades.find((g: any) => g.grader_id === userId && (!role || g.grader_role === role))

        if (role === 'council') {
          // Check if previous rounds were graded by supervisor and reviewer in ANY submission within this registration
          const allOtherSubmissions = reg.submissions || []
          const hasSupervisorGradeAnywhere = allOtherSubmissions.some((s: any) => 
            (s.grades || []).some((g: any) => g.grader_role === 'supervisor')
          )
          const hasReviewerGradeAnywhere = allOtherSubmissions.some((s: any) => 
            (s.grades || []).some((g: any) => g.grader_role === 'reviewer')
          )
          
          if (!hasSupervisorGradeAnywhere || !hasReviewerGradeAnywhere) {
             console.log(`[LecturerSubmissions] Council skipping sub ${sub.id} because prev rounds not graded anywhere`)
             return 
          }
        }

        const submission = {
          id: sub.id,
          registration_id: reg.id,
          student_id: reg.student_id,
          student_name: reg.student_name || 'Unknown',
          student_code: reg.student_code || '',
          thesis_title: reg.proposal_title || 'Unknown',
          proposal_type: reg.proposal_type || 'KLTN',
          submission_type: sub.submission_type || null,
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
