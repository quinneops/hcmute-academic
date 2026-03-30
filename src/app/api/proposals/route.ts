import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/proposals
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      // Get single proposal - no joins, use denormalized fields
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      return NextResponse.json(data)
    }

    // Get all proposals - no joins, use denormalized fields
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('API proposals GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
