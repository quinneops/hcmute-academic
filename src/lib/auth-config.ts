/**
 * Auth Config
 * Pure functions for role-based configuration (no server dependencies)
 */

export type UserRole = 'student' | 'lecturer' | 'admin'

/**
 * Get dashboard URL based on role
 */
export function getDashboardUrl(role: UserRole | null): string {
  switch (role) {
    case 'student':
      return '/student'
    case 'lecturer':
      return '/lecturer'
    case 'admin':
      return '/admin'
    default:
      return '/'
  }
}

/**
 * Get navigation links based on role
 */
export function getNavLinks(role: UserRole | null): Array<{ label: string; href: string; icon: string }> {
  switch (role) {
    case 'student':
      return [
        { label: 'Bảng điều khiển', href: '/student', icon: 'dashboard' },
        { label: 'Đăng ký', href: '/student/registration', icon: 'assignment' },
        { label: 'Nộp bài', href: '/student/submissions', icon: 'upload' },
        { label: 'Đề cương', href: '/student/proposals', icon: 'description' },
        { label: 'Góp ý', href: '/student/feedback', icon: 'feedback' },
        { label: 'Tài liệu', href: '/student/documents', icon: 'folder' },
        { label: 'Thông báo', href: '/student/notifications', icon: 'notifications' },
      ]
    case 'lecturer':
      return [
        { label: 'Bảng điều khiển', href: '/lecturer', icon: 'dashboard' },
        { label: 'Sinh viên', href: '/lecturer/students', icon: 'group' },
        { label: 'Chấm điểm', href: '/lecturer/grading', icon: 'rate_review' },
        { label: 'Đề cương', href: '/lecturer/proposals', icon: 'description' },
        { label: 'Góp ý', href: '/lecturer/feedback', icon: 'feedback' },
        { label: 'Lịch hẹn', href: '/lecturer/schedule', icon: 'event' },
      ]
    case 'admin':
      return [
        { label: 'Bảng điều khiển', href: '/admin', icon: 'dashboard' },
        { label: 'Sinh viên', href: '/admin/students', icon: 'group' },
        { label: 'Giảng viên', href: '/admin/lecturers', icon: 'school' },
        { label: 'Hội đồng', href: '/admin/councils', icon: 'people' },
        { label: 'Báo cáo', href: '/admin/reports', icon: 'analytics' },
        { label: 'Cài đặt', href: '/admin/settings', icon: 'settings' },
      ]
    default:
      return []
  }
}
