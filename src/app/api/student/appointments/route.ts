import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/student/appointments?status=scheduled
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'student') {
      return NextResponse.json({ error: 'Forbidden - students only' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('student_id', user.id)
      .order('scheduled_at', { ascending: true })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: appointments, error } = await query

    if (error) throw error

    // Fetch lecturer info for each appointment
    const lecturerIds = Array.from(new Set(appointments?.map((a) => a.lecturer_id).filter(Boolean)))
    let lecturersMap = new Map()

    if (lecturerIds.length > 0) {
      const { data: lecturers } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, lecturer_code')
        .in('id', lecturerIds)

      if (lecturers) {
        lecturers.forEach((l) => {
          lecturersMap.set(l.id, {
            full_name: l.full_name,
            email: l.email,
            lecturer_code: l.lecturer_code,
          })
        })
      }
    }

    const transformedAppointments = (appointments || []).map((apt: any) => {
      const lecturerInfo = lecturersMap.get(apt.lecturer_id) || {}
      return {
        ...apt,
        lecturer_name: lecturerInfo.full_name || null,
        lecturer_email: lecturerInfo.email || null,
        lecturer_code: lecturerInfo.lecturer_code || null,
      }
    })

    return NextResponse.json(transformedAppointments)
  } catch (error: any) {
    console.error('API student appointments GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
