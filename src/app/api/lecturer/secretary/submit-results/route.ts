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

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { council_id, results, minutes_excel_url, meeting_docs_url } = await request.json()

    if (!council_id || !results || !Array.isArray(results)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Verify that the user is the Secretary of the council
    const { data: council, error: councilError } = await supabaseAdmin
      .from('councils')
      .select('*')
      .eq('id', council_id)
      .eq('secretary_id', user.id)
      .single()

    if (councilError || !council) {
      return NextResponse.json({ error: 'Forbidden: You are not the secretary for this council' }, { status: 403 })
    }

    // 2. Perform updates for each student registration
    for (const res of results) {
       const { registration_id, score, notes, detailed_scores } = res
       if (!registration_id) continue

       const { data: reg } = await supabaseAdmin
         .from('registrations')
         .select('defense_session')
         .eq('id', registration_id)
         .single()
       
       const defenseSession = reg?.defense_session || {}
       const updatedDefense = {
         ...defenseSession,
         result_score: parseFloat(score),
         detailed_scores: detailed_scores || null,
         notes: notes,
         status: 'completed',
         completed_at: new Date().toISOString()
       }

       await supabaseAdmin
         .from('registrations')
         .update({ 
           status: 'completed',
           defense_session: updatedDefense, 
           final_score: parseFloat(score),
           post_defense_edit_status: 'pending_chair',
           updated_at: new Date().toISOString()
         })
         .eq('id', registration_id)
    }

    // 3. Update council status and store file URLs
    await supabaseAdmin
      .from('councils')
      .update({ 
        status: 'completed',
        minutes_excel_url: minutes_excel_url || null,
        meeting_docs_url: meeting_docs_url || null,
        notes: `Biên bản họp được lập bởi thư ký lúc ${new Date().toLocaleString('vi-VN')}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', council_id)

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Secretary Submit Results API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
