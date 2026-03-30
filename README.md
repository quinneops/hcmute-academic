# Academic Nexus - Quick Start Guide

> 📚 **For non-tech students:** See [docs/HUONG_DAN_SU_DUNG.md](docs/HUONG_DAN_SU_DUNG.md) for user guide in Vietnamese

## Prerequisites

1. **Node.js 18+** and **bun** (optional but recommended)
2. **Supabase account** - Create a project at https://supabase.com
3. **Google Cloud Console** project for OAuth

## Step 1: Install Dependencies

```bash
cd /Users/thuong/Downloads/design/academic-nexus-app

# Using npm
npm install

# Or using bun (faster)
bun install
```

## Step 2: Set Up Supabase

### 2.1 Create Supabase Project

1. Go to https://supabase.com
2. Create new project: "Academic Nexus"
3. Note your project URL and keys

### 2.2 Run Database Migration

```bash
# Copy the SQL schema to Supabase SQL Editor
# File: supabase/migrations/001_initial_schema.sql

# Or use Supabase CLI
supabase link --project-ref your-project-ref
supabase db push
```

### 2.3 Configure Google OAuth in Supabase

1. Go to **Authentication** → **Providers** → **Google**
2. Enable Google provider
3. Add credentials from Google Cloud Console:
   - **Authorized JavaScript origins**: `http://localhost:3000`
   - **Authorized redirect URIs**: `https://your-project.supabase.co/auth/v1/callback`
4. Save credentials

### 2.4 Set Environment Variables

```bash
# Copy example file
cp .env.local.example .env.local

# Edit with your values
# NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
# SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

## Step 3: Configure Google Cloud Console

1. Go to https://console.cloud.google.com
2. Create new project or select existing
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add authorized origins and redirect URIs
7. Copy **Client ID** and **Client Secret** to Supabase

## Step 4: Run Development Server

```bash
npm run dev
# or
bun dev
```

Visit http://localhost:3000 - you'll be redirected to `/login`

## Step 5: Create First User

1. Click "Đăng nhập với Google Sinh viên"
2. Sign in with HCM-UTE email
3. User will be created in `auth.users`
4. Manually add user to `profiles` table with role:

```sql
-- Insert first admin user
INSERT INTO profiles (id, email, full_name, role, is_active)
VALUES (
  '<auth-user-id-from-supabase>',
  'admin@ute.edu.vn',
  'Admin User',
  'admin',
  true
);
```

## Project Structure

```
academic-nexus-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth pages (login)
│   │   ├── (dashboard)/       # Authenticated pages
│   │   │   ├── student/       # Student routes
│   │   │   ├── lecturer/      # Lecturer routes
│   │   │   └── admin/         # Admin routes
│   │   ├── auth/callback/     # OAuth callback
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   └── layout/            # Shell, SideNavBar, TopAppBar
│   ├── lib/
│   │   ├── supabase/          # Supabase clients
│   │   ├── design-tokens.ts   # Design system tokens
│   │   └── utils.ts           # Utilities
│   └── types/
│       └── database.ts        # TypeScript types
├── supabase/
│   └── migrations/            # SQL migrations
├── middleware.ts              # Auth & role protection
└── tailwind.config.ts         # Tailwind configuration
```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

## Next Steps

### Phase 1: Complete Student Cluster
- [ ] Proposals listing page
- [ ] Registration form
- [ ] Submission timeline page
- [ ] Feedback page
- [ ] Profile edit page
- [ ] Notifications page

### Phase 2: Implement Lecturer Cluster
- [ ] Lecturer dashboard
- [ ] Student list with bulk actions
- [ ] Grading form (4 criteria)
- [ ] Proposal review
- [ ] Defense schedule
- [ ] Feedback editor

### Phase 3: Implement Admin Cluster
- [ ] Admin dashboard with stats
- [ ] User management
- [ ] Thesis management
- [ ] Council management
- [ ] Reports

### Phase 4: Data Integration
- [ ] Replace mock data with Supabase queries
- [ ] Add real-time subscriptions
- [ ] Implement optimistic updates
- [ ] Add error boundaries

## Troubleshooting

### "NEXT_PUBLIC_SUPABASE_URL is not defined"
- Ensure `.env.local` exists with correct values
- Restart dev server after adding env variables

### OAuth callback error
- Check Google Cloud Console redirect URIs
- Verify Supabase Google OAuth is enabled
- Ensure user email matches allowed domains

### RLS policy errors
- Check that user has correct role in `profiles` table
- Verify RLS policies are enabled on all tables
- Use Supabase logs to debug policy violations

## Design System Reference

See `IMPLEMENTATION_PLAN.md` for full design system documentation including:
- Color tokens
- Typography scale
- Spacing system
- Component patterns
- "No-Line Rule" principle

## 📚 Documentation

### For Students (Non-tech)
- 📘 [Hướng Dẫn Sử Dụng](docs/HUONG_DAN_SU_DUNG.md) - Cách dùng hệ thống
- 📗 [Tổng Quan Tính Năng](docs/TONG_QUAN_TINH_NANG.md) - Chi tiết tính năng

### For Setup & Development
- 📙 [Hướng Dẫn Setup](docs/HUONG_DAN_SETUP.md) - Cài đặt từ A-Z cho non-tech
- 🔧 [Implementaton Plan](IMPLEMENTATION_PLAN.md) - Technical roadmap

## Getting Help

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **shadcn/ui**: https://ui.shadcn.com
- **Material Symbols**: https://fonts.google.com/icons
# hcmute-academic
