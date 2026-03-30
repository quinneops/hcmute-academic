import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Animated Illustration */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping" />
          <div className="relative w-32 h-32 bg-primary/20 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-6xl text-primary">construction</span>
          </div>
        </div>

        {/* Error Code */}
        <h1 className="text-display-lg font-headline font-extrabold text-primary mb-2">
          404
        </h1>

        {/* Title */}
        <h2 className="text-title-lg font-headline font-bold text-on-surface mb-4">
          Trang không tìm thấy
        </h2>

        {/* Description */}
        <p className="text-body-md text-on-surface-variant mb-8">
          Tính năng này đang được phát triển và sẽ sớm ra mắt.
          <br />
          Vui lòng quay lại sau!
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button className="bg-primary hover:bg-primary/90 text-white shadow-glow-primary min-w-[140px]">
              <span className="material-symbols-outlined text-sm mr-2">home</span>
              Về trang chủ
            </Button>
          </Link>
          <Link href="/student">
            <Button variant="outline" className="min-w-[140px]">
              <span className="material-symbols-outlined text-sm mr-2">dashboard</span>
              Bảng điều khiển
            </Button>
          </Link>
        </div>

        {/* Progress Indicator */}
        <div className="mt-12 pt-8 border-t border-outline-variant/10">
          <p className="text-xs text-secondary mb-3">Tiến độ phát triển</p>
          <div className="w-full bg-surface-container-highest rounded-full h-2 overflow-hidden">
            <div className="bg-primary h-full rounded-full animate-pulse" style={{ width: '70%' }} />
          </div>
          <p className="text-xs text-secondary mt-2">70% hoàn thành</p>
        </div>
      </div>
    </div>
  )
}
