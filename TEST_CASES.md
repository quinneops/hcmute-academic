# Test Cases - Academic Nexus App

**Generated:** 2026-03-29
**Project:** Hệ thống Quản lý Khóa luận Tốt nghiệp - HCM-UTE

---

## Mục lục

1. [Test Data Overview](#test-data-overview)
2. [Authentication Tests](#authentication-tests)
3. [Student Workflow Tests](#student-workflow-tests)
4. [Lecturer Workflow Tests](#lecturer-workflow-tests)
5. [Admin Workflow Tests](#admin-workflow-tests)
6. [Integration Tests](#integration-tests)
7. [How to Run Tests](#how-to-run-tests)

---

## Test Data Overview

### Users Created

| Role | Email | Password | Profile |
|------|-------|----------|---------|
| Student | `sv20001@student.ute.vn` | `Test1234!` | Nguyễn Văn A |
| Student | `sv20002@student.ute.vn` | `Test1234!` | Trần Thị B |
| Student | `sv20003@student.ute.vn` | `Test1234!` | Lê Văn C (Xuất sắc) |
| Student | `sv20004@student.ute.vn` | `Test1234!` | Phạm Thị D |
| Student | `sv20005@student.ute.vn` | `Test1234!` | Hoàng Văn E |
| Student | `sv20006@student.ute.vn` | `Test1234!` | Vũ Thị F |
| Student | `sv20007@student.ute.vn` | `Test1234!` | Đỗ Văn G |
| Student | `sv20008@student.ute.vn` | `Test1234!` | Bùi Thị H |
| Lecturer | `thay.nguyen@ute.edu.vn` | `Test1234!` | TS. Nguyễn Minh Trí |
| Lecturer | `co.tran@ute.edu.vn` | `Test1234!` | ThS. Trần Thị Lan Anh |
| Lecturer | `thay.le@ute.edu.vn` | `Test1234!` | PGS.TS. Lê Hoàng Dũng |
| Lecturer | `co.pham@ute.edu.vn` | `Test1234!` | ThS. Phạm Thị Mai |
| Admin | `admin@ute.edu.vn` | `Test1234!` | Nguyễn Văn Admin |
| Admin | `admin2@ute.edu.vn` | `Test1234!` | Trần Thị Hạnh |

### Semesters

| ID | Name | Academic Year | Status |
|----|------|---------------|--------|
| 1 | HK1 2024-2025 | 2024-2025 | Inactive |
| 2 | HK2 2024-2025 | 2024-2025 | **Current** |
| 3 | HK3 2024-2025 | 2024-2025 | Upcoming |
| 4 | HK1 2025-2026 | 2025-2026 | Future |

### Proposals Summary

| ID | Title | Supervisor | Status | Students |
|----|-------|------------|--------|----------|
| 441 | Gợi ý bài học ML | TS. Trí | Approved | 2 |
| 442 | Phân tích cảm xúc NLP | TS. Trí | Approved | 1 |
| 443 | QLTV QR Code | ThS. Anh | Approved | 2 |
| 444 | Đặt chỗ phòng máy | ThS. Anh | Approved | 1 |
| 445 | Nén ảnh Mobile | PGS. Dũng | Approved | 2 |
| 446 | Blockchain văn bằng | PGS. Dũng | Approved | 0 (pending) |
| 447 | Phát hiện xâm nhập AI | ThS. Mai | Approved | 0 (pending) |
| 448 | IoT giám sát MT | ThS. Mai | Pending | 0 |

---

## Authentication Tests

### Test Case: AUTH-001 - Successful Login (Student)

**Purpose:** Verify student can log in with valid credentials

**Preconditions:**
- User `sv20001@student.ute.vn` exists in system
- Password is `Test1234!`

**Steps:**
1. Navigate to `/login`
2. Enter email: `sv20001@student.ute.vn`
3. Enter password: `Test1234!`
4. Click "Đăng nhập"

**Expected Result:**
- Redirect to `/student` dashboard
- Welcome message shows "Nguyễn Văn A"
- Sidebar shows student menu items

**Test Status:** ☐ Pass ☐ Fail

---

### Test Case: AUTH-002 - Failed Login (Wrong Password)

**Purpose:** Verify system rejects invalid credentials

**Steps:**
1. Navigate to `/login`
2. Enter email: `sv20001@student.ute.vn`
3. Enter password: `wrongpassword`
4. Click "Đăng nhập"

**Expected Result:**
- Error message: "Invalid email or password"
- User stays on login page
- No session created

**Test Status:** ☐ Pass ☐ Fail

---

### Test Case: AUTH-003 - Session Persistence

**Purpose:** Verify session persists across page refresh

**Steps:**
1. Log in as student
2. Refresh browser (F5)
3. Navigate to `/student/proposals`

**Expected Result:**
- User remains logged in after refresh
- No redirect to login page
- Dashboard shows user data

**Test Status:** ☐ Pass ☐ Fail

---

## Student Workflow Tests

### Test Case: STU-001 - Browse Proposals

**Purpose:** Verify student can view approved proposals

**Preconditions:** Logged in as student

**Steps:**
1. Navigate to `/student/proposals`
2. Wait for data to load

**Expected Result:**
- Display list of approved proposals
- Show supervisor names
- Show registration count per proposal
- Filter by category works

**Test Data:** Should show 8 approved proposals

**Test Status:** ☐ Pass ☐ Fail

---

### Test Case: STU-002 - Register for Proposal

**Purpose:** Verify student can register for approved proposal

**Preconditions:**
- Logged in as student without existing registration
- Proposal has available slots

**Steps:**
1. Go to `/student/proposals`
2. Click on proposal "Xây dựng hệ thống gợi ý bài học sử dụng Machine Learning"
3. Click "Đăng ký" button
4. Fill motivation letter
5. Submit

**Expected Result:**
- Registration created with status "pending"
- Notification shown
- Redirect to registration history page

**Test Status:** ☐ Pass ☐ Fail

---

### Test Case: STU-003 - View Registration History

**Purpose:** Verify student can see their registrations

**Preconditions:** Logged in as student with registrations

**Steps:**
1. Navigate to `/student/registrations`

**Expected Result:**
- Show all registrations for current user
- Display status badges (pending/approved/completed)
- Show proposal title and supervisor

**Test Data:** Student 20001 should see 2 registrations (1 completed, 1 pending)

**Test Status:** ☐ Pass ☐ Fail

---

### Test Case: STU-004 - Submit Assignment

**Purpose:** Verify student can submit work for a round

**Preconditions:**
- Logged in as student
- Has approved registration
- Submission round is active

**Steps:**
1. Navigate to `/student/submissions`
2. Select active round
3. Upload PDF file
4. Click "Nộp bài"

**Expected Result:**
- File uploaded successfully
- Submission record created
- Status shows "submitted"
- Timestamp recorded

**Test Status:** ☐ Pass ☐ Fail

---

### Test Case: STU-005 - View Grades

**Purpose:** Verify student can see published grades

**Preconditions:**
- Logged in as student
- Has graded submissions

**Steps:**
1. Navigate to `/student/grades`

**Expected Result:**
- Display published grades only
- Show criteria scores
- Show total score and grade
- Hide unpublished grades

**Test Data:** Student 20003 should see grade 9.0 (A)

**Test Status:** ☐ Pass ☐ Fail

---

### Test Case: STU-006 - View Feedback

**Purpose:** Verify student can read lecturer feedback

**Preconditions:** Logged in as student with feedback

**Steps:**
1. Navigate to `/student/feedback`

**Expected Result:**
- Show feedback from supervisor
- Display read/unread status
- Threaded replies visible
- Mark as read works

**Test Data:** Student 20001 should see 3 feedback items

**Test Status:** ☐ Pass ☐ Fail

---

### Test Case: STU-007 - View Notifications

**Purpose:** Verify notification system works

**Preconditions:** Logged in as any user

**Steps:**
1. Check notification bell icon in header
2. Click to view all notifications

**Expected Result:**
- Unread count shown in badge
- Notifications sorted by date
- Different types styled differently
- Click marks as read

**Test Data:** Student 20001 should see 5 notifications (1 unread)

**Test Status:** ☐ Pass ☐ Fail

---

## Lecturer Workflow Tests

### Test Case: LEC-001 - View Supervised Proposals

**Purpose:** Verify lecturer sees their proposals

**Preconditions:** Logged in as lecturer

**Steps:**
1. Navigate to `/lecturer/proposals`

**Expected Result:**
- Show proposals where user is supervisor
- Show all statuses (draft/pending/approved)
- Edit button visible for own proposals

**Test Data:** TS. Trí should see 2 proposals

**Test Status:** ☐ Pass ☐ Fail

---

### Test Case: LEC-002 - Review Registration

**Purpose:** Verify lecturer can approve/reject registrations

**Preconditions:**
- Logged in as lecturer
- Has pending registration for proposal

**Steps:**
1. Go to `/lecturer/registrations`
2. Find pending registration
3. Click "Review"
4. Select "Approve" or "Reject"
5. Add notes
6. Submit

**Expected Result:**
- Status updated
- Student notified
- Review timestamp recorded

**Test Status:** ☐ Pass ☐ Fail

---

### Test Case: LEC-003 - Grade Submission

**Purpose:** Verify lecturer can grade student work

**Preconditions:**
- Logged in as lecturer
- Student has submission for supervised registration

**Steps:**
1. Navigate to `/lecturer/grading`
2. Select submission
3. Enter criteria scores (4 criteria)
4. Add feedback
5. Publish grade

**Expected Result:**
- Grade saved
- Total calculated automatically
- Student can see published grade
- Feedback visible

**Test Status:** ☐ Pass ☐ Fail

---

### Test Case: LEC-004 - Give Feedback

**Purpose:** Verify lecturer can send feedback to student

**Preconditions:**
- Logged in as lecturer
- Has supervised registration

**Steps:**
1. Go to `/lecturer/feedback`
2. Select student/registration
3. Write feedback content
4. (Optional) Attach file
5. Send

**Expected Result:**
- Feedback created
- Student receives notification
- Appears in student feedback list

**Test Status:** ☐ Pass ☐ Fail

---

### Test Case: LEC-005 - View Workload

**Purpose:** Verify lecturer workload dashboard

**Preconditions:** Logged in as lecturer

**Steps:**
1. Navigate to `/lecturer` (dashboard)

**Expected Result:**
- Show total proposals
- Show approved count
- Show pending reviews
- Show pending grades

**Test Data:** TS. Trí should see: 2 proposals, 3 students, pending grades

**Test Status:** ☐ Pass ☐ Fail

---

## Admin Workflow Tests

### Test Case: ADM-001 - View Dashboard Stats

**Purpose:** Verify admin sees system statistics

**Preconditions:** Logged in as admin

**Steps:**
1. Navigate to `/admin` (dashboard)

**Expected Result:**
- Show active students count
- Show active lecturers count
- Show approved theses count
- Show pending registrations
- Show scheduled defenses

**Test Data:** Should show 8 students, 4 lecturers, 8 approved, 2 pending

**Test Status:** ☐ Pass ☐ Fail

---

### Test Case: ADM-002 - Create Council

**Purpose:** Verify admin can create defense council

**Preconditions:** Logged in as admin

**Steps:**
1. Go to `/admin/councils`
2. Click "Create Council"
3. Fill name, code, date, room
4. Assign members (chair, secretary, members)
5. Save

**Expected Result:**
- Council created
- Members assigned
- Status set to "draft" or "assigned"

**Test Status:** ☐ Pass ☐ Fail

---

### Test Case: ADM-003 - Schedule Defense

**Purpose:** Verify admin can schedule defense sessions

**Preconditions:**
- Council exists
- Students completed registrations

**Steps:**
1. Go to `/admin/defenses`
2. Click "Schedule Defense"
3. Select council
4. Select student registration
5. Set time slot
6. Save

**Expected Result:**
- Defense session created
- Student notified
- Appears in council schedule

**Test Status:** ☐ Pass ☐ Fail

---

### Test Case: ADM-004 - Manage Users

**Purpose:** Verify admin can view all users

**Preconditions:** Logged in as admin

**Steps:**
1. Navigate to `/admin/users`

**Expected Result:**
- List all students
- List all lecturers
- Show status (active/inactive)
- Edit role capability

**Test Status:** ☐ Pass ☐ Fail

---

### Test Case: ADM-005 - View All Submissions

**Purpose:** Verify admin can monitor all submissions

**Preconditions:** Logged in as admin

**Steps:**
1. Go to `/admin/submissions`

**Expected Result:**
- Show all submissions across system
- Filter by semester
- Filter by status
- Late submissions highlighted

**Test Status:** ☐ Pass ☐ Fail

---

## Integration Tests

### Test Case: INT-001 - Complete Student Journey

**Purpose:** End-to-end test of full student workflow

**Scenario:** Fresh student joins, completes thesis

**Steps:**
1. Student registers account
2. Profile auto-created
3. Browse proposals
4. Register for proposal
5. Lecturer approves registration
6. Submit Round 1 (Đề cương)
7. Receive feedback
8. Submit Round 2, 3, 4
9. Receive grades
10. Defense scheduled
11. View final result

**Expected Flow:**
- Each step triggers next
- Notifications sent at each stage
- Data consistent across all pages

**Test Status:** ☐ Pass ☐ Fail

---

### Test Case: INT-002 - Complete Grading Workflow

**Purpose:** End-to-end test of grading process

**Scenario:** Student submits, lecturer grades, result published

**Steps:**
1. Student submits assignment
2. Lecturer receives notification
3. Lecturer opens grading page
4. Enters 4 criteria scores
5. Adds feedback
6. Publishes grade
7. Student sees grade
8. Student receives notification

**Expected Result:**
- Grade visible to student
- Appears in transcript
- Averages updated

**Test Status:** ☐ Pass ☐ Fail

---

### Test Case: INT-003 - Defense Council Formation

**Purpose:** Complete council setup to defense

**Steps:**
1. Admin creates council
2. Assigns members with roles
3. Schedules defense sessions
4. Students see their schedule
5. Defense completed
6. Results entered
7. Final grades calculated

**Test Status:** ☐ Pass ☐ Fail

---

## Edge Cases & Error Handling

### Test Case: EDGE-001 - Duplicate Registration Prevention

**Purpose:** System prevents double registration

**Steps:**
1. Student registers for proposal
2. Try to register again for same proposal

**Expected Result:**
- Error: "You already registered for this proposal"
- Database unique constraint enforced

**Test Status:** ☐ Pass ☐ Fail

---

### Test Case: EDGE-002 - Late Submission Penalty

**Purpose:** System applies late penalty

**Preconditions:** Submission deadline passed

**Steps:**
1. Student submits after deadline
2. Check submission status

**Expected Result:**
- Status marked as "late"
- Late penalty applied (e.g., -0.5 per day)
- Grade reduced accordingly

**Test Status:** ☐ Pass ☐ Fail

---

### Test Case: EDGE-003 - File Type Validation

**Purpose:** System rejects wrong file types

**Steps:**
1. Try upload .exe file instead of .pdf
2. Try upload 50MB file (limit 20MB)

**Expected Result:**
- Upload rejected
- Error message shown
- File not stored

**Test Status:** ☐ Pass ☐ Fail

---

### Test Case: EDGE-004 - RLS Security

**Purpose:** Users cannot access others' data

**Steps:**
1. Login as Student A
2. Try to access Student B's submissions via API
3. Try to access Lecturer C's proposals

**Expected Result:**
- All unauthorized requests rejected
- RLS policies enforced
- 403 or empty results returned

**Test Status:** ☐ Pass ☐ Fail

---

## How to Run Tests

### Automated Tests (Bun Test)

```bash
# Install dependencies
bun install

# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL=your_url
export NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
export SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Run all tests
bun test test/academic-nexus.test.ts

# Run specific test suite
bun test test/academic-nexus.test.ts -t "Authentication"

# Run with coverage
bun test --coverage test/academic-nexus.test.ts
```

### Manual Testing Checklist

```bash
# 1. Seed test data (run once)
# Execute: supabase/migrations/004_seed_test_data.sql

# 2. Start development server
bun dev

# 3. Test each role
# Student: http://localhost:3000/student
# Lecturer: http://localhost:3000/lecturer
# Admin: http://localhost:3000/admin
```

### Test Data Reset

```sql
-- WARNING: This deletes all test data!
-- Run in Supabase SQL Editor

DELETE FROM audit_logs;
DELETE FROM notifications;
DELETE FROM feedback;
DELETE FROM defense_sessions;
DELETE FROM council_members;
DELETE FROM councils;
DELETE FROM grades;
DELETE FROM submissions;
DELETE FROM registrations;
DELETE FROM proposals;
DELETE FROM submission_rounds;
DELETE FROM semesters;
DELETE FROM profiles WHERE id != 'your-user-id';
```

---

## Test Coverage Summary

| Module | Test Cases | Pass | Fail | Coverage |
|--------|-----------|------|------|----------|
| Authentication | 3 | ☐ | ☐ | ☐% |
| Student | 7 | ☐ | ☐ | ☐% |
| Lecturer | 5 | ☐ | ☐ | ☐% |
| Admin | 5 | ☐ | ☐ | ☐% |
| Integration | 3 | ☐ | ☐ | ☐% |
| Edge Cases | 4 | ☐ | ☐ | ☐% |
| **Total** | **27** | | | |

---

## Notes

1. **Test Data:** All test data is stored in `supabase/migrations/004_seed_test_data.sql`
2. **Auto Tests:** Automated tests in `test/academic-nexus.test.ts`
3. **Credentials:** Use test accounts listed above for manual testing
4. **RLS:** Remember RLS policies may affect test results - use service role for setup
5. **Environment:** Tests require Supabase project to be running (local or cloud)

---

**Last Updated:** 2026-03-29
**Author:** AI Assistant
**Review Status:** Pending QA Review
