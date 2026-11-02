/**
 * Setup sheets: named car setups saved per circuit, with the best lap each one has set. Also the
 * short share code (`f7r8h2b6s`) that carries a setup through a link or a chat message, and the
 * JSON shape the sheets export to.
 */
import { isCircuitId, type CircuitId } from './circuitId'
import { sanitizeSetup, TYRE_COMPOUNDS, type CarSetup, type TyreCompound } from './setup'

export interface SetupSheet {
  id: string
  name: string
  circuit: CircuitId
  setup: CarSetup
  savedAt: number
  /** Quickest clean lap set with exactly this setup on this circuit. */
  bestMs: number | null
}

export const MAX_SHEETS = 12
export const MAX_SHEET_NAME = 24

export function sameSetup(a: CarSetup, b: CarSetup): boolean {
  return (
    a.frontWing === b.frontWing &&
    a.rearWing === b.rearWing &&
    a.tyre === b.tyre &&
    a.rideHeight === b.rideHeight &&
    a.brakeBias === b.brakeBias
  )
}

export function sanitizeSheetName(value: unknown, fallback = 'Setup'): string {
  if (typeof value !== 'string') return fallback
  const cleaned = value
    .replace(/[^\p{L}\p{N} _.-]/gu, '')
    .trim()
    .slice(0, MAX_SHEET_NAME)
  return cleaned || fallback
}

export function sanitizeSheets(value: unknown): SetupSheet[] {
  if (!Array.isArray(value)) return []
  const kept: SetupSheet[] = []
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue
    const raw = entry as Record<string, unknown>
    const id = typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 40) : null
    if (!id || kept.some((sheet) => sheet.id === id)) continue
    kept.push({
      id,
      name: sanitizeSheetName(raw.name),
      circuit: isCircuitId(raw.circuit) ? raw.circuit : 'flat',
      setup: sanitizeSetup(raw.setup),
      savedAt: typeof raw.savedAt === 'number' && Number.isFinite(raw.savedAt) ? raw.savedAt : 0,
      bestMs:
        typeof raw.bestMs === 'number' && Number.isFinite(raw.bestMs) && raw.bestMs > 0
          ? raw.bestMs
          : null,
    })
    if (kept.length === MAX_SHEETS) break
  }
  return kept
}

const TYRE_LETTER: Record<TyreCompound, string> = { soft: 's', medium: 'm', hard: 'h' }

/** `f7r8h2b6s`: front wing, rear wing, ride height, brake bias, tyre. */
export function encodeSetup(setup: CarSetup): string {
  return `f${setup.frontWing}r${setup.rearWing}h${setup.rideHeight}b${setup.brakeBias}${TYRE_LETTER[setup.tyre]}`
}

export function decodeSetup(code: string): CarSetup | null {
  const match = /^\s*f(\d{1,2})r(\d{1,2})h(\d{1,2})b(\d{1,2})([smh])\s*$/i.exec(code)
  if (!match) return null
  const tyre = TYRE_COMPOUNDS.find((compound) => TYRE_LETTER[compound] === match[5].toLowerCase())
  if (!tyre) return null
  return sanitizeSetup({
    frontWing: Number(match[1]),
    rearWing: Number(match[2]),
    rideHeight: Number(match[3]),
    brakeBias: Number(match[4]),
    tyre,
  })
}

/** The share link for a setup: this page with the code in the hash. */
export function setupLink(setup: CarSetup, base = window.location.href.split('#')[0]): string {
  return `${base}#setup=${encodeSetup(setup)}`
}

/** A setup carried in the page's hash, if any. */
export function setupFromHash(hash = window.location.hash): CarSetup | null {
  const match = /^#setup=([a-z0-9]+)$/i.exec(hash)
  return match ? decodeSetup(match[1]) : null
}

export interface SheetsFile {
  app: 'open-wheel-workshop'
  kind: 'setup-sheets'
  version: 1
  sheets: SetupSheet[]
}

export function sheetsToFile(sheets: SetupSheet[]): string {
  const file: SheetsFile = { app: 'open-wheel-workshop', kind: 'setup-sheets', version: 1, sheets }
  return JSON.stringify(file, null, 2)
}

/** Sheets from a JSON file, or null when the text is not a sheets file at all. */
export function sheetsFromFile(text: string): SetupSheet[] | null {
  try {
    const parsed: unknown = JSON.parse(text)
    if (typeof parsed !== 'object' || parsed === null) return null
    const raw = parsed as Record<string, unknown>
    const list = Array.isArray(raw.sheets) ? raw.sheets : Array.isArray(parsed) ? parsed : null
    return list ? sanitizeSheets(list) : null
  } catch {
    return null
  }
}

export function newSheetId(): string {
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
}
