import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility for merging Tailwind classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date to Vietnamese locale
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date

  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }

  return new Intl.DateTimeFormat('vi-VN', { ...defaultOptions, ...options }).format(d)
}

/**
 * Format date to relative time (e.g., "2 ngày trước")
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000)

  const intervals: [number, Intl.RelativeTimeFormatUnit][] = [
    [31536000, 'year'],
    [2592000, 'month'],
    [604800, 'week'],
    [86400, 'day'],
    [3600, 'hour'],
    [60, 'minute'],
  ]

  for (const [seconds, unit] of intervals) {
    const interval = Math.floor(diffInSeconds / seconds)
    if (interval >= 1) {
      const rtf = new Intl.RelativeTimeFormat('vi-VN', { numeric: 'auto' })
      return rtf.format(-interval, unit)
    }
  }

  return 'Vừa xong'
}

/**
 * Format file size to human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Generate slug from title
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Check if email is HCM-UTE student email
 */
export function isUteStudentEmail(email: string): boolean {
  return email.endsWith('@students.ute.vn') || email.endsWith('@ute.edu.vn')
}

/**
 * Calculate grade from score
 */
export function calculateGrade(score: number): string {
  if (score >= 9.0) return 'A+'
  if (score >= 8.5) return 'A'
  if (score >= 8.0) return 'B+'
  if (score >= 7.0) return 'B'
  if (score >= 6.5) return 'C+'
  if (score >= 5.5) return 'C'
  if (score >= 5.0) return 'D'
  return 'F'
}

/**
 * Get status badge color
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    approved: 'text-emerald-600 bg-emerald-100',
    pending: 'text-amber-600 bg-amber-50',
    rejected: 'text-error bg-error-container',
    draft: 'text-secondary bg-slate-100',
    submitted: 'text-blue-600 bg-blue-50',
    graded: 'text-emerald-600 bg-emerald-100',
    late: 'text-orange-600 bg-orange-50',
  }
  return colors[status] || colors.draft
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

/**
 * Get dynamic base URL for redirects
 */
export function getURL() {
  let url =
    process?.env?.NEXT_PUBLIC_APP_URL ?? // Custom app URL
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Supabase default
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Vercel default
    'http://localhost:3001'

  // Ensure browser-side dynamic host detection
  if (typeof window !== 'undefined') {
    url = window.location.origin
  }

  // Make sure to include `https://` when not localhost.
  url = url.includes('http') ? url : `https://${url}`
  // Remove trailing slash for consistency
  url = url.endsWith('/') ? url.slice(0, -1) : url
  
  return url
}
