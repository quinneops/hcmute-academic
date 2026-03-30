import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
 * GET /api/lecturer/profile
 * Returns profile data for a lecturer
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    let userId: string | null = null

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    userId = user.id

    // Get profile data
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Verify user is a lecturer
    if (profile.role !== 'lecturer') {
      return NextResponse.json({ error: 'Forbidden: Not a lecturer' }, { status: 403 })
    }

    return NextResponse.json(profile)

  } catch (error: any) {
    console.error('Profile API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/lecturer/profile
 * Updates lecturer profile data
 */
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    let userId: string | null = null

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    userId = user.id

    const body = await request.json()
    const {
      full_name,
      department,
      faculty,
      phone,
      title,
      bio,
      office,
      date_of_birth,
    } = body

    // Verify user is a lecturer
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (existingProfile?.role !== 'lecturer') {
      return NextResponse.json({ error: 'Forbidden: Not a lecturer' }, { status: 403 })
    }

    // Update profile
    const updateData: any = {}
    if (full_name !== undefined) updateData.full_name = full_name
    if (department !== undefined) updateData.department = department
    if (faculty !== undefined) updateData.faculty = faculty
    if (phone !== undefined) updateData.phone = phone
    if (title !== undefined) updateData.title = title
    if (bio !== undefined) updateData.bio = bio
    if (office !== undefined) updateData.office = office
    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth

    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json(updatedProfile)

  } catch (error: any) {
    console.error('Profile update API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
