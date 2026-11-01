import { lazy } from 'react'

/** The track scene and its HUD load as their own chunk, fetched the first time the car is complete. */
export const DriveScene = lazy(() => import('./DriveScene'))
export const DriveHUD = lazy(() => import('./DriveHUD'))

export function preloadDrive(): void {
  void import('./DriveScene')
  void import('./DriveHUD')
}
