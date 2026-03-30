'use client'

import * as React from 'react'
import { Suspense } from 'react'
import { LoginForm } from './LoginForm'

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="text-center">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-secondary text-sm">Đang tải...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
