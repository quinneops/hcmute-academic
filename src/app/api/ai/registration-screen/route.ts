import { NextRequest, NextResponse } from 'next/server'
import { createCompletion, checkRateLimit, logTokenUsage, DEFAULT_MODEL } from '@/lib/groq/client'
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

    const { registration_id } = await request.json()

    if (!registration_id) {
      return NextResponse.json({ error: 'Missing registration_id' }, { status: 400 })
    }

    const rateLimit = checkRateLimit()
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    // 1. Fetch registration details (student info + proposal info)
    const { data: registration, error: regError } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('id', registration_id)
      .single()

    if (regError || !registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    const { data: proposal } = await supabaseAdmin
      .from('proposals')
      .select('*')
      .eq('id', registration.proposal_id)
      .single()

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal context missing' }, { status: 404 })
    }

    // 2. AI Screening logic
    const systemPrompt = `You are an academic screening assistant.
Evaluate a student's registration for a thesis proposal.
- Proposal: ${proposal.title}
- Description: ${proposal.description}
- Criteria: ${proposal.ai_screening_criteria || 'Standard academic fitness'}

Candidate Info:
- Motivation Letter: "${registration.motivation_letter || 'No motivation letter provided.'}"

Analyze the "Fitness Score" (0-100) and provide a concise summary (Vietnamese).
Respond in JSON:
{
  "score": number,
  "summary": "string in Vietnamese",
  "recommendation": "approve" | "reject" | "interview"
}`

    const { content: screening, usage } = await createCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Please screen this student registration: id ${registration.id}.` }
      ],
      { model: DEFAULT_MODEL, temperature: 0.7, responseFormat: 'json_object' }
    )

    if (usage) logTokenUsage(usage, '/api/ai/registration-screen')

    let result
    try {
      result = JSON.parse(screening)
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      return NextResponse.json({ error: 'Failed to generate screening result' }, { status: 500 })
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('AI Registration Screen error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
