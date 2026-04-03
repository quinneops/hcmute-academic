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

    // 1. Fetch Students who are approved but NOT in any council yet
    // In this simplified NoSQL schema, we look for registrations with status='approved' 
    // and check if they are already in the 'defenses' jsonb of any council.
    
    // First, get all councils to see who is already assigned
    const { data: councils } = await supabaseAdmin
      .from('councils')
      .select('defenses')
    
    const assignedStudentIds = new Set(
      (councils || []).flatMap((c: any) => (c.defenses || []).map((d: any) => d.student_id))
    )

    // Get approved registrations
    const { data: registrations, error: regError } = await supabaseAdmin
      .from('registrations')
      .select('id, student_name, student_code, proposal_title, proposal_supervisor_id, reviewer_id, reviewer_name')
      .eq('status', 'approved')

    if (regError) throw regError

    const unassigned = (registrations || []).filter(r => !assignedStudentIds.has(r.id))

    if (unassigned.length === 0) {
      return NextResponse.json({ message: 'No unassigned students found', suggestions: [] })
    }

    // 2. Fetch all Lecturers with specializations
    const { data: lecturers, error: lecError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, specialization')
      .eq('role', 'lecturer')

    if (lecError) throw lecError

    // Create a map for lecturer names
    const lecturerMap = new Map((lecturers || []).map(l => [l.id, l.full_name]))

    // 3. Construct AI Prompt
    const systemPrompt = `You are an Academic Coordinator responsible for organizing thesis defense councils.
Your goal is to group students into councils of 3-5 students and assign a Chair (Chủ tịch) and Secretary (Thư ký) for each.

CONSTRAINTS:
1. CONFLICT OF INTEREST: The Chair and Secretary of a council MUST NOT be the Supervisor (HD) or Reviewer (PB) for ANY student assigned to that council.
2. GROUPING: Group students with similar "Thesis Titles" together in the same council if possible.
3. EXPERTISE: Assign a Chair and Secretary whose "Specialization" matches the topics of the students in that council.
4. SCHEDULING: Each council must have a unique combination of "room" and "scheduled_time".
5. ROOMS: Use format "A1-101", "A2-202", "B1-303", etc.
6. TIME: Use blocks of 60 minutes: "08:00", "09:00", "10:00", "13:00", "14:00", "15:00".

RETURN VALID JSON ONLY:
{
  "suggestions": [
    {
      "council_name": "string (e.g. Hội đồng Hệ thống nhúng 01)",
      "chair_id": "uuid",
      "chair_name": "string",
      "secretary_id": "uuid",
      "secretary_name": "string",
      "room": "string",
      "scheduled_time": "hh:mm",
      "student_ids": ["uuid", "uuid", ...]
    }
  ],
  "reasoning": "string - brief explanation of the grouping logic. MUST BE IN VIETNAMESE. Always use Lecturer Names instead of IDs when explaining."
}`

    const userPrompt = `
UNASSIGNED STUDENTS:
${unassigned.map(s => {
  const supervisorName = lecturerMap.get(s.proposal_supervisor_id) || 'Unknown'
  return `- ID: ${s.id}, Title: ${s.proposal_title}, HD: ${supervisorName}, PB: ${s.reviewer_name}`
}).join('\n')}

LECTURERS & SPECIALIZATIONS:
${lecturers?.map(l => `- ID: ${l.id}, Name: ${l.full_name}, Domain: ${l.specialization || 'General'}`).join('\n')}

Plan the councils for these students. Return ONLY valid JSON.`

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
      logTokenUsage(usage, '/api/ai/auto-assign-councils')
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
    console.error('AI auto-assign error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate assignments' },
      { status: 500 }
    )
  }
}
