import * as React from 'react'
import { api } from '@/lib/api/client'

export interface OverviewStats {
  totalStudents: number
  totalLecturers: number
  totalTheses: number
  totalRegistrations: number
  totalDefenses: number
}

export interface StatusBreakdown {
  pending: number
  approved: number
  active: number
  completed: number
  rejected: number
}

export interface DefenseBreakdown {
  scheduled: number
  completed: number
  cancelled: number
}

export interface DepartmentStats {
  name: string
  theses: number
  avgScore: number
  completion: number
}

interface UseAdminReportsReturn {
  overview: OverviewStats | null
  thesisByStatus: StatusBreakdown | null
  registrationsByStatus: StatusBreakdown | null
  defensesByStatus: DefenseBreakdown | null
  currentSemester: {
    id: string
    name: string
    academic_year: string
  } | null
  departmentStats: DepartmentStats[]
  isLoading: boolean
  error: string | null
  fetchOverview: (semesterId?: string) => Promise<void>
}

export function useAdminReports(): UseAdminReportsReturn {
  const [overview, setOverview] = React.useState<OverviewStats | null>(null)
  const [thesisByStatus, setThesisByStatus] = React.useState<StatusBreakdown | null>(null)
  const [registrationsByStatus, setRegistrationsByStatus] = React.useState<StatusBreakdown | null>(null)
  const [defensesByStatus, setDefensesByStatus] = React.useState<DefenseBreakdown | null>(null)
  const [currentSemester, setCurrentSemester] = React.useState<{
    id: string
    name: string
    academic_year: string
  } | null>(null)
  const [departmentStats, setDepartmentStats] = React.useState<DepartmentStats[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fetchOverview = React.useCallback(async (semesterId?: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.admin.reports.overview({ semester_id: semesterId })
      setOverview(response.overview || null)
      setThesisByStatus(response.thesisByStatus || null)
      setRegistrationsByStatus(response.registrationsByStatus || null)
      setDefensesByStatus(response.defensesByStatus || null)
      setCurrentSemester(response.currentSemester || null)

      // Mock department stats - would come from a dedicated endpoint
      setDepartmentStats([
        { name: 'CNTT', theses: 45, avgScore: 8.2, completion: 85 },
        { name: 'Viễn thông', theses: 32, avgScore: 7.8, completion: 78 },
        { name: 'Điện tử', theses: 28, avgScore: 7.5, completion: 72 },
        { name: 'Cơ khí', theses: 24, avgScore: 7.9, completion: 80 },
      ])
    } catch (err: any) {
      setError(err.message || 'Không thể tải báo cáo')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    overview,
    thesisByStatus,
    registrationsByStatus,
    defensesByStatus,
    currentSemester,
    departmentStats,
    isLoading,
    error,
    fetchOverview,
  }
}
