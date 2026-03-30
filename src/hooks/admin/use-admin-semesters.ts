import * as React from 'react'
import { api } from '@/lib/api/client'

export interface Semester {
  id: string
  name: string
  academic_year: string
  semester_number: number
  start_date: string
  end_date: string
  registration_start: string | null
  registration_end: string | null
  is_current: boolean
  is_active: boolean
  created_at: string
}

interface UseAdminSemestersReturn {
  semesters: Semester[]
  currentSemester: Semester | null
  isLoading: boolean
  error: string | null
  fetchSemesters: (includeArchived?: boolean) => Promise<void>
  createSemester: (data: {
    name: string
    academic_year: string
    semester_number?: number
    start_date: string
    end_date: string
    registration_start?: string
    registration_end?: string
    is_current?: boolean
  }) => Promise<void>
  updateSemester: (id: string, data: Partial<Semester>) => Promise<void>
  deleteSemester: (id: string) => Promise<void>
}

export function useAdminSemesters(): UseAdminSemestersReturn {
  const [semesters, setSemesters] = React.useState<Semester[]>([])
  const [currentSemester, setCurrentSemester] = React.useState<Semester | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fetchSemesters = React.useCallback(async (includeArchived?: boolean) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.admin.semesters.list({ include_archived: includeArchived })
      const semestersList = response.semesters || []
      setSemesters(semestersList)
      const current = semestersList.find((s: Semester) => s.is_current) || null
      setCurrentSemester(current)
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách học kỳ')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createSemester = React.useCallback(async (data: {
    name: string
    academic_year: string
    semester_number?: number
    start_date: string
    end_date: string
    registration_start?: string
    registration_end?: string
    is_current?: boolean
  }) => {
    setIsLoading(true)
    setError(null)
    try {
      const newSemester = await api.admin.semesters.create(data)
      setSemesters(prev => [newSemester, ...prev])
      if (newSemester.is_current) {
        setCurrentSemester(newSemester)
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tạo học kỳ')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateSemester = React.useCallback(async (id: string, data: Partial<Semester>) => {
    setIsLoading(true)
    setError(null)
    try {
      const updatedSemester = await api.admin.semesters.update(id, data)
      setSemesters(prev => prev.map(s => s.id === id ? { ...s, ...data } : s))
      if (updatedSemester.is_current) {
        setCurrentSemester(updatedSemester)
      } else if (currentSemester?.id === id && !updatedSemester.is_current) {
        setCurrentSemester(null)
      }
    } catch (err: any) {
      setError(err.message || 'Không thể cập nhật học kỳ')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [currentSemester])

  const deleteSemester = React.useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await api.admin.semesters.delete(id)
      setSemesters(prev => prev.filter(s => s.id !== id))
      if (currentSemester?.id === id) {
        setCurrentSemester(null)
      }
    } catch (err: any) {
      setError(err.message || 'Không thể xóa học kỳ')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [currentSemester])

  return {
    semesters,
    currentSemester,
    isLoading,
    error,
    fetchSemesters,
    createSemester,
    updateSemester,
    deleteSemester,
  }
}
