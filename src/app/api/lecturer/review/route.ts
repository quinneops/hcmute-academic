import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
)

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch registrations where current user is the reviewer
    const { data: reviews, error } = await supabaseAdmin
      .from('registrations')
      .select(`
        id,
        student_id,
        student_name,
        student_code,
        proposal_title,
        status,
        reviewer_id,
        reviewer_name,
        reviewer_score,
        reviewer_feedback,
        reviewer_deadline,
        submissions
      `)
      .eq('reviewer_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(reviews)

  } catch (error: any) {
    console.error('Reviewer API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const { score, feedback } = await request.json()

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('registrations')
      .update({
        reviewer_score: score,
        reviewer_feedback: feedback,
        reviewer_submitted_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('reviewer_id', user.id) // Ensure only the reviewer can update
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)

  } catch (error: any) {
    console.error('Reviewer API update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
