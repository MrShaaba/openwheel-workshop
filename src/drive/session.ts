/**
 * Session-only mutable state for the test drive, shared by the scene, the camera and the HUD without
 * React re-renders: one car, one lap record with sectors, and the trace of the lap in progress.
 */
import { useWorkshop } from '../state/store'
import { createCarState, placeCar } from './physics'
import { TRACE_STRIDE, useRecords, type SectorTimes } from './records'
import { getCircuit, gridPose, HALF_WIDTH, type Circuit, type TrackFix } from './track'

/** The circuit the store has selected, built on first use. */
export function activeCircuit(): Circuit {
  return getCircuit(useWorkshop.getState().circuit)
}

/** A crossing of the line only counts within this distance of the centreline. */
const LINE_REACH = HALF_WIDTH + 6
/** Sector boundaries as lap progress. */
export const SECTOR_ENDS = [1 / 3, 2 / 3] as const
/** How often the lap trace samples the car, in milliseconds. */
const TRACE_INTERVAL_MS = 40
/** How long a split delta stays on the HUD. */
export const SPLIT_SHOW_MS = 2800

export interface Split {
  /** Milliseconds against the best lap at the same sector boundary; negative is faster. */
  delta: number
  sector: number
  at: number
}

export interface LapResult {
  ms: number
  sectors: SectorTimes
  /** The lap left the track, so it does not count for the records. */
  dirty: boolean
  position: number | null
  newBest: boolean
  purple: [boolean, boolean, boolean]
  at: number
}

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
  /** Sector the car is in, 0 to 2, and when it began. */
  sector: number
  sectorStartedAt: number | null
  /** Sector times of the lap in progress (null until each sector is done). */
  sectors: [number | null, number | null, number | null]
  /** Sector times of the last completed lap. */
  lastSectors: SectorTimes | null
  /** The lap in progress went fully off the track. */
  dirty: boolean
  /** Last completed lap in full, for the HUD flash. */
  result: LapResult | null
  split: Split | null
  /** Samples of the lap in progress: [ms, x, z, heading, steer] flattened. */
  trace: number[]
  lastSampleAt: number
}

export const car = createCarState(gridPose(activeCircuit()))

/** Set once a gamepad has driven the car, so the HUD can switch its hints to the pad. */
export const padUsed = { value: false }

export const laps: LapState = {
  lap: 0,
  startedAt: null,
  lastMs: null,
  bestMs: null,
  passedHalf: false,
  moved: false,
  progress: 0,
  sector: 0,
  sectorStartedAt: null,
  sectors: [null, null, null],
  lastSectors: null,
  dirty: false,
  result: null,
  split: null,
  trace: [],
  lastSampleAt: 0,
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

/** ss.mmm for sectors. */
export function formatSector(ms: number | null): string {
  if (ms === null) return '--.---'
  const total = Math.max(0, Math.round(ms))
  return `${Math.floor(total / 1000)}.${String(total % 1000).padStart(3, '0')}`
}

/** +0.312 / -0.045 */
export function formatDelta(ms: number): string {
  const sign = ms < 0 ? '-' : '+'
  return `${sign}${(Math.abs(ms) / 1000).toFixed(3)}`
}

/** The car stands still while a panel or photo mode has the screen. */
export function drivePaused(): boolean {
  const state = useWorkshop.getState()
  return state.engineer !== null || state.photoMode
}

/** A fresh set of the current compound. */
export function fitTyres(): void {
  car.tyreWear = 0
}

function clearLap(): void {
  laps.startedAt = null
  laps.passedHalf = false
  laps.sector = 0
  laps.sectorStartedAt = null
  laps.sectors = [null, null, null]
  laps.dirty = false
  laps.trace = []
  laps.lastSampleAt = 0
}

/** Back to the grid with the clock stopped; the best lap survives for the session. */
export function resetCar(): void {
  placeCar(car, gridPose(activeCircuit()))
  laps.lap = 0
  laps.lastMs = null
  laps.lastSectors = null
  laps.moved = false
  laps.progress = 0
  laps.result = null
  laps.split = null
  clearLap()
}

function completeLap(now: number): void {
  if (laps.startedAt === null) return
  const ms = now - laps.startedAt
  const s1 = laps.sectors[0] ?? ms / 3
  const s2 = laps.sectors[1] ?? ms / 3
  const sectors: SectorTimes = [s1, s2, ms - s1 - s2]
  laps.lastMs = ms
  laps.lastSectors = sectors
  const dirty = laps.dirty
  let submission: Pick<LapResult, 'position' | 'newBest' | 'purple'> = {
    position: null,
    newBest: false,
    purple: [false, false, false],
  }
  if (!dirty) {
    // The final split compares with the best lap as it stood before this one.
    split(2, ms, now)
    laps.bestMs = laps.bestMs === null ? ms : Math.min(laps.bestMs, ms)
    const { setup, circuit } = useWorkshop.getState()
    useWorkshop.getState().recordSheetLap(circuit, setup, ms)
    submission = useRecords
      .getState()
      .submitLap(
        circuit,
        { ms, sectors, compound: setup.tyre, wings: [setup.frontWing, setup.rearWing] },
        quantise(laps.trace),
      )
  }
  laps.result = { ms, sectors, dirty, ...submission, at: now }
}

/** Two decimals of a metre and three of a radian are plenty for a ghost. */
function quantise(trace: number[]): number[] {
  return trace.map((value, index) => {
    const field = index % TRACE_STRIDE
    return field === 0
      ? Math.round(value)
      : Math.round(value * (field === 3 ? 1000 : 100)) / (field === 3 ? 1000 : 100)
  })
}

function sampleTrace(now: number): void {
  if (laps.startedAt === null || now - laps.lastSampleAt < TRACE_INTERVAL_MS) return
  laps.lastSampleAt = now
  laps.trace.push(now - laps.startedAt, car.x, car.z, car.heading, car.steer)
}

/** Delta against the best lap at a sector boundary, if there is a best lap to compare with. */
function split(sector: number, elapsed: number, now: number): void {
  const best = useRecords.getState().circuits[useWorkshop.getState().circuit].bestLap
  if (!best) return
  let reference = 0
  for (let i = 0; i <= sector; i++) reference += best.sectors[i]
  laps.split = { delta: elapsed - reference, sector, at: now }
}

/**
 * Lap timing from the car's progress around the centreline. A lap counts when the line is crossed
 * forwards after the far side of the circuit has been passed; crossing it backwards cancels the lap.
 * Sectors end at one and two thirds of the lap. Leaving the track marks the lap as not counting.
 */
export function updateLaps(fix: TrackFix, now: number): void {
  const previous = laps.progress
  const progress = fix.progress
  laps.progress = progress
  if (!laps.moved && Math.abs(car.speed) > 0.5) laps.moved = true
  if (progress > 0.4 && progress < 0.6) laps.passedHalf = true
  if (laps.startedAt !== null) {
    if (car.offTrack) laps.dirty = true
    sampleTrace(now)
    // Sector boundaries, forwards only.
    for (let i = laps.sector; i < SECTOR_ENDS.length; i++) {
      if (previous < SECTOR_ENDS[i] && progress >= SECTOR_ENDS[i] && progress - previous < 0.5) {
        const sectorMs = now - (laps.sectorStartedAt ?? laps.startedAt)
        laps.sectors[i] = sectorMs
        laps.sector = i + 1
        laps.sectorStartedAt = now
        split(i, now - laps.startedAt, now)
      }
    }
  }
  if (Math.abs(fix.lateral) > LINE_REACH) return
  if (previous > 0.9 && progress < 0.1) {
    if (laps.startedAt !== null && laps.passedHalf) completeLap(now)
    laps.lap += 1
    clearLap()
    laps.startedAt = now
    laps.sectorStartedAt = now
    laps.lastSampleAt = 0
    sampleTrace(now)
  } else if (previous < 0.1 && progress > 0.9) {
    laps.lap = Math.max(0, laps.lap - 1)
    clearLap()
  }
}
