import { lazy } from 'react'

/** The tour player and its narration engine load as their own chunk the first time a tour starts. */
export const TourPlayer = lazy(() => import('./TourPlayer'))

export function preloadTour(): void {
  void import('./TourPlayer')
}
