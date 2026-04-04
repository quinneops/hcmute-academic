import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Papa from 'papaparse'
import { createGradingSheet, readGradingSheet } from '@/lib/google-sheets'

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = user.id

    const { data: registrations } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .or(`proposal_supervisor_id.eq.${userId},reviewer_id.eq.${userId}`)

    const csvData: any[] = []

    ;(registrations || []).forEach((reg: any) => {
      const submissions = reg.submissions || []
      submissions.forEach((sub: any) => {
        const grades = sub.grades || []
        const hasMyGrade = grades.some((g: any) => g.grader_id === userId)
        
        if (!hasMyGrade && sub.status === 'submitted') {
          csvData.push({
            'Student ID': `${sub.id}:${reg.id}`, // Hidden Reference
            'Student Code': reg.student_code,
            'Student Name': reg.student_name,
            'Slide': '',
            'Presentation': '',
            'Timing': '',
            'Content': '',
            'Q&A': '',
            'Innovation': '',
            'Bonus': '',
            'Total': '',
            'Feedback': ''
          })
        }
      })
    })

    const csv = Papa.unparse(csvData)

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=grading_template_${Date.now()}.csv`
      }
    })

  } catch (error: any) {
    console.error('Spreadsheet sync GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = user.id

    const body = await request.json()
    const { action, csvData: incomingCsvData, spreadsheetId } = body

    // 1. Action: Create Google Sheet Link
    if (action === 'create-link') {
      const { data: lecturerProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single()
      
      const { data: registrations } = await supabaseAdmin
        .from('registrations')
        .select('*')
        .or(`proposal_supervisor_id.eq.${userId},reviewer_id.eq.${userId}`)
      
      const studentsToGrade: any[] = []
      ;(registrations || []).forEach((reg: any) => {
        const submissions = reg.submissions || []
        submissions.forEach((sub: any) => {
          const grades = sub.grades || []
          const hasMyGrade = grades.some((g: any) => g.grader_id === userId)
          if (!hasMyGrade && sub.status === 'submitted') {
             studentsToGrade.push({
               submission_id: sub.id,
               registration_id: reg.id,
               student_code: reg.student_code,
               student_name: reg.student_name
             })
          }
        })
      })

      if (studentsToGrade.length === 0) {
        return NextResponse.json({ error: 'Không có sinh viên nào cần chấm điểm' }, { status: 400 })
      }

      const { spreadsheetUrl, spreadsheetId: newId } = await createGradingSheet(
        lecturerProfile?.email || '',
        lecturerProfile?.full_name || 'Lecturer',
        studentsToGrade
      )

      return NextResponse.json({ success: true, spreadsheetUrl, spreadsheetId: newId })
    }

    // 2. Action: Sync (CSV or Spreadsheet)
    let syncData = incomingCsvData
    if (spreadsheetId) {
       syncData = await readGradingSheet(spreadsheetId)
    }

    if (!syncData || !Array.isArray(syncData)) {
      return NextResponse.json({ error: 'Dữ liệu đồng bộ không hợp lệ' }, { status: 400 })
    }

    const { data: lecturerProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single()

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const row of syncData) {
      const studentIdRef = row['Student ID']
      if (!studentIdRef) continue

      const [subId, regId] = studentIdRef.split(':')
      if (!subId || !regId) continue

      try {
        const { data: registration } = await supabaseAdmin
          .from('registrations')
          .select('*')
          .eq('id', regId)
          .single()

        if (!registration) throw new Error(`Registration not found`)
        if (registration.proposal_supervisor_id !== userId && registration.reviewer_id !== userId) {
          throw new Error(`Unauthorized`)
        }

        const role = registration.proposal_supervisor_id === userId ? 'supervisor' : 'reviewer'
        const submissions = [...(registration.submissions || [])]
        const subIndex = submissions.findIndex((s: any) => s.id === subId)
        if (subIndex === -1) throw new Error(`Submission not found`)

        const submission = submissions[subIndex]
        const grades = [...(submission.grades || [])]
        
        const slide = parseFloat(row['Slide']) || 0
        const presentation = parseFloat(row['Presentation']) || 0
        const timing = parseFloat(row['Timing']) || 0
        const content = parseFloat(row['Content']) || 0
        const qa = parseFloat(row['Q&A']) || 0
        const innovation = parseFloat(row['Innovation']) || 0
        const bonus = parseFloat(row['Bonus']) || 0
        const feedback = row['Feedback'] || ''

        const totalScore = Math.min(12, slide + presentation + timing + content + qa + innovation + bonus)

        const existingGradeIndex = grades.findIndex((g: any) => g.grader_id === userId)
        const gradePayload = {
          id: existingGradeIndex >= 0 ? grades[existingGradeIndex].id : `grade-${Date.now()}-${registration.id.substring(0, 4)}`,
          grader_id: userId,
          grader_name: lecturerProfile?.full_name || '',
          grader_role: role,
          criteria_scores: {
            slide,
            presentation,
            timing,
            content,
            qa,
            innovation,
            bonus
          },
          total_score: totalScore,
          feedback,
          is_published: true,
          graded_at: new Date().toISOString()
        }

        if (existingGradeIndex >= 0) grades[existingGradeIndex] = gradePayload
        else grades.push(gradePayload)

        submissions[subIndex] = { ...submission, grades, status: 'graded', graded_at: new Date().toISOString() }

        const updatePayload: any = { submissions }
        if (role === 'reviewer') {
          updatePayload.reviewer_score = totalScore
          updatePayload.reviewer_feedback = feedback
          updatePayload.reviewer_submitted_at = new Date().toISOString()
        }

        const { error: updateError } = await supabaseAdmin.from('registrations').update(updatePayload).eq('id', regId)
        if (updateError) throw updateError
        successCount++
      } catch (err: any) {
        errorCount++
        errors.push(`${row['Student Code'] || regId}: ${err.message}`)
      }
    }

    return NextResponse.json({ 
      success: true, 
      summary: { total: syncData.length, success: successCount, failed: errorCount }, 
      errors 
    })
  } catch (error: any) {
    console.error('Spreadsheet sync POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
