import { NextRequest, NextResponse } from 'next/server'
import { createCompletion, checkRateLimit, FAST_MODEL, logTokenUsage } from '@/lib/groq/client'
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
 * POST /api/ai/feedback-generate
 *
 * AI-powered feedback generator using Groq
 * Generates constructive feedback based on submission and scores
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
      criteria_scores,
      total_score,
      student_name,
    } = body

    if (!criteria_scores || !proposal_title) {
      return NextResponse.json(
        { error: 'criteria_scores and proposal_title are required' },
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
    const criteriaText = Object.entries(criteria_scores || {})
      .map(([key, value]: [string, any]) => {
        const names = {
          criteria_1: 'Content (Nội dung)',
          criteria_2: 'Methodology (Phương pháp)',
          criteria_3: 'Presentation (Trình bày)',
          criteria_4: 'Q&A Readiness',
        }
        const name = names[key as keyof typeof names] || key
        return `- ${name}: ${(value as any).score || value}/10`
      })
      .join('\n')

    const systemPrompt = `You are a supportive and experienced university thesis advisor in Vietnam.
You ALWAYS respond in Vietnamese language only.
Your task is to write constructive, encouraging feedback for students based on their thesis scores.

Tone guidelines:
- Start with genuine praise for what they did well
- Be gentle but clear about areas for improvement
- End with encouragement and confidence in their abilities
- Use Vietnamese academic context and language

Always respond in VALID JSON format with this exact structure:
{
  "feedback_draft": "string (2-3 paragraphs in VIETNAMESE)",
  "strengths": ["string - 2-3 specific strengths in VIETNAMESE"],
  "areas_for_improvement": ["string - 1-2 gentle suggestions in VIETNAMESE"],
  "suggestions": ["string - 2-3 actionable next steps in VIETNAMESE"],
  "encouragement": "string - final encouraging message in VIETNAMESE"
}

Score interpretation:
- 9-10: Xuất sắc - Emphasize excellence, minor refinements only
- 8-8.9: Giỏi - Strong work, some areas to polish
- 7-7.9: Khá - Good foundation, several improvements needed
- 6-6.9: Trung bình - Needs significant work, but has potential
- <6: Need major revision, be encouraging but honest

ALL text fields MUST be in Vietnamese language.`

    const userPrompt = `Please write feedback for this student's thesis. Respond ENTIRELY IN VIETNAMESE.

**STUDENT:** ${student_name || 'Student'}
**THESIS TITLE:** ${proposal_title}
**CATEGORY:** ${category || 'Not specified'}
**TOTAL SCORE:** ${total_score || 'N/A'}/10

**CRITERIA SCORES:**
${criteriaText}

**SUBMISSION CONTENT (excerpt):**
${submission_content ? submission_content.slice(0, 5000) : 'Not provided'}

---
Write feedback in Vietnamese. Be warm, constructive, and specific. Return ONLY valid JSON, no markdown. ALL text must be in Vietnamese.`

    // Call Groq API
    const { content: responseText, usage } = await createCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: FAST_MODEL,
        temperature: 0.8,
        maxTokens: 1000,
        responseFormat: 'json_object',
      }
    )

    if (usage) {
      logTokenUsage(usage, '/api/ai/feedback-generate')
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
    if (!result.feedback_draft) {
      console.error('Invalid Groq response structure:', result)
      return NextResponse.json(
        { error: 'AI returned invalid response format' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ...result,
      model: FAST_MODEL,
    })

  } catch (error: any) {
    console.error('AI feedback generation error:', error)

    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'Invalid Groq API key. Please check your configuration.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate AI feedback' },
      { status: 500 }
    )
  }
}