/**
 * Admin Users Hook
 * Handles user management for admin
 */

import * as React from 'react'
import { api } from '@/lib/api/client'

export interface User {
  id: string
  email: string
  full_name: string | null
  role: 'student' | 'lecturer' | 'admin'
  student_code?: string | null
  faculty?: string | null
  department?: string | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
}

export interface UserStats {
  total: number
  students: number
  lecturers: number
  admins: number
  active: number
}

export function useAdminUsers() {
  const [users, setUsers] = React.useState<User[]>([])
  const [stats, setStats] = React.useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 20,
    total: 0,
  })

  const fetchUsers = React.useCallback(async (
    page = 1,
    limit = 20,
    filters?: {
      role?: 'student' | 'lecturer' | 'admin' | 'all'
      search?: string
      is_active?: boolean
    }
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await api.admin.users.list(page, limit, filters)
      setUsers(data.users || [])
      setStats(data.stats)
      setPagination({
        page: data.page || page,
        limit: data.limit || limit,
        total: data.total || 0,
      })
    } catch (err: any) {
      console.error('Users fetch error:', err)
      setError(err.message || 'Không thể tải danh sách người dùng')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createUser = async (userData: {
    email: string
    password: string
    full_name: string
    role: 'student' | 'lecturer' | 'admin'
    student_code?: string
    faculty?: string
    department?: string
  }): Promise<{ success?: boolean; error?: string }> => {
    try {
      const result = await api.admin.users.create(userData)
      await fetchUsers(pagination.page, pagination.limit)
      return { success: true }
    } catch (err: any) {
      console.error('User create error:', err)
      return { error: err.message }
    }
  }

  const updateUser = async (
    userId: string,
    updates: Partial<User>
  ): Promise<{ success?: boolean; error?: string }> => {
    try {
      const result = await api.admin.users.update(userId, updates)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u))
      return { success: true }
    } catch (err: any) {
      console.error('User update error:', err)
      return { error: err.message }
    }
  }

  const deleteUser = async (userId: string): Promise<{ success?: boolean; error?: string }> => {
    try {
      await api.admin.users.delete(userId)
      setUsers(prev => prev.filter(u => u.id !== userId))
      return { success: true }
    } catch (err: any) {
      console.error('User delete error:', err)
      return { error: err.message }
    }
  }

  React.useEffect(() => {
    fetchUsers()
  }, [])

  return {
    users,
    stats,
    isLoading,
    error,
    pagination,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  }
}
