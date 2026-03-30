import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PATCH /api/lecturer/appointments/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const body = await request.json()
    const {
      status,
      scheduled_at,
      duration_minutes,
      location,
      room,
      title,
      description,
      notes,
      cancellation_reason,
      meeting_link,
    } = body

    // Get current appointment to check ownership and student_id
    const { data: currentAppointment } = await supabaseAdmin
      .from('appointments')
      .select('lecturer_id, student_id, status, scheduled_at, duration_minutes')
      .eq('id', params.id)
      .single()

    if (!currentAppointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    if (currentAppointment.lecturer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Calculate end_at if scheduled_at or duration changed
    let endAt = undefined
    if (scheduled_at || duration_minutes) {
      const newScheduledAt = scheduled_at || currentAppointment.scheduled_at
      const newDuration = duration_minutes || 30
      const endDate = new Date(newScheduledAt)
      endDate.setMinutes(endDate.getMinutes() + newDuration)
      endAt = endDate.toISOString()
    }

    // Build update object
    const updateData: any = {}
    if (status) updateData.status = status
    if (scheduled_at) updateData.scheduled_at = scheduled_at
    if (endAt) updateData.end_at = endAt
    if (duration_minutes) updateData.duration_minutes = duration_minutes
    if (location !== undefined) updateData.location = location
    if (room !== undefined) updateData.room = room
    if (title) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (notes !== undefined) updateData.notes = notes
    if (cancellation_reason !== undefined) updateData.cancellation_reason = cancellation_reason
    if (meeting_link !== undefined) updateData.meeting_link = meeting_link

    const { data: appointment, error: updateError } = await supabaseAdmin
      .from('appointments')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) throw updateError

    // Send notification if status changed
    if (status && status !== currentAppointment.status && currentAppointment.student_id) {
      const { data: studentProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', currentAppointment.student_id)
        .single()

      const { sendAppointmentNotification } = await import('@/lib/notifications')

      if (status === 'cancelled') {
        await sendAppointmentNotification('cancelled', {
          studentId: currentAppointment.student_id,
          studentName: studentProfile?.full_name || 'Sinh viên',
          lecturerName: profile?.full_name || 'Giảng viên',
          appointmentId: appointment.id,
          scheduledAt: appointment.scheduled_at,
          location: appointment.location || appointment.room || 'online',
          type: appointment.type,
          thesisTitle: appointment.thesis_title,
          cancellationReason: cancellation_reason,
        })
      } else if (status === 'confirmed') {
        await sendAppointmentNotification('updated', {
          studentId: currentAppointment.student_id,
          studentName: studentProfile?.full_name || 'Sinh viên',
          lecturerName: profile?.full_name || 'Giảng viên',
          appointmentId: appointment.id,
          scheduledAt: appointment.scheduled_at,
          location: appointment.location || appointment.room || 'online',
          type: appointment.type,
          thesisTitle: appointment.thesis_title,
        })
      }
    }

    return NextResponse.json(appointment)
  } catch (error: any) {
    console.error('API lecturer appointments PATCH error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/lecturer/appointments/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get appointment to check ownership and student_id
    const { data: appointment } = await supabaseAdmin
      .from('appointments')
      .select('lecturer_id, student_id, scheduled_at, location, room, type, thesis_title')
      .eq('id', params.id)
      .single()

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    if (appointment.lecturer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Send cancellation notification before deleting
    if (appointment.student_id) {
      const { data: studentProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', appointment.student_id)
        .single()

      const { sendAppointmentNotification } = await import('@/lib/notifications')
      await sendAppointmentNotification('cancelled', {
        studentId: appointment.student_id,
        studentName: studentProfile?.full_name || 'Sinh viên',
        lecturerName: profile?.full_name || 'Giảng viên',
        appointmentId: params.id,
        scheduledAt: appointment.scheduled_at,
        location: appointment.location || appointment.room || 'online',
        type: appointment.type,
        thesisTitle: appointment.thesis_title,
      })
    }

    // Delete the appointment
    const { error: deleteError } = await supabaseAdmin
      .from('appointments')
      .delete()
      .eq('id', params.id)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API lecturer appointments DELETE error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
