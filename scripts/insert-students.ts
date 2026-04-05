/**
 * Script to insert all students from sv_data.csv into the database
 *
 * Usage: npx tsx scripts/insert-students.ts
 *
 * Prerequisites:
 * 1. Ensure .env.local has SUPABASE_SERVICE_ROLE_KEY set
 * 2. File sv_data.csv must be in the project root directory
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

interface StudentRecord {
  Email: string
  MS: string
  Ten: string
  Role: string
  Major: string
  HeDaoTao: string
}

function parseCSV(content: string): StudentRecord[] {
  const results = Papa.parse<StudentRecord>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  })

  return results.data.filter(row => row.Email && row.MS)
}

async function createStudentProfile(student: StudentRecord): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    // Check if profile already exists by email
    const { data: existingProfileByEmail } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('email', student.Email)
      .single()

    if (existingProfileByEmail) {
      return { success: true, userId: existingProfileByEmail.id, error: 'Already exists' }
    }

    // Check if auth user exists by trying to get user by email
    // If profile doesn't exist but auth user does, we need to create the profile
    let authUserId: string | null = null

    // Generate default password (student can reset later)
    const defaultPassword = `Sinh${student.MS}@2026`

    // Try to create auth user
    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: student.Email,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        full_name: student.Ten,
        student_code: student.MS,
      }
    })

    if (createAuthError) {
      // Check if user already exists in auth
      if (createAuthError.message.includes('User already registered') ||
          createAuthError.message.includes('duplicate') ||
          createAuthError.message.includes('already been registered')) {
        // Auth user exists, try to get their ID by querying profiles with student_code
        const { data: existingByCode } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('student_code', student.MS)
          .single()

        if (existingByCode) {
          return { success: true, userId: existingByCode.id, error: 'Auth user exists' }
        }

        // Auth user exists but no profile - we can't easily get the user ID
        // Skip this user and log
        return { success: true, error: 'Auth user exists (no profile found)' }
      }
      return { success: false, error: createAuthError.message }
    }

    authUserId = authData.user.id

    // Map major to faculty/department
    const { faculty, department } = mapMajorToFaculty(student.Major)

    // Create profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUserId,
        email: student.Email,
        full_name: student.Ten,
        role: 'student',
        student_code: student.MS,
        faculty: faculty,
        department: department,
        is_active: true,
        is_tbm: false,
      })
      .select()
      .single()

    if (profileError) {
      // Rollback auth user
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

function mapMajorToFaculty(major: string): { faculty: string; department: string } {
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

async function main() {
  // Read CSV file
  const csvPath = path.join(process.cwd(), 'sv_data.csv')

  if (!fs.existsSync(csvPath)) {
    console.error('❌ File sv_data.csv không tìm thấy trong thư mục hiện tại')
    console.error('   Đảm bảo file sv_data.csv nằm trong thư mục gốc của project')
    process.exit(1)
  }

  // Check environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Thiếu biến môi trường')
    console.error('   Đảm bảo .env.local có:')
    console.error('   - NEXT_PUBLIC_SUPABASE_URL')
    console.error('   - SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const students = parseCSV(csvContent)

  console.log(`📊 Tìm thấy ${students.length} dòng trong file CSV`)
  console.log('')

  // Filter only students
  const studentRecords = students.filter(s => s.Role?.toLowerCase() === 'student')
  console.log(`📚 Số lượng sinh viên cần insert: ${studentRecords.length}`)
  console.log('')

  // Process in batches to avoid rate limiting
  const batchSize = 10
  let successCount = 0
  let existingCount = 0
  let errorCount = 0
  const errors: { email: string; error: string }[] = []

  for (let i = 0; i < studentRecords.length; i += batchSize) {
    const batch = studentRecords.slice(i, i + batchSize)
    const batchNum = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(studentRecords.length / batchSize)

    console.log(`⏳ Đang xử lý batch ${batchNum}/${totalBatches}...`)

    const results = await Promise.all(
      batch.map(async (student) => {
        const result = await createStudentProfile(student)
        return { ...result, email: student.Email, fullName: student.Ten }
      })
    )

    for (const result of results) {
      if (result.success) {
        if (result.error === 'Already exists' || result.error === 'Auth user exists') {
          existingCount++
          console.log(`   ⚪ Đã tồn tại: ${result.fullName} (${result.email})`)
        } else {
          successCount++
          console.log(`   ✅ Thành công: ${result.fullName} (${result.email})`)
        }
      } else {
        errorCount++
        errors.push({ email: result.email, error: result.error || 'Unknown error' })
        console.log(`   ❌ Lỗi: ${result.fullName} (${result.email}) - ${result.error}`)
      }
    }

    // Small delay between batches
    if (i + batchSize < studentRecords.length) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📈 KẾT QUẢ')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ Thành công: ${successCount} sinh viên`)
  console.log(`⚪ Đã tồn tại: ${existingCount} sinh viên`)
  console.log(`❌ Thất bại: ${errorCount} sinh viên`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (errors.length > 0) {
    console.log('')
    console.log('📋 Chi tiết lỗi:')
    errors.forEach(({ email, error }) => {
      console.log(`   - ${email}: ${error}`)
    })
  }

  console.log('')
  console.log('💡 Mật khẩu mặc định: Sinh<MSV>@2026 (ví dụ: Sinh23124045@2026)')
  console.log('   Sinh viên có thể đổi mật khẩu sau khi đăng nhập')
}

// Run the script
main().catch(console.error)
