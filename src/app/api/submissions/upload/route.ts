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

// Submission type mapping
const SUBMISSION_TYPES = ['proposal', 'draft', 'interim', 'final', 'slide', 'defense']

// Round number to submission type mapping (1-indexed)
function getSubmissionTypeFromRound(roundNumber: number): string {
  const typeIndex = (roundNumber - 1) % SUBMISSION_TYPES.length
  return SUBMISSION_TYPES[typeIndex]
}

// Get the next required submission type based on existing submissions
function getNextRequiredType(submissions: any[]): string {
  if (!submissions || submissions.length === 0) {
    return 'proposal'
  }

  // Find the highest order type that has been graded
  const gradedTypes = submissions
    .filter((s: any) => s.status === 'graded')
    .map((s: any) => s.round_number || 0)

  if (gradedTypes.length === 0) {
    // No graded submissions - must complete proposal first
    return 'proposal'
  }

  const maxGradedRound = Math.max(...gradedTypes)
  const nextTypeIndex = maxGradedRound % SUBMISSION_TYPES.length

  // If all rounds completed
  if (nextTypeIndex >= SUBMISSION_TYPES.length) {
    return 'defense'
  }

  return SUBMISSION_TYPES[nextTypeIndex]
}

// Validate sequential submission order
function validateSequentialSubmission(registration: any, submissionType: string) {
  const submissions = registration.submissions || []
  const nextRequiredType = getNextRequiredType(submissions)

  // Check if submission type matches required type
  if (submissionType !== nextRequiredType) {
    // Find what type is actually required
    const currentTypeIndex = SUBMISSION_TYPES.indexOf(nextRequiredType)
    const requiredOrder = SUBMISSION_TYPES.slice(0, currentTypeIndex + 1)

    return {
      valid: false,
      error: `Phải nộp theo thứ tự. Bước tiếp theo là: ${nextRequiredType}`,
      requiredOrder: requiredOrder,
      currentRound: nextRequiredType,
    }
  }

  return { valid: true }
}

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
    const submission_type = formData.get('submission_type') as string  // Now using submission_type

    if (!file || !student_id || !registration_id || !submission_type) {
      return NextResponse.json(
        { error: 'Missing required fields: file, student_id, registration_id, submission_type' },
        { status: 400 }
      )
    }

    // Validate submission_type is valid
    if (!SUBMISSION_TYPES.includes(submission_type)) {
      return NextResponse.json(
        { error: `Invalid submission_type. Must be one of: ${SUBMISSION_TYPES.join(', ')}` },
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

    // Validate sequential submission order
    const validationResult = validateSequentialSubmission(registration, submission_type)
    if (!validationResult.valid) {
      return NextResponse.json({
        error: validationResult.error,
        required_order: validationResult.requiredOrder,
        current_round: validationResult.currentRound,
      }, { status: 409 })
    }

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${student_id}/submissions/${registration_id}/${submission_type}-${Date.now()}.${fileExt}`

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

    // Calculate document number for this submission type
    const sameTypeSubmissions = submissions.filter((s: any) => s.submission_type === submission_type)
    const documentNumber = sameTypeSubmissions.length + 1

    // Get submission type order for round_number calculation
    const typeIndex = SUBMISSION_TYPES.indexOf(submission_type)
    const roundNumber = typeIndex + 1

    // Create new submission record
    const newSubmission = {
      id: `sub-${Date.now()}`,
      round_id: `round-${roundNumber}`,
      round_number: roundNumber,
      round_name: `${submission_type.charAt(0).toUpperCase() + submission_type.slice(1)} - Document ${documentNumber}`,
      submission_type: submission_type,
      document_number: documentNumber,
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
      submissionType: submission_type,
      documentNumber,
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
