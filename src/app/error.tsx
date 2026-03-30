'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  React.useEffect(() => {
    // Log error to error tracking service
    console.error('[Runtime Error]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Animated Illustration */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          <div className="absolute inset-0 bg-error/10 rounded-full animate-ping" />
          <div className="relative w-32 h-32 bg-error/20 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-6xl text-error">error</span>
          </div>
        </div>

        {/* Error Code */}
        <h1 className="text-display-lg font-headline font-extrabold text-error mb-2">
          500
        </h1>

        {/* Title */}
        <h2 className="text-title-lg font-headline font-bold text-on-surface mb-4">
          Có lỗi xảy ra
        </h2>

        {/* Description */}
        <p className="text-body-md text-on-surface-variant mb-8">
          Tính năng này đang được phát triển và sẽ sớm ra mắt.
          <br />
          Vui lòng thử lại sau!
        </p>

        {/* Error Details (dev only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-error-container/50 rounded-lg text-left">
            <p className="text-xs font-mono text-error">
              {error.message}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            className="bg-primary hover:bg-primary/90 text-white shadow-glow-primary min-w-[140px]"
          >
            <span className="material-symbols-outlined text-sm mr-2">refresh</span>
            Thử lại
          </Button>
          <Button variant="outline" onClick={() => window.history.back()} className="min-w-[140px]">
            <span className="material-symbols-outlined text-sm mr-2">arrow_back</span>
            Quay lại
          </Button>
        </div>

        {/* Support Info */}
        <div className="mt-12 pt-8 border-t border-outline-variant/10">
          <p className="text-xs text-secondary">
            Cần hỗ trợ? Liên hệ <a href="mailto:support@academic-nexus.app" className="text-primary hover:underline">support@academic-nexus.app</a>
          </p>
        </div>
      </div>
    </div>
  )
}
