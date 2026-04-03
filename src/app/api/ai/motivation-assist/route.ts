import { NextRequest, NextResponse } from 'next/server'
import { createCompletion, checkRateLimit, logTokenUsage, FAST_MODEL } from '@/lib/groq/client'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { proposal_id, student_id, motivation } = await request.json()

    if (!proposal_id || !student_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const rateLimit = checkRateLimit()
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    // 1. Fetch context (Proposal + Student Profile)
    const [{ data: proposal }, { data: profile }] = await Promise.all([
      supabaseAdmin.from('proposals').select('*').eq('id', proposal_id).single(),
      supabaseAdmin.from('profiles').select('*').eq('id', student_id).single()
    ])

    if (!proposal || !profile) {
      return NextResponse.json({ error: 'Context not found' }, { status: 404 })
    }

    // 2. Compose AI Prompt
    const systemPrompt = `You are an academic advisor helping a student write a compelling motivation letter for a thesis proposal.
The student has provided a draft. Your goal is to:
1. Make it professional and academic.
2. Align it with the proposal's requirements and title: "${proposal.title}".
3. Mention the student's skills if relevant (Skills: ${profile.skills || 'N/A'}).
4. Keep it concise (under 200 words).
Write in Vietnamese.`

    const userPrompt = `Draft: "${motivation || 'I am very interested in this topic.'}"
Improve this draft to be a strong motivation letter for registering for this proposal.`

    const { content: improved, usage } = await createCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      { model: FAST_MODEL, temperature: 0.7 }
    )

    if (usage) logTokenUsage(usage, '/api/ai/motivation-assist')

    return NextResponse.json({ improved })

  } catch (error: any) {
    console.error('AI Motivation Assist error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
