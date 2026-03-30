import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/registrations/check?student_id=xxx&proposal_id=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('student_id')
    const proposalId = searchParams.get('proposal_id')

    if (!studentId || !proposalId) {
      return NextResponse.json({ error: 'Missing required params' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('registrations')
      .select('id')
      .eq('student_id', studentId)
      .eq('proposal_id', proposalId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return NextResponse.json(data || null)
  } catch (error: any) {
    console.error('API registrations check error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
