import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
)

export async function POST(request: NextRequest) {
  try {
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
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'excel' or 'docs'
    const council_id = formData.get('council_id') as string

    if (!file || !type || !council_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `councils/${council_id}/minutes/${type}-${Date.now()}.${fileExt}`

    const { data, error } = await supabaseAdmin.storage
      .from('submissions') // Reuse submission bucket but in councils folder
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) throw error

    const { data: urlData } = supabaseAdmin.storage
      .from('submissions')
      .getPublicUrl(fileName)

    return NextResponse.json({ url: urlData.publicUrl })

  } catch (error: any) {
    console.error('Secretary Upload API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
