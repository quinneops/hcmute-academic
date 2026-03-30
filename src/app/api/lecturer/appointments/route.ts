import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/lecturer/appointments?start_date=2026-03-30&end_date=2026-04-06&status=scheduled
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
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'lecturer') {
      return NextResponse.json({ error: 'Forbidden - lecturers only' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const status = searchParams.get('status')

    let query = supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('lecturer_id', user.id)
      .order('scheduled_at', { ascending: true })

    if (startDate) {
      query = query.gte('scheduled_at', startDate)
    }
    if (endDate) {
      query = query.lte('scheduled_at', endDate)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: appointments, error } = await query

    if (error) throw error

    // Fetch student info for each appointment
    const studentIds = Array.from(new Set(appointments?.map((a) => a.student_id).filter(Boolean)))
    let studentsMap = new Map()

    if (studentIds.length > 0) {
      const { data: students } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, student_code')
        .in('id', studentIds)

      if (students) {
        students.forEach((s) => {
          studentsMap.set(s.id, {
            full_name: s.full_name,
            email: s.email,
            student_code: s.student_code,
          })
        })
      }
    }

    const transformedAppointments = (appointments || []).map((apt: any) => {
      const studentInfo = studentsMap.get(apt.student_id) || {}
      return {
        ...apt,
        student_name: studentInfo.full_name || null,
        student_email: studentInfo.email || null,
        student_code: studentInfo.student_code || null,
      }
    })

    return NextResponse.json(transformedAppointments)
  } catch (error: any) {
    console.error('API lecturer appointments GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/lecturer/appointments
// Supports both single student (student_id) and group (student_ids array)
export async function POST(request: NextRequest) {
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
      .select('role, full_name, email')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'lecturer') {
      return NextResponse.json({ error: 'Forbidden - lecturers only' }, { status: 403 })
    }

    const body = await request.json()
    const {
      student_id,       // Single student (backward compatible)
      student_ids,      // Array of student IDs for group appointments
      type,
      scheduled_at,
      duration_minutes,
      location,
      room,
      title,
      description,
      thesis_title,
      meeting_link,
    } = body

    // Determine students: either from student_ids array or single student_id
    const targetStudentIds = student_ids || (student_id ? [student_id] : [])

    if (!targetStudentIds || targetStudentIds.length === 0 || !scheduled_at || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch all student profiles
    const { data: students } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .in('id', targetStudentIds)

    if (!students || students.length !== targetStudentIds.length) {
      return NextResponse.json({ error: 'Invalid student IDs' }, { status: 400 })
    }

    // Calculate end_at
    const endAt = new Date(scheduled_at)
    endAt.setMinutes(endAt.getMinutes() + (duration_minutes || 30))

    const isGroup = targetStudentIds.length > 1

    // Create appointment
    const { data: appointment, error: insertError } = await supabaseAdmin
      .from('appointments')
      .insert({
        lecturer_id: user.id,
        student_id: isGroup ? null : targetStudentIds[0],  // Keep single student for backward compat
        student_ids: targetStudentIds,
        is_group_appointment: isGroup,
        type: type || 'meeting',
        scheduled_at,
        end_at: endAt.toISOString(),
        duration_minutes: duration_minutes || 30,
        location: location || 'online',
        room,
        title,
        description,
        thesis_title,
        meeting_link,
        status: 'scheduled',
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Send notifications to ALL students
    const { sendAppointmentNotification } = await import('@/lib/notifications')
    const notificationPromises = students.map((student: any) =>
      sendAppointmentNotification('created', {
        studentId: student.id,
        studentName: student.full_name,
        lecturerName: profile.full_name || 'Giảng viên',
        lecturerEmail: profile.email || '',
        appointmentId: appointment.id,
        scheduledAt: scheduled_at,
        location: location || 'online',
        room: room || undefined,
        meetingLink: meeting_link || undefined,
        type: type || 'meeting',
        thesisTitle: thesis_title,
      })
    )

    await Promise.all(notificationPromises)

    return NextResponse.json(appointment, { status: 201 })
  } catch (error: any) {
    console.error('API lecturer appointments POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
