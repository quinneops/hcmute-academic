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

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimit = checkRateLimit()
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retry_after: rateLimit.retryAfter },
        { status: 429 }
      )
    }

    // 1. Fetch Approved registrations that DO NOT have a reviewer yet
    const { data: registrations, error: regError } = await supabaseAdmin
      .from('registrations')
      .select('id, student_name, student_code, proposal_title, proposal_supervisor_id, proposal_type, reviewer_id')
      .eq('status', 'approved')

    if (regError) throw regError
    
    // We only process the ones without a reviewer
    const unassigned = (registrations || []).filter(r => !r.reviewer_id)

    if (unassigned.length === 0) {
      return NextResponse.json({ message: 'No unassigned students found', suggestions: [] })
    }

    // 2. Fetch all Lecturers with specializations
    const { data: lecturers, error: lecError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, specialization')
      .eq('role', 'lecturer')

    if (lecError) throw lecError

    // Create a map for lecturer names to provide supervisor name context to the AI
    const lecturerMap = new Map((lecturers || []).map(l => [l.id, l.full_name]))

    // 3. Construct AI Prompt
    const systemPrompt = `You are an Academic Coordinator assigning Reviewers (Giảng viên phản biện) to student theses.
Your goal is to assign ONE reviewer to each student.

CONSTRAINTS:
1. CONFLICT OF INTEREST (CRITICAL): The assigned Reviewer MUST NOT be the same person as the Supervisor (HD).
2. EXPERTISE: Match the Reviewer's "Specialization" (Domain) to the student's "Title". 
3. BALANCING: Distribute the reviewer workload among available lecturers as evenly as possible. Do not assign the same reviewer to everyone.

RETURN VALID JSON ONLY:
{
  "suggestions": [
    {
      "registration_id": "uuid",
      "student_name": "string",
      "thesis_title": "string",
      "reviewer_id": "uuid",
      "reviewer_name": "string"
    }
  ],
  "reasoning": "string - brief explanation of the matching strategy and workload distribution. MUST BE IN VIETNAMESE. Always use Lecturer Names instead of IDs when explaining."
}`

    const userPrompt = `
UNASSIGNED REGISTRATIONS:
${unassigned.map(s => {
  const supervisorName = lecturerMap.get(s.proposal_supervisor_id) || 'Unknown'
  return `- RegID: ${s.id}, Title: ${s.proposal_title}, Type: ${s.proposal_type}, Supervisor (MUST AVOID): ID=${s.proposal_supervisor_id} (${supervisorName})`
}).join('\n')}

AVAILABLE LECTURERS & SPECIALIZATIONS:
${lecturers?.map(l => `- ID: ${l.id}, Name: ${l.full_name}, Domain: ${l.specialization || 'General'}`).join('\n')}

Assign reviewers to these registrations based on the constraints. Return ONLY valid JSON.`

    const { content: responseText, usage } = await createCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: DEFAULT_MODEL,
        temperature: 0.2, // Low temperature for high consistency with IDs
        maxTokens: 3000,
        responseFormat: 'json_object',
      }
    )

    if (usage) {
      logTokenUsage(usage, '/api/ai/auto-assign-reviewers')
    }

    let result: any
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse Groq response:', parseError)
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    return NextResponse.json({
      ...result,
      tokens_used: usage,
    })

  } catch (error: any) {
    console.error('AI auto-assign reviewers error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate assignments' },
      { status: 500 }
    )
  }
}
