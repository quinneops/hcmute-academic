/**
 * Auth Callback API Route
 * Handles profile creation after OAuth signup
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { userId, email, fullName, avatarUrl } = await request.json()

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .single()

    if (existingProfile) {
      return NextResponse.json({ profile: existingProfile, created: false })
    }

    // Create new profile with default student role
    const insertData = {
      id: userId,
      email,
      full_name: fullName || email.split('@')[0],
      role: 'student',
      student_code: '2111' + Math.floor(Math.random() * 9000 + 1000),
      is_active: true,
      avatar_url: avatarUrl || null,
    }

    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('[AuthCallback API] Profile insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create profile: ' + insertError.message },
        { status: 500 }
      )
    }

    console.log('[AuthCallback API] Profile created:', newProfile)
    return NextResponse.json({ profile: newProfile, created: true })
  } catch (error: any) {
    console.error('[AuthCallback API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create profile' },
      { status: 500 }
    )
  }
}
