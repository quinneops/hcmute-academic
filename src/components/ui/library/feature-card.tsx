import * as React from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface FeatureCardProps {
  eyebrow?: string
  title: string
  description: string
  icon?: React.ReactNode
  tags?: string[]
  className?: string
}

export function FeatureCard({
  eyebrow,
  title,
  description,
  icon,
  tags = [],
  className,
}: FeatureCardProps) {
  return (
    <Card
      className={cn(
        'group overflow-hidden rounded-2xl bg-surface-container-lowest/95 shadow-ambient-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated-lg',
        className,
      )}
    >
      <CardHeader className="space-y-5 p-6 md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            {eyebrow ? (
              <p className="text-label-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
                {eyebrow}
              </p>
            ) : null}
            <CardTitle className="text-title-lg md:text-[1.5rem] leading-tight text-on-surface">
              {title}
            </CardTitle>
          </div>
          {icon ? (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-fixed text-primary shadow-ambient-sm">
              {icon}
            </div>
          ) : null}
        </div>
        <CardDescription className="mt-0 text-sm md:text-base leading-6 text-on-surface-variant">
          {description}
        </CardDescription>
      </CardHeader>
      {tags.length > 0 ? (
        <CardContent className="flex flex-wrap gap-2 p-6 pt-0 md:p-7 md:pt-0">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-surface-container-low px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary"
            >
              {tag}
            </span>
          ))}
        </CardContent>
      ) : null}
    </Card>
  )
}
