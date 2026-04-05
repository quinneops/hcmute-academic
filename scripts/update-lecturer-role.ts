/**
 * Script to update lecturers from data_gv.csv to have role='lecturer'
 *
 * Usage: npx tsx scripts/update-lecturer-role.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import Papa from 'papaparse'

// Load environment variables from .env.local
config({ path: '.env.local' })

// Initialize Supabase admin client
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

interface LecturerRecord {
  Email: string
  Major: string
  HeDaoTao: string
  Quota: string
}

function parseCSV(content: string): LecturerRecord[] {
  const results = Papa.parse<LecturerRecord>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  })

  return results.data.filter(row => row.Email && row.Major)
}

async function updateLecturerRole(email: string): Promise<{ success: boolean; updated: boolean; error?: string }> {
  try {
    // Check if profile exists
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, email')
      .eq('email', email)
      .single()

    if (fetchError || !profile) {
      return { success: false, updated: false, error: 'Profile not found' }
    }

    // Check if already lecturer
    if (profile.role === 'lecturer') {
      return { success: true, updated: false }
    }

    // Update role to lecturer
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'lecturer' })
      .eq('id', profile.id)
      .select()
      .single()

    if (updateError) {
      return { success: false, updated: false, error: updateError.message }
    }

    return { success: true, updated: true }
  } catch (error: any) {
    return { success: false, updated: false, error: error.message }
  }
}

async function main() {
  const csvPath = path.join(process.cwd(), 'data_gv.csv')

  if (!fs.existsSync(csvPath)) {
    console.error('❌ File data_gv.csv không tìm thấy')
    process.exit(1)
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Thiếu biến môi trường')
    process.exit(1)
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lecturers = parseCSV(csvContent)

  // Get unique emails only
  const uniqueEmails = Array.from(new Set(lecturers.map(l => l.Email)))

  console.log(`📊 Tìm thấy ${uniqueEmails.length} giảng viên cần cập nhật`)
  console.log('')

  const batchSize = 10
  let updatedCount = 0
  let alreadyLecturerCount = 0
  let errorCount = 0
  const errors: { email: string; error: string }[] = []

  for (let i = 0; i < uniqueEmails.length; i += batchSize) {
    const batch = uniqueEmails.slice(i, i + batchSize)
    const batchNum = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(uniqueEmails.length / batchSize)

    console.log(`⏳ Đang xử lý batch ${batchNum}/${totalBatches}...`)

    const results = await Promise.all(
      batch.map(async (email) => {
        const result = await updateLecturerRole(email)
        return { ...result, email }
      })
    )

    for (const result of results) {
      if (result.success) {
        if (result.updated) {
          updatedCount++
          console.log(`   ✅ Đã cập nhật: ${result.email}`)
        } else {
          alreadyLecturerCount++
          console.log(`   ⚪ Đã là lecturer: ${result.email}`)
        }
      } else {
        errorCount++
        errors.push({ email: result.email, error: result.error || 'Unknown error' })
        console.log(`   ❌ Lỗi: ${result.email} - ${result.error}`)
      }
    }

    if (i + batchSize < uniqueEmails.length) {
      await new Promise(resolve => setTimeout(resolve, 300))
    }
  }

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📈 KẾT QUẢ')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ Đã cập nhật: ${updatedCount} giảng viên`)
  console.log(`⚪ Đã là lecturer: ${alreadyLecturerCount} giảng viên`)
  console.log(`❌ Lỗi: ${errorCount} giảng viên`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (errors.length > 0) {
    console.log('')
    console.log('📋 Chi tiết lỗi:')
    errors.forEach(({ email, error }) => {
      console.log(`   - ${email}: ${error}`)
    })
  }
}

main().catch(console.error)
