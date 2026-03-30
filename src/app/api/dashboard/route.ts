import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/dashboard?student_id=xxx
// NoSQL Schema: Data nhúng trong registrations JSONB hoặc proposals.registrations_summary
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('student_id')

    if (!studentId) {
      return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
    }

    // Query 1: Lấy từ registrations table (authoritative)
    const registrationsResult = await supabase
      .from('registrations')
      .select('*')
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false })

    // Query 2: Fallback - Lấy từ proposals.registrations_summary JSONB
    const proposalsWithRegResult = await supabase
      .from('proposals')
      .select('id, title, supervisor_id, supervisor_name, registrations_summary')
      .contains('registrations_summary', JSON.stringify([{ student_id: studentId }]))
      .limit(10)

    console.log('[Dashboard] Query results:', {
      registrationsCount: registrationsResult.data?.length ?? 0,
      proposalsWithReg: proposalsWithRegResult.data?.length ?? 0,
    })

    // Lấy latest registration: ưu tiên registrations table, fallback JSONB
    let latestRegistration = null
    let supervisorName: string | null = null
    if (registrationsResult.data && registrationsResult.data.length > 0) {
      latestRegistration = registrationsResult.data[0]
      supervisorName = latestRegistration.proposal_supervisor_id || null
      console.log('[Dashboard] Found in registrations table:', latestRegistration.id)
    } else if (proposalsWithRegResult.data && proposalsWithRegResult.data.length > 0) {
      // Fallback: extract from proposals.registrations_summary
      console.log('[Dashboard] Falling back to proposals.registrations_summary')
      for (const proposal of proposalsWithRegResult.data) {
        const summary = proposal.registrations_summary || []
        const studentRegs = summary.filter((r: any) => r.student_id === studentId)
        if (studentRegs.length > 0) {
          const latest = studentRegs.sort((a: any, b: any) =>
            new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
          )[0]
          supervisorName = proposal.supervisor_name || 'Chưa xác định'
          latestRegistration = {
            id: latest.id,
            proposal_id: proposal.id,
            proposal_title: latest.proposed_title || proposal.title || 'Chưa xác định',
            proposal_supervisor_id: proposal.supervisor_id,
            supervisor_name: supervisorName,
            status: latest.status,
            submitted_at: latest.submitted_at,
            reviewed_at: latest.reviewed_at,
            review_notes: latest.review_notes,
            submissions: latest.submissions || [],
            feedback_thread: latest.feedback_thread || [],
          }
          console.log('[Dashboard] Found in JSONB:', latestRegistration.id)
          break
        }
      }
    }

    // Lấy submissions từ JSONB (embedded data)
    const allSubmissions: any[] = []
    if (latestRegistration?.submissions && Array.isArray(latestRegistration.submissions)) {
      allSubmissions.push(...latestRegistration.submissions)
    }

    // Lấy feedback từ JSONB (embedded data)
    const allFeedback: any[] = []
    if (latestRegistration?.feedback_thread && Array.isArray(latestRegistration.feedback_thread)) {
      allFeedback.push(...latestRegistration.feedback_thread)
    }

    // Lấy unread notifications
    const notificationsResult = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', studentId)
      .eq('is_read', false)

    // Lấy documents (public docs, limit 3)
    const docsResult = await supabase
      .from('documents')
      .select('id, title, type, category, file_url, file_size, download_count, created_at')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(3)

    // Tính toán stats
    const stats = {
      proposalsCount: registrationsResult.data?.length ?? (latestRegistration ? 1 : 0),
      registrationsCount: latestRegistration ? 1 : 0,
      submissionsCount: allSubmissions.length,
      unreadNotifications: notificationsResult.count ?? 0,
      latestRegistrationStatus: latestRegistration?.status || null,
      latestRegistrationTitle: latestRegistration?.proposal_title || null,
    }

    // Process thesis progress từ submissions JSONB
    const milestones = ['Proposal', 'Draft', 'Interim', 'Final', 'Slide', 'Defense']
    const completedRounds = new Set(
      allSubmissions
        .filter((s: any) => s.status === 'graded')
        .map((s: any) => s.round_number)
    )
    const thesisProgress = milestones.map((milestone, idx) => ({
      milestone,
      completed: completedRounds.has(idx + 1),
    }))

    // Latest feedback
    const feedback = allFeedback.length > 0 ? {
      id: allFeedback[0].id,
      content: allFeedback[0].content,
      lecturer_name: allFeedback[0].lecturer_name,
      created_at: allFeedback[0].created_at,
      is_read: allFeedback[0].is_read,
    } : null

    return NextResponse.json({
      stats,
      thesisProgress,
      recentDocuments: docsResult.data || [],
      feedback,
      submissions: allSubmissions,
      supervisor_name: supervisorName,
      latestRegistration: latestRegistration ? {
        id: latestRegistration.id,
        status: latestRegistration.status,
        proposal_title: latestRegistration.proposal_title,
        supervisor_name: supervisorName,
        submitted_at: latestRegistration.submitted_at,
        reviewed_at: latestRegistration.reviewed_at,
        review_notes: latestRegistration.review_notes,
      } : null,
    })
  } catch (error: any) {
    console.error('API dashboard GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
