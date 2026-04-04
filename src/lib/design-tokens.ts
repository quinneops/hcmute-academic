/**
 * Academic Editorial Design Tokens
 *
 * Design system tokens for HCM-UTE Academic Nexus
 * Based on "The Prestigious Curator" creative direction
 */

export const colors = {
  // Primary Palette - Academic Blues
  primary: '#002068',
  'primary-container': '#003399',
  'primary-fixed': '#dce1ff',
  'primary-fixed-dim': '#b5c4ff',
  'on-primary': '#ffffff',
  'on-primary-container': '#8aa4ff',
  'on-primary-fixed': '#00164e',
  'on-primary-fixed-variant': '#153ea3',

  // Secondary Palette - Neutral Grays
  secondary: '#576066',
  'secondary-container': '#dbe4eb',
  'secondary-fixed': '#dbe4eb',
  'secondary-fixed-dim': '#bfc8ce',
  'on-secondary': '#ffffff',
  'on-secondary-container': '#5d666c',
  'on-secondary-fixed': '#141d22',
  'on-secondary-fixed-variant': '#3f484e',

  // Tertiary Palette - Excellence Accents (Gold/Emerald)
  tertiary: '#735c00',
  'tertiary-container': '#cca730',
  'tertiary-fixed': '#ffe088',
  'tertiary-fixed-dim': '#e9c349',
  'on-tertiary': '#ffffff',
  'on-tertiary-container': '#4f3d00',
  'on-tertiary-fixed': '#241a00',
  'on-tertiary-fixed-variant': '#574500',

  // Surface Hierarchy (No-Line Rule)
  // Level 0: Base canvas
  background: '#f8f9fb',
  surface: '#f8f9fb',

  // Level 1: Sections
  'surface-dim': '#d8dadc',
  'surface-container-lowest': '#ffffff',
  'surface-container-low': '#f2f4f6',
  'surface-container': '#eceef0',

  // Level 2: Cards
  'surface-container-high': '#e6e8ea',
  'surface-container-highest': '#e0e3e5',

  // Level 3: Interactive
  'surface-bright': '#f8f9fb',

  // Content Colors
  'on-surface': '#191c1e',
  'on-surface-variant': '#444653',
  'on-background': '#191c1e',

  // Semantic Colors
  error: '#ba1a1a',
  'error-container': '#ffdad6',
  'on-error': '#ffffff',
  'on-error-container': '#93000a',

  // Utility
  outline: '#747684',
  'outline-variant': '#c4c5d5',

  // Special
  'surface-tint': '#3557bc',
  'inverse-surface': '#2d3133',
  'inverse-on-surface': '#eff1f3',
  'inverse-primary': '#b5c4ff',
} as const

export const fontFamily = {
  headline: ['Be Vietnam Pro', 'sans-serif'],
  body: ['Inter', 'sans-serif'],
  label: ['Be Vietnam Pro', 'sans-serif'],
} as const

export const fontSize = {
  // Display: High-impact headlines
  'display-sm': '2.25rem',    // 36px
  'display-md': '2.75rem',    // 44px
  'display-lg': '3.5rem',     // 56px

  // Headline: Section titles
  'headline-sm': '1.5rem',    // 24px
  'headline-md': '1.75rem',   // 28px
  'headline-lg': '2rem',      // 32px

  // Title: Card headers
  'title-sm': '1rem',         // 16px
  'title-md': '1.125rem',     // 18px
  'title-lg': '1.375rem',     // 22px

  // Body: Primary reading
  'body-sm': '0.875rem',      // 14px
  'body-md': '1rem',          // 16px

  // Label: Micro-copy
  'label-sm': '0.6875rem',    // 11px
  'label-md': '0.75rem',      // 12px
} as const

export const fontWeight = {
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
} as const

export const letterSpacing = {
  'display-tight': '-0.02em',
  'headline-tight': '-0.015em',
  'title-normal': '0',
  'body-normal': '0',
  'label-wide': '0.05em',
  'label-wider': '0.1em',
} as const

export const borderRadius = {
  DEFAULT: '0.25rem',       // 4px
  lg: '0.5rem',             // 8px
  xl: '0.75rem',            // 12px
  '2xl': '1rem',            // 16px
  full: '9999px',           // Pill
} as const

export const boxShadow = {
  // Ambient shadows (4% opacity, 24px blur)
  'ambient-sm': '0 1px 2px rgba(25, 28, 30, 0.04)',
  'ambient-md': '0 4px 8px rgba(25, 28, 30, 0.04)',
  'ambient-lg': '0 8px 16px rgba(25, 28, 30, 0.04)',
  'ambient-xl': '0 24px 48px rgba(25, 28, 30, 0.04)',

  // Elevated (8% opacity on hover)
  'elevated-sm': '0 1px 3px rgba(25, 28, 30, 0.08)',
  'elevated-md': '0 4px 12px rgba(25, 28, 30, 0.08)',
  'elevated-lg': '0 24px 30px rgba(25, 28, 30, 0.08)',

  // Special
  'glow-primary': '0 8px 24px rgba(0, 32, 104, 0.15)',
  'glow-primary-dim': '0 8px 24px rgba(0, 32, 104, 0.10)',
} as const

export const spacing = {
  '0': '0',
  '1': '0.25rem',   // 4px
  '2': '0.5rem',    // 8px
  '3': '0.75rem',   // 12px
  '4': '1rem',      // 16px
  '5': '1.25rem',   // 20px
  '6': '1.5rem',    // 24px
  '8': '2rem',      // 32px
  '10': '2.5rem',   // 40px
  '12': '3rem',     // 48px (page margins)
  '16': '4rem',     // 64px (large margins)
  '20': '5rem',     // 80px
  '24': '6rem',     // 96px
} as const

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

/**
 * Creative North Star: "The Prestigious Curator"
 *
 * The system is designed to feel like a premium academic journal—
 * authoritative yet breathable. We achieve this through "Institutional Innovation":
 * combining the gravitas of HCM-UTE's heritage with a forward-thinking digital execution.
 *
 * Key Principles:
 * 1. No-Line Rule: No 1px solid borders. Structure via tonal transitions.
 * 2. Layered Surface: UI as stacked academic papers on a desk.
 * 3. Glass & Gradient: Glassmorphism for floating elements, gradients for CTAs.
 * 4. Editorial Typography: Be Vietnam Pro for Vietnamese, Inter for body.
 * 5. Excellence Accents: Gold/Emerald as rare "rewards" for the eye.
 */
