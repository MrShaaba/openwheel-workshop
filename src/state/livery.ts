export type LiveryPattern = 'solid' | 'stripe' | 'split' | 'fade'

export const LIVERY_PATTERNS: readonly LiveryPattern[] = ['solid', 'stripe', 'split', 'fade']

export const PATTERN_LABELS: Record<LiveryPattern, string> = {
  solid: 'Solid',
  stripe: 'Stripe',
  split: 'Split',
  fade: 'Fade',
}

export interface Livery {
  primary: string
  secondary: string
  accent: string
  number: number
  pattern: LiveryPattern
}

export const DEFAULT_LIVERY: Livery = {
  primary: '#12306e',
  secondary: '#e8edf2',
  accent: '#38e7ff',
  number: 1,
  pattern: 'solid',
}

export const MIN_CAR_NUMBER = 1
export const MAX_CAR_NUMBER = 99

export interface Swatch {
  hex: string
  name: string
}

/** Quick-pick palette for the paint shop. Any hex colour can still be typed into the picker. */
export const LIVERY_SWATCHES: readonly Swatch[] = [
  { hex: '#12306e', name: 'Midnight navy' },
  { hex: '#0b0d12', name: 'Jet black' },
  { hex: '#4b5563', name: 'Gunmetal' },
  { hex: '#e8edf2', name: 'Arctic white' },
  { hex: '#e0263a', name: 'Signal red' },
  { hex: '#ff6a1f', name: 'Ember orange' },
  { hex: '#ffd21f', name: 'Solar yellow' },
  { hex: '#0f6b3a', name: 'Racing green' },
  { hex: '#0ea5a4', name: 'Teal' },
  { hex: '#38e7ff', name: 'Cyan' },
  { hex: '#7c3aed', name: 'Violet' },
  { hex: '#ff4fa3', name: 'Rose' },
]

export interface LiveryScheme {
  name: string
  livery: Omit<Livery, 'number'>
}

/** Original colour schemes. They never touch the car number. */
export const LIVERY_SCHEMES: readonly LiveryScheme[] = [
  {
    name: 'Midnight',
    livery: { primary: '#12306e', secondary: '#e8edf2', accent: '#38e7ff', pattern: 'stripe' },
  },
  {
    name: 'Ember',
    livery: { primary: '#0b0d12', secondary: '#ff6a1f', accent: '#e8edf2', pattern: 'split' },
  },
  {
    name: 'Glacier',
    livery: { primary: '#e8edf2', secondary: '#0ea5a4', accent: '#0b0d12', pattern: 'fade' },
  },
  {
    name: 'Signal',
    livery: { primary: '#ffd21f', secondary: '#0b0d12', accent: '#e0263a', pattern: 'stripe' },
  },
]
