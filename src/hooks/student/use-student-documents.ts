/**
 * Student Documents Hook
 * Handles document library with download tracking
 */

import * as React from 'react'
import { api } from '@/lib/api/client'
import { createClient } from '@/lib/supabase/client'

export interface Document {
  id: string
  title: string
  type: string
  category: string
  file_url: string
  file_size: number | null
  download_count: number
  created_at: string
  uploader_name: string | null
}

const typeLabels: Record<string, string> = {
  guide: 'Hướng dẫn',
  template: 'Biểu mẫu',
  regulation: 'Quy định',
  form: 'Mẫu đơn',
  video: 'Video',
}

const categoryLabels: Record<string, string> = {
  academic: 'Học vụ',
  template: 'Biểu mẫu',
  admin: 'Hành chính',
}

export function useStudentDocuments() {
  const [documents, setDocuments] = React.useState<Document[]>([])
  const [category, setCategory] = React.useState<string>('all')
  const [searchTerm, setSearchTerm] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isDownloading, setIsDownloading] = React.useState<string | null>(null)

  const fetchDocuments = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await api.documents.list(undefined as any, category !== 'all' ? category : undefined)
      setDocuments((data || []).map((d: any) => ({
        id: d.id,
        title: d.title,
        type: d.type,
        category: d.category,
        file_url: d.file_url,
        file_size: d.file_size,
        download_count: d.download_count,
        created_at: d.created_at,
        uploader_name: d.uploader_name,
      })))
    } catch (err: any) {
      console.error('Documents fetch error:', err)
      setError(err.message || 'Không thể tải tài liệu')
    } finally {
      setIsLoading(false)
    }
  }, [category])

  const downloadDocument = async (document: Document): Promise<string | null> => {
    setIsDownloading(document.id)
    setError(null)

    try {
      const supabase = createClient()

      // For private buckets, generate signed URL
      // For public buckets, use the direct URL
      let downloadUrl = document.file_url

      // Try to create signed URL (works for private buckets)
      try {
        const filePath = document.file_url.split('/').pop()
        if (filePath) {
          const { data: signedData } = await supabase.storage
            .from('documents')
            .createSignedUrl(filePath, 300) // 5 minutes

          if (signedData?.signedUrl) {
            downloadUrl = signedData.signedUrl
          }
        }
      } catch {
        // Fall back to public URL
      }

      // Update local count (optimistic)
      setDocuments(prev =>
        prev.map(d =>
          d.id === document.id
            ? { ...d, download_count: d.download_count + 1 }
            : d
        )
      )

      return downloadUrl
    } catch (err: any) {
      console.error('Download error:', err)
      setError(err.message || 'Không thể tải tài liệu')
      return null
    } finally {
      setIsDownloading(null)
    }
  }

  const getTypeLabel = (type: string): string => {
    return typeLabels[type] || type
  }

  const getCategoryLabel = (category: string): string => {
    return categoryLabels[category] || category
  }

  const requestDocument = async (studentId: string, title: string, description: string) => {
    try {
      const supabase = createClient()
      const { data, error } = await (supabase
        .from('document_requests') as any)
        .insert({
          student_id: studentId,
          title,
          description,
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (err: any) {
      console.error('Document request error:', err)
      return { success: false, error: err.message }
    }
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  React.useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  return {
    documents: filteredDocuments,
    allDocuments: documents,
    category,
    setCategory,
    searchTerm,
    setSearchTerm,
    isLoading,
    error,
    isDownloading,
    downloadDocument,
    getTypeLabel,
    getCategoryLabel,
    requestDocument,
    refresh: fetchDocuments,
  }
}
