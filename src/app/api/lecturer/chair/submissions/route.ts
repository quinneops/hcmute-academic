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

    // 1. Fetch councils where user is Chair
    const { data: councils, error: councilError } = await supabaseAdmin
      .from('councils')
      .select('id, defenses')
      .eq('chair_id', user.id)

    if (councilError) throw councilError
    if (!councils || councils.length === 0) {
      return NextResponse.json([])
    }

    const councilIds = councils.map(c => c.id)

    // 2. Collect all registration IDs from these councils' defenses (legacy/secondary source)
    const registrationIds: string[] = []
    councils.forEach(council => {
      const defenses = (council.defenses || []) as any[]
      defenses.forEach((defense: any) => {
        // Handle both object format and primitive string ID format
        const regId = typeof defense === 'string' ? defense : (defense.registration_id || defense.student_id)
        if (regId) {
          registrationIds.push(regId)
        }
      })
    })

    // 3. Fetch registrations that need chair review
    // Robust query: Look for registrations in the explicitly listed IDs OR assigned via council_id
    let query = supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('post_defense_edit_status', 'pending_chair')

    // Combine filters safely
    if (registrationIds.length > 0) {
      // Format: ID is in list OR council_id matches
      const councilIdList = councilIds.join(',')
      const regIdList = registrationIds.join(',')

      // Use raw filter for JSONB council_id check plus the IN list
      // Note: defense_session->>council_id is the key set by TBM/Secretary
      query = query.or(`id.in.(${regIdList}),defense_session->>council_id.in.(${councilIdList})`)
    } else {
      // Just check council_id if the defenses array was empty
      const councilIdList = councilIds.join(',')
      query = query.filter('defense_session->>council_id', 'in', `(${councilIdList})`)
    }

    const { data: registrations, error: regError } = await query

    if (regError) throw regError

    // Map to simple FE-friendly format
    const result = (registrations || []).map(reg => ({
      id: reg.id,
      student_name: reg.student_name,
      student_code: reg.student_code,
      thesis_title: reg.proposal_title,
      defense_score: reg.final_score,
      edit_status: reg.post_defense_edit_status,
      editing_file_url: reg.editing_file_url,
      submitted_at: reg.updated_at, // Using updated_at as proxy for submission time
      gvhd_approval_status: reg.post_defense_edit_status === 'pending_chair',
      council_minutes: reg.defense_session?.council_minutes,
    }))

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Chair Submissions API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
