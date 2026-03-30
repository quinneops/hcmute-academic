# Test Data Setup Guide

## Quick Start

### Option 1: Automatic Setup (Recommended)

```bash
# 1. Apply seed data migration
npx supabase db push

# 2. Run test user setup in Supabase Dashboard
# Go to: https://app.supabase.com/project/YOUR_PROJECT/sql
# Copy and paste: supabase/migrations/005_setup_test_users.sql
# Run the script

# 3. Verify data
# Run this query in SQL Editor:
SELECT p.role, COUNT(*) FROM profiles p GROUP BY p.role;
```

### Option 2: Manual Setup via UI

1. **Create Semesters:**
   - Go to Database → Tables → semesters → Insert
   - Copy data from `004_seed_test_data.sql`

2. **Create Test Users:**
   - Go to Authentication → Users → Add User
   - Add each test user manually (14 users total)
   - Use passwords listed in `TEST_CASES.md`

3. **Create Proposals:**
   - Go to Database → Tables → proposals → Insert
   - Copy proposal data from seed file

---

## Test Accounts

After running setup, use these credentials:

### Student Accounts

| Email | Password | Name |
|-------|----------|------|
| `sv20001@student.ute.vn` | `Test1234!` | Nguyễn Văn A |
| `sv20002@student.ute.vn` | `Test1234!` | Trần Thị B |
| `sv20003@student.ute.vn` | `Test1234!` | Lê Văn C |
| `sv20004@student.ute.vn` | `Test1234!` | Phạm Thị D |
| `sv20005@student.ute.vn` | `Test1234!` | Hoàng Văn E |
| `sv20006@student.ute.vn` | `Test1234!` | Vũ Thị F |
| `sv20007@student.ute.vn` | `Test1234!` | Đỗ Văn G |
| `sv20008@student.ute.vn` | `Test1234!` | Bùi Thị H |

### Lecturer Accounts

| Email | Password | Name |
|-------|----------|------|
| `thay.nguyen@ute.edu.vn` | `Test1234!` | TS. Nguyễn Minh Trí |
| `co.tran@ute.edu.vn` | `Test1234!` | ThS. Trần Thị Lan Anh |
| `thay.le@ute.edu.vn` | `Test1234!` | PGS.TS. Lê Hoàng Dũng |
| `co.pham@ute.edu.vn` | `Test1234!` | ThS. Phạm Thị Mai |

### Admin Accounts

| Email | Password | Name |
|-------|----------|------|
| `admin@ute.edu.vn` | `Test1234!` | Nguyễn Văn Admin |
| `admin2@ute.edu.vn` | `Test1234!` | Trần Thị Hạnh |

---

## Verification

Run these queries to verify setup:

```sql
-- Check user counts by role
SELECT role, COUNT(*) as count
FROM profiles
WHERE id IN (SELECT id FROM auth.users)
GROUP BY role;

-- Expected:
-- student: 8
-- lecturer: 4
-- admin: 2

-- Check proposals
SELECT status, COUNT(*) as count
FROM proposals
GROUP BY status;

-- Expected:
-- approved: 8
-- pending: 1
-- draft: 1

-- Check registrations
SELECT status, COUNT(*) as count
FROM registrations
GROUP BY status;

-- Expected:
-- completed: 8
-- pending: 2
```

---

## Running Tests

### Automated Tests

```bash
# Set environment
export NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
export SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Run tests
bun test test/academic-nexus.test.ts

# Run specific suite
bun test test/academic-nexus.test.ts -t "Authentication"
```

### Manual Testing

1. Start dev server:
```bash
bun dev
```

2. Open test cases:
```bash
# Open TEST_CASES.md and follow test scenarios
```

3. Login and test each role:
```
http://localhost:3000/login
→ Use student account
→ Navigate to /student/proposals
→ Should see 8 approved proposals
```

---

## Reset Test Data

To reset all test data and start fresh:

```sql
-- WARNING: Deletes ALL test data!
-- Run in Supabase SQL Editor

-- 1. Delete auth users (cascades to profiles)
DELETE FROM auth.users
WHERE email LIKE '%student.ute.vn'
   OR email LIKE '%ute.edu.vn'
   OR email LIKE '%admin%';

-- 2. Truncate other tables (in order)
TRUNCATE TABLE
  notifications,
  feedback,
  defense_sessions,
  council_members,
  councils,
  grades,
  submissions,
  registrations,
  proposals,
  submission_rounds,
  semesters
CASCADE;

-- 3. Re-run seed data
-- Copy and paste from 004_seed_test_data.sql
-- Then re-run 005_setup_test_users.sql
```

---

## Troubleshooting

### "infinite recursion detected in policy"

**Solution:** Apply migration `003_fix_profiles_rls_and_auto_create.sql` first

```bash
npx supabase db push
```

### "Profile not found"

**Cause:** Profile trigger not working

**Solution:** Check trigger exists:

```sql
-- Verify trigger
SELECT tgname FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- If missing, run:
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### "Cannot insert - violates foreign key"

**Cause:** Trying to insert profile without auth.user

**Solution:** Use the `create_test_user()` function from `005_setup_test_users.sql`

### RLS blocking test data inserts

**Solution:** Temporarily disable RLS for seeding:

```sql
-- Disable RLS
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Insert test data

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

---

## Data Relationships

```
auth.users (1) ──→ (1) profiles (1) ──→ (N) registrations
                      │
                      ├──→ (N) proposals (supervisor)
                      │
                      └──→ (N) grades (grader)

proposals (1) ──→ (N) registrations (N) ──→ (N) submissions
                                              │
                                              └──→ (N) grades

semesters (1) ──→ (N) proposals
semesters (1) ──→ (N) submission_rounds
semesters (1) ──→ (N) councils

councils (1) ──→ (N) council_members
councils (1) ──→ (N) defense_sessions

registrations (1) ──→ (N) feedback
registrations (1) ──→ (N) defense_sessions

profiles (1) ──→ (N) notifications
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `supabase/migrations/004_seed_test_data.sql` | SQL INSERT statements for test data |
| `supabase/migrations/005_setup_test_users.sql` | Auth user creation script |
| `test/academic-nexus.test.ts` | Automated test suite |
| `TEST_CASES.md` | Manual test cases documentation |
| `TEST_DATA_SETUP.md` | This file - setup instructions |

---

**Last Updated:** 2026-03-29
