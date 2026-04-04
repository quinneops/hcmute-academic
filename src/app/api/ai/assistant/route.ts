import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

// Client for auth token verification
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Client with service role for bypassing RLS
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
 * AI Assistant for Lecturers
 * Uses Groq Tool Calling to fetch real-time data from Supabase
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    let userId: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user }, error } = await supabaseAuth.auth.getUser(token)
      if (error || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = user.id
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messages } = await request.json()
    console.log(`[AI-Assistant] Request received from lecturer: ${userId}`)

    // 1. Initial AI call with tool definitions
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `Bạn là Trợ lý AI chuyên nghiệp dành cho Giảng viên trong hệ thống Academic Nexus (HCMUTE). 
          Bạn có quyền truy cập vào dữ liệu thực tế về sinh viên và đề cương của giảng viên này. 
          
          QUY TẮC TRÌNH BÀY:
          - Luôn sử dụng Markdown để định dạng câu trả lời.
          - Đối với dữ liệu thống kê (số lượng sinh viên, trạng thái), hãy sử dụng Bảng (Markdown Table) để trình bày cho rõ ràng.
          - Sử dụng các Header (###) và danh sách có dấu chấm tròn (bullet points) kèm Emoji phù hợp (📊, 👥, 🎓, ⏳).
          - In đậm (Bold) các thông tin quan trọng như MSSV, Tên bài nộp, Ngày nộp bài.
          - Trình bày chuyên nghiệp, súc tích và dễ quét (scannable).
          
          Khi được hỏi về sinh viên hoặc tiến độ, bạn PHẢI sử dụng công cụ để lấy dữ liệu mới nhất. 
          Trả lời bằng Tiếng Việt thân thiện, rõ ràng.`
        },
        ...messages
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "get_my_students",
            description: "Lấy danh sách đầy đủ sinh viên do tôi hướng dẫn.",
          },
        },
        {
          type: "function",
          function: {
            name: "get_student_submissions",
            description: "Xem chi tiết các bài đã nộp của một sinh viên cụ thể qua MSSV.",
            parameters: {
              type: "object",
              properties: {
                student_code: { type: "string", description: "Mã số sinh viên (ví dụ: 20110300)" },
              },
              required: ["student_code"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "get_lecturer_stats",
            description: "Thống kê tổng số sinh viên, số đề tài đang chờ duyệt và số buổi bảo vệ.",
          }
        },
        {
          type: "function",
          function: {
            name: "get_my_appointments",
            description: "Lấy danh sách các lịch hẹn sắp tới của tôi.",
          }
        },
        {
          type: "function",
          function: {
            name: "search_my_proposals",
            description: "Tìm kiếm các đề cương của tôi theo từ khóa hoặc chủ đề.",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string", description: "Từ khóa tìm kiếm (ví dụ: AI, Mobile, Blockchain)" },
              },
              required: ["query"],
            },
          }
        },
        {
          type: "function",
          function: {
            name: "get_at_risk_students",
            description: "Phân tích và tìm ra những sinh viên đang nộp bài muộn hoặc có tiến độ chậm.",
          }
        },
        {
          type: "function",
          function: {
            name: "get_student_detail",
            description: "Lấy thông tin chi tiết về một sinh viên bao gồm đề tài, tiến độ và nhận xét cũ.",
            parameters: {
              type: "object",
              properties: {
                student_code: { type: "string", description: "Mã số sinh viên" },
              },
              required: ["student_code"],
            },
          }
        }
      ],
      tool_choice: "auto",
    })

    const responseMessage = completion.choices[0].message

    // 2. Handle Tool Calls
    if (responseMessage.tool_calls) {
      console.log(`[AI-Assistant] Tool calls detected: ${responseMessage.tool_calls.length}`)
      const toolMessages: any[] = []

      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name
        const functionArgs = JSON.parse(toolCall.function.arguments)

        let functionResponse = ""

        if (functionName === "get_my_students") {
          const { data: registrations } = await supabaseAdmin
            .from('registrations')
            .select(`
                id, student_id, student_name, student_code, student_email,
                proposal_title, status, submitted_at, final_score
            `)
            .eq('proposal_supervisor_id', userId)

          functionResponse = JSON.stringify(registrations || [])
        }
        else if (functionName === "get_student_submissions") {
          const { data: reg } = await supabaseAdmin
            .from('registrations')
            .select('submissions')
            .eq('proposal_supervisor_id', userId)
            .eq('student_code', functionArgs.student_code)
            .single()

          functionResponse = JSON.stringify(reg?.submissions || [])
        }
        else if (functionName === "get_lecturer_stats") {
          const { data: registrations } = await supabaseAdmin
            .from('registrations')
            .select('*')
            .eq('proposal_supervisor_id', userId)

          const stats = {
            total_students: registrations?.length || 0,
            pending_review: registrations?.filter(r => r.status === 'pending').length || 0,
            approved: registrations?.filter(r => r.status === 'approved').length || 0,
            defenses_scheduled: registrations?.filter(r => r.defense_session?.status === 'scheduled').length || 0
          }
          functionResponse = JSON.stringify(stats)
        }
        else if (functionName === "get_my_appointments") {
          const { data: appointments } = await supabaseAdmin
            .from('appointments')
            .select('*')
            .eq('lecturer_id', userId)
            .gte('scheduled_at', new Date().toISOString())
            .order('scheduled_at', { ascending: true })

          functionResponse = JSON.stringify(appointments || [])
        }
        else if (functionName === "search_my_proposals") {
          const { data: proposals } = await supabaseAdmin
            .from('proposals')
            .select('*')
            .eq('supervisor_id', userId)
            .or(`title.ilike.%${functionArgs.query}%,description.ilike.%${functionArgs.query}%`)

          functionResponse = JSON.stringify(proposals || [])
        }
        else if (functionName === "get_at_risk_students") {
          const { data: registrations } = await supabaseAdmin
            .from('registrations')
            .select('*')
            .eq('proposal_supervisor_id', userId)

          const atRisk = registrations?.filter(r => {
            const hasPendingSubmissions = r.submissions?.some((s: any) => s.status === 'pending')
            const isLateReview = r.status === 'pending' && (new Date().getTime() - new Date(r.submitted_at).getTime() > 7 * 24 * 60 * 60 * 1000)
            return hasPendingSubmissions || isLateReview
          })

          functionResponse = JSON.stringify(atRisk || [])
        }
        else if (functionName === "get_student_detail") {
          const { data: reg } = await supabaseAdmin
            .from('registrations')
            .select('*')
            .eq('proposal_supervisor_id', userId)
            .eq('student_code', functionArgs.student_code)
            .single()

          functionResponse = JSON.stringify(reg || {})
        }

        toolMessages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: functionResponse,
        })
      }

      // 3. Re-call AI with tool results
      const secondCompletion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          ...messages,
          responseMessage,
          ...toolMessages,
        ],
      })

      const finalContent = secondCompletion.choices[0].message.content || "Tôi đã nhận được thông tin nhưng không thể tóm tắt ngay lúc này. Thầy/Cô có muốn tôi thử lại không?"

      return NextResponse.json({
        content: finalContent,
        role: 'ai'
      })
    }

    return NextResponse.json({
      content: responseMessage.content || "Xin lỗi, tôi chưa hiểu ý của Thầy/Cô. Thầy/Cô có thể nói rõ hơn được không?",
      role: 'ai'
    })

  } catch (error: any) {
    console.error('AI Assistant API error:', error)
    return NextResponse.json(
      { error: error.message || 'AI Assistant is currently unavailable' },
      { status: 500 }
    )
  }
}
