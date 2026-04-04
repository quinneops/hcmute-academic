import * as React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PageHeroProps {
  eyebrow: string
  title: string
  description: string
  primaryAction?: string
  secondaryAction?: string
  className?: string
}

export function PageHero({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: PageHeroProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_top_left,_rgba(0,51,153,0.18),_transparent_35%),linear-gradient(135deg,_#ffffff_0%,_#f3f6fb_45%,_#eef2ff_100%)] p-8 shadow-ambient-xl md:p-12',
        className,
      )}
    >
      <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,_rgba(0,32,104,0.12),_transparent_65%)] md:block" />
      <div className="relative max-w-4xl space-y-8">
        <div className="space-y-4">
          <p className="text-label-md font-semibold uppercase tracking-[0.22em] text-primary/70">
            {eyebrow}
          </p>
          <h1 className="max-w-3xl text-4xl font-headline font-black tracking-tight text-on-surface md:text-6xl md:leading-[1.05]">
            {title}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-on-surface-variant md:text-lg">
            {description}
          </p>
        </div>

        {(primaryAction || secondaryAction) ? (
          <div className="flex flex-wrap gap-3">
            {primaryAction ? <Button size="lg">{primaryAction}</Button> : null}
            {secondaryAction ? (
              <Button size="lg" variant="outline" className="border-outline-variant/40 bg-white/80">
                {secondaryAction}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
