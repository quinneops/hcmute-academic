/**
 * Script to update specialization for all lecturers
 *
 * Usage: npx tsx scripts/update-lecturer-specialization.ts
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

// Chuyên môn theo ngành
const specializationsByMajor: Record<string, string[]> = {
  'QLCN': [
    'Quản lý dự án phần mềm',
    'Quản trị chuỗi cung ứng',
    'Quản lý chất lượng',
    'Quản trị doanh nghiệp',
    'Hệ thống thông tin quản lý',
    'Quản lý vận hành',
    'Khởi nghiệp và đổi mới sáng tạo',
    'Tư vấn quản lý',
  ],
  'TMĐT': [
    'Thương mại điện tử',
    'Digital Marketing',
    'Kinh doanh số',
    'Phân tích dữ liệu kinh doanh',
    'Hệ thống thanh toán điện tử',
    'Quản trị quan hệ khách hàng',
    'Khởi nghiệp số',
    'Logistics thương mại điện tử',
  ],
  'KDQT': [
    'Kinh doanh quốc tế',
    'Xuất nhập khẩu',
    'Đầu tư quốc tế',
    'Quản trị đa văn hóa',
    'Thương mại quốc tế',
    'Chiến lược kinh doanh',
    'Khởi nghiệp kinh doanh',
    'Quản trị bán hàng',
  ],
  'Ktoan': [
    'Kế toán tài chính',
    'Kế toán quản trị',
    'Kiểm toán',
    'Thuế và tư vấn thuế',
    'Phân tích báo cáo tài chính',
    'Kế toán công',
    'Hệ thống thông tin kế toán',
    'Tư vấn tài chính',
  ],
  'Log': [
    'Quản lý chuỗi cung ứng',
    'Vận tải và phân phối',
    'Quản lý kho bãi',
    'Logistics cảng biển',
    'Mua hàng và cung ứng',
    'Logistics lạnh',
    'Quản lý tồn kho',
    'Logistics ngược',
  ],
}

function parseCSV(content: string): LecturerRecord[] {
  const results = Papa.parse<LecturerRecord>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  })

  return results.data.filter(row => row.Email && row.Major)
}

function getRandomSpecialization(major: string): string {
  const specs = specializationsByMajor[major] || specializationsByMajor['QLCN']
  return specs[Math.floor(Math.random() * specs.length)]
}

async function updateLecturerSpecialization(email: string, major: string): Promise<{ success: boolean; updated: boolean; error?: string }> {
  try {
    // Check if profile exists
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, specialization')
      .eq('email', email)
      .single()

    if (fetchError || !profile) {
      return { success: false, updated: false, error: 'Profile not found' }
    }

    // Generate new specialization
    const specialization = getRandomSpecialization(major)

    // Check if already has specialization
    if (profile.specialization) {
      // Still update with new one from major
    }

    // Update specialization
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ specialization })
      .eq('id', profile.id)
      .select('specialization')
      .single()

    if (updateError) {
      return { success: false, updated: false, error: updateError.message }
    }

    return { success: true, updated: true, error: updated?.specialization }
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

  // Get unique emails with their major
  const emailMap = new Map<string, string>()
  lecturers.forEach(l => {
    if (!emailMap.has(l.Email)) {
      emailMap.set(l.Email, l.Major)
    }
  })
  const uniqueLecturers = Array.from(emailMap.entries())

  console.log(`📊 Tìm thấy ${uniqueLecturers.length} giảng viên cần cập nhật`)
  console.log('')

  const batchSize = 10
  let updatedCount = 0
  let errorCount = 0
  const errors: { email: string; error: string }[] = []
  const specializations: { email: string; spec: string }[] = []

  for (let i = 0; i < uniqueLecturers.length; i += batchSize) {
    const batch = uniqueLecturers.slice(i, i + batchSize)
    const batchNum = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(uniqueLecturers.length / batchSize)

    console.log(`⏳ Đang xử lý batch ${batchNum}/${totalBatches}...`)

    const results = await Promise.all(
      batch.map(async ([email, major]) => {
        const result = await updateLecturerSpecialization(email, major)
        return { ...result, email, major }
      })
    )

    for (const result of results) {
      if (result.success) {
        if (result.updated) {
          updatedCount++
          specializations.push({ email: result.email, spec: result.error || 'N/A' })
          console.log(`   ✅ ${result.email} → ${result.error}`)
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

  // Print summary of specializations by major
  console.log('')
  console.log('📋 DANH SÁCH CHUYÊN MÔN THEO GIẢNG VIÊN:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  specializations.forEach(({ email, spec }) => {
    console.log(`   ${email}: ${spec}`)
  })
}

main().catch(console.error)
