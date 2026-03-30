# Student Dashboard Backend Integration - Setup Guide

## Overview

All 8 student pages have been connected to Supabase backend with real database queries, mutations, and real-time updates.

## Files Created/Modified

### New Hooks (`src/hooks/student/`)
- `use-student-dashboard.ts` - Dashboard stats, thesis progress, recent documents, feedback
- `use-student-proposals.ts` - Proposal browsing, registration, withdrawal
- `use-student-submissions.ts` - File uploads, submission history, milestone tracking
- `use-student-feedback.ts` - Bidirectional messaging with real-time updates
- `use-student-notifications.ts` - Real-time notifications with read/unread states
- `use-student-documents.ts` - Document library with download tracking
- `use-student-profile.ts` - Profile management, avatar upload, password change
- `use-student-registration.ts` - Registration workflow, approval tracking

### Modified Pages (`src/app/(dashboard)/student/`)
- `page.tsx` - Dashboard with real stats and progress
- `proposals/page.tsx` - Proposal management with registration
- `registration/page.tsx` - Registration history with status tracking
- `submissions/page.tsx` - File upload and grade tracking
- `feedback/page.tsx` - Real-time messaging
- `notifications/page.tsx` - Real-time notifications
- `profile/page.tsx` - Editable profile with avatar upload
- `documents/page.tsx` - Document library with filters

### Database Migration
- `supabase/migrations/001_student_dashboard.sql` - Full schema setup

## Setup Instructions

### 1. Run Database Migration

Open Supabase SQL Editor and run:
```bash
# Copy contents of supabase/migrations/001_student_dashboard.sql
# Paste into Supabase SQL Editor and run
```

### 2. Create Storage Buckets

In Supabase Dashboard > Storage, create these buckets:

1. **submissions** (private)
   - Purpose: Student submission files
   - Policy: Authenticated users can upload to their own folder

2. **documents** (private)
   - Purpose: Shared documents
   - Policy: Authenticated users can read, admins can write

3. **profiles** (public)
   - Purpose: User avatars
   - Policy: Authenticated users can upload, public can read

### 3. Verify Environment Variables

Ensure these are set in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Test Authentication

1. Navigate to `/login`
2. Use Dev Mode to test with any Gmail account
3. Verify redirect to `/student` dashboard

### 5. Test Each Page

- **Dashboard** (`/student`): Verify stats cards show real counts
- **Proposals** (`/student/proposals`): Register for a proposal
- **Registration** (`/student/registration`): Check registration status
- **Submissions** (`/student/submissions`): Upload a test file
- **Feedback** (`/student/feedback`): Send a message
- **Notifications** (`/student/notifications`): Verify real-time updates
- **Profile** (`/student/profile`): Update profile and upload avatar
- **Documents** (`/student/documents`): Download a document

## Database Schema

### Tables Created

| Table | Purpose |
|-------|---------|
| `documents` | Document library with download tracking |
| `proposals` | Thesis proposals from lecturers |
| `registrations` | Student registrations for proposals |
| `submissions` | Student submission files and grades |
| `feedback` | Bidirectional messaging |
| `notifications` | System notifications |
| `document_requests` | Student document requests |

### RLS Policies

All tables have Row Level Security enabled:
- Students can only see their own data
- Documents are readable by all authenticated users
- Feedback is private between student and lecturer
- Notifications are user-specific

## Features Implemented

### Dashboard
- [x] Real-time stats (registrations, submissions, notifications)
- [x] Thesis progress tracking (6 milestones)
- [x] Recent documents list
- [x] Latest feedback from supervisor

### Proposals
- [x] Browse available proposals
- [x] View registration status
- [x] Register for proposals
- [x] Withdraw registration
- [x] View lecturer feedback

### Registration
- [x] Registration history
- [x] Status tracking (pending/approved/rejected)
- [x] Lecturer feedback display
- [x] Timeline view

### Submissions
- [x] File upload to Supabase Storage
- [x] Submission history
- [x] Grade tracking
- [x] Milestone progress visualization
- [x] Feedback from graders

### Feedback
- [x] Real-time messaging
- [x] Read/unread states
- [x] Send replies to lecturers
- [x] Message history

### Notifications
- [x] Real-time updates
- [x] Filter (all/unread/read)
- [x] Mark as read
- [x] Mark all as read
- [x] Type-based icons

### Profile
- [x] View/edit profile information
- [x] Avatar upload
- [x] Password change
- [x] Read-only academic info

### Documents
- [x] Category filtering
- [x] Search functionality
- [x] Download tracking
- [x] Document request feature
- [x] View/download files

## Error Handling

All hooks implement consistent error handling:
- Loading states during async operations
- Error messages in Vietnamese
- Toast notifications for errors
- Graceful fallback for empty states

## Next Steps

1. **Lecturer Dashboard** - Implement lecturer cluster with same patterns
2. **Admin Dashboard** - Implement admin cluster for management
3. **Real-time Features** - Expand Supabase subscriptions
4. **File Validation** - Add file type/size validation for uploads
5. **Pagination** - Add pagination for large lists
6. **Caching** - Consider React Query for caching optimization

## Support

For issues, check:
1. Supabase logs for database errors
2. Browser console for client-side errors
3. RLS policy configuration for permission issues
