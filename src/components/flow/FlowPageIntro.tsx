import * as React from 'react'

import { cn } from '@/lib/utils'

interface FlowPageIntroProps {
  eyebrow?: string
  title: string
  description: string
  actions?: React.ReactNode
  meta?: React.ReactNode
  className?: string
}

export function FlowPageIntro({
  eyebrow = 'Dashboard flow',
  title,
  description,
  actions,
  meta,
  className,
}: FlowPageIntroProps) {
  return (
    <section
      className={cn(
        'relative mb-8 overflow-hidden rounded-[1.75rem] bg-[radial-gradient(circle_at_top_left,_rgba(0,51,153,0.14),_transparent_32%),linear-gradient(135deg,_#ffffff_0%,_#f5f7fb_52%,_#eef3ff_100%)] p-6 shadow-ambient-xl md:p-8',
        className,
      )}
    >
      <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,_rgba(0,32,104,0.1),_transparent_65%)] md:block" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <p className="text-label-md font-semibold uppercase tracking-[0.22em] text-primary/70">
            {eyebrow}
          </p>
          <div className="space-y-2">
            <h1 className="text-3xl font-headline font-black tracking-tight text-on-surface md:text-5xl md:leading-[1.04]">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-on-surface-variant md:text-base">
              {description}
            </p>
          </div>
          {meta ? <div className="flex flex-wrap gap-2 pt-1">{meta}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </section>
  )
}
