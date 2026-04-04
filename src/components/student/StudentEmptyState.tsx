import * as React from 'react'

import { Card, CardContent } from '@/components/ui/card'

interface StudentEmptyStateProps {
  icon: string
  title: string
  description: string
  action?: React.ReactNode
}

export function StudentEmptyState({ icon, title, description, action }: StudentEmptyStateProps) {
  return (
    <Card className="rounded-2xl shadow-ambient-lg">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-10 sm:py-14 px-4 text-center">
        <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-3xl bg-primary-fixed text-primary">
          <span className="material-symbols-outlined text-2xl sm:text-3xl">{icon}</span>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-headline font-bold text-on-surface">{title}</h3>
          <p className="max-w-md text-sm leading-6 text-on-surface-variant">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  )
}
