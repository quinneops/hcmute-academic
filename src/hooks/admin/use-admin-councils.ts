import * as React from 'react'
import { api } from '@/lib/api/client'

export interface Council {
  id: string
  name: string
  code: string
  status: 'pending' | 'active' | 'completed'
  scheduled_at: string | null
  room: string | null
  semester_id: string
  chair_name: string | null
  secretary_name: string | null
  member_count: number
  theses_count: number
  created_at: string
}

export interface CouncilMember {
  id: string
  council_id: string
  lecturer_id: string
  role: 'chair' | 'secretary' | 'member'
  lecturer: {
    id: string
    full_name: string
    email: string
    department: string | null
  }
}

interface UseAdminCouncilsReturn {
  councils: Council[]
  selectedCouncil: Council | null
  councilMembers: CouncilMember[]
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  fetchCouncils: (semesterId?: string) => Promise<void>
  createCouncil: (data: {
    name: string
    code: string
    semester_id: string
    chair_id: string
    secretary_id: string
    member_ids: string[]
    scheduled_at?: string
    room?: string
  }) => Promise<void>
  updateCouncil: (id: string, data: Partial<Council>) => Promise<void>
  deleteCouncil: (id: string) => Promise<void>
  selectCouncil: (council: Council | null) => void
  fetchCouncilMembers: (councilId: string) => Promise<void>
}

export function useAdminCouncils(): UseAdminCouncilsReturn {
  const [councils, setCouncils] = React.useState<Council[]>([])
  const [selectedCouncil, setSelectedCouncil] = React.useState<Council | null>(null)
  const [councilMembers, setCouncilMembers] = React.useState<CouncilMember[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  const fetchCouncils = React.useCallback(async (semesterId?: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.admin.councils.list({ semester_id: semesterId })
      setCouncils(response.councils || [])
      setPagination(prev => ({
        ...prev,
        total: response.councils?.length || 0,
        totalPages: Math.ceil((response.councils?.length || 0) / prev.limit),
      }))
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách hội đồng')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createCouncil = React.useCallback(async (data: {
    name: string
    code: string
    semester_id: string
    chair_id: string
    secretary_id: string
    member_ids: string[]
    scheduled_at?: string
    room?: string
  }) => {
    setIsLoading(true)
    setError(null)
    try {
      await api.admin.councils.create(data)
      await fetchCouncils()
    } catch (err: any) {
      setError(err.message || 'Không thể tạo hội đồng')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [fetchCouncils])

  const updateCouncil = React.useCallback(async (id: string, data: Partial<Council>) => {
    setIsLoading(true)
    setError(null)
    try {
      await api.admin.councils.update(id, data)
      await fetchCouncils()
      if (selectedCouncil?.id === id) {
        const updated = councils.find(c => c.id === id)
        if (updated) setSelectedCouncil({ ...updated, ...data })
      }
    } catch (err: any) {
      setError(err.message || 'Không thể cập nhật hội đồng')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [fetchCouncils, selectedCouncil, councils])

  const deleteCouncil = React.useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await api.admin.councils.delete(id)
      setCouncils(prev => prev.filter(c => c.id !== id))
      if (selectedCouncil?.id === id) {
        setSelectedCouncil(null)
      }
    } catch (err: any) {
      setError(err.message || 'Không thể xóa hội đồng')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [selectedCouncil])

  const selectCouncil = React.useCallback((council: Council | null) => {
    setSelectedCouncil(council)
  }, [])

  const fetchCouncilMembers = React.useCallback(async (councilId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const council = councils.find(c => c.id === councilId)
      if (council) {
        // Members are included in the list response
        setCouncilMembers([]) // Placeholder - actual members would come from API
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tải thành viên hội đồng')
    } finally {
      setIsLoading(false)
    }
  }, [councils])

  return {
    councils,
    selectedCouncil,
    councilMembers,
    isLoading,
    error,
    pagination,
    fetchCouncils,
    createCouncil,
    updateCouncil,
    deleteCouncil,
    selectCouncil,
    fetchCouncilMembers,
  }
}
