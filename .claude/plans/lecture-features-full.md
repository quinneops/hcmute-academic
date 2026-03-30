# Lecture Features Implementation - Academic Nexus App

## Context

**Problem Statement:**
Hiện tại application đang ở trạng thái "half-implemented" - các trang student đã có UI + hooks + API连接, nhưng lecturer pages và admin pages vẫn dùng **mock data** hoàn toàn. Giảng viên không thể:
- Xem danh sách sinh viên thực tế đang hướng dẫn
- Chấm điểm và lưu điểm số vào database
- Xem đề cương sinh viên nộp và phê duyệt
- Gửi góp ý được lưu vào database
- Xem lịch bảo vệ từ bảng `defense_sessions`

Admin cũng không thể:
- Quản lý users (sinh viên, giảng viên)
- Tạo hội đồng bảo vệ
- Quản lý học kỳ
- Xem báo cáo tổng hợp

**Mục tiêu:** Implement 100% features cho lecturer và admin, hoàn thiện flow student → lecturer → admin integration.

---

## Current State Analysis

### ✅ Student Features (COMPLETE - ~90%)

| Feature | UI | Hook | API | DB | Status |
|---------|----|----|----|----|--------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | Complete |
| Registration | ✅ | ✅ | ✅ | ✅ | Complete |
| Proposals | ✅ | ✅ | ✅ | ✅ | Complete |
| Submissions | ✅ | ✅ | ✅ | ✅ | Complete |
| Documents | ✅ | ✅ | ✅ | ✅ | Complete |
| Feedback | ✅ | ✅ | ✅ | ✅ | Complete |
| Profile | ✅ | ✅ | ✅ | ✅ | Complete |
| Notifications | ✅ | ✅ | ✅ | ✅ | Complete |

**Student workflow (đã hoạt động):**
```
Login → Browse Proposals → Register → Wait Approval → Submit Documents → Get Feedback → Defense
```

---

### ⚠️ Lecturer Features (PARTIAL - ~60%)

| Feature | UI | Hook | API | DB | Status |
|---------|----|----|----|----|--------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | Complete (vừa update) |
| Students | ✅ | ✅ | ✅ | ✅ | Complete (vừa update) |
| Grading | ✅ | ✅ | ✅ | ✅ | Complete (vừa update) |
| Proposals | ✅ | ✅ | ✅ | ✅ | Complete (vừa update) |
| Feedback | ✅ | ✅ | ✅ | ✅ | Complete (vừa update) |
| Schedule | ✅ | ✅ | ✅ | ✅ | Complete (vừa update) |
| Profile | ✅ | ❌ | ❌ | ✅ | Missing hook + API |

**Lecturer workflow (cần test thực tế):**
```
Login → Create Proposal → Review Registrations → Approve/Reject → View Submissions → Grade → Feedback → Schedule Defense
```

**Vấn đề còn lại:**
- Lecturer API routes vừa được update sang pattern two-client, cần test với token thật
- Chưa có lecturer profile hook/API

---

### ❌ Admin Features (MISSING - ~10%)

| Feature | UI | Hook | API | DB | Status |
|---------|----|----|----|----|--------|
| Dashboard | ✅ (mock) | ❌ | ❌ | ✅ | UI only, no data |
| Users | ✅ (mock) | ❌ | ❌ | ✅ | UI only, no data |
| Councils | ✅ (mock) | ❌ | ❌ | ✅ | UI only, no data |
| Theses | ✅ (mock) | ❌ | ❌ | ✅ | UI only, no data |
| Schedule | ✅ (mock) | ❌ | ❌ | ✅ | UI only, no data |
| Reports | ❌ | ❌ | ❌ | ✅ | Missing entirely |
| Semesters | ❌ | ❌ | ❌ | ✅ | Missing entirely |

**Admin workflow (chưa có):**
```
Login → Manage Users → Create Councils → Assign Theses → Schedule Defenses → View Reports
```

---

## Database Schema (Đã có - 001_initial_schema.sql)

### Core Tables for Features:
```
profiles → users (students, lecturers, admins)
proposals → thesis topics
registrations → student registrations
submissions → student submissions
grades → grading records
feedback → lecturer feedback
defense_sessions → defense scheduling
councils → defense councils
semesters → academic periods
```

### RLS Policies (Đã có):
- `lecturers_view_own_proposals`
- `lecturers_view_proposal_registrations`
- `lecturers_view_student_submissions`
- `graders_manage_own_grades`
- `lecturers_view_student_feedback`
- `lecturers_create_feedback`

---

## Implementation Plan

### Phase 1: Complete Lecturer Features (PRIORITY: HIGH)

#### 1.1 Lecturer Profile Hook + API
**Files to create:**
- `src/hooks/lecturer/use-lecturer-profile.ts`
- `src/app/api/lecturer/profile/route.ts`

**Implementation:**
```typescript
// use-lecturer-profile.ts
export function useLecturerProfile(lecturerId: string) {
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch profile
  // Update profile
  // Upload avatar
}
```

```typescript
// GET /api/lecturer/profile - fetch profile
// PUT /api/lecturer/profile - update profile
```

**Why:** Lecturer cần xem và cập nhật thông tin cá nhân (email, phone, department, faculty).

---

#### 1.2 Lecturer Proposal Detail + Create
**Files to create:**
- `src/app/api/lecturer/proposals/[id]/route.ts`
- `src/app/(dashboard)/lecturer/proposals/create/page.tsx`

**Implementation:**
```typescript
// GET /api/lecturer/proposals/:id - get detail with registrations
// PUT /api/lecturer/proposals/:id - update proposal
// DELETE /api/lecturer/proposals/:id - archive proposal
// POST /api/lecturer/proposals - create new proposal
```

**UI Flow:**
```
/lecturer/proposals → Click "Tạo đề cương mới" → Form:
  - Title
  - Description
  - Category
  - Tags
  - Max students
  - Requirements
  - Is industrial (company partnership)
```

---

#### 1.3 Lecturer Grading Enhancement
**Files to modify:**
- `src/app/api/lecturer/grades/route.ts` - add GET for detail
- `src/app/api/lecturer/grades/[id]/route.ts` - create for update/delete

**Implementation:**
```typescript
// GET /api/lecturer/grades - list all graded submissions
// GET /api/lecturer/grades/:id - get grade detail
// PUT /api/lecturer/grades/:id - update grade
// DELETE /api/lecturer/grades/:id - delete grade (admin only)
```

**UI Enhancement:**
- Thêm grading history view
- Export grades to CSV
- Bulk grading (multiple submissions)

---

### Phase 2: Admin Features (PRIORITY: HIGH)

#### 2.1 Admin Dashboard API + Hook
**Files to create:**
- `src/hooks/admin/use-admin-dashboard.ts`
- `src/app/api/admin/dashboard/route.ts`

**Implementation:**
```typescript
// GET /api/admin/dashboard
{
  stats: {
    totalStudents: number,
    totalLecturers: number,
    activeSemesters: number,
    pendingRegistrations: number,
    upcomingDefenses: number,
  },
  recentActivity: Activity[],
  recentTheses: ThesisSummary[],
}
```

---

#### 2.2 Admin Users Management
**Files to create:**
- `src/hooks/admin/use-admin-users.ts`
- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/users/[id]/route.ts`

**Implementation:**
```typescript
// GET /api/admin/users - list all users with pagination
// POST /api/admin/users - create user (import from CSV)
// PUT /api/admin/users/:id - update user (role, status)
// DELETE /api/admin/users/:id - deactivate user
```

**UI Features:**
- Bulk import from CSV/Excel
- Role assignment (student ↔ lecturer ↔ admin)
- Activate/deactivate accounts
- View login history

---

#### 2.3 Admin Councils Management
**Files to create:**
- `src/hooks/admin/use-admin-councils.ts`
- `src/app/api/admin/councils/route.ts`
- `src/app/api/admin/councils/[id]/route.ts`
- `src/app/api/admin/councils/[id]/members/route.ts`

**Implementation:**
```typescript
// GET /api/admin/councils - list all councils
// POST /api/admin/councils - create council
// PUT /api/admin/councils/:id - update council
// POST /api/admin/councils/:id/members - add member
// DELETE /api/admin/councils/:id/members/:memberId - remove member
```

**UI Flow:**
```
/admin/councils → Click "Tạo hội đồng mới" → Form:
  - Name (Hội đồng 1, 2, 3...)
  - Code (HD-2024-001)
  - Semester
  - Chair (chọn từ danh sách lecturers)
  - Secretary (chọn từ danh sách lecturers)
  - Members (chọn multiple lecturers)
  - Scheduled date
  - Room
```

---

#### 2.4 Admin Theses Management
**Files to create:**
- `src/hooks/admin/use-admin-theses.ts`
- `src/app/api/admin/theses/route.ts`
- `src/app/api/admin/theses/[id]/route.ts`

**Implementation:**
```typescript
// GET /api/admin/theses - list all theses with filters
// PUT /api/admin/theses/:id - update thesis (status, council assignment)
// POST /api/admin/theses/[id]/council - assign to council
```

**UI Features:**
- View all theses across semesters
- Filter by status, supervisor, council
- Assign thesis to defense council
- Export thesis list

---

#### 2.5 Admin Semester Management
**Files to create:**
- `src/hooks/admin/use-admin-semesters.ts`
- `src/app/api/admin/semesters/route.ts`
- `src/app/api/admin/semesters/[id]/route.ts`

**Implementation:**
```typescript
// GET /api/admin/semesters - list all semesters
// POST /api/admin/semesters - create new semester
// PUT /api/admin/semesters/:id - update semester (dates, status)
// DELETE /api/admin/semesters/:id - archive semester (if no data)
```

**UI Flow:**
```
/admin/semesters → Click "Tạo học kỳ mới" → Form:
  - Name (HK2 2024-2025)
  - Academic year (2024-2025)
  - Semester number (1, 2, 3)
  - Start date
  - End date
  - Registration start/end
  - Is current (radio)
```

---

#### 2.6 Admin Reports
**Files to create:**
- `src/hooks/admin/use-admin-reports.ts`
- `src/app/api/admin/reports/overview/route.ts`
- `src/app/api/admin/reports/theses/route.ts`
- `src/app/api/admin/reports/grades/route.ts`
- `src/app/(dashboard)/admin/reports/page.tsx`

**Implementation:**
```typescript
// GET /api/admin/reports/overview - general stats
// GET /api/admin/reports/theses - thesis completion rates
// GET /api/admin/reports/grades - grade distribution
```

**Report Types:**
1. **Tổng quan:** Số lượng SV, GV, đề tài, hội đồng, tỷ lệ hoàn thành
2. **Đề tài:** Theo category, theo GVHD, theo status
3. **Điểm số:** Distribution (A/B/C/D/F), average scores theo criteria
4. **Tiến độ:** % completion theo semester, department

**Export:** PDF, Excel

---

### Phase 3: Enhanced Features (PRIORITY: MEDIUM)

#### 3.1 Student Calendar
**Files to create:**
- `src/hooks/student/use-student-calendar.ts`
- `src/app/api/student/calendar/route.ts`
- `src/app/(dashboard)/student/calendar/page.tsx`

**Features:**
- View all deadlines (submission rounds, defense dates)
- Personal events (meetings with supervisor)
- Integration with Google Calendar (export .ics)

---

#### 3.2 Lecturer Calendar
**Files to create:**
- `src/hooks/lecturer/use-lecturer-calendar.ts`
- `src/app/api/lecturer/calendar/route.ts`
- `src/app/(dashboard)/lecturer/calendar/page.tsx`

**Features:**
- View all student meetings
- Defense schedule
- Submission deadlines
- Office hours management

---

#### 3.3 Notifications Enhancement
**Files to modify:**
- `src/app/api/notifications/route.ts` - add real-time
- `src/lib/supabase/realtime.ts` - setup Supabase Realtime

**Implementation:**
```typescript
// Subscribe to notifications channel
supabase.channel('notifications:user_id')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    // Show toast notification
  })
  .subscribe()
```

---

#### 3.4 File Upload to Supabase Storage
**Files to create:**
- `src/lib/supabase/storage.ts`
- `src/app/api/upload/route.ts`

**Implementation:**
```typescript
// Upload file to bucket
export async function uploadFile(
  bucket: 'submissions' | 'attachments' | 'avatars',
  file: File,
  path: string
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error
  return data.path
}
```

**RLS Policies for Storage:**
```sql
-- submissions: students upload to own folder
CREATE POLICY "students_upload_own" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'submissions' AND (storage.foldername(name))[1] = auth.uid()::text);

-- attachments: lecturers can upload feedback
CREATE POLICY "lecturers_upload_feedback" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'attachments' AND auth.uid() IN (SELECT id FROM profiles WHERE role = 'lecturer'));
```

---

### Phase 4: Polish & Optimization (PRIORITY: LOW)

#### 4.1 Performance Optimization
- Add React Query for caching
- Implement infinite scroll for long lists
- Add loading skeletons (Skeleton component)
- Lazy load heavy components

---

#### 4.2 Accessibility
- Keyboard navigation for all interactive elements
- ARIA labels for icons
- Focus management in modals
- Screen reader testing

---

#### 4.3 Mobile Responsiveness
- Test all pages on mobile devices
- Fix layout issues
- Touch-friendly tap targets
- Bottom nav for mobile

---

## Database Migrations Needed

### 002_lecturer_admin_features.sql

```sql
-- 1. Indexes for admin queries
CREATE INDEX IF NOT EXISTS profiles_role_is_active_idx ON profiles(role, is_active);
CREATE INDEX IF NOT EXISTS proposals_semester_status_idx ON proposals(semester_id, status);
CREATE INDEX IF NOT EXISTS councils_semester_status_idx ON councils(semester_id, status);
CREATE INDEX IF NOT EXISTS semesters_is_current_idx ON semesters(is_current);

-- 2. Function: Get admin dashboard stats
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS TABLE (
  total_students INTEGER,
  total_lecturers INTEGER,
  active_theses INTEGER,
  pending_registrations INTEGER,
  upcoming_defenses BIGINT,
  current_semester_id UUID
) AS $$
BEGIN
  RETURN QUERY SELECT
    (SELECT COUNT(*) FROM profiles WHERE role = 'student' AND is_active = true),
    (SELECT COUNT(*) FROM profiles WHERE role = 'lecturer' AND is_active = true),
    (SELECT COUNT(*) FROM proposals WHERE status = 'approved'),
    (SELECT COUNT(*) FROM registrations WHERE status = 'pending'),
    (SELECT COUNT(*) FROM defense_sessions WHERE status = 'scheduled' AND scheduled_at >= NOW()),
    (SELECT id FROM semesters WHERE is_current = true LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function: Get thesis completion rate by semester
CREATE OR REPLACE FUNCTION get_thesis_completion_rate(semester_uuid UUID)
RETURNS TABLE (
  total_registrations INTEGER,
  completed INTEGER,
  in_progress INTEGER,
  pending INTEGER,
  completion_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY SELECT
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE r.status = 'completed')::INTEGER,
    COUNT(*) FILTER (WHERE r.status IN ('approved', 'active'))::INTEGER,
    COUNT(*) FILTER (WHERE r.status = 'pending')::INTEGER,
    ROUND(
      COUNT(*) FILTER (WHERE r.status = 'completed') * 100.0 / NULLIF(COUNT(*), 0),
      2
    );
  FROM registrations r
  JOIN proposals p ON r.proposal_id = p.id
  WHERE p.semester_id = semester_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function: Grade distribution report
CREATE OR REPLACE FUNCTION get_grade_distribution(semester_uuid UUID DEFAULT NULL)
RETURNS TABLE (
  grade TEXT,
  count BIGINT,
  percentage DECIMAL
) AS $$
DECLARE
  total_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_count
  FROM registrations r
  JOIN proposals p ON r.proposal_id = p.id
  WHERE r.final_grade IS NOT NULL
  AND (semester_uuid IS NULL OR p.semester_id = semester_uuid);

  RETURN QUERY SELECT
    r.final_grade,
    COUNT(*),
    ROUND(COUNT(*) * 100.0 / NULLIF(total_count, 0), 2)
  FROM registrations r
  JOIN proposals p ON r.proposal_id = p.id
  WHERE r.final_grade IS NOT NULL
  AND (semester_uuid IS NULL OR p.semester_id = semester_uuid)
  GROUP BY r.final_grade
  ORDER BY r.final_grade;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger: Auto-create notification for admin when new user registers
CREATE OR REPLACE FUNCTION create_admin_user_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, title, content, type, priority)
  SELECT
    id,
    'Người dùng mới đăng ký',
    NEW.full_name || ' (' || NEW.email || ')',
    'system'::notification_type,
    'normal'
  FROM profiles
  WHERE role = 'admin' AND is_active = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_admin_user_notification_after_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_admin_user_notification();
```

---

## Files to Create (Summary)

### Lecturer (8 files)
1. `src/hooks/lecturer/use-lecturer-profile.ts`
2. `src/app/api/lecturer/profile/route.ts`
3. `src/app/api/lecturer/proposals/[id]/route.ts`
4. `src/app/api/lecturer/grades/[id]/route.ts`
5. `src/app/(dashboard)/lecturer/proposals/create/page.tsx`
6. `src/app/(dashboard)/lecturer/calendar/page.tsx`
7. `src/hooks/lecturer/use-lecturer-calendar.ts`
8. `src/app/api/lecturer/calendar/route.ts`

### Admin (15 files)
1. `src/hooks/admin/use-admin-dashboard.ts`
2. `src/hooks/admin/use-admin-users.ts`
3. `src/hooks/admin/use-admin-councils.ts`
4. `src/hooks/admin/use-admin-theses.ts`
5. `src/hooks/admin/use-admin-semesters.ts`
6. `src/hooks/admin/use-admin-reports.ts`
7. `src/app/api/admin/dashboard/route.ts`
8. `src/app/api/admin/users/route.ts`
9. `src/app/api/admin/users/[id]/route.ts`
10. `src/app/api/admin/councils/route.ts`
11. `src/app/api/admin/councils/[id]/route.ts`
12. `src/app/api/admin/councils/[id]/members/route.ts`
13. `src/app/api/admin/theses/route.ts`
14. `src/app/api/admin/theses/[id]/route.ts`
15. `src/app/api/admin/semesters/route.ts`
16. `src/app/api/admin/semesters/[id]/route.ts`
17. `src/app/api/admin/reports/overview/route.ts`
18. `src/app/api/admin/reports/theses/route.ts`
19. `src/app/api/admin/reports/grades/route.ts`

### Shared (4 files)
1. `src/lib/supabase/storage.ts`
2. `src/app/api/upload/route.ts`
3. `src/lib/supabase/realtime.ts`
4. `src/app/api/student/calendar/route.ts`

### Migrations (1 file)
1. `supabase/migrations/002_lecturer_admin_features.sql`

**Total: ~32 files mới**

---

## Testing Strategy

### Unit Tests (Jest + React Testing Library)
- Test each hook with mock Supabase client
- Test API routes with mocked requests
- Test grading calculation logic
- Test RLS policies

### Integration Tests (Playwright)
```typescript
// Test full flow: student submits → lecturer grades → student sees grade
test('full grading flow', async ({ page }) => {
  // Login as student
  await page.goto('/login')
  await page.fill('[name=email]', 'student@ute.edu.vn')
  await page.click('button[type=submit]')

  // Submit document
  await page.goto('/student/submissions')
  await page.click('text=Nộp sản phẩm mới')
  // ... fill form

  // Login as lecturer
  await page.goto('/logout')
  await page.goto('/login')
  await page.fill('[name=email]', 'lecturer@ute.edu.vn')

  // Grade submission
  await page.goto('/lecturer/grading')
  await page.click('text=Xem')
  // ... fill scores, submit

  // Verify student sees grade
  // ...
})
```

### Manual Testing Checklist
- [ ] Lecturer sees only their own students
- [ ] Grade form saves correctly with all criteria
- [ ] Proposal approve/reject updates status
- [ ] Feedback sent appears in student's feedback list
- [ ] Schedule shows correct defense sessions
- [ ] Admin can create council with members
- [ ] Admin can view all users with pagination
- [ ] Reports show correct stats
- [ ] File upload works with size validation
- [ ] Real-time notifications appear

---

## Success Criteria

1. ✅ Tất cả 6 lecturer pages không còn mock data
2. ✅ Tất cả 6 admin pages có data thật từ DB
3. ✅ CRUD operations hoạt động: create feedback, submit grade, approve proposal, create council
4. ✅ RLS policies đảm bảo lecturers chỉ xem được data của mình
5. ✅ Admin có thể quản lý toàn bộ hệ thống
6. ✅ No TypeScript errors, proper types throughout
7. ✅ All API routes tested with curl/Postman
8. ✅ File upload to Supabase Storage working
9. ✅ Real-time notifications working

---

## Timeline Estimate

| Phase | Human team | CC+gstack |
|-------|-----------|-----------|
| Phase 1: Lecturer completion | 4 hours | 30 min |
| Phase 2: Admin features | 8 hours | 45 min |
| Phase 3: Enhanced features | 6 hours | 40 min |
| Phase 4: Polish | 4 hours | 20 min |
| Testing | 4 hours | 30 min |
| **Total** | **26 hours** | **~2.5 hours** |

---

## Next Steps

1. **Confirm scope:** Bạn muốn tôi bắt đầu với phase nào?
2. **Migration first:** Chạy migration `002_lecturer_admin_features.sql` trước khi implement
3. **Priority order:**
   - Option A: Lecturer trước (student đã hoạt động, lecturer cần hoàn thiện)
   - Option B: Admin trước (quản lý users, councils quan trọng)
   - Option C: Cuộn từng phần nhỏ, test xong mới qua phần khác

**Khuyến nghị:** Làm Phase 1 (Lecturer profile + proposal create) trước → test → qua Phase 2 (Admin).
