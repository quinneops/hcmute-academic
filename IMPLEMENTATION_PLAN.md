# Academic Nexus - Implementation Plan

## Overview

**Project**: HCM-UTE Thesis Management System
**Stack**: Next.js 14 (App Router) + shadcn/ui + Supabase
**Design System**: Academic Editorial
**Language**: Vietnamese (primary)
**Auth**: Google OAuth for HCM-UTE students

---

## Phase 1: Project Setup (Day 1)

### 1.1 Next.js 14 Project Initialization

```bash
npx create-next-app@latest academic-nexus --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd academic-nexus
```

### 1.2 shadcn/ui Configuration

```bash
npx shadcn-ui@latest init
```

**Configure with Academic Editorial tokens:**

```json
// components.json
{
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

### 1.3 Design Tokens (tailwind.config.ts)

```typescript
// src/lib/design-tokens.ts
export const designTokens = {
  colors: {
    // Primary Palette - Academic Blues
    primary: "#002068",
    "primary-container": "#003399",
    "primary-fixed": "#dce1ff",
    "primary-fixed-dim": "#b5c4ff",
    "on-primary": "#ffffff",
    "on-primary-container": "#8aa4ff",

    // Secondary Palette - Neutral Grays
    secondary: "#576066",
    "secondary-container": "#dbe4eb",
    "secondary-fixed": "#dbe4eb",
    "on-secondary": "#ffffff",
    "on-secondary-container": "#5d666c",

    // Tertiary Palette - Excellence Accents (Gold/Emerald)
    tertiary: "#735c00",
    "tertiary-container": "#cca730",
    "tertiary-fixed": "#ffe088",
    "on-tertiary": "#ffffff",

    // Surface Hierarchy (No-Line Rule)
    background: "#f8f9fb",
    surface: "#f8f9fb",
    "surface-dim": "#d8dadc",
    "surface-bright": "#f8f9fb",
    "surface-container-lowest": "#ffffff",
    "surface-container-low": "#f2f4f6",
    "surface-container": "#eceef0",
    "surface-container-high": "#e6e8ea",
    "surface-container-highest": "#e0e3e5",

    // Content Colors
    "on-surface": "#191c1e",
    "on-surface-variant": "#444653",
    "on-background": "#191c1e",

    // Semantic Colors
    error: "#ba1a1a",
    "error-container": "#ffdad6",
    "on-error": "#ffffff",
    "on-error-container": "#93000a",

    // Utility
    outline: "#747684",
    "outline-variant": "#c4c5d5",
  },
  fontFamily: {
    headline: ["Be Vietnam Pro", "sans-serif"],
    body: ["Inter", "sans-serif"],
    label: ["Inter", "sans-serif"],
  },
  borderRadius: {
    DEFAULT: "0.25rem",
    lg: "0.5rem",
    xl: "0.75rem",
    full: "9999px",
  },
}
```

### 1.4 Install Required shadcn/ui Components

```bash
npx shadcn-ui@latest add button card input label select textarea dialog avatar badge progress tabs dropdown-menu scroll-area separator sheet tooltip form calendar
```

### 1.5 Project Structure

```
academic-nexus/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx          # Login page
│   │   ├── (dashboard)/
│   │   │   ├── student/
│   │   │   │   ├── page.tsx          # Student Dashboard
│   │   │   │   ├── proposals/        # Browse proposals
│   │   │   │   ├── registration/     # Register thesis
│   │   │   │   ├── submissions/      # Submission timeline
│   │   │   │   ├── feedback/         # Lecturer feedback
│   │   │   │   ├── profile/          # Edit profile
│   │   │   │   └── notifications/    # Notifications
│   │   │   ├── lecturer/
│   │   │   │   ├── page.tsx          # Lecturer Dashboard
│   │   │   │   ├── students/         # Student list
│   │   │   │   ├── grading/          # Grading form
│   │   │   │   ├── proposals/        # Proposal review
│   │   │   │   ├── schedule/         # Defense schedule
│   │   │   │   └── feedback/         # Write feedback
│   │   │   └── admin/
│   │   │       ├── page.tsx          # Admin Dashboard
│   │   │       ├── users/            # User management
│   │   │       ├── theses/           # Thesis management
│   │   │       ├── councils/         # Council management
│   │   │       └── reports/          # Reports
│   │   ├── api/
│   │   │   └── webhooks/
│   │   │       └── supabase/         # Supabase webhooks
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── page.tsx                  # Landing/redirect
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── SideNavBar.tsx
│   │   │   ├── TopAppBar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Shell.tsx
│   │   ├── student/
│   │   │   ├── ThesisProgressFlow.tsx
│   │   │   ├── OverviewCards.tsx
│   │   │   ├── DocumentList.tsx
│   │   │   ├── SubmissionTimeline.tsx
│   │   │   └── AIChatAssistant.tsx
│   │   ├── lecturer/
│   │   │   ├── GradingForm.tsx
│   │   │   ├── StudentTable.tsx
│   │   │   └── FeedbackEditor.tsx
│   │   └── admin/
│   │       ├── StatsCards.tsx
│   │       ├── UserTable.tsx
│   │       └── ThesisTable.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   ├── design-tokens.ts
│   │   ├── utils.ts
│   │   └── validations/
│   │       └── index.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useUserRole.ts
│   └── types/
│       ├── database.ts
│       └── index.ts
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── config.toml
├── .env.local
├── middleware.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Phase 2: Supabase Configuration (Day 1-2)

### 2.1 Database Schema (14 Tables)

```sql
-- profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('student', 'lecturer', 'admin')),
  student_code TEXT UNIQUE,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- semesters
CREATE TABLE semesters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- "HK2 2024-2025"
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- proposals (thesis topics)
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  tags TEXT[],
  supervisor_id UUID REFERENCES profiles(id),
  status TEXT CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  semester_id UUID REFERENCES semesters(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- registrations (student registers for thesis)
CREATE TABLE registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  proposal_id UUID REFERENCES proposals(id),
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  UNIQUE(student_id, proposal_id)
);

-- submissions (student submissions by round)
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES registrations(id),
  round INTEGER NOT NULL, -- 1, 2, 3, 4
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  status TEXT CHECK (status IN ('submitted', 'graded', 'late')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  graded_at TIMESTAMPTZ
);

-- grades (council/lecturer grades)
CREATE TABLE grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id),
  grader_id UUID REFERENCES profiles(id),
  criteria_1_score DECIMAL(4,2), -- Content
  criteria_2_score DECIMAL(4,2), -- Methodology
  criteria_3_score DECIMAL(4,2), -- Presentation
  criteria_4_score DECIMAL(4,2), -- Q&A
  total_score DECIMAL(4,2),
  feedback TEXT,
  graded_at TIMESTAMPTZ DEFAULT NOW()
);

-- councils (defense councils)
CREATE TABLE councils (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- "Hội đồng 1"
  semester_id UUID REFERENCES semesters(id),
  chair_id UUID REFERENCES profiles(id),
  secretary_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- council_members
CREATE TABLE council_members (
  council_id UUID REFERENCES councils(id),
  member_id UUID REFERENCES profiles(id),
  role TEXT CHECK (role IN ('chair', 'secretary', 'member', 'opponent1', 'opponent2')),
  PRIMARY KEY (council_id, member_id)
);

-- defense_sessions
CREATE TABLE defense_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  council_id UUID REFERENCES councils(id),
  registration_id UUID REFERENCES registrations(id),
  scheduled_at TIMESTAMPTZ,
  room TEXT,
  status TEXT CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- feedback (lecturer feedback to student)
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES registrations(id),
  lecturer_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  attachment_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  content TEXT,
  type TEXT CHECK (type IN ('system', 'academic', 'deadline')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- submission_rounds (configuration for each semester)
CREATE TABLE submission_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_id UUID REFERENCES semesters(id),
  round_number INTEGER NOT NULL,
  name TEXT NOT NULL, -- "Đề cương chi tiết", "Báo cáo tiến độ 1", etc.
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT false,
  UNIQUE(semester_id, round_number)
);

-- settings (system-wide settings)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- audit_logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables

-- Profiles: Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Students can view all lecturers
CREATE POLICY "Students can view lecturers"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'student'
    )
  );

-- Registrations: Students can only see their own
CREATE POLICY "Students view own registrations"
  ON registrations FOR SELECT
  USING (student_id = auth.uid());

-- Lecturers can view registrations for their supervisees
CREATE POLICY "Lecturers view supervisee registrations"
  ON registrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = registrations.proposal_id
      AND proposals.supervisor_id = auth.uid()
    )
  );

-- Submissions: Students can insert their own
CREATE POLICY "Students can submit"
  ON submissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM registrations
      WHERE registrations.id = submissions.registration_id
      AND registrations.student_id = auth.uid()
    )
  );
```

---

## Phase 3: Core Components (Day 2-3)

### 3.1 Shell Components

**SideNavBar Component** - Role-specific navigation

```tsx
// src/components/layout/SideNavBar.tsx
import { SideNavProps } from '@/types'

const studentNavItems = [
  { icon: 'dashboard', label: 'Bảng điều khiển', href: '/student' },
  { icon: 'lightbulb', label: 'Đề tài gợi ý', href: '/student/proposals' },
  { icon: 'how_to_reg', label: 'Đăng ký', href: '/student/registration' },
  { icon: 'trending_up', label: 'Tiến độ', href: '/student/submissions' },
  { icon: 'forum', label: 'Phản hồi', href: '/student/feedback' },
  { icon: 'notifications', label: 'Thông báo', href: '/student/notifications' },
]

const lecturerNavItems = [
  { icon: 'dashboard', label: 'Bảng điều khiển', href: '/lecturer' },
  { icon: 'groups', label: 'Sinh viên', href: '/lecturer/students' },
  { icon: 'grading', label: 'Chấm điểm', href: '/lecturer/grading' },
  { icon: 'assignment', label: 'Đề tài', href: '/lecturer/proposals' },
  { icon: 'event', label: 'Lịch bảo vệ', href: '/lecturer/schedule' },
]

const adminNavItems = [
  { icon: 'dashboard', label: 'Bảng điều khiển', href: '/admin' },
  { icon: 'people', label: 'Người dùng', href: '/admin/users' },
  { icon: 'school', label: 'Khóa luận', href: '/admin/theses' },
  { icon: 'groups', label: 'Hội đồng', href: '/admin/councils' },
  { icon: 'assessment', label: 'Báo cáo', href: '/admin/reports' },
]
```

**TopAppBar Component** - Search, notifications, profile menu

```tsx
// src/components/layout/TopAppBar.tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function TopAppBar({ user, role }) {
  return (
    <header className="sticky top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-outline-variant/15">
      <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <span>{role === 'student' ? 'Sinh viên' : role === 'lecturer' ? 'Giảng viên' : 'Admin'}</span>
          <span className="material-symbols-outlined">chevron_right</span>
          <span className="text-primary font-bold">Current Page</span>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-slate-50 rounded-full">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback>{user.full_name?.[0]}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Hồ sơ</DropdownMenuItem>
              <DropdownMenuItem>Cài đặt</DropdownMenuItem>
              <DropdownMenuItem>Đăng xuất</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
```

### 3.2 Design System Utilities

```tsx
// src/lib/design-utils.ts
import { cx } from 'class-variance-authority'

// No-Line Rule: Use tonal transitions instead of borders
export const cardStyles = {
  base: "bg-surface-container-lowest rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]",
  interactive: "hover:bg-surface-bright transition-colors",
  elevated: "shadow-[0_24px_48px_-12px_rgba(25,28,30,0.08)]",
}

// Status Badge styles
export const badgeStyles = {
  approved: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  rejected: "bg-red-50 text-red-700",
  draft: "bg-slate-100 text-slate-600",
}
```

---

## Phase 4: Page Implementation (Day 4-10)

### 4.1 Student Cluster (8 pages)

| Screen | Route | Components | Status |
|--------|-------|------------|--------|
| Login | `/login` | LoginForm, GoogleOAuth | Pending |
| Dashboard | `/student` | OverviewCards, ThesisProgressFlow, DocumentList, SupervisorFeedback | Pending |
| Proposals | `/student/proposals` | ProposalList, SearchFilters | Pending |
| Registration | `/student/registration` | RegistrationForm | Pending |
| Submissions | `/student/submissions` | SubmissionTimeline, UploadDialog | Pending |
| Feedback | `/student/feedback` | FeedbackTimeline | Pending |
| Profile | `/student/profile` | ProfileForm | Pending |
| Notifications | `/student/notifications` | NotificationList, FilterTabs | Pending |

### 4.2 Lecturer Cluster (8 pages)

| Screen | Route | Components | Status |
|--------|-------|------------|--------|
| Dashboard | `/lecturer` | LecturerOverview, StudentSummary | Pending |
| Students | `/lecturer/students` | StudentTable, BulkActions | Pending |
| Grading | `/lecturer/grading/[id]` | GradingForm (4 criteria) | Pending |
| Proposals | `/lecturer/proposals` | ProposalReviewList | Pending |
| Schedule | `/lecturer/schedule` | DefenseSchedule | Pending |
| Feedback | `/lecturer/feedback/[id]` | FeedbackEditor | Pending |

### 4.3 Admin Cluster (9 pages)

| Screen | Route | Components | Status |
|--------|-------|------------|--------|
| Dashboard | `/admin` | StatsCards, SystemOverview | Pending |
| Users | `/admin/users` | UserTable, RoleManagement | Pending |
| Theses | `/admin/theses` | ThesisTable, StatusManagement | Pending |
| Councils | `/admin/councils` | CouncilForm, MemberAssignment | Pending |
| Schedule | `/admin/schedule` | MasterSchedule | Pending |
| Reports | `/admin/reports` | ReportGenerator, ExportDialog | Pending |

---

## Phase 5: Integration & Testing (Day 11-14)

### 5.1 Data Integration Checklist

- [ ] All pages fetch data from Supabase
- [ ] Real-time subscriptions for notifications
- [ ] Optimistic updates for forms
- [ ] Error boundaries on all pages
- [ ] Loading states with skeletons

### 5.2 Testing Checklist

- [ ] Unit tests for utility functions
- [ ] Component tests for shared components
- [ ] E2E tests for critical flows (login → submit thesis)
- [ ] RLS policy tests
- [ ] Accessibility audit (WCAG 2.1 AA)

---

## Phase 6: Deployment (Day 15)

### 6.1 Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://academic-nexus.vercel.app
```

### 6.2 Deployment Steps

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy production

---

## Effort Estimates

| Phase | Human Team | CC+gstack | Tasks |
|-------|------------|-----------|-------|
| Setup | 1 day | 30 min | 1, 19 |
| Supabase | 2 days | 1 hour | 2, 16 |
| Core Components | 2 days | 2 hours | 4, 13 |
| Student Pages | 3 days | 4 hours | 5, 14 |
| Lecturer Pages | 3 days | 4 hours | 6, 17 |
| Admin Pages | 3 days | 4 hours | 7, 15 |
| Integration | 4 days | 6 hours | 8, 12 |
| Testing | 3 days | 4 hours | - |
| Deployment | 1 day | 1 hour | - |

**Total**: ~22 days human team / ~24 hours with CC+gstack

---

## Next Action

Start with **Task 19**: Initialize Next.js project with shadcn/ui.

```bash
cd /Users/thuong/Downloads/design/academic-nexus-app
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir
```
