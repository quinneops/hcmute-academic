import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * GET /api/lecturer/post-defense/submissions
 * Returns registrations where post_defense_edit_status = 'pending_supervisor'
 * for the authenticated lecturer's supervised students.
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

    const { data: registrations, error: regError } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('proposal_supervisor_id', user.id)
      .eq('post_defense_edit_status', 'pending_supervisor')

    if (regError) throw regError

    const result = (registrations || []).map(reg => ({
      id: reg.id,
      student_name: reg.student_name,
      student_code: reg.student_code,
      thesis_title: reg.proposal_title,
      final_score: reg.final_score,
      editing_file_url: reg.editing_file_url,
      council_minutes: reg.council_minutes || null,
      explanation_letter_url: reg.explanation_letter_url || null,
      post_defense_edit_status: reg.post_defense_edit_status,
      updated_at: reg.updated_at,
    }))

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Post-defense submissions API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
