# User Role Check - Hướng dẫn sử dụng

## Tổng quan

Hệ thống cung cấp nhiều cách để xác định user là giảng viên hay sinh viên:

1. **Hook** (`useAuthUser`) - Dùng trong Client Components
2. **Utils** (`auth-utils.ts`) - Functions cho cả client và server
3. **HOC** (`with-role-check.tsx`) - Bảo vệ pages theo role
4. **Server Guard** (`server-guard.ts`) - Bảo vệ API routes

---

## 1. Use Auth User Hook (Client Components)

**File:** `src/hooks/use-auth-user.ts`

### Usage:

```tsx
'use client'

import { useAuthUser } from '@/hooks/use-auth-user'

export default function MyComponent() {
  const { user, isStudent, isLecturer, isAdmin, isAuthenticated, isLoading } = useAuthUser()

  if (isLoading) return <div>Loading...</div>
  if (!isAuthenticated) return <div>Not logged in</div>

  return (
    <div>
      <p>Xin chào, {user?.full_name}</p>
      <p>Role: {user?.role}</p>

      {isStudent && <StudentContent />}
      {isLecturer && <LecturerContent />}
      {isAdmin && <AdminContent />}
    </div>
  )
}
```

### Returns:

```typescript
{
  user: UserProfile | null,
  isLoading: boolean,
  error: string | null,
  isStudent: boolean,
  isLecturer: boolean,
  isAdmin: boolean,
  isAuthenticated: boolean,
  refresh: () => void,
}
```

---

## 2. Auth Utils Functions

**File:** `src/lib/auth-utils.ts`

### Client-side functions:

```typescript
// Check if user is lecturer
const isLecturer = await checkIsLecturer()

// Check if user is student
const isStudent = await checkIsStudent()

// Get user role
const role = await getCurrentUserRole() // 'student' | 'lecturer' | 'admin' | null
```

### Server-side functions:

```typescript
// In Server Components or Server Actions
import { checkIsLecturerServer, getCurrentUserRoleServer } from '@/lib/auth-utils'

const isLecturer = await checkIsLecturerServer()
const role = await getCurrentUserRoleServer()
```

### Helper functions:

```typescript
import { getDashboardUrl, getNavLinks } from '@/lib/auth-utils'

// Get dashboard URL based on role
const dashboardUrl = getDashboardUrl('lecturer') // '/lecturer'

// Get navigation links for role
const links = getNavLinks('student')
// Returns array of { label, href, icon } for student navigation
```

---

## 3. Higher-Order Component (HOC)

**File:** `src/hocs/with-role-check.tsx`

### Bảo vệ page theo role:

```tsx
'use client'

import { withLecturer } from '@/hocs/with-role-check'

function LecturerDashboard() {
  return <div>Only lecturers can see this</div>
}

// Wrap with role check
export default withLecturer(LecturerDashboard)
```

### Custom options:

```tsx
import { withRoleCheck } from '@/hocs/with-role-check'

// Multiple allowed roles
export default withRoleCheck(MyComponent, {
  requiredRole: ['student', 'lecturer'],
  redirectPath: '/custom-redirect',
  loadingComponent: <CustomLoader />,
})
```

### Available wrappers:

```typescript
withStudent(Component)      // Only students
withLecturer(Component)     // Only lecturers
withAdmin(Component)        // Only admins
withRoleCheck(Component, options) // Custom
```

---

## 4. Server Guard (API Routes)

**File:** `src/lib/server-guard.ts`

### Basic usage in API routes:

```typescript
// src/app/api/lecturer/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireLecturer } from '@/lib/server-guard'

export async function GET(request: NextRequest) {
  const auth = await requireLecturer()

  if (!auth.authorized) {
    return auth.response // 401 or 403 error
  }

  // auth.user contains authenticated user info
  const { userId, email, role, profile } = auth.user

  // Your protected code here
  return NextResponse.json({ data: 'protected data' })
}
```

### Multiple roles:

```typescript
import { requireAuthRole } from '@/lib/server-guard'

export async function POST(request: NextRequest) {
  const auth = await requireAuthRole(['lecturer', 'admin'])

  if (!auth.authorized) {
    return auth.response
  }

  // Both lecturers and admins can access
  return NextResponse.json({ success: true })
}
```

### Available guards:

```typescript
await requireAuth()        // Any authenticated user
await requireStudent()     // Students only
await requireLecturer()    // Lecturers only
await requireAdmin()       // Admins only
await requireAuthRole(['student', 'lecturer']) // Multiple roles
```

---

## Examples

### Example 1: Protect a student page

```tsx
// src/app/(dashboard)/student/my-page/page.tsx
'use client'

import { withStudent } from '@/hocs/with-role-check'
import { useAuthUser } from '@/hooks/use-auth-user'

function MyStudentPage() {
  const { user } = useAuthUser()

  return (
    <div>
      <h1>Welcome, {user?.full_name}</h1>
      <p>Student Code: {user?.student_code}</p>
    </div>
  )
}

export default withStudent(MyStudentPage)
```

### Example 2: Conditional rendering based on role

```tsx
'use client'

import { useAuthUser } from '@/hooks/use-auth-user'

export default function NavBar() {
  const { user, isStudent, isLecturer } = useAuthUser()

  return (
    <nav>
      <Link href="/">Home</Link>

      {isStudent && <Link href="/student">Student Dashboard</Link>}
      {isLecturer && <Link href="/lecturer">Lecturer Dashboard</Link>}

      {!user && <Link href="/login">Login</Link>}
    </nav>
  )
}
```

### Example 3: Protected API route

```typescript
// src/app/api/my-protected-route/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuthRole } from '@/lib/server-guard'

export async function GET(request: NextRequest) {
  const auth = await requireAuthRole('lecturer')

  if (!auth.authorized) {
    return auth.response
  }

  // Access user info
  const lecturerId = auth.user.userId

  // Query database for lecturer's data
  // ...

  return NextResponse.json({ data: ' lecturer data' })
}
```

---

## File Structure

```
src/
├── hooks/
│   ├── use-auth-user.ts          # Main hook for user info
│   ├── student/                   # Student-specific hooks
│   └── lecturer/                  # Lecturer-specific hooks
├── hocs/
│   └── with-role-check.tsx        # Role-based page protection
├── lib/
│   ├── auth-utils.ts              # Utility functions
│   ├── server-guard.ts            # API route protection
│   └── supabase/
│       ├── client.ts              # Browser client
│       └── server.ts              # Server client
```

---

## Best Practices

1. **Use `useAuthUser` hook** for client components that need user info
2. **Use HOCs** (`withStudent`, `withLecturer`) to protect entire pages
3. **Use server guards** (`requireAuthRole`) in API routes
4. **Always check `isLoading`** before rendering role-based content
5. **Redirect to appropriate dashboard** when access is denied

---

## Database Schema

Role information is stored in `profiles` table:

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student', -- 'student' | 'lecturer' | 'admin'
  student_code TEXT UNIQUE,     -- For students
  lecturer_code TEXT UNIQUE,    -- For lecturers
  -- ... other fields
);
```

The `role` field determines:
- Dashboard redirect URL
- Navigation links
- Page access permissions
- API route access
