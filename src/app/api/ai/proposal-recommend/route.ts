import { NextRequest, NextResponse } from 'next/server'
import { createCompletion, checkRateLimit, logTokenUsage, FAST_MODEL } from '@/lib/groq/client'
import { createClient } from '@supabase/supabase-js'

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
 * GET /api/ai/proposal-recommend?student_id=xxx
 *
 * AI-powered proposal recommender
 * Matches students with thesis topics based on their profile
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('student_id')

    if (!studentId) {
      return NextResponse.json(
        { error: 'student_id is required' },
        { status: 400 }
      )
    }

    const rateLimit = checkRateLimit()
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retry_after: rateLimit.retryAfter },
        { status: 429 }
      )
    }

    // Fetch student profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', studentId)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      )
    }

    // Fetch available proposals
    const { data: proposals } = await supabaseAdmin
      .from('proposals')
      .select('*')
      .eq('status', 'active')
      .limit(20)

    if (!proposals || proposals.length === 0) {
      return NextResponse.json({ recommendations: [] })
    }

    const systemPrompt = `You are a career advisor matching students with thesis topics.

Analyze the student profile and match against available proposals.

Return VALID JSON:
{
  "recommendations": [{
    "proposal_id": "string",
    "title": "string",
    "supervisor": "string",
    "match_score": number (0-100),
    "match_reasons": ["string - specific reasons"],
    "category": "string"
  }]
}

Return top 5 recommendations sorted by match_score. Write in Vietnamese.`

    const userPrompt = `Student Profile:
- Name: ${profile.full_name}
- Email: ${profile.email}
- Skills: ${profile.skills || 'Not specified'}
- Interests: ${profile.interests || 'Not specified'}

Available Proposals:
${proposals.map((p: any) => `- ${p.title} (Category: ${p.category}, Supervisor: ${p.lecturer_name || 'N/A'})`).join('\n')}

---
Match proposals to student. Return ONLY valid JSON.`

    const { content: responseText, usage } = await createCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: FAST_MODEL,
        temperature: 0.7,
        maxTokens: 1500,
        responseFormat: 'json_object',
      }
    )

    if (usage) {
      logTokenUsage(usage, '/api/ai/proposal-recommend')
    }

    let result: any
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse Groq response:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ...result,
      model: FAST_MODEL,
      tokens_used: usage,
    })

  } catch (error: any) {
    console.error('AI proposal recommend error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}
