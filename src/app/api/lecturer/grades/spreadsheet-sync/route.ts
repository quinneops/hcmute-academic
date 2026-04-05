import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Auth verification
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Admin access for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/lecturer/grades/spreadsheet-sync
 * Generates a pre-filled CSV template for students needing grading.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch registrations where caller is supervisor or reviewer
    const { data: registrations } = await supabaseAdmin
      .from('registrations')
      .select('id, student_id, student_name, student_code, proposal_title, submissions')
      .or(`proposal_supervisor_id.eq.${user.id},reviewer_id.eq.${user.id}`)

    // Create CSV Header
    const headers = [
      'Submission ID',
      'Student Code',
      'Student Name',
      'Slide (1.0)',
      'Presentation (1.5)',
      'Timing (0.5)',
      'Content (4.0)',
      'Q&A (2.0)',
      'Innovation (1.0)',
      'Bonus (2.0)',
      'Feedback'
    ]

    const rows = []
    ;(registrations || []).forEach(reg => {
      // Find the latest submission that hasn't been graded by this lecturer
      const latestSub = (reg.submissions || [])
        .filter((s: any) => s.status === 'submitted')
        .sort((a: any, b: any) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0]

      if (latestSub) {
        rows.push([
          latestSub.id,
          reg.student_code,
          reg.student_name,
          '', '', '', '', '', '', '', '' // Empty score fields
        ])
      }
    })

    // Return as CSV or JSON
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="grading_template.csv"'
      }
    })

  } catch (error: any) {
    console.error('Spreadsheet sync GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/lecturer/grades/spreadsheet-sync
 * Sync grades from a payload of CSV/JSON data.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { grades } = body // Expected: array of objects { submission_id, scores, feedback }

    if (!Array.isArray(grades)) {
      return NextResponse.json({ error: 'Invalid grades format. Array expected.' }, { status: 400 })
    }

    const results = {
      total: grades.length,
      success: 0,
      errors: [] as string[]
    }

    // Since we're hitting Supabase for each update in bulk, 
    // it's better to fetch and verify then update. 
    // We'll process them in sequence for data integrity.
    for (const item of grades) {
      try {
        const { submission_id, scores, feedback } = item

        // Verify registration and permission
        const { data: registration } = await supabaseAdmin
          .from('registrations')
          .select('*')
          .filter('submissions', 'cs', `[{"id":"${submission_id}"}]`)
          .single()

        if (!registration || (registration.proposal_supervisor_id !== user.id && registration.reviewer_id !== user.id)) {
          results.errors.push(`ID ${submission_id}: Permission denied or not found`)
          continue
        }

        const role = registration.proposal_supervisor_id === user.id ? 'supervisor' : 'reviewer'
        const submissions = registration.submissions || []
        const subIndex = submissions.findIndex((s: any) => s.id === submission_id)

        if (subIndex === -1) {
          results.errors.push(`ID ${submission_id}: Submission missing in records`)
          continue
        }

        const submission = submissions[subIndex]
        const existingGrades = submission.grades || []
        const existingIdx = existingGrades.findIndex((g: any) => g.grader_id === user.id)

        // Calculate total
        const scalarScores = Object.values(scores).map(v => parseFloat(v as string) || 0)
        const totalScore = Math.min(12, Math.max(0, scalarScores.reduce((a, b) => a + b, 0)))

        const newGradeEntry = {
          id: existingIdx >= 0 ? existingGrades[existingIdx].id : `grade-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          grader_id: user.id,
          grader_role: role,
          criteria_scores: scores,
          total_score: totalScore,
          feedback: feedback || '',
          graded_at: new Date().toISOString(),
          is_published: true // Spreadsheet sync usually means "final"
        }

        if (existingIdx >= 0) {
          existingGrades[existingIdx] = newGradeEntry
        } else {
          existingGrades.push(newGradeEntry)
        }

        submissions[subIndex] = {
          ...submission,
          grades: existingGrades,
          status: 'graded',
          graded_at: new Date().toISOString()
        }

        // Update database
        const updatePayload: any = { submissions }
        if (role === 'reviewer') {
          updatePayload.reviewer_score = totalScore
          updatePayload.reviewer_feedback = feedback
          updatePayload.reviewer_submitted_at = new Date().toISOString()
        }

        const { error: updateError } = await supabaseAdmin
          .from('registrations')
          .update(updatePayload)
          .eq('id', registration.id)

        if (updateError) throw updateError
        results.success++

      } catch (err: any) {
        results.errors.push(`ID ${item.submission_id}: ${err.message}`)
      }
    }

    return NextResponse.json({
      message: `Successfully synced ${results.success}/${results.total} grades.`,
      results
    })

  } catch (error: any) {
    console.error('Spreadsheet sync POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
