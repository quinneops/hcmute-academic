import { NextRequest, NextResponse } from 'next/server'
import { createCompletion, checkRateLimit, logTokenUsage, FAST_MODEL } from '@/lib/groq/client'

/**
 * POST /api/ai/feedback-review
 *
 * AI-powered feedback quality optimizer
 * Analyzes feedback tone and suggests improvements
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      feedback_content,
      student_name,
      total_score,
    } = body

    if (!feedback_content) {
      return NextResponse.json(
        { error: 'feedback_content is required' },
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

    const systemPrompt = `You are a communication coach reviewing feedback for tone and constructiveness.

Analyze the feedback and provide suggestions for improvement.

Always respond in VALID JSON format:
{
  "tone_analysis": {
    "score": number (0-100, higher = more constructive),
    "detected_tone": "encouraging" | "harsh" | "vague" | "balanced" | "constructive",
    "issues": ["string - specific tone issues"]
  },
  "suggested_revisions": [{
    "original": "string",
    "suggested": "string",
    "reason": "string"
  }],
  "missing_elements": ["string - what should be added"]
}

Be helpful, not critical. Focus on making feedback more actionable.`

    const userPrompt = `Review this feedback for a student:

**STUDENT:** ${student_name || 'Student'}
**SCORE:** ${total_score || 'N/A'}/10

**FEEDBACK:**
${feedback_content}

---
Analyze tone, suggest revisions, identify missing elements. Return ONLY valid JSON. Write in Vietnamese.`

    const { content: responseText, usage } = await createCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: FAST_MODEL,
        temperature: 0.6,
        maxTokens: 1000,
        responseFormat: 'json_object',
      }
    )

    if (usage) {
      logTokenUsage(usage, '/api/ai/feedback-review')
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

    if (!result.tone_analysis) {
      return NextResponse.json(
        { error: 'Invalid response format' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ...result,
      model: FAST_MODEL,
      tokens_used: usage,
    })

  } catch (error: any) {
    console.error('AI feedback review error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to review feedback' },
      { status: 500 }
    )
  }
}
