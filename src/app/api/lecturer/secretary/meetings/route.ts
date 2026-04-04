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

    // 1. Fetch councils where user is Secretary
    const { data: councils, error: councilError } = await supabaseAdmin
      .from('councils')
      .select('*')
      .eq('secretary_id', user.id)
      .order('scheduled_date', { ascending: true })

    if (councilError) throw councilError
    if (!councils || councils.length === 0) {
      return NextResponse.json([])
    }

    // 2. For each council, enrich with registration data if needed
    // In this NoSQL schema, councils often have defenses embedded.
    // We'll return the councils and the defenses array.
    const result = await Promise.all(councils.map(async (council) => {
      const defenseIds = (council.defenses || []).map((d: any) => d.student_id || d.registration_id).filter(Boolean)
      
      let students: any[] = []
      if (defenseIds.length > 0) {
        const { data: registrations } = await supabaseAdmin
          .from('registrations')
          .select('id, student_name, student_code, proposal_title, final_score, defense_session, reviewer_score, reviewer_feedback')
          .in('id', defenseIds)
        
        students = (registrations || []).map(reg => ({
          registration_id: reg.id,
          student_name: reg.student_name,
          student_code: reg.student_code,
          thesis_title: reg.proposal_title,
          current_score: reg.defense_session?.result_score || reg.final_score || null,
          detailed_scores: reg.defense_session?.detailed_scores || null,
          current_notes: reg.defense_session?.notes || '',
          status: reg.defense_session?.status || 'pending',
          supervisor_score: reg.final_score || null,
          reviewer_score: reg.reviewer_score || null,
          reviewer_feedback: reg.reviewer_feedback || ''
        }))
      }

      return {
        id: council.id,
        name: council.name,
        code: council.code,
        date: `${council.scheduled_date}T${council.scheduled_time || '08:00:00'}`,
        location: council.room || 'TBD',
        status: council.status,
        minutes_excel_url: council.minutes_excel_url || null,
        meeting_docs_url: council.meeting_docs_url || null,
        students: students
      }
    }))

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Secretary Meetings API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
