'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface PDFViewerProps {
  url: string
  fileName?: string
  fileSize?: number | null
  onContentExtracted?: (content: string) => void
  onError?: (error: string) => void
  className?: string
}

const MAX_FILE_SIZE_FOR_AI = 5 * 1024 * 1024 // 5MB limit for AI processing
const MAX_FILE_SIZE_TO_VIEW = 50 * 1024 * 1024 // 50MB max to view

export function PDFViewer({
  url,
  fileName,
  fileSize,
  onContentExtracted,
  onError,
  className,
}: PDFViewerProps) {
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [totalPages, setTotalPages] = React.useState(0)
  const [hasExtractedContent, setHasExtractedContent] = React.useState(false)
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  const isFileTooLargeForAI = React.useMemo(() => {
    if (!fileSize) return false
    return fileSize > MAX_FILE_SIZE_FOR_AI
  }, [fileSize])

  // Extract text content from PDF via API
  React.useEffect(() => {
    if (!url || hasExtractedContent) return

    const extractText = async () => {
      try {
        const response = await fetch('/api/pdf/extract-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Không thể trích xuất nội dung')
        }

        setTotalPages(data.totalPages)
        setHasExtractedContent(true)
        onContentExtracted?.(data.text)

        if (data.isTooLargeForAI) {
          // Content extracted but file is too large for AI features
          console.warn('File too large for AI review:', data.fileSize)
        }
      } catch (err: any) {
        console.error('Text extraction error:', err)
        // Don't show error for text extraction - PDF can still be viewed
        onError?.('Không thể trích xuất nội dung từ PDF')
      }
    }

    extractText()
  }, [url, hasExtractedContent, onContentExtracted, onError])

  // Handle iframe load
  React.useEffect(() => {
    if (!url) return

    const iframe = iframeRef.current
    if (!iframe) return

    const handleLoad = () => {
      setIsLoading(false)
      setError(null)
    }

    const handleError = () => {
      setIsLoading(false)
      setError('Không thể tải PDF. Vui lòng tải xuống để xem.')
    }

    iframe.addEventListener('load', handleLoad)
    iframe.addEventListener('error', handleError)

    return () => {
      iframe.removeEventListener('load', handleLoad)
      iframe.removeEventListener('error', handleError)
    }
  }, [url])

  if (error && !url) {
    return (
      <div className={cn("rounded-lg border bg-error-container p-6 text-center", className)}>
        <span className="material-symbols-outlined text-4xl text-error mb-2">error</span>
        <p className="text-error font-bold">{error}</p>
      </div>
    )
  }

  return (
    <div className={cn("rounded-lg border bg-surface-container-low overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-surface-container">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-secondary">
            {totalPages > 0 ? `${totalPages} trang` : 'Đang tải...'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isFileTooLargeForAI && (
            <span className="flex items-center gap-1 text-amber-700 bg-amber-100 px-2 py-1 rounded-full text-xs">
              <span className="material-symbols-outlined text-[10px]">warning</span>
              File quá lớn để AI review
            </span>
          )}
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-3 py-1.5 rounded hover:bg-surface-container-high text-sm font-medium transition-colors"
          title="Mở trong tab mới"
        >
          <span className="material-symbols-outlined text-sm">open_in_new</span>
          Mở trong tab mới
        </a>
      </div>

      {/* PDF Content */}
      <div className="overflow-auto bg-slate-100" style={{ maxHeight: '70vh' }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <span className="material-symbols-outlined text-4xl animate-spin mb-2">progress_activity</span>
              <p className="text-secondary">Đang tải PDF...</p>
              {fileSize && (
                <p className="text-xs text-secondary mt-1">
                  Kích thước: {(fileSize / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <span className="material-symbols-outlined text-4xl text-error mb-2">error</span>
              <p className="text-error">{error}</p>
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-4 text-primary hover:underline"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  Tải xuống để xem
                </a>
              )}
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={`${url}#toolbar=0`}
            className="w-full h-[70vh] border-0"
            title={fileName || 'PDF Viewer'}
            style={{ minHeight: '500px' }}
          />
        )}
      </div>

      {/* Footer Info */}
      {fileName && (
        <div className="px-4 py-2 border-t bg-surface-container-lowest text-xs text-secondary flex justify-between">
          <span className="truncate">{fileName}</span>
          {fileSize && <span>{(fileSize / 1024 / 1024).toFixed(2)} MB</span>}
        </div>
      )}
    </div>
  )
}
