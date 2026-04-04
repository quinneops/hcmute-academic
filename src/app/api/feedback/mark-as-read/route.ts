import { NextResponse } from 'next/server'
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

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'Missing feedback ID' }, { status: 400 })
    }

    // Find the registration containing this feedback in its thread
    // This is a bit complex because feedback_thread is a JSON array
    // We'll search for the registration that has this feedback ID
    const { data: registrations, error: fetchError } = await supabaseAdmin
      .from('registrations')
      .select('id, feedback_thread')
      .filter('feedback_thread', 'cs', `[{"id":"${id}"}]`)
    
    if (fetchError || !registrations || registrations.length === 0) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
    }

    const registration = registrations[0]
    const thread = registration.feedback_thread as any[]
    const feedbackIndex = thread.findIndex(fb => fb.id === id)

    if (feedbackIndex === -1) {
      return NextResponse.json({ error: 'Feedback not found in thread' }, { status: 404 })
    }

    // Mark as read
    thread[feedbackIndex].is_read = true

    const { error: updateError } = await supabaseAdmin
      .from('registrations')
      .update({ feedback_thread: thread })
      .eq('id', registration.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Mark as read API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
