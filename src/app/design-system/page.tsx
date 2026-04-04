import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FeatureCard } from '@/components/ui/library/feature-card'
import { MetricCard } from '@/components/ui/library/metric-card'
import { PageHero } from '@/components/ui/library/page-hero'
import { SectionHeading } from '@/components/ui/library/section-heading'
import { colors } from '@/lib/design-tokens'

const libraryPrinciples = [
  {
    title: 'Editorial hierarchy',
    description: 'Use oversized headlines, quieter supporting copy, and clear spacing to make each page feel intentional.',
    tags: ['Hero', 'Section heading', 'Typography'],
    icon: 'text_fields',
  },
  {
    title: 'Premium surfaces',
    description: 'Prefer tonal layers, soft gradients, and rounded geometry over hard borders so dashboards feel calmer and more modern.',
    tags: ['Cards', 'Panels', 'Glass'],
    icon: 'layers',
  },
  {
    title: 'Action clarity',
    description: 'Primary, secondary, and passive actions should read immediately with consistent button sizes and spacing.',
    tags: ['Buttons', 'Menus', 'States'],
    icon: 'ads_click',
  },
]

const colorGroups = [
  {
    name: 'Brand',
    tokens: [
      ['Primary', colors.primary],
      ['Primary Container', colors['primary-container']],
      ['Primary Fixed', colors['primary-fixed']],
      ['Tertiary', colors.tertiary],
    ],
  },
  {
    name: 'Surface',
    tokens: [
      ['Surface', colors.surface],
      ['Lowest', colors['surface-container-lowest']],
      ['Low', colors['surface-container-low']],
      ['High', colors['surface-container-high']],
    ],
  },
  {
    name: 'Content',
    tokens: [
      ['On Surface', colors['on-surface']],
      ['Variant', colors['on-surface-variant']],
      ['Outline', colors.outline],
      ['Error', colors.error],
    ],
  },
]

export default function DesignSystemPage() {
  return (
    <main className="min-h-screen bg-surface px-6 py-8 md:px-10 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-16">
        <PageHero
          eyebrow="Academic Nexus component library"
          title="A more professional UI system inspired by DeepMind-style clarity."
          description="This first-pass library introduces reusable hero, metrics, feature, and section patterns so the thesis platform can look cleaner, more premium, and easier to scale across student, lecturer, and admin experiences."
          primaryAction="Apply to dashboards"
          secondaryAction="Review tokens"
        />

        <section className="grid gap-6 lg:grid-cols-4">
          <MetricCard
            label="Library status"
            value="v1 foundation"
            hint="Reusable blocks ready for dashboard migration."
            accent="primary"
            icon={<span className="material-symbols-outlined">deployed_code</span>}
          />
          <MetricCard
            label="Core patterns"
            value="4 new"
            hint="Hero, section heading, feature card, metric card."
            accent="emerald"
            icon={<span className="material-symbols-outlined">category</span>}
          />
          <MetricCard
            label="Visual direction"
            value="Editorial"
            hint="Large type, soft surfaces, stronger rhythm."
            accent="amber"
            icon={<span className="material-symbols-outlined">auto_awesome</span>}
          />
          <MetricCard
            label="Migration path"
            value="Dashboard first"
            hint="Refactor admin and student overview blocks into primitives."
            accent="violet"
            icon={<span className="material-symbols-outlined">dashboard_customize</span>}
          />
        </section>

        <section className="space-y-8">
          <SectionHeading
            eyebrow="Design principles"
            title="What to borrow from the reference"
            description="The DeepMind models page uses bold headlines, strong whitespace, calm surfaces, and modular cards. We can adapt that language without copying the brand directly."
          />
          <div className="grid gap-6 lg:grid-cols-3">
            {libraryPrinciples.map((item) => (
              <FeatureCard
                key={item.title}
                eyebrow="UI / UX"
                title={item.title}
                description={item.description}
                tags={item.tags}
                icon={<span className="material-symbols-outlined">{item.icon}</span>}
              />
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <SectionHeading
            eyebrow="Tokens"
            title="Visual tokens already available in the project"
            description="Your codebase already has a strong academic palette. The main improvement is packaging those tokens into repeatable component patterns instead of hand-coding each page block."
            action={<Badge variant="secondary" className="px-3 py-1">Existing tokens reused</Badge>}
          />
          <div className="grid gap-6 lg:grid-cols-3">
            {colorGroups.map((group) => (
              <Card key={group.name} className="rounded-2xl shadow-ambient-lg">
                <CardHeader>
                  <CardTitle className="text-title-md text-primary">{group.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {group.tokens.map(([label, value]) => (
                    <div key={label} className="flex items-center gap-4 rounded-xl bg-surface-container-low p-3">
                      <div className="h-12 w-12 rounded-2xl shadow-ambient-sm" style={{ backgroundColor: value }} />
                      <div>
                        <p className="text-sm font-semibold text-on-surface">{label}</p>
                        <p className="text-xs uppercase tracking-[0.14em] text-secondary">{value}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <SectionHeading
            eyebrow="Usage guidance"
            title="How to roll this out in the current app"
            description="Start with the highest-visibility screens so the design uplift is obvious and low-risk."
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl shadow-ambient-lg">
              <CardHeader>
                <CardTitle className="text-title-lg text-on-surface">Recommended migration order</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-7 text-on-surface-variant">
                <p>1. Replace dashboard stat blocks with <strong className="text-on-surface">MetricCard</strong>.</p>
                <p>2. Replace page headers with <strong className="text-on-surface">PageHero</strong> or <strong className="text-on-surface">SectionHeading</strong>.</p>
                <p>3. Standardize content highlights using <strong className="text-on-surface">FeatureCard</strong>.</p>
                <p>4. Keep forms on the current shadcn/Radix foundation, but tune spacing and grouping afterward.</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-ambient-lg">
              <CardHeader>
                <CardTitle className="text-title-lg text-on-surface">Next implementation step</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm leading-7 text-on-surface-variant">
                  The best next move is refactoring the admin and student dashboards to use these shared blocks. That gives a professional visual upgrade quickly while reducing duplicated Tailwind classes.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button>Refactor admin dashboard</Button>
                  <Button variant="outline">Refactor student dashboard</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  )
}
