# NoSQL Migration Guide - Academic Nexus App

## Overview

Database đã được chuyển đổi từ 14 bảng relational sang 8 bảng document-based (NoSQL style) với JSONB embeddings.

---

## Schema Changes

### Trước (14 tables)
- profiles, semesters, proposals, registrations
- submissions, grades, feedback, defense_sessions
- councils, council_members, submission_rounds
- notifications, audit_logs, settings

### Sau (8 tables)
1. **profiles** - User accounts (giữ nguyên)
2. **semesters** - Academic periods + embedded `rounds[]`
3. **proposals** - Thesis topics + embedded `registrations_summary[]`
4. **registrations** - CORE table với embedded:
   - `submissions[]` (thay thế bảng submissions)
   - `submissions[].grades[]` (thay thế bảng grades)
   - `feedback_thread[]` (thay thế bảng feedback)
   - `defense_session` (thay thế bảng defense_sessions)
5. **councils** - Defense councils + embedded `members[]`, `defenses[]`
6. **notifications** - User notifications
7. **audit_logs** - Activity logs
8. **settings** - System config

---

## Chạy Migration

### Cách 1: Supabase SQL Editor (Recommended)

1. Truy cập: https://hhqwraokxkynkmushugf.supabase.co/project/editor/sql
2. Copy toàn bộ nội dung file `supabase/migrations/002_nosql_migration_standalone.sql`
3. Paste vào SQL Editor và click **Run**
4. Xác nhận migration thành công

### Cách 2: Supabase CLI (nếu đã cài)

```bash
cd supabase
supabase db push
```

---

## API Routes Đã Update

| Route | Changes |
|-------|---------|
| GET /api/lecturer/proposals | Dùng `registrations_summary` JSONB thay vì JOIN |
| POST /api/lecturer/proposals | Denormalize supervisor info khi tạo proposal |
| GET /api/lecturer/students | Query `registrations` với `proposal_supervisor_id` |
| GET /api/lecturer/dashboard | Stats từ embedded data, không JOIN |
| GET /api/registrations | Trả về embedded `submissions[]`, `feedback_thread[]` |
| POST /api/registrations | Embed student/proposal info, update proposal summary |
| GET /api/lecturer/grades | Đọc grades từ `registrations.submissions[].grades[]` |
| POST /api/lecturer/grades | Ghi grade vào embedded array |
| GET /api/lecturer/feedback | Đọc từ `registrations.feedback_thread[]` |
| POST /api/lecturer/feedback | Ghi feedback vào embedded array |

---

## Data Denormalization

Khi tạo registration mới:
- `student_name`, `student_email`, `student_code` được copy từ profiles
- `proposal_title`, `proposal_supervisor_id` được copy từ proposals

Khi tạo proposal mới:
- `supervisor_name`, `supervisor_email` được copy từ profiles

Khi user update profile (name, email):
- Cần update tất cả documents chứa denormalized data (application-level hoặc trigger)

---

## Test Checklist

### Lecturer Pages
- [ ] `/lecturer` - Dashboard loads với stats đúng
- [ ] `/lecturer/students` - Danh sách sinh viên với progress
- [ ] `/lecturer/proposals` - Đề cương với registrations
- [ ] `/lecturer/grading` - Pending grading list
- [ ] `/lecturer/feedback` - Feedback history
- [ ] `/lecturer/schedule` - Defense sessions

### Student Pages
- [ ] `/student/proposals` - Available proposals
- [ ] `/student/registrations` - My registrations với embedded data
- [ ] `/student/grading` - Grades từ embedded submissions

### API Tests
```bash
# Test lecturer proposals
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/lecturer/proposals

# Test registrations
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/registrations?student_id=YOUR_ID
```

---

## Troubleshooting

### Lỗi: "relation does not exist"
- Migration chưa chạy thành công
- Check Supabase dashboard → Table editor

### Lỗi: "column not found"
- Schema cũ còn tồn tại
- Drop tables hoàn toàn và chạy lại migration

### Lỗi: RLS policy violation
- Check RLS policies trong migration script
- Verify user role trong profiles table

---

## Next Steps

1. ✅ Migration SQL created
2. ✅ API routes updated
3. ⏳ Run migration on Supabase
4. ⏳ Test all pages
5. ⏳ Update frontend types (nếu cần)

---

## Files Reference

- Migration SQL: `supabase/migrations/002_nosql_migration_standalone.sql`
- API Routes: `src/app/api/lecturer/**/route.ts`
- Plan: `.claude/plans/snug-cooking-deer.md`
