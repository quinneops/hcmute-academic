'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface FileViewerProps {
  url: string
  fileName?: string
  fileSize?: number | null
  onContentExtracted?: (content: string) => void
  onError?: (error: string) => void
  className?: string
}

const MAX_FILE_SIZE_FOR_AI = 5 * 1024 * 1024 // 5MB limit for AI processing
const MAX_FILE_SIZE_TO_VIEW = 50 * 1024 * 1024 // 50MB max to view

// Supported file extensions
const PDF_EXTENSIONS = ['.pdf']
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.avi', '.mov']
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg']
const TEXT_EXTENSIONS = ['.txt', '.md', '.json', '.xml', '.csv']
const OFFICE_EXTENSIONS = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']

function getFileExtension(fileName: string): string {
  return '.' + fileName.split('.').pop()?.toLowerCase() || ''
}

function getFileType(fileName: string): 'pdf' | 'image' | 'video' | 'audio' | 'text' | 'office' | 'unknown' {
  const ext = getFileExtension(fileName)
  if (PDF_EXTENSIONS.includes(ext)) return 'pdf'
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image'
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video'
  if (AUDIO_EXTENSIONS.includes(ext)) return 'audio'
  if (TEXT_EXTENSIONS.includes(ext)) return 'text'
  if (OFFICE_EXTENSIONS.includes(ext)) return 'office'
  return 'unknown'
}

export function FileViewer({
  url,
  fileName,
  fileSize,
  onContentExtracted,
  onError,
  className,
}: FileViewerProps) {
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [extractedContent, setExtractedContent] = React.useState<string | null>(null)
  const [isTextExtracting, setIsTextExtracting] = React.useState(false)

  const fileType = React.useMemo(() => fileName ? getFileType(fileName) : 'unknown', [fileName])
  const fileExtension = React.useMemo(() => fileName ? getFileExtension(fileName) : '', [fileName])

  // Reset state when URL changes
  React.useEffect(() => {
    if (url) {
      setIsLoading(true)
      setError(null)
      // Auto-stop loading after 2 seconds for better UX
      // iframe load events are unreliable with cross-origin content
      const timer = setTimeout(() => setIsLoading(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [url])

  const isFileTooLargeForAI = React.useMemo(() => {
    if (!fileSize) return false
    return fileSize > MAX_FILE_SIZE_FOR_AI
  }, [fileSize])

  // Extract text content from supported files via API (non-blocking)
  React.useEffect(() => {
    if (!url || extractedContent) return
    if (fileType !== 'pdf' && fileType !== 'text' && fileType !== 'office') return

    const extractText = async () => {
      setIsTextExtracting(true)
      try {
        const response = await fetch('/api/file/extract-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, fileName }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Không thể trích xuất nội dung')
        }

        setExtractedContent(data.text)
        onContentExtracted?.(data.text)

        if (data.isTooLargeForAI) {
          console.warn('File too large for AI review:', data.fileSize)
        }
      } catch (err: any) {
        console.error('Text extraction error:', err)
        // Don't block viewing - just log the error
        onError?.('Không thể trích xuất nội dung từ file')
      } finally {
        setIsTextExtracting(false)
      }
    }

    extractText()
  }, [url, fileName, fileType, extractedContent, onContentExtracted, onError])

  // Timeout to stop loading after 5 seconds
  React.useEffect(() => {
    if (!isLoading) return

    const timeout = setTimeout(() => {
      console.warn('File loading timeout - forcing stop')
      setIsLoading(false)
    }, 5000) // 5 second timeout

    return () => clearTimeout(timeout)
  }, [isLoading, url])

  // Auto-stop loading after 2 seconds for better UX
  // iframe load events are unreliable with cross-origin content
  React.useEffect(() => {
    if (!url) return
    const timer = setTimeout(() => setIsLoading(false), 2000)
    return () => clearTimeout(timer)
  }, [url])

  // Render file based on type
  const renderFileContent = () => {
    switch (fileType) {
      case 'pdf':
        return (
          <iframe
            src={`${url}#toolbar=0`}
            className="w-full h-[70vh] border-0"
            title={fileName || 'PDF Viewer'}
            onLoad={() => {
              console.log('PDF iframe loaded')
              setIsLoading(false)
            }}
            onError={() => {
              console.error('PDF iframe error')
              setIsLoading(false)
              setError('Không thể tải PDF. Vui lòng tải xuống để xem.')
            }}
          />
        )

      case 'image':
        return (
          <div className="flex items-center justify-center bg-slate-100" style={{ minHeight: '500px' }}>
            <img
              src={url}
              alt={fileName || 'File image'}
              className="max-w-full max-h-[70vh] object-contain"
              onLoad={() => {
                console.log('Image loaded')
                setIsLoading(false)
              }}
              onError={() => {
                console.error('Image load error')
                setIsLoading(false)
                setError('Không thể tải hình ảnh. Vui lòng tải xuống để xem.')
              }}
            />
          </div>
        )

      case 'video':
        return (
          <div className="flex items-center justify-center bg-slate-100 p-4" style={{ minHeight: '500px' }}>
            <video
              controls
              className="max-w-full max-h-[70vh]"
              onLoadedData={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false)
                setError('Không thể tải video. Vui lòng tải xuống để xem.')
              }}
            >
              <source src={url} />
              Trình duyệt không hỗ trợ video tag.
            </video>
          </div>
        )

      case 'audio':
        return (
          <div className="flex items-center justify-center bg-slate-100 p-4" style={{ minHeight: '300px' }}>
            <audio
              controls
              className="w-full max-w-md"
              onLoadedData={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false)
                setError('Không thể tải audio. Vui lòng tải xuống để xem.')
              }}
            >
              <source src={url} />
              Trình duyệt không hỗ trợ audio tag.
            </audio>
          </div>
        )

      case 'text':
      case 'office':
        // For text and office files, try to show extracted content or iframe
        if (extractedContent) {
          return (
            <div className="p-6 bg-white" style={{ minHeight: '500px', maxHeight: '70vh', overflow: 'auto' }}>
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                {extractedContent}
              </pre>
            </div>
          )
        }
        // Show iframe for viewing, with timeout fallback
        return (
          <div className="relative" style={{ height: '70vh' }}>
            <iframe
              src={url}
              className="w-full h-full border-0"
              title={fileName || 'File Viewer'}
              onLoad={() => {
                console.log('File iframe loaded')
                setIsLoading(false)
              }}
              onError={() => {
                console.error('File iframe error')
                setIsLoading(false)
                setError('Không thể tải file. Vui lòng tải xuống để xem.')
              }}
            />
            {/* Timeout fallback - stop loading after 10 seconds */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                <div className="text-center">
                  <span className="material-symbols-outlined text-4xl animate-spin mb-2">progress_activity</span>
                  <p className="text-secondary">Đang tải file...</p>
                </div>
              </div>
            )}
          </div>
        )

      default:
        return (
          <div className="flex items-center justify-center h-64 bg-slate-100">
            <div className="text-center">
              <span className="material-symbols-outlined text-6xl text-secondary mb-2">description</span>
              <p className="text-secondary">
                Định dạng {fileExtension?.toUpperCase() || 'file'} không thể xem trước
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 text-primary hover:underline"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Tải xuống để xem
              </a>
            </div>
          </div>
        )
    }
  }

  return (
    <div className={cn("rounded-lg border bg-surface-container-low overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-surface-container">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-lg text-primary">
            {fileType === 'pdf' ? 'picture_as_pdf' :
             fileType === 'image' ? 'image' :
             fileType === 'video' ? 'videocam' :
             fileType === 'audio' ? 'audiotrack' :
             fileType === 'text' ? 'description' :
             fileType === 'office' ? 'description' : 'insert_drive_file'}
          </span>
          <span className="text-sm font-medium text-secondary">
            {fileType === 'unknown' ? 'File không rõ định dạng' :
             `Định dạng: ${fileExtension?.toUpperCase() || 'Unknown'}`}
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

      {/* File Content */}
      <div className="overflow-auto bg-slate-100" style={{ maxHeight: '70vh' }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <span className="material-symbols-outlined text-4xl animate-spin mb-2">progress_activity</span>
              <p className="text-secondary">Đang tải file...</p>
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
          renderFileContent()
        )}
      </div>

      {/* Footer Info */}
      {fileName && (
        <div className="px-4 py-2 border-t bg-surface-container-lowest text-xs text-secondary flex justify-between">
          <span className="truncate" title={fileName}>{fileName}</span>
          {fileSize && <span>{(fileSize / 1024 / 1024).toFixed(2)} MB</span>}
        </div>
      )}
    </div>
  )
}
