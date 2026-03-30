import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/profile/:id
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // Get auth token from request header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    // Create client with user token if available
    const userSupabase = token
      ? createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          }
        )
      : supabase

    const { data, error } = await userSupabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('API profile GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/profile/:id
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()

    // Get auth token from request header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    // Create client with user token if available
    const userSupabase = token
      ? createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          }
        )
      : supabase

    const { data, error } = await userSupabase
      .from('profiles')
      .update({
        full_name: body.full_name,
        phone: body.phone,
        avatar_url: body.avatar_url,
        department: body.department,
        faculty: body.faculty,
      })
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('API profile PUT error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
