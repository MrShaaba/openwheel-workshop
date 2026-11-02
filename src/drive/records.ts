/**
 * Time-trial records, saved in the browser under their own key and kept per circuit: the best lap
 * with its trace (for the ghost), the best time through each sector, and a local leaderboard of
 * the ten quickest laps.
 */
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createSafeStorage } from '../state/persistence'
import { TYRE_COMPOUNDS, type TyreCompound } from '../state/setup'
import { useWorkshop } from '../state/store'
import { CIRCUIT_IDS, isCircuitId, type CircuitId } from './track'

export const RECORDS_KEY = 'open-wheel-workshop:timetrial'
export const LEADERBOARD_SIZE = 10
export const MAX_TAG_LENGTH = 12
export const DEFAULT_TAG = 'YOU'
/** A lap under this many milliseconds earns the Hot lap badge. */
export const HOT_LAP_MS: Record<CircuitId, number> = { flat: 30000, ridge: 42000 }

export type SectorTimes = [number, number, number]

export interface LapRecord {
  ms: number
  sectors: SectorTimes
  tag: string
  compound: TyreCompound
  /** Front and rear wing steps. */
  wings: [number, number]
  /** Epoch milliseconds. */
  at: number
}

export interface BestLap extends LapRecord {
  /** Samples of [ms, x, z, heading, steer] flattened, from the start line, for the ghost. */
  trace: number[]
}

export interface CircuitRecords {
  bestLap: BestLap | null
  bestSectors: [number | null, number | null, number | null]
  leaderboard: LapRecord[]
}

export interface LapSubmission {
  /** 1-based leaderboard position, or null when it did not make the table. */
  position: number | null
  newBest: boolean
  /** Which sectors were the quickest ever. */
  purple: [boolean, boolean, boolean]
}

interface RecordsState {
  circuits: Record<CircuitId, CircuitRecords>
  driverTag: string
  submitLap: (
    circuit: CircuitId,
    lap: Omit<LapRecord, 'tag' | 'at'>,
    trace: number[],
  ) => LapSubmission
  setDriverTag: (tag: string) => void
  clear: (circuit: CircuitId) => void
}

interface PersistedRecords {
  circuits: Record<CircuitId, CircuitRecords>
  driverTag: string
}

const emptyRecords = (): CircuitRecords => ({
  bestLap: null,
  bestSectors: [null, null, null],
  leaderboard: [],
})

const isMs = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 36e5
const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}

export function sanitizeTag(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_TAG
  const cleaned = value
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .trim()
    .slice(0, MAX_TAG_LENGTH)
  return cleaned || DEFAULT_TAG
}

function sanitizeLap(value: unknown): LapRecord | null {
  const raw = asRecord(value)
  const sectors = Array.isArray(raw.sectors) ? raw.sectors : []
  const wings = Array.isArray(raw.wings) ? raw.wings : []
  if (!isMs(raw.ms) || sectors.length !== 3 || !sectors.every(isMs)) return null
  return {
    ms: raw.ms,
    sectors: [sectors[0], sectors[1], sectors[2]] as SectorTimes,
    tag: sanitizeTag(raw.tag),
    compound: (TYRE_COMPOUNDS as readonly string[]).includes(raw.compound as string)
      ? (raw.compound as TyreCompound)
      : 'medium',
    wings: [
      typeof wings[0] === 'number' ? Math.round(wings[0]) : 5,
      typeof wings[1] === 'number' ? Math.round(wings[1]) : 5,
    ],
    at: typeof raw.at === 'number' && Number.isFinite(raw.at) ? raw.at : 0,
  }
}

function sanitizeCircuitRecords(value: unknown): CircuitRecords {
  const raw = asRecord(value)
  const bestRaw = asRecord(raw.bestLap)
  const bestLap = sanitizeLap(raw.bestLap)
  const trace = Array.isArray(bestRaw.trace)
    ? bestRaw.trace.filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
    : []
  const sectorsRaw = Array.isArray(raw.bestSectors) ? raw.bestSectors : []
  const leaderboard = Array.isArray(raw.leaderboard)
    ? raw.leaderboard
        .map(sanitizeLap)
        .filter((lap): lap is LapRecord => lap !== null)
        .sort((a, b) => a.ms - b.ms)
        .slice(0, LEADERBOARD_SIZE)
    : []
  return {
    bestLap: bestLap && trace.length >= 10 && trace.length % 5 === 0 ? { ...bestLap, trace } : null,
    bestSectors: [0, 1, 2].map((i) => (isMs(sectorsRaw[i]) ? sectorsRaw[i] : null)) as [
      number | null,
      number | null,
      number | null,
    ],
    leaderboard,
  }
}

/** Reads either shape: version 2 keyed by circuit, or version 1 which only knew the flat circuit. */
function sanitizeRecords(value: unknown): PersistedRecords {
  const raw = asRecord(value)
  const circuits = {} as Record<CircuitId, CircuitRecords>
  const byCircuit = asRecord(raw.circuits)
  for (const id of CIRCUIT_IDS) {
    circuits[id] =
      id in byCircuit
        ? sanitizeCircuitRecords(byCircuit[id])
        : id === 'flat' && 'leaderboard' in raw
          ? sanitizeCircuitRecords(raw)
          : emptyRecords()
  }
  return { circuits, driverTag: sanitizeTag(raw.driverTag) }
}

export const useRecords = create<RecordsState>()(
  persist(
    (set, get) => ({
      circuits: { flat: emptyRecords(), ridge: emptyRecords() },
      driverTag: DEFAULT_TAG,

      submitLap: (circuit, lap, trace) => {
        const state = get()
        const records = state.circuits[circuit]
        const record: LapRecord = { ...lap, tag: state.driverTag, at: Date.now() }
        const newBest = records.bestLap === null || lap.ms < records.bestLap.ms
        const purple = lap.sectors.map(
          (ms, i) => records.bestSectors[i] === null || ms < (records.bestSectors[i] as number),
        ) as [boolean, boolean, boolean]
        const leaderboard = [...records.leaderboard, record]
          .sort((a, b) => a.ms - b.ms)
          .slice(0, LEADERBOARD_SIZE)
        const index = leaderboard.indexOf(record)
        set({
          circuits: {
            ...state.circuits,
            [circuit]: {
              leaderboard,
              bestLap: newBest ? { ...record, trace } : records.bestLap,
              bestSectors: lap.sectors.map((ms, i) =>
                purple[i] ? ms : records.bestSectors[i],
              ) as CircuitRecords['bestSectors'],
            },
          },
        })
        if (lap.ms < HOT_LAP_MS[circuit]) useWorkshop.getState().awardBadge('hot-lap')
        return { position: index >= 0 ? index + 1 : null, newBest, purple }
      },

      setDriverTag: (tag) => set({ driverTag: sanitizeTag(tag) }),

      clear: (circuit) =>
        set((state) => ({ circuits: { ...state.circuits, [circuit]: emptyRecords() } })),
    }),
    {
      name: RECORDS_KEY,
      version: 2,
      storage: createJSONStorage<PersistedRecords>(() => createSafeStorage()),
      partialize: (state) => ({ circuits: state.circuits, driverTag: state.driverTag }),
      migrate: (persisted) => sanitizeRecords(persisted),
      merge: (persisted, current) => ({ ...current, ...sanitizeRecords(persisted) }),
    },
  ),
)

/** Records of the circuit the store has selected. */
export function useCircuitRecords(): CircuitRecords {
  const circuit = useWorkshop((state) => state.circuit)
  return useRecords((state) => state.circuits[circuit])
}

export { isCircuitId }

/** Values per trace sample: ms, x, z, heading, steer. */
export const TRACE_STRIDE = 5

export interface TracePose {
  x: number
  z: number
  heading: number
  steer: number
}

/** Where the ghost was `ms` after the line, interpolated between samples. Clamps to the ends. */
export function traceAt(trace: readonly number[], ms: number, out: TracePose): TracePose {
  const count = trace.length / TRACE_STRIDE
  if (count === 0) return out
  let lo = 0
  let hi = count - 1
  if (ms <= trace[0]) hi = 0
  else if (ms >= trace[(count - 1) * TRACE_STRIDE]) lo = count - 1
  else {
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (trace[mid * TRACE_STRIDE] <= ms) lo = mid
      else hi = mid
    }
  }
  const a = lo * TRACE_STRIDE
  const b = hi * TRACE_STRIDE
  const span = trace[b] - trace[a]
  const t = span > 0 ? (ms - trace[a]) / span : 0
  out.x = trace[a + 1] + (trace[b + 1] - trace[a + 1]) * t
  out.z = trace[a + 2] + (trace[b + 2] - trace[a + 2]) * t
  let dh = trace[b + 3] - trace[a + 3]
  if (dh > Math.PI) dh -= Math.PI * 2
  else if (dh < -Math.PI) dh += Math.PI * 2
  out.heading = trace[a + 3] + dh * t
  out.steer = trace[a + 4] + (trace[b + 4] - trace[a + 4]) * t
  return out
}

/** Relative date for the leaderboard. */
export function describeWhen(at: number, now = Date.now()): string {
  if (!at) return ''
  const minutes = Math.round((now - at) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}
