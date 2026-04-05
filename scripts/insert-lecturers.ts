/**
 * Script to insert all lecturers from data_gv.csv into the database
 *
 * Usage: npm run insert-lecturers
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

function mapMajorToDepartment(major: string): { faculty: string; department: string } {
  const majorMap: Record<string, { faculty: string; department: string }> = {
    'QLCN': { faculty: 'Khoa Kinh tế & Quản lý', department: 'Bộ môn Quản lý Công nghiệp' },
    'TMĐT': { faculty: 'Khoa Kinh tế & Quản lý', department: 'Bộ môn Thương mại điện tử' },
    'KDQT': { faculty: 'Khoa Kinh tế & Quản lý', department: 'Bộ môn Kinh doanh Quốc tế' },
    'Ktoan': { faculty: 'Khoa Kinh tế & Quản lý', department: 'Bộ môn Kế toán' },
    'Log': { faculty: 'Khoa Kinh tế & Quản lý', department: 'Bộ môn Logistics' },
  }

  return majorMap[major] || {
    faculty: 'Khoa Kinh tế & Quản lý',
    department: 'Bộ môn ' + (major || 'Chung')
  }
}

async function createLecturerProfile(lecturer: LecturerRecord): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', lecturer.Email)
      .single()

    if (existingProfile) {
      return { success: true, userId: existingProfile.id, error: 'Already exists' }
    }

    // Generate default password
    const defaultPassword = `GiangVien${lecturer.Email.split('@')[0]}@2026`

    // Create auth user
    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: lecturer.Email,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        full_name: lecturer.Email.split('@')[0],
        lecturer_code: lecturer.Quota,
      }
    })

    if (createAuthError) {
      if (createAuthError.message.includes('User already registered') ||
          createAuthError.message.includes('duplicate')) {
        return { success: true, error: 'Auth user exists' }
      }
      return { success: false, error: createAuthError.message }
    }

    const authUserId = authData.user.id

    const { faculty, department } = mapMajorToDepartment(lecturer.Major)
    const specialization = getRandomSpecialization(lecturer.Major)

    // Generate lecturer_code from email
    const lecturerCode = lecturer.Email.split('@')[0].replace(/[^a-zA-Z]/g, '').toUpperCase()

    // Create profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUserId,
        email: lecturer.Email,
        full_name: lecturer.Email.split('@')[0].replace(/[._]/g, ' '),
        role: 'lecturer',
        lecturer_code: lecturerCode,
        faculty: faculty,
        department: department,
        specialization: specialization,
        is_active: true,
        is_tbm: lecturer.HeDaoTao === 'CLC',
      })
      .select()
      .single()

    if (profileError) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
      } catch {}
      return { success: false, error: profileError.message }
    }

    return { success: true, userId: authUserId }
  } catch (error: any) {
    return { success: false, error: error.message }
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

  console.log(`📊 Tìm thấy ${lecturers.length} giảng viên trong file CSV`)
  console.log('')

  const batchSize = 10
  let successCount = 0
  let existingCount = 0
  let errorCount = 0
  const errors: { email: string; error: string }[] = []

  for (let i = 0; i < lecturers.length; i += batchSize) {
    const batch = lecturers.slice(i, i + batchSize)
    const batchNum = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(lecturers.length / batchSize)

    console.log(`⏳ Đang xử lý batch ${batchNum}/${totalBatches}...`)

    const results = await Promise.all(
      batch.map(async (lecturer) => {
        const result = await createLecturerProfile(lecturer)
        return { ...result, email: lecturer.Email, major: lecturer.Major }
      })
    )

    for (const result of results) {
      if (result.success) {
        if (result.error === 'Already exists' || result.error === 'Auth user exists') {
          existingCount++
          console.log(`   ⚪ Đã tồn tại: ${result.email}`)
        } else {
          successCount++
          console.log(`   ✅ Thành công: ${result.email}`)
        }
      } else {
        errorCount++
        errors.push({ email: result.email, error: result.error || 'Unknown error' })
        console.log(`   ❌ Lỗi: ${result.email} - ${result.error}`)
      }
    }

    if (i + batchSize < lecturers.length) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📈 KẾT QUẢ')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ Thành công: ${successCount} giảng viên`)
  console.log(`⚪ Đã tồn tại: ${existingCount} giảng viên`)
  console.log(`❌ Thất bại: ${errorCount} giảng viên`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (errors.length > 0) {
    console.log('')
    console.log('📋 Chi tiết lỗi:')
    errors.forEach(({ email, error }) => {
      console.log(`   - ${email}: ${error}`)
    })
  }

  console.log('')
  console.log('💡 Mật khẩu mặc định: GiangVien<email>@2026')
}

main().catch(console.error)
