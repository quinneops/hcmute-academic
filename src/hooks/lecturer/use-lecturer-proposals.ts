/**
 * Lecturer Proposals Hook
 * Fetches proposals supervised by lecturer and handles approve/reject actions
 */

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'

export interface LecturerProposal {
  id: string
  title: string
  slug: string | null
  description: string | null
  category: string | null
  tags: string[]
  status: string
  student_name: string
  student_code: string
  student_id: string
  registration_id: string
  submitted_at: string
  reviewed_at: string | null
  review_notes: string | null
  motivation_letter: string | null
  proposed_title: string | null
}

export function useLecturerProposals(lecturerId: string) {
  const [proposals, setProposals] = React.useState<LecturerProposal[]>([])
  const [selectedProposal, setSelectedProposal] = React.useState<LecturerProposal | null>(null)
  const [stats, setStats] = React.useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  })
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isUpdating, setIsUpdating] = React.useState(false)

  const fetchProposals = React.useCallback(async () => {
    if (!lecturerId) {
      console.log('[LecturerProposals] No lecturerId, returning early')
      return
    }

    console.log('[LecturerProposals] Fetching data for lecturerId:', lecturerId)
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Fetch proposals with registrations for this lecturer
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          id,
          title,
          slug,
          description,
          category,
          tags,
          status,
          created_at,
          registrations (
            id,
            student_id,
            status,
            submitted_at,
            reviewed_at,
            review_notes,
            motivation_letter,
            proposed_title,
            profiles (
              id,
              full_name,
              student_code
            )
          )
        `)
        .eq('supervisor_id', lecturerId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform data - flatten registrations into proposals
      const transformedProposals: LecturerProposal[] = []

      ;(data || []).forEach((proposal: any) => {
        if (proposal.registrations && proposal.registrations.length > 0) {
          proposal.registrations.forEach((reg: any) => {
            transformedProposals.push({
              id: proposal.id,
              title: proposal.title,
              slug: proposal.slug,
              description: proposal.description,
              category: proposal.category,
              tags: proposal.tags || [],
              status: proposal.status,
              student_name: reg.profiles?.full_name || 'Unknown',
              student_code: reg.profiles?.student_code || '',
              student_id: reg.student_id,
              registration_id: reg.id,
              submitted_at: reg.submitted_at,
              reviewed_at: reg.reviewed_at,
              review_notes: reg.review_notes,
              motivation_letter: reg.motivation_letter,
              proposed_title: reg.proposed_title,
            })
          })
        } else {
          // Proposal without registrations
          transformedProposals.push({
            id: proposal.id,
            title: proposal.title,
            slug: proposal.slug,
            description: proposal.description,
            category: proposal.category,
            tags: proposal.tags || [],
            status: proposal.status,
            student_name: '',
            student_code: '',
            student_id: '',
            registration_id: '',
            submitted_at: proposal.created_at,
            reviewed_at: null,
            review_notes: null,
            motivation_letter: null,
            proposed_title: null,
          })
        }
      })

      setProposals(transformedProposals)

      // Calculate stats
      setStats({
        pending: transformedProposals.filter(p => p.status === 'pending').length,
        approved: transformedProposals.filter(p => p.status === 'approved').length,
        rejected: transformedProposals.filter(p => p.status === 'rejected').length,
      })

      // Set first proposal as selected by default
      if (transformedProposals.length > 0 && !selectedProposal) {
        setSelectedProposal(transformedProposals[0])
      }

    } catch (err: any) {
      console.error('[LecturerProposals] Fetch error:', err)
      setError(err.message || 'Không thể tải danh sách đề cương')
    } finally {
      setIsLoading(false)
    }
  }, [lecturerId, selectedProposal])

  const reviewProposal = async (
    proposalId: string,
    action: 'approve' | 'reject',
    reviewNotes?: string
  ): Promise<void> => {
    if (!lecturerId) throw new Error('No lecturer ID')

    setIsUpdating(true)
    setError(null)

    try {
      const supabase = createClient()

      // Update proposal status
      const newStatus = action === 'approve' ? 'approved' : 'rejected'

      const { error: proposalError } = await (supabase
        .from('proposals') as any)
        .update({
          status: newStatus,
          review_notes: reviewNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', proposalId)

      if (proposalError) throw proposalError

      // Also update registration if exists
      const { error: regError } = await (supabase
        .from('registrations') as any)
        .update({
          status: newStatus === 'approved' ? 'approved' : 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: lecturerId,
          review_notes: reviewNotes,
        })
        .eq('proposal_id', proposalId)

      if (regError) {
        console.error('[LecturerProposals] Registration update error:', regError)
        // Don't throw - proposal update was successful
      }

      console.log(`[LecturerProposals] Proposal ${action}ed successfully`)

      // Refresh data
      await fetchProposals()

    } catch (err: any) {
      console.error('[LecturerProposals] Review error:', err)
      throw err
    } finally {
      setIsUpdating(false)
    }
  }

  const createProposal = async (proposalData: {
    title: string
    description?: string
    category?: string
    tags?: string[]
    requirements?: string
    max_students?: number
  }): Promise<void> => {
    if (!lecturerId) throw new Error('No lecturer ID')

    setIsUpdating(true)
    setError(null)

    try {
      const supabase = createClient()

      const { error } = await (supabase
        .from('proposals') as any)
        .insert({
          ...proposalData,
          supervisor_id: lecturerId,
          status: 'draft',
          semester_id: await getCurrentSemesterId(supabase),
        })

      if (error) throw error

      console.log('[LecturerProposals] Proposal created successfully')

      await fetchProposals()

    } catch (err: any) {
      console.error('[LecturerProposals] Create error:', err)
      throw err
    } finally {
      setIsUpdating(false)
    }
  }

  React.useEffect(() => {
    fetchProposals()
  }, [fetchProposals])

  return {
    proposals,
    selectedProposal,
    setSelectedProposal,
    stats,
    reviewProposal,
    createProposal,
    isLoading,
    isUpdating,
    error,
    refresh: fetchProposals,
  }
}

async function getCurrentSemesterId(supabase: any): Promise<string | null> {
  const { data } = await supabase
    .from('semesters')
    .select('id')
    .eq('is_current', true)
    .single()

  return data?.id || null
}
