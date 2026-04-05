import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * POST /api/lecturer/post-defense/review
 * GVHD approves or rejects a student's post-defense revision.
 * On approval, post_defense_edit_status transitions to 'pending_chair'.
 * On rejection, it stays/resets to 'pending_supervisor'.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { registration_id, action, notes } = await request.json()

    if (!registration_id || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['approved', 'rejected'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Verify this lecturer is the supervisor of this registration
    const { data: reg, error: regError } = await supabaseAdmin
      .from('registrations')
      .select('id, student_id, proposal_title, proposal_supervisor_id, post_defense_edit_status')
      .eq('id', registration_id)
      .single()

    if (regError || !reg) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    if (reg.proposal_supervisor_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You are not the supervisor for this registration' }, { status: 403 })
    }

    // Only allow review when status is pending_supervisor
    if (reg.post_defense_edit_status !== 'pending_supervisor') {
      return NextResponse.json({ 
        error: `Cannot review: current status is '${reg.post_defense_edit_status}'` 
      }, { status: 400 })
    }

    const newStatus = action === 'approved' ? 'pending_chair' : 'pending_supervisor'

    const updateData: any = {
      post_defense_edit_status: newStatus,
      supervisor_defense_notes: notes || null,
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabaseAdmin
      .from('registrations')
      .update(updateData)
      .eq('id', registration_id)

    if (updateError) throw updateError

    // Notify student
    await supabaseAdmin.from('notifications').insert({
      user_id: reg.student_id,
      title: action === 'approved'
        ? 'GVHD đã duyệt bản chỉnh sửa'
        : 'GVHD yêu cầu chỉnh sửa lại',
      content: action === 'approved'
        ? `Giảng viên hướng dẫn đã xác nhận bản chỉnh sửa của đề tài "${reg.proposal_title}". Hiện đang chờ Chủ tịch hội đồng duyệt.`
        : `Giảng viên hướng dẫn yêu cầu bạn chỉnh sửa lại. Ghi chú: ${notes || 'Vui lòng kiểm tra lại nội dung.'}`,
      type: 'academic',
      priority: 'high',
      action_url: `/student/submissions`,
      action_label: 'Xem chi tiết',
    })

    return NextResponse.json({ success: true, action, new_status: newStatus })

  } catch (error: any) {
    console.error('Post-defense review API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
