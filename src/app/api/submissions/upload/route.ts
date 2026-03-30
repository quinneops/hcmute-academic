import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
 * POST /api/submissions/upload
 * Upload file to Supabase Storage and create submission record
 */
export async function POST(request: NextRequest) {
  try {
    // Validate auth header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse FormData
    const formData = await request.formData()
    const file = formData.get('file') as File
    const student_id = formData.get('student_id') as string
    const registration_id = formData.get('registration_id') as string
    const round_number = parseInt(formData.get('round_number') as string, 10)

    if (!file || !student_id || !registration_id || !round_number) {
      return NextResponse.json(
        { error: 'Missing required fields: file, student_id, registration_id, round_number' },
        { status: 400 }
      )
    }

    // Verify student ownership
    const { data: registration } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('id', registration_id)
      .single()

    if (!registration || registration.student_id !== student_id) {
      return NextResponse.json({ error: 'Forbidden: Not your registration' }, { status: 403 })
    }

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${student_id}/submissions/${registration_id}/round-${round_number}-${Date.now()}.${fileExt}`

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('submissions')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file: ' + uploadError.message },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('submissions')
      .getPublicUrl(fileName)

    if (!urlData?.publicUrl) {
      return NextResponse.json({ error: 'Failed to get file URL' }, { status: 500 })
    }

    // Get existing submissions from registration
    const submissions = registration.submissions || []

    // Create new submission record
    const newSubmission = {
      id: `sub-${Date.now()}`,
      round_id: `round-${round_number}`,
      round_number,
      round_name: `Round ${round_number}`,
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      grades: [],
    }

    submissions.push(newSubmission)

    // Update registration with new submission
    const { error: updateError } = await supabaseAdmin
      .from('registrations')
      .update({ submissions })
      .eq('id', registration_id)

    if (updateError) {
      console.error('Registration update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update registration: ' + updateError.message },
        { status: 500 }
      )
    }

    console.log('[Submissions API] File uploaded successfully:', {
      fileName: file.name,
      fileSize: file.size,
      round: round_number,
      registrationId: registration_id,
    })

    return NextResponse.json(newSubmission, { status: 201 })
  } catch (error: any) {
    console.error('[Submissions API] Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
