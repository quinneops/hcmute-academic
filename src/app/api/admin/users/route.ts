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
 * GET /api/admin/users
 * Returns paginated list of users with optional filters
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

    // Verify user is admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const role = searchParams.get('role') as 'student' | 'lecturer' | 'admin' | 'all' | null
    const search = searchParams.get('search')
    const isActive = searchParams.get('is_active')

    // Build query
    let query = supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' })

    // Apply filters
    if (role && role !== 'all') {
      query = query.eq('role', role)
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: users, count } = await query.order('created_at', { ascending: false })

    // Calculate stats
    const { data: allUsers } = await supabaseAdmin
      .from('profiles')
      .select('role, is_active')
      .eq('is_active', true)

    const stats = {
      total: count || 0,
      students: allUsers?.filter(u => u.role === 'student').length || 0,
      lecturers: allUsers?.filter(u => u.role === 'lecturer').length || 0,
      admins: allUsers?.filter(u => u.role === 'admin').length || 0,
      active: allUsers?.filter(u => u.is_active).length || 0,
    }

    return NextResponse.json({
      users: users || [],
      stats,
      page,
      limit,
      total: count || 0,
    })

  } catch (error: any) {
    console.error('Admin Users API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/users
 * Creates a new user
 */
export async function POST(request: NextRequest) {
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

    // Verify user is admin
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      email,
      password,
      full_name,
      role,
      student_code,
      faculty,
      department,
    } = body

    // Validate required fields
    if (!email || !password || !full_name || !role) {
      return NextResponse.json(
        { error: 'email, password, full_name, and role are required' },
        { status: 400 }
      )
    }

    if (!['student', 'lecturer', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Create auth user
    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createAuthError) {
      return NextResponse.json(
        { error: createAuthError.message },
        { status: 500 }
      )
    }

    const authUserId = authData.user.id

    // Create profile
    const { data: newProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUserId,
        email,
        full_name,
        role,
        student_code: student_code || null,
        faculty: faculty || null,
        department: department || null,
        is_active: true,
      })
      .select()
      .single()

    if (profileError) {
      // Rollback auth user creation
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(newProfile, { status: 201 })

  } catch (error: any) {
    console.error('User create API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
