import { NextRequest, NextResponse } from 'next/server'
import { createCompletion, checkRateLimit, logTokenUsage, DEFAULT_MODEL } from '@/lib/groq/client'
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
 * GET /api/ai/at-risk-analysis?semester_id=xxx&lecturer_id=yyy
 *
 * AI-powered early warning system
 * Identifies at-risk students based on submission patterns
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const lecturerId = searchParams.get('lecturer_id')

    if (!lecturerId) {
      return NextResponse.json(
        { error: 'lecturer_id is required' },
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

    // Fetch registrations for this lecturer
    const { data: registrations } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('proposal_supervisor_id', lecturerId)

    if (!registrations || registrations.length === 0) {
      return NextResponse.json({ at_risk_students: [], overall_health: 'good' })
    }

    // Analyze each student
    const studentData = registrations.map((reg: any) => {
      const submissions = reg.submissions || []
      const grades = reg.grades || []

      const lastSubmissionDate = submissions.length > 0
        ? submissions[submissions.length - 1]?.submitted_at
        : null

      const daysSinceSubmission = lastSubmissionDate
        ? Math.floor((Date.now() - new Date(lastSubmissionDate).getTime()) / (1000 * 60 * 60 * 24))
        : 999

      const latestScore = grades.length > 0 ? grades[grades.length - 1]?.total_score : null
      const previousScore = grades.length > 1 ? grades[grades.length - 2]?.total_score : null
      const scoreChange = latestScore && previousScore ? latestScore - previousScore : 0

      return {
        student_id: reg.student_id,
        student_name: reg.student_name,
        student_code: reg.student_code,
        days_since_submission: daysSinceSubmission,
        latest_score: latestScore,
        score_change: scoreChange,
        submission_count: submissions.length,
        proposal_title: reg.proposal_title,
      }
    })

    const systemPrompt = `You are an academic advisor identifying at-risk students.

Analyze student data and identify those who need intervention.

Return VALID JSON:
{
  "at_risk_students": [{
    "student_id": "string",
    "student_name": "string",
    "risk_score": number (0-100),
    "risk_factors": ["string - specific concerns"],
    "recommended_action": "string - what lecturer should do"
  }],
  "overall_health": "good" | "concerning" | "critical"
}

Risk factors:
- No submission in 14+ days: HIGH risk
- Score dropped 2+ points: MEDIUM risk
- No submission in 7-14 days: MEDIUM risk
- Score dropped 1 point: LOW risk

Focus on actionable insights. Write in Vietnamese.`

    const userPrompt = `Student Data:
${studentData.map((s: any) => `- ${s.student_name} (${s.student_code}): Last submission ${s.days_since_submission} days ago, Score: ${s.latest_score ?? 'N/A'}, Change: ${s.score_change}`).join('\n')}

---
Identify at-risk students. Return ONLY valid JSON.`

    const { content: responseText, usage } = await createCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: DEFAULT_MODEL,
        temperature: 0.5,
        maxTokens: 1500,
        responseFormat: 'json_object',
      }
    )

    if (usage) {
      logTokenUsage(usage, '/api/ai/at-risk-analysis')
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
      model: DEFAULT_MODEL,
      tokens_used: usage,
    })

  } catch (error: any) {
    console.error('AI at-risk analysis error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze at-risk students' },
      { status: 500 }
    )
  }
}
