import { NextRequest, NextResponse } from 'next/server'
import { createCompletion, checkRateLimit, DEFAULT_MODEL, getCached, setCache, logTokenUsage } from '@/lib/groq/client'
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
 * POST /api/ai/grade-suggestion
 *
 * AI-powered grading suggestion using Groq
 * Evaluates student submission against 4 criteria and suggests scores
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
      requirements,
      round_name,
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

    // Check cache first
    const cacheKey = `grade:${Buffer.from(submission_content.slice(0, 500)).toString('base64')}`
    const cached = getCached(cacheKey)
    if (cached) {
      return NextResponse.json({ ...cached, cached: true })
    }

    // Build the prompt for Groq
    const systemPrompt = `You are an experienced university thesis evaluator in Vietnam.
You ALWAYS respond in Vietnamese language only.
Your task is to evaluate student thesis submissions fairly and constructively.

Evaluation criteria (each scored 0-10):
1. **Content (Nội dung)**: Depth of research, quality of analysis, completeness of coverage
2. **Methodology (Phương pháp)**: Appropriateness of methods, rigor of approach, data handling
3. **Presentation (Trình bày)**: Organization, clarity, formatting, visual elements
4. **Q&A Readiness**: Anticipated ability to defend the work, understanding of limitations

Always respond in VALID JSON format with this exact structure:
{
  "criteria_scores": {
    "criteria_1": { "score": number, "justification": "string (IN VIETNAMESE)" },
    "criteria_2": { "score": number, "justification": "string (IN VIETNAMESE)" },
    "criteria_3": { "score": number, "justification": "string (IN VIETNAMESE)" },
    "criteria_4": { "score": number, "justification": "string (IN VIETNAMESE)" }
  },
  "total_score": number,
  "overall_feedback": "string (IN VIETNAMESE)",
  "confidence": "high" | "medium" | "low",
  "strengths": ["string (IN VIETNAMESE)"],
  "areas_for_improvement": ["string (IN VIETNAMESE)"]
}

Scores should be realistic - not everyone gets 10. Average thesis scores are typically 7.0-8.5.
Be constructive but honest in your feedback.
ALL text fields MUST be in Vietnamese language.`

    const userPrompt = `Please evaluate this thesis submission and respond ENTIRELY IN VIETNAMEESE.

**THESIS TITLE:** ${proposal_title}
**CATEGORY:** ${category || 'Not specified'}
**REQUIREMENTS:** ${requirements || 'Not specified'}
**SUBMISSION ROUND:** ${round_name || 'Final submission'}

**SUBMISSION CONTENT:**
${submission_content.slice(0, 15000)}

---
Evaluate the submission based on the 4 criteria. Return ONLY valid JSON, no markdown. ALL text must be in Vietnamese.`

    // Call Groq API
    const { content: responseText, usage } = await createCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: DEFAULT_MODEL,
        temperature: 0.7,
        maxTokens: 1500,
        responseFormat: 'json_object',
      }
    )

    if (usage) {
      logTokenUsage(usage, '/api/ai/grade-suggestion')
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

    // Validate the response structure
    if (!result.criteria_scores || typeof result.total_score !== 'number') {
      console.error('Invalid Groq response structure:', result)
      return NextResponse.json(
        { error: 'AI returned invalid response format' },
        { status: 500 }
      )
    }

    // Ensure scores are in valid range (0-10)
    Object.values(result.criteria_scores).forEach((criteria: any) => {
      if (typeof criteria.score === 'number') {
        criteria.score = Math.max(0, Math.min(10, criteria.score))
      }
    })

    result.total_score = Math.max(0, Math.min(10, result.total_score))

    // Cache the result
    setCache(cacheKey, result)

    return NextResponse.json({
      ...result,
      cached: false,
      model: DEFAULT_MODEL,
    })

  } catch (error: any) {
    console.error('AI grade suggestion error:', error)

    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'Invalid Groq API key. Please check your configuration.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate AI suggestions' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ai/grade-suggestion?submission_id=xxx
 *
 * Fetch cached grade suggestion for a submission
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const submissionId = searchParams.get('submission_id')

    if (!submissionId) {
      return NextResponse.json(
        { error: 'submission_id is required' },
        { status: 400 }
      )
    }

    // In a real implementation, fetch from database
    // For now, return empty (client should POST to generate)
    return NextResponse.json({
      message: 'No cached suggestion found. POST to generate.',
      submission_id: submissionId
    })

  } catch (error: any) {
    console.error('AI grade suggestion GET error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}