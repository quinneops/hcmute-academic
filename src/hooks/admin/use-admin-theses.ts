import * as React from 'react'
import { api } from '@/lib/api/client'

export interface Thesis {
  id: string
  title: string
  status: 'draft' | 'pending' | 'approved' | 'active' | 'completed' | 'rejected'
  semester_id: string
  supervisor_id: string
  semester: {
    id: string
    name: string
    academic_year: string
  } | null
  supervisor: {
    id: string
    full_name: string
    email: string
  } | null
  students: Array<{
    id: string
    student_id: string
    name: string | null
    code: string | null
    status: string
    final_score?: number | null
    final_grade?: string | null
  }>
  progress: number
  created_at: string
}

interface UseAdminThesesReturn {
  theses: Thesis[]
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  stats: {
    total: number
    draft: number
    inProgress: number
    pendingReview: number
    completed: number
  }
  fetchTheses: (filters?: {
    status?: string
    semester_id?: string
    supervisor_id?: string
  }) => Promise<void>
  updateThesis: (id: string, data: {
    status?: string
    council_id?: string
  }) => Promise<void>
}

export function useAdminTheses(): UseAdminThesesReturn {
  const [theses, setTheses] = React.useState<Thesis[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  const stats = React.useMemo(() => {
    return {
      total: theses.length,
      draft: theses.filter(t => t.status === 'draft').length,
      inProgress: theses.filter(t => t.status === 'active' || t.status === 'approved').length,
      pendingReview: theses.filter(t => t.status === 'pending').length,
      completed: theses.filter(t => t.status === 'completed').length,
    }
  }, [theses])

  const fetchTheses = React.useCallback(async (filters?: {
    status?: string
    semester_id?: string
    supervisor_id?: string
  }) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.admin.theses.list(filters)
      const transformedTheses: Thesis[] = (response.theses || []).map((t: any) => ({
        ...t,
        progress: t.status === 'completed' ? 100 :
                  t.status === 'active' ? 65 :
                  t.status === 'pending' ? 30 : 10,
      }))
      setTheses(transformedTheses)
      setPagination(prev => ({
        ...prev,
        total: transformedTheses.length,
        totalPages: Math.ceil(transformedTheses.length / prev.limit),
      }))
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách khóa luận')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateThesis = React.useCallback(async (id: string, data: {
    status?: string
    council_id?: string
  }) => {
    setIsLoading(true)
    setError(null)
    try {
      await api.admin.theses.update(id, data)
      await fetchTheses()
    } catch (err: any) {
      setError(err.message || 'Không thể cập nhật khóa luận')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [fetchTheses])

  return {
    theses,
    isLoading,
    error,
    pagination,
    stats,
    fetchTheses,
    updateThesis,
  }
}
