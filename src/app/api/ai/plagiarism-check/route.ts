import { NextRequest, NextResponse } from 'next/server'
import { createCompletion, checkRateLimit, logTokenUsage, DEFAULT_MODEL } from '@/lib/groq/client'

/**
 * POST /api/ai/plagiarism-check
 *
 * AI-powered plagiarism detection assistant
 * Analyzes writing style consistency and flags suspicious patterns
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      submission_content,
      submission_id,
      proposal_title,
    } = body

    if (!submission_content) {
      return NextResponse.json(
        { error: 'submission_content is required' },
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

    const systemPrompt = `You are an academic integrity assistant analyzing student submissions for potential plagiarism.
You ALWAYS respond in Vietnamese language only.

Analyze the text for:
1. Writing style inconsistencies (sudden changes in tone, vocabulary, complexity)
2. Generic/template language that suggests copying
3. Sections that lack depth compared to the rest
4. AI-generated text patterns

Return VALID JSON:
{
  "originality_score": number (0-100, higher = more original),
  "flagged_sections": [{
    "text": "string (excerpt)",
    "reason": "string (IN VIETNAMESE)",
    "severity": "low" | "medium" | "high"
  }],
  "overall_assessment": "string (IN VIETNAMESE)",
  "recommendations": ["string - actionable next steps (IN VIETNAMESE)"]
}

Be fair - flag concerns but don't accuse. ALL text fields MUST be in Vietnamese.`

    const userPrompt = `Analyze this submission for potential plagiarism. Respond ENTIRELY IN VIETNAMESE.

**TITLE:** ${proposal_title || 'Thesis'}

**CONTENT:**
${submission_content.slice(0, 15000)}

---
Check for writing inconsistencies, generic language, suspicious patterns. Return ONLY valid JSON. ALL text must be in Vietnamese.`

    const { content: responseText, usage } = await createCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: DEFAULT_MODEL,
        temperature: 0.3,
        maxTokens: 1500,
        responseFormat: 'json_object',
      }
    )

    if (usage) {
      logTokenUsage(usage, '/api/ai/plagiarism-check')
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

    if (typeof result.originality_score !== 'number') {
      return NextResponse.json(
        { error: 'Invalid response format' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ...result,
      model: DEFAULT_MODEL,
      tokens_used: usage,
    })

  } catch (error: any) {
    console.error('AI plagiarism check error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check for plagiarism' },
      { status: 500 }
    )
  }
}
