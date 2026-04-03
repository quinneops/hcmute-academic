/**
 * Student Proposals Hook
 * Handles proposal browsing, registration, and status tracking
 */

import * as React from 'react'
import { api } from '@/lib/api/client'
import { createClient } from '@/lib/supabase/client'

export interface Proposal {
  id: string
  title: string
  description: string | null
  category: string | null
  tags: string[]
  supervisor_name: string | null
  max_students: number
  current_students: number
  views_count: number
  created_at: string
}

export interface Registration {
  id: string
  proposal_id: string
  proposal_title: string
  proposal_category: string | null
  proposal_tags: string[]
  status: string
  submitted_at: string
  review_notes: string | null
  supervisor_name: string | null
  supervisor_email: string | null
  motivation_letter: string | null
}

export function useStudentProposals(studentId: string) {
  const [availableProposals, setAvailableProposals] = React.useState<Proposal[]>([])
  const [myRegistrations, setMyRegistrations] = React.useState<Registration[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isRegistering, setIsRegistering] = React.useState<string | null>(null)

  const fetchProposals = React.useCallback(async () => {
    if (!studentId) return

    setIsLoading(true)
    setError(null)

    try {
      // Fetch student's existing registrations
      const registrationsData = await api.registrations.list(studentId)
      const registeredProposalIds = (registrationsData as any[])?.map(r => r.proposal_id) || []

      // Fetch available proposals
      const proposalsData = await api.proposals.list()

      // Filter out proposals student already registered for
      const available = (proposalsData as any[]).filter(
        (p: any) => !registeredProposalIds.includes(p.id)
      )

      setAvailableProposals(available.map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        category: p.category,
        tags: p.tags || [],
        supervisor_name: p.supervisor_name || p.supervisor?.full_name,
        max_students: p.max_students,
        current_students: p.registrations_count || 0,
        views_count: p.views_count || 0,
        created_at: p.created_at,
      })))

      // Set my registrations
      setMyRegistrations((registrationsData as any[]).map((r: any) => ({
        id: r.id,
        proposal_id: r.proposal_id,
        proposal_title: r.proposal_title,
        proposal_category: r.proposal_category || r.proposal?.category,
        proposal_tags: r.proposal_tags || r.proposal?.tags || [],
        status: r.status,
        submitted_at: r.submitted_at,
        review_notes: r.review_notes,
        supervisor_name: r.supervisor_name || r.proposal?.supervisor?.full_name,
        supervisor_email: r.supervisor_email,
        motivation_letter: r.motivation_letter,
      })))
    } catch (err: any) {
      console.error('Proposals fetch error:', err)
      setError(err.message || 'Không thể tải danh sách đề tài')
    } finally {
      setIsLoading(false)
    }
  }, [studentId])

  const registerForProposal = async (proposalId: string, motivationLetter?: string) => {
    if (!studentId) return { error: 'Không tìm thấy user ID' }

    setIsRegistering(proposalId)
    setError(null)

    try {
      // Check if already registered for this specific proposal (legacy check)
      const existing = await api.registrations.checkExisting(studentId, proposalId)
      if (existing) {
        throw new Error('Bạn đã đăng ký đề tài này rồi')
      }

      await api.registrations.submit({
        student_id: studentId,
        proposal_id: proposalId,
        status: 'pending',
        motivation_letter: motivationLetter || null,
      })

      // Refresh data
      await fetchProposals()

      return { success: true }
    } catch (err: any) {
      console.error('Registration error:', err)
      // Handle "already registered for 1 proposal" error
      const errorMessage = err.message?.includes('1 đề tài')
        ? err.message
        : err.message?.includes('đã đăng ký')
          ? err.message
          : 'Không thể đăng ký đề tài'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsRegistering(null)
    }
  }

  const withdrawRegistration = async (registrationId: string) => {
    setError(null)

    try {
      // Note: This would need a new API endpoint for now use Supabase directly
      const supabase = createClient()
      const { error } = await (supabase as any)
        .from('registrations')
        .update({ status: 'withdrawn' })
        .eq('id', registrationId)

      if (error) throw error

      await fetchProposals()
      return { success: true }
    } catch (err: any) {
      console.error('Withdrawal error:', err)
      setError(err.message || 'Không thể hủy đăng ký')
      return { error: err.message }
    }
  }

  React.useEffect(() => {
    fetchProposals()
  }, [fetchProposals])

  return {
    availableProposals,
    myRegistrations,
    isLoading,
    error,
    isRegistering,
    registerForProposal,
    withdrawRegistration,
    refresh: fetchProposals,
  }
}
