import { NextRequest, NextResponse } from 'next/server'
import { createCompletion, checkRateLimit, logTokenUsage, DEFAULT_MODEL } from '@/lib/groq/client'

/**
 * POST /api/ai/submission-summary
 *
 * AI-powered submission summarizer using Groq
 * Generates executive summary and key findings from thesis submissions
 */
export async function POST(request: NextRequest) {
  try {
    // Validate auth header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      submission_content,
      proposal_title,
      category,
    } = body

    if (!submission_content || !proposal_title) {
      return NextResponse.json(
        { error: 'submission_content and proposal_title are required' },
        { status: 400 }
      )
    }

    // Check rate limit
    const rateLimit = checkRateLimit()
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          retry_after: rateLimit.retryAfter
        },
        { status: 429 }
      )
    }

    // Build the prompt for Groq
    const systemPrompt = `You are an academic research assistant helping lecturers quickly understand student thesis submissions.
You ALWAYS respond in Vietnamese language only.

Your task is to extract and summarize the key information from a thesis submission.

Always respond in VALID JSON format with this exact structure:
{
  "executive_summary": "string (150-200 words in VIETNAMESE)",
  "key_contributions": ["string - 3-5 specific contributions in VIETNAMESE"],
  "methodology_used": "string - describe research method (qualitative/quantitative/mixed) in VIETNAMESE",
  "data_sources": ["string - datasets, surveys, interviews used in VIETNAMESE"],
  "limitations_identified": ["string - 2-3 limitations in VIETNAMESE"],
  "confidence_level": "high" | "medium" | "low"
}

Be concise but specific. Focus on what matters for evaluation.
ALL text fields MUST be in Vietnamese language.`

    const userPrompt = `Please summarize this thesis submission. Respond ENTIRELY IN VIETNAMESE.

**THESIS TITLE:** ${proposal_title}
**CATEGORY:** ${category || 'Not specified'}

**SUBMISSION CONTENT:**
${submission_content.slice(0, 12000)}

---
Return ONLY valid JSON, no markdown. ALL text must be in Vietnamese.`

    // Call Groq API
    const { content: responseText, usage } = await createCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: DEFAULT_MODEL,
        temperature: 0.5,
        maxTokens: 1200,
        responseFormat: 'json_object',
      }
    )

    // Log token usage
    if (usage) {
      logTokenUsage(usage, '/api/ai/submission-summary')
    }

    // Parse the response
    let result: any
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse Groq response:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      )
    }

    // Validate response structure
    if (!result.executive_summary || !result.key_contributions) {
      console.error('Invalid Groq response structure:', result)
      return NextResponse.json(
        { error: 'AI returned invalid response format' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ...result,
      model: DEFAULT_MODEL,
      tokens_used: usage,
    })

  } catch (error: any) {
    console.error('AI submission summary error:', error)

    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'Invalid Groq API key. Please check your configuration.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate submission summary' },
      { status: 500 }
    )
  }
}
