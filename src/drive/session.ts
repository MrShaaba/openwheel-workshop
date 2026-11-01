/**
 * Session-only mutable state for the test drive, shared by the scene, the camera and the HUD without
 * React re-renders: one car, one lap record.
 */
import { createCarState, placeCar, type CarPose } from './physics'
import { gridPose, HALF_WIDTH, type TrackFix } from './track'

/** Where the car waits at the start: on the grid behind the line, pointing down the straight. */
export const GRID_POSE: CarPose = gridPose()

/** A crossing of the line only counts within this distance of the centreline. */
const LINE_REACH = HALF_WIDTH + 6

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
  /** Lap progress last frame, to detect the line being crossed. */
  progress: number
}

export const car = createCarState(GRID_POSE)

export const laps: LapState = {
  lap: 0,
  startedAt: null,
  lastMs: null,
  bestMs: null,
  passedHalf: false,
  moved: false,
  progress: 0,
}

/** m:ss.mmm, or dashes before a time exists. */
export function formatLap(ms: number | null): string {
  if (ms === null) return '--:--.---'
  const total = Math.max(0, Math.round(ms))
  const minutes = Math.floor(total / 60000)
  const seconds = Math.floor((total % 60000) / 1000)
  const millis = total % 1000
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
}

/** Back to the grid with the clock stopped; the best lap survives for the session. */
export function resetCar(): void {
  placeCar(car, GRID_POSE)
  laps.lap = 0
  laps.startedAt = null
  laps.lastMs = null
  laps.passedHalf = false
  laps.moved = false
  laps.progress = 0
}

/**
 * Lap timing from the car's progress around the centreline. A lap counts when the line is crossed
 * forwards after the far side of the circuit has been passed; crossing it backwards cancels the lap.
 */
export function updateLaps(fix: TrackFix, now: number): void {
  const previous = laps.progress
  const progress = fix.progress
  laps.progress = progress
  if (!laps.moved && Math.abs(car.speed) > 0.5) laps.moved = true
  if (progress > 0.4 && progress < 0.6) laps.passedHalf = true
  if (Math.abs(fix.lateral) > LINE_REACH) return
  if (previous > 0.9 && progress < 0.1) {
    if (laps.startedAt !== null && laps.passedHalf) {
      laps.lastMs = now - laps.startedAt
      laps.bestMs = laps.bestMs === null ? laps.lastMs : Math.min(laps.bestMs, laps.lastMs)
    }
    laps.lap += 1
    laps.startedAt = now
    laps.passedHalf = false
  } else if (previous < 0.1 && progress > 0.9) {
    laps.lap = Math.max(0, laps.lap - 1)
    laps.startedAt = null
    laps.passedHalf = false
  }
}
