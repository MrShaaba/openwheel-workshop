import type { StateStorage } from 'zustand/middleware'
import { dependenciesMet, type BuildMode } from '../parts/graph'
import { PART_IDS, type PartId } from '../parts/types'
import { DEFAULT_LIVERY, LIVERY_PATTERNS, type Livery, type LiveryPattern } from './livery'
import { sanitizeBadges, type BadgeId } from './badges'
import { sanitizeSetup, type CarSetup } from './setup'

export const STORAGE_KEY = 'open-wheel-workshop:build'
/** Bump when the persisted shape changes in a way `sanitizePersisted` cannot absorb. */
export const SCHEMA_VERSION = 1

/** The slice of the store that survives a reload. */
export interface PersistedState {
  installed: PartId[]
  mode: BuildMode
  muted: boolean
  livery: Livery
  /** Test-drive car setup. Kept even when the drive flag is off, so it is there when it comes on. */
  setup: CarSetup
  /** Best pit-stop challenge time in milliseconds. */
  pitBestMs: number | null
  /** Best quiz score out of a round. */
  quizBest: number | null
  badges: BadgeId[]
}

/**
 * localStorage behind try/catch. Private windows, blocked third-party storage and full quotas
 * all throw; the in-memory copy keeps the current session consistent when they do. A value that
 * is not valid JSON is discarded here, so hydration always runs its normal path and can finish.
 */
export function createSafeStorage(): StateStorage {
  const memory = new Map<string, string>()
  const local = (): Storage | null => {
    try {
      return typeof window === 'undefined' ? null : window.localStorage
    } catch {
      return null
    }
  }
  const read = (name: string): string | null => {
    try {
      return local()?.getItem(name) ?? memory.get(name) ?? null
    } catch {
      return memory.get(name) ?? null
    }
  }
  const remove = (name: string): void => {
    memory.delete(name)
    try {
      local()?.removeItem(name)
    } catch {
      // Nothing to recover; the memory copy is already gone.
    }
  }
  return {
    getItem: (name) => {
      const raw = read(name)
      if (raw === null) return null
      try {
        JSON.parse(raw)
        return raw
      } catch {
        console.warn('Saved build could not be read; starting fresh.')
        remove(name)
        return null
      }
    },
    setItem: (name, value) => {
      memory.set(name, value)
      try {
        local()?.setItem(name, value)
      } catch {
        // Quota exceeded or storage blocked: the memory copy still serves this session.
      }
    },
    removeItem: remove,
  }
}

const PART_ID_SET: ReadonlySet<string> = new Set<string>(PART_IDS)
const isPartId = (value: unknown): value is PartId =>
  typeof value === 'string' && PART_ID_SET.has(value)
const isHexColour = (value: unknown): value is string =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
const isPattern = (value: unknown): value is LiveryPattern =>
  typeof value === 'string' && (LIVERY_PATTERNS as readonly string[]).includes(value)
const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}

/**
 * Keep valid, unique part ids in their saved order and drop any part whose dependencies are not
 * already kept, so a hand-edited or partially written list can never produce a floating wheel.
 */
export function sanitizeInstalled(value: unknown): PartId[] {
  if (!Array.isArray(value)) return []
  const kept: PartId[] = []
  for (const entry of value) {
    if (!isPartId(entry) || kept.includes(entry)) continue
    if (dependenciesMet(entry, kept)) kept.push(entry)
  }
  return kept
}

export function sanitizeLivery(value: unknown): Livery {
  const raw = asRecord(value)
  const number = raw.number
  return {
    primary: isHexColour(raw.primary) ? raw.primary : DEFAULT_LIVERY.primary,
    secondary: isHexColour(raw.secondary) ? raw.secondary : DEFAULT_LIVERY.secondary,
    accent: isHexColour(raw.accent) ? raw.accent : DEFAULT_LIVERY.accent,
    number:
      typeof number === 'number' && Number.isInteger(number) && number >= 1 && number <= 99
        ? number
        : DEFAULT_LIVERY.number,
    pattern: isPattern(raw.pattern) ? raw.pattern : DEFAULT_LIVERY.pattern,
  }
}

/** Validate whatever came out of storage, field by field, falling back to defaults. */
export function sanitizePersisted(value: unknown): PersistedState {
  const raw = asRecord(value)
  return {
    installed: sanitizeInstalled(raw.installed),
    mode: raw.mode === 'free' ? 'free' : 'guided',
    muted: raw.muted === true,
    livery: sanitizeLivery(raw.livery),
    setup: sanitizeSetup(raw.setup),
    pitBestMs:
      typeof raw.pitBestMs === 'number' && Number.isFinite(raw.pitBestMs) && raw.pitBestMs > 0
        ? raw.pitBestMs
        : null,
    quizBest:
      typeof raw.quizBest === 'number' && Number.isInteger(raw.quizBest) && raw.quizBest >= 0
        ? raw.quizBest
        : null,
    badges: sanitizeBadges(raw.badges),
  }
}

export function pickPersisted<T extends PersistedState>(state: T): PersistedState {
  return {
    installed: state.installed,
    mode: state.mode,
    muted: state.muted,
    livery: state.livery,
    setup: state.setup,
    pitBestMs: state.pitBestMs,
    quizBest: state.quizBest,
    badges: state.badges,
  }
}
