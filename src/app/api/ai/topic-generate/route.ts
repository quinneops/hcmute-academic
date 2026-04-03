import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { groq } from '@/lib/groq/client'

// Client for auth token verification
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SYSTEM_PROMPT = `
Bạn là một giáo sư hướng dẫn Đại học chuyên nghiệp tại Việt Nam.
Sinh viên sẽ đưa cho bạn một số từ khóa, lĩnh vực quan tâm, hoặc ý tưởng sơ sài.
Nhiệm vụ của bạn là sinh ra 3 ĐỀ TÀI KHÓA LUẬN HOẶC THỰC TẬP (chất lượng cao) phù hợp với sinh viên.

Định dạng trả về BẮT BUỘC LÀ JSON với cấu trúc mảng:
[
  {
    "title": "Tên đề tài 1",
    "description": "Mô tả chi tiết mục tiêu, phạm vi và công nghệ sử dụng của đề tài này (khoảng 3-4 câu).",
    "category": "Tên lĩnh vực (VD: Trí tuệ nhân tạo, Kỹ thuật phần mềm, v.v.)"
  },
  ...
]

Tuyệt đối KHÔNG trả về bất kỳ text nào ngoài JSON array.
`

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { keywords, type } = body

    if (!keywords) {
      return NextResponse.json(
        { error: 'Yêu cầu cung cấp từ khóa để sinh đề tài.' },
        { status: 400 }
      )
    }

    const prompt = `Loại đề tài mong muốn: ${type || 'Không xác định'}\nTừ khóa/Sở thích của sinh viên: ${keywords}\nHãy gọi ý 3 đề tài hay và khả thi nhất.`

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      model: 'openai/gpt-oss-120b', // or any robust model available
      temperature: 0.7,
      max_tokens: 1024,
      response_format: { type: 'json_object' } // Groq supports this for Llama3
    })

    const resultString = completion.choices[0]?.message?.content || '[]'

    // Fallback parsing just in case response_format isn't strictly adhered to or we get wrapped json
    let recommendations = []
    try {
      const parsed = JSON.parse(resultString)
      recommendations = Array.isArray(parsed) ? parsed : (parsed.topics || parsed.recommendations || [])
    } catch (e) {
      console.warn("Failed to parse groq response directly. Might contain markdown chars.");
      const match = resultString.match(/\[.*\]/s)
      if (match) {
        recommendations = JSON.parse(match[0])
      }
    }

    return NextResponse.json({
      success: true,
      recommendations
    })

  } catch (error: any) {
    console.error('AI Topic Generate API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
