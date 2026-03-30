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
 * GET /api/lecturer/grades/:id
 * Returns detailed grade info with submission and student data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const gradeId = params.id

    // Get grade with submission and student info
    const { data: grade, error: gradeError } = await supabaseAdmin
      .from('grades')
      .select(`
        *,
        submissions (
          id,
          round_number,
          file_url,
          file_name,
          submitted_at,
          status,
          registrations (
            student_id,
            status,
            proposals (
              title,
              supervisor_id
            )
          ),
          profiles (
            full_name,
            student_code
          )
        )
      `)
      .eq('id', gradeId)
      .single()

    if (gradeError) {
      return NextResponse.json({ error: gradeError.message }, { status: 500 })
    }

    if (!grade) {
      return NextResponse.json({ error: 'Grade not found' }, { status: 404 })
    }

    // Verify grader ownership or supervisor access
    const isGrader = grade.grader_id === userId
    const isSupervisor = grade.submissions?.registrations?.proposals?.supervisor_id === userId

    if (!isGrader && !isSupervisor) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 })
    }

    return NextResponse.json(grade)

  } catch (error: any) {
    console.error('Grade detail API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/lecturer/grades/:id
 * Updates an existing grade
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const gradeId = params.id
    const body = await request.json()
    const {
      criteria_scores,
      total_score,
      feedback,
      is_published,
    } = body

    // Verify grader ownership
    const { data: existingGrade } = await supabaseAdmin
      .from('grades')
      .select('grader_id')
      .eq('id', gradeId)
      .single()

    if (!existingGrade || existingGrade.grader_id !== userId) {
      return NextResponse.json({ error: 'Forbidden: Not your grade' }, { status: 403 })
    }

    // Update grade
    const updateData: any = {}
    if (criteria_scores !== undefined) updateData.criteria_scores = criteria_scores
    if (total_score !== undefined) updateData.total_score = total_score
    if (feedback !== undefined) updateData.feedback = feedback
    if (is_published !== undefined) updateData.is_published = is_published

    const { data: updatedGrade, error: updateError } = await supabaseAdmin
      .from('grades')
      .update(updateData)
      .eq('id', gradeId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json(updatedGrade)

  } catch (error: any) {
    console.error('Grade update API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/lecturer/grades/:id
 * Deletes a grade (admin only or grader before publishing)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const gradeId = params.id

    // Get grade to check ownership and publish status
    const { data: existingGrade } = await supabaseAdmin
      .from('grades')
      .select('grader_id, is_published')
      .eq('id', gradeId)
      .single()

    if (!existingGrade) {
      return NextResponse.json({ error: 'Grade not found' }, { status: 404 })
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    const isAdmin = profile?.role === 'admin'
    const isGrader = existingGrade.grader_id === userId

    // Only grader (if not published) or admin can delete
    if (!isAdmin && !isGrader) {
      return NextResponse.json({ error: 'Forbidden: Not your grade' }, { status: 403 })
    }

    if (isGrader && existingGrade.is_published) {
      return NextResponse.json(
        { error: 'Cannot delete published grade. Contact admin.' },
        { status: 400 }
      )
    }

    // Delete grade
    const { error: deleteError } = await supabaseAdmin
      .from('grades')
      .delete()
      .eq('id', gradeId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Grade delete API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
