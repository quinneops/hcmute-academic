import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { registration_id, registration_ids, action, notes } = await request.json()

    // Normalize input to an array of IDs
    const targetIds: string[] = []
    if (registration_id) targetIds.push(registration_id)
    if (Array.isArray(registration_ids)) targetIds.push(...registration_ids)

    if (targetIds.length === 0 || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['approved', 'rejected'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // 1. Verify that the user is the Chair of the councils for these registrations
    // Fetch all councils where this user is the chair
    const { data: chairCouncils, error: councilError } = await supabaseAdmin
      .from('councils')
      .select('id, defenses')
      .eq('chair_id', user.id)

    if (councilError) throw councilError
    
    // Extract all authorized registration IDs from the chair's councils
    const authorizedIdsSet = new Set<string>()
    chairCouncils?.forEach(council => {
      const defenses = (council.defenses || []) as any[]
      defenses.forEach(def => {
        const id = def.registration_id || def.student_id
        if (id) authorizedIdsSet.add(id)
      })
    })

    // Filter target IDs to only those the user is authorized for
    const validIds = targetIds.filter(id => authorizedIdsSet.has(id))

    if (validIds.length === 0) {
      return NextResponse.json({ error: 'Forbidden: You are not the chair for these registrations or IDs are invalid' }, { status: 403 })
    }

    // 2. Perform the update for all valid IDs
    const updateData: any = {
      post_defense_edit_status: action,
      updated_at: new Date().toISOString()
    }

    if (action === 'approved') {
      updateData.status = 'completed'
      updateData.completed_at = new Date().toISOString()
    }

    const { error: updateError } = await supabaseAdmin
      .from('registrations')
      .update(updateData)
      .in('id', validIds)

    if (updateError) throw updateError

    // 3. Create notifications for all students in batch
    const { data: registrations } = await supabaseAdmin
      .from('registrations')
      .select('id, student_id, proposal_title')
      .in('id', validIds)

    if (registrations && registrations.length > 0) {
      const notifications = registrations.map(reg => ({
        user_id: reg.student_id,
        title: action === 'approved' ? 'Chỉnh sửa khóa luận được duyệt' : 'Yêu cầu chỉnh sửa lại khóa luận',
        content: action === 'approved' 
          ? `Chủ tịch hội đồng đã duyệt bản chỉnh sửa cuối cùng của đề tài: ${reg.proposal_title}.`
          : `Chủ tịch hội đồng yêu cầu bạn chỉnh sửa lại bản báo cáo. Ghi chú: ${notes || 'Vui lòng kiểm tra lại nội dung.'}`,
        type: 'academic',
        priority: 'high',
        action_url: `/student/thesis/${reg.id}`,
        action_label: 'Xem chi tiết'
      }))

      await supabaseAdmin.from('notifications').insert(notifications)
    }

    return NextResponse.json({ 
      success: true, 
      action, 
      processed_count: validIds.length,
      total_requested: targetIds.length 
    })

  } catch (error: any) {
    console.error('Chair Review API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
