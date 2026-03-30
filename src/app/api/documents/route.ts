import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * GET /api/documents?student_id=xxx&category=xxx
 * Returns list of academic documents
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('student_id')
    const category = searchParams.get('category')

    let query = supabase
      .from('documents')
      .select('id, title, type, category, file_url, file_size, download_count, created_at, uploaded_by, uploaded_by_name')
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) throw error

    const documents = (data || []).map((d: any) => ({
      id: d.id,
      title: d.title,
      type: d.type,
      category: d.category,
      file_url: d.file_url,
      file_size: d.file_size,
      download_count: d.download_count,
      created_at: d.created_at,
      uploader_name: d.uploaded_by_name || null,
    }))

    return NextResponse.json(documents)
  } catch (error: any) {
    console.error('API documents GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/documents
 * Create new document (admin only)
 */
export async function POST(request: Request) {
  try {
    // Validate auth header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { title, type, category, file_url, file_size, uploaded_by_name } = body

    if (!title || !type || !category || !file_url) {
      return NextResponse.json(
        { error: 'Missing required fields: title, type, category, file_url' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('documents')
      .insert({
        title,
        type,
        category,
        file_url,
        file_size: file_size || null,
        uploaded_by: user.id,
        uploaded_by_name: uploaded_by_name || user.email,
        is_public: true,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error('API documents POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
