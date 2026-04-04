import * as React from 'react'

import { MetricCard } from '@/components/ui/library/metric-card'

interface StudentMetricItem {
  label: string
  value: string
  hint?: string
  accent?: 'primary' | 'emerald' | 'amber' | 'violet'
  icon: string
}

interface StudentMetricGridProps {
  items: StudentMetricItem[]
  className?: string
}

export function StudentMetricGrid({ items, className }: StudentMetricGridProps) {
  return (
    <div className={className ?? 'grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4'}>
      {items.map((item) => (
        <MetricCard
          key={item.label}
          label={item.label}
          value={item.value}
          hint={item.hint}
          accent={item.accent}
          icon={<span className="material-symbols-outlined">{item.icon}</span>}
        />
      ))}
    </div>
  )
}
