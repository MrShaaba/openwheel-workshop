/**
 * Session-only mutable state for the test drive, shared by the scene, the camera and the HUD without
 * React re-renders: one car, one lap record.
 */
import { gridPose } from './track'
import { createCarState, placeCar, type CarPose } from './physics'

/** Where the car waits at the start: on the grid behind the line, pointing down the straight. */
export const GRID_POSE: CarPose = gridPose()

export interface LapState {
  /** 0 before the first crossing of the line, then the lap in progress. */
  lap: number
  /** `performance.now()` when the current lap began, null before the first crossing. */
  startedAt: number | null
  lastMs: number | null
  bestMs: number | null
  /** The far side of the circuit has been passed on this lap, so the next crossing counts. */
  passedHalf: boolean
  /** The car has moved since it was placed, which clears the "press W" hint. */
  moved: boolean
}

export const car = createCarState(GRID_POSE)

export const laps: LapState = {
  lap: 0,
  startedAt: null,
  lastMs: null,
  bestMs: null,
  passedHalf: false,
  moved: false,
}

/** Back to the grid with the clock stopped; the best lap survives for the session. */
export function resetCar(): void {
  placeCar(car, GRID_POSE)
  laps.lap = 0
  laps.startedAt = null
  laps.lastMs = null
  laps.passedHalf = false
  laps.moved = false
}
