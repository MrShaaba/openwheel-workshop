import { lazy } from 'react'

/** The photo-mode toolbar loads as its own small chunk the first time photo mode opens. */
export const PhotoToolbar = lazy(() => import('./PhotoToolbar'))

export function preloadPhoto(): void {
  void import('./PhotoToolbar')
}
