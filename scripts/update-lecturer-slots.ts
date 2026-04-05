/**
 * Script to update bctt_slots and kltn_slots for lecturers from data_gv.csv
 * Sets both bctt_slots and kltn_slots equal to Quota (giữ nguyên giá trị)
 *
 * Usage: npx tsx scripts/update-lecturer-slots.ts
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

async function updateLecturerSlots(
  email: string,
  quota: number
): Promise<{ success: boolean; updated: boolean; bctt_slots?: number; kltn_slots?: number; error?: string }> {
  try {
    // Check if profile exists
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('email', email)
      .single()

    if (fetchError || !profile) {
      return { success: false, updated: false, error: 'Profile not found' }
    }

    // Set both slots equal to quota
    const bctt_slots = quota
    const kltn_slots = quota

    // Update slots
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        bctt_slots,
        kltn_slots,
      })
      .eq('id', profile.id)
      .select('bctt_slots, kltn_slots')
      .single()

    if (updateError) {
      return { success: false, updated: false, error: updateError.message }
    }

    return {
      success: true,
      updated: true,
      bctt_slots: updated?.bctt_slots,
      kltn_slots: updated?.kltn_slots
    }
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

  // Get unique emails with their quota (take first occurrence)
  const emailMap = new Map<string, { major: string; quota: number }>()
  lecturers.forEach(l => {
    if (!emailMap.has(l.Email)) {
      emailMap.set(l.Email, {
        major: l.Major,
        quota: parseInt(l.Quota, 10) || 0,
      })
    }
  })
  const uniqueLecturers = Array.from(emailMap.entries())

  console.log(`📊 Tìm thấy ${uniqueLecturers.length} giảng viên cần cập nhật`)
  console.log('')

  const batchSize = 10
  let updatedCount = 0
  let errorCount = 0
  const errors: { email: string; error: string }[] = []
  const slotResults: { email: string; quota: number; bctt_slots: number; kltn_slots: number }[] = []

  for (let i = 0; i < uniqueLecturers.length; i += batchSize) {
    const batch = uniqueLecturers.slice(i, i + batchSize)
    const batchNum = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(uniqueLecturers.length / batchSize)

    console.log(`⏳ Đang xử lý batch ${batchNum}/${totalBatches}...`)

    const results = await Promise.all(
      batch.map(async ([email, { major, quota }]) => {
        const result = await updateLecturerSlots(email, quota)
        return { ...result, email, major, quota }
      })
    )

    for (const result of results) {
      if (result.success) {
        if (result.updated) {
          updatedCount++
          slotResults.push({
            email: result.email,
            quota: result.quota,
            bctt_slots: result.bctt_slots || 0,
            kltn_slots: result.kltn_slots || 0,
          })
          console.log(`   ✅ ${result.email} | Quota: ${result.quota} → bctt_slots: ${result.bctt_slots}, kltn_slots: ${result.kltn_slots}`)
        }
      } else {
        errorCount++
        errors.push({ email: result.email, error: result.error || 'Unknown error' })
        console.log(`   ❌ Lỗi: ${result.email} - ${result.error}`)
      }
    }

    if (i + batchSize < uniqueLecturers.length) {
      await new Promise(resolve => setTimeout(resolve, 300))
    }
  }

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📈 KẾT QUẢ')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ Đã cập nhật: ${updatedCount} giảng viên`)
  console.log(`❌ Lỗi: ${errorCount} giảng viên`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (errors.length > 0) {
    console.log('')
    console.log('📋 Chi tiết lỗi:')
    errors.forEach(({ email, error }) => {
      console.log(`   - ${email}: ${error}`)
    })
  }

  // Print summary
  console.log('')
  console.log('📋 DANH SÁCH SLOTS THEO GIẢNG VIÊN:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  slotResults.forEach(({ email, quota, bctt_slots, kltn_slots }) => {
    console.log(`   ${email}: Quota=${quota} → bctt_slots=${bctt_slots}, kltn_slots=${kltn_slots}`)
  })
}

main().catch(console.error)
