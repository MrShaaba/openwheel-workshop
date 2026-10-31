export type LiveryPattern = 'solid' | 'stripe' | 'split' | 'fade'

export const LIVERY_PATTERNS: readonly LiveryPattern[] = ['solid', 'stripe', 'split', 'fade']

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
