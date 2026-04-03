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

    // Fetch councils where user is Chair, Secretary, or in members JSONB
    // In NoSQL-style Supabase, we query the JSONB column 'members'
    // For members, we assume it's a JSONB array of UUIDs or objects with ID
    const { data: councils, error } = await supabaseAdmin
      .from('councils')
      .select('*')
      .or(`chair_id.eq.${user.id},secretary_id.eq.${user.id}`)
      .order('scheduled_date', { ascending: true })

    // Also fetch where user is in members array (since .or doesn't easily handle JSONB contains)
    const { data: memberCouncils } = await supabaseAdmin
      .from('councils')
      .select('*')
      .filter('members', 'cs', `["${user.id}"]`)

    // Merge and deduplicate
    const allCouncilsMap = new Map()
    ;(councils || []).forEach(c => allCouncilsMap.set(c.id, c))
    ;(memberCouncils || []).forEach(c => allCouncilsMap.set(c.id, c))

    return NextResponse.json(Array.from(allCouncilsMap.values()))

  } catch (error: any) {
    console.error('Lecturer Council API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
