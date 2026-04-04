import * as React from 'react'

import { cn } from '@/lib/utils'

interface SectionHeadingProps {
  eyebrow?: string
  title: string
  description?: string
  align?: 'left' | 'center'
  action?: React.ReactNode
  className?: string
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  action,
  className,
}: SectionHeadingProps) {
  const centered = align === 'center'

  return (
    <div
      className={cn(
        'flex flex-col gap-4 md:flex-row md:items-end md:justify-between',
        centered && 'items-center text-center md:flex-col md:items-center',
        className,
      )}
    >
      <div className="space-y-3 max-w-3xl">
        {eyebrow ? (
          <p className="text-label-md font-semibold uppercase tracking-[0.22em] text-primary/70">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-2">
          <h2 className="text-3xl md:text-5xl font-headline font-extrabold text-on-surface tracking-tight">
            {title}
          </h2>
          {description ? (
            <p className="text-base md:text-lg text-on-surface-variant leading-7">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  )
}
