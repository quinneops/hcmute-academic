import * as React from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: string
  hint?: string
  accent?: 'primary' | 'emerald' | 'amber' | 'violet'
  icon?: React.ReactNode
  className?: string
}

const accentStyles = {
  primary: 'from-primary-fixed via-white to-white text-primary',
  emerald: 'from-emerald-50 via-white to-white text-emerald-600',
  amber: 'from-amber-50 via-white to-white text-amber-600',
  violet: 'from-violet-50 via-white to-white text-violet-600',
}

export function MetricCard({
  label,
  value,
  hint,
  accent = 'primary',
  icon,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn('overflow-hidden rounded-2xl shadow-ambient-lg', className)}>
      <CardContent className="p-0">
        <div className={cn('bg-gradient-to-br p-6 md:p-7', accentStyles[accent])}>
          <div className="mb-8 flex items-center justify-between gap-4">
            <span className="text-label-sm font-semibold uppercase tracking-[0.18em] text-on-surface-variant/70">
              {label}
            </span>
            {icon ? (
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/90 shadow-ambient-sm">
                {icon}
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <p className="text-3xl md:text-4xl font-headline font-black tracking-tight text-on-surface">
              {value}
            </p>
            {hint ? (
              <p className="text-sm text-on-surface-variant leading-6">{hint}</p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
