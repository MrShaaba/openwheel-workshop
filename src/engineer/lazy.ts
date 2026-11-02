import { lazy } from 'react'

/** The Race engineer panel (setup, pit stop, quiz, time trial) loads as its own chunk on first open. */
export const EngineerPanel = lazy(() => import('./EngineerPanel'))

export function preloadEngineer(): void {
  void import('./EngineerPanel')
}
