import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { CircuitId } from './circuitId'
import { TEST_DRIVE_ENABLED } from '../lib/flags'
import {
  checkInstall,
  dependentsOf,
  remainingIds,
  type BuildMode,
  type InstallCheck,
} from '../parts/graph'
import { PART_BY_ID, PART_COUNT, PARTS } from '../parts/registry'
import { useTour } from '../tour/tourState'
import type { PartId } from '../parts/types'
import { DEFAULT_LIVERY, type Livery } from './livery'
import { BADGES, type BadgeId } from './badges'
import { DEFAULT_SETUP, type CarSetup } from './setup'
import { MAX_SHEETS, newSheetId, sameSetup, sanitizeSheetName, type SetupSheet } from './sheets'
import {
  createSafeStorage,
  pickPersisted,
  sanitizePersisted,
  SCHEMA_VERSION,
  STORAGE_KEY,
  type PersistedState,
} from './persistence'

export type { BuildMode } from '../parts/graph'
export { DEFAULT_LIVERY, type Livery, type LiveryPattern } from './livery'
export type { CarSetup, TyreCompound } from './setup'
export type { SetupSheet } from './sheets'
export type { BadgeId } from './badges'

/** The Race engineer panel's tabs. */
export type EngineerView = 'setup' | 'pitstop' | 'quiz' | 'timetrial'

/** Named camera poses. The first six sit on the HUD and keys 1 to 6; `exploded` backs Exploded View. */
export type CameraPreset = 'front' | 'side' | 'top' | 'rear' | 'cockpit' | 'hero' | 'exploded'

export const CAMERA_PRESETS: readonly CameraPreset[] = [
  'front',
  'side',
  'top',
  'rear',
  'cockpit',
  'hero',
]

export type CameraRequest =
  | { kind: 'preset'; preset: CameraPreset; nonce: number }
  | { kind: 'focus'; part: PartId; nonce: number }
  | { kind: 'sweep'; nonce: number }

export type ToastTone = 'info' | 'denied' | 'success'

export interface Toast {
  text: string
  tone: ToastTone
  nonce: number
}

/** Outcome of an install request: the dependency-graph reasons plus two session-level blocks. */
export type InstallResult =
  | InstallCheck
  | {
      ok: false
      reason: 'exploded' | 'assembling'
      missing: readonly PartId[]
      expected: PartId | null
    }

export interface WorkshopState extends PersistedState {
  // Session only
  ready: boolean
  /** True once the saved build has been read back from storage (or storage was empty or broken). */
  hydrated: boolean
  installing: PartId | null
  inspecting: PartId | null
  hovered: PartId | null
  dragging: PartId | null
  exploded: boolean
  assembling: boolean
  cameraRequest: CameraRequest | null
  toast: Toast | null
  /** Bumped when the last part locks in; drives the completion sequence. Never restored from storage. */
  celebration: number | null
  /** The paint shop panel. Only meaningful while the car is complete. */
  liveryOpen: boolean
  /** Test-drive mode (behind VITE_ENABLE_TEST_DRIVE): the user has asked to drive or to come back. */
  driving: boolean
  /**
   * Whether the track scene is the one mounted. Follows `driving` once the fade to black has
   * covered the screen, so the scene swap and the camera jump are never visible.
   */
  trackScene: boolean
  /** Which Race engineer tab is open, or null for none. Opening one pauses the car on the track. */
  engineer: EngineerView | null
  /** Photo mode: free camera, depth of field, PNG download. Pauses the car on the track. */
  photoMode: boolean
  /** Name of the connected gamepad, once the browser has reported one. */
  gamepad: string | null
  /** The narrated build tour is running (its player holds the chapter). */
  touring: boolean

  // Actions
  setReady: () => void
  setHydrated: () => void
  /** User-initiated install: honours the build mode plus the Exploded View and Assemble All blocks. */
  attemptInstall: (id: PartId) => InstallResult
  /** Install driven by the Assemble All director; bypasses the session blocks, not the graph. */
  queueInstall: (id: PartId) => InstallCheck
  commitInstall: (id: PartId) => void
  cancelInstall: () => void
  detach: (id: PartId) => void
  setMode: (mode: BuildMode) => void
  inspect: (id: PartId | null) => void
  hover: (id: PartId | null) => void
  setDragging: (id: PartId | null) => void
  toggleExploded: () => void
  startAssembly: () => void
  stopAssembly: () => void
  /** Installs everything that is left in one step. */
  finishAssembly: () => void
  requestCamera: (preset: CameraPreset) => void
  focusPart: (id: PartId) => void
  toggleMute: () => void
  notify: (text: string, tone?: ToastTone) => void
  dismissToast: () => void
  setLivery: (livery: Partial<Livery>) => void
  resetLivery: () => void
  /** Opens or closes the paint shop; refused with a toast until the car is complete. */
  toggleLivery: () => void
  closeLivery: () => void
  /** Leaves the workshop for the track; refused with a toast until the car is complete. */
  startDrive: () => void
  stopDrive: () => void
  setTrackScene: (mounted: boolean) => void
  /** Car setup for the test drive. Changing the compound fits new tyres on the track. */
  setSetup: (setup: Partial<CarSetup>) => void
  resetSetup: () => void
  /** Saves the current setup under a name for the current circuit; a same-named sheet is replaced. */
  saveSheet: (name: string) => SetupSheet | null
  loadSheet: (id: string) => void
  renameSheet: (id: string, name: string) => void
  deleteSheet: (id: string) => void
  /** Adds sheets from a file, skipping ones already present, up to the limit. Returns how many landed. */
  importSheets: (sheets: SetupSheet[]) => number
  /** A clean lap with the current setup: every sheet that matches it keeps its quickest time. */
  recordSheetLap: (circuit: CircuitId, setup: CarSetup, ms: number) => void
  openEngineer: (view: EngineerView) => void
  closeEngineer: () => void
  /** `G`: opens the last tab, or closes the panel. */
  toggleEngineer: () => void
  setGamepad: (name: string | null) => void
  /** Starts the guided tour in the workshop; refused with a toast while the car is assembling. */
  startTour: () => void
  stopTour: () => void
  /**
   * The tour reached a part: everything before it in build order is placed at once (no wipe) and the
   * part itself flies in, so the car on screen always matches the chapter.
   */
  tourInstall: (part: PartId) => void
  /** Picks the circuit for the test drive; on the track the car goes back to the new grid. */
  setCircuit: (circuit: CircuitId) => void
  /** `P`: photo mode on or off; refused with a toast while the platform is empty. */
  togglePhoto: () => void
  closePhoto: () => void
  /** A finished pit-stop challenge: keeps the best time and hands out the badge. */
  recordPitStop: (ms: number, mistakes: number) => void
  /** A finished quiz round: keeps the best score and hands out the badge for a perfect one. */
  recordQuiz: (score: number, total: number) => void
  /** Adds a badge once, with a toast. */
  awardBadge: (badge: BadgeId) => void
  reset: () => void
}

let nonce = 0
const nextNonce = (): number => ++nonce

/** The tab `G` reopens: the last one used this session. */
let lastEngineerView: EngineerView = 'setup'

/** State changes shared by every way of finishing the car. */
const completion = () => ({
  celebration: nextNonce(),
  cameraRequest: { kind: 'sweep' as const, nonce: nextNonce() },
})

const makeToast = (text: string, tone: ToastTone): Toast => ({ text, tone, nonce: nextNonce() })

function describeDenial(check: Exclude<InstallResult, { ok: true }>): string {
  switch (check.reason) {
    case 'installed':
      return 'Already installed'
    case 'busy':
      return 'Wait for the current part to lock in'
    case 'dependencies':
      return `Requires ${check.missing.map((id) => PART_BY_ID[id].name).join(', ')}`
    case 'order':
      return check.expected
        ? `Guided build: install ${PART_BY_ID[check.expected].name} first`
        : 'Nothing left to install'
    case 'exploded':
      return 'Collapse the exploded view first'
    case 'assembling':
      return 'Assembly in progress'
  }
}

export const useWorkshop = create<WorkshopState>()(
  persist(
    (set, get) => ({
      installed: [],
      mode: 'guided',
      muted: false,
      livery: DEFAULT_LIVERY,
      setup: DEFAULT_SETUP,
      pitBestMs: null,
      quizBest: null,
      badges: [],
      circuit: 'flat',
      setupSheets: [],

      ready: false,
      hydrated: false,
      installing: null,
      inspecting: null,
      hovered: null,
      dragging: null,
      exploded: false,
      assembling: false,
      cameraRequest: null,
      toast: null,
      celebration: null,
      liveryOpen: false,
      driving: false,
      trackScene: false,
      engineer: null,
      photoMode: false,
      gamepad: null,
      touring: false,

      setReady: () => set({ ready: true }),

      setHydrated: () => set({ hydrated: true }),

      attemptInstall: (id) => {
        const state = get()
        const blocked = state.exploded ? 'exploded' : state.assembling ? 'assembling' : null
        const check: InstallResult = blocked
          ? { ok: false, reason: blocked, missing: [], expected: null }
          : checkInstall(id, state.installed, state.mode, state.installing)
        if (check.ok) {
          set({ installing: id, inspecting: null, hovered: null })
        } else if (check.reason !== 'busy') {
          set({ toast: makeToast(describeDenial(check), 'denied') })
        }
        return check
      },

      queueInstall: (id) => {
        const state = get()
        const check = checkInstall(id, state.installed, state.mode, state.installing)
        if (check.ok) set({ installing: id, inspecting: null, hovered: null })
        return check
      },

      commitInstall: (id) =>
        set((state) => {
          if (state.installing !== id) return {}
          if (state.installed.includes(id)) return { installing: null }
          const installed = [...state.installed, id]
          return {
            installing: null,
            installed,
            ...(installed.length === PART_COUNT ? completion() : {}),
          }
        }),

      cancelInstall: () => set({ installing: null }),

      detach: (id) =>
        set((state) => {
          const remove = new Set<PartId>([id, ...dependentsOf(id, state.installed)])
          return {
            installed: state.installed.filter((part) => !remove.has(part)),
            inspecting: null,
            hovered: null,
            liveryOpen: false,
          }
        }),

      setMode: (mode) => set({ mode }),

      inspect: (id) =>
        set((state) =>
          state.inspecting === id || (id && (state.exploded || state.assembling))
            ? {}
            : // The info card and the paint shop share the right-hand column.
              { inspecting: id, ...(id ? { liveryOpen: false } : {}) },
        ),

      hover: (id) => set((state) => (state.hovered === id ? {} : { hovered: id })),

      setDragging: (id) => set((state) => (state.dragging === id ? {} : { dragging: id })),

      toggleExploded: () => {
        const state = get()
        if (state.driving) return
        if (state.exploded) {
          set({ exploded: false })
          return
        }
        if (state.installing || state.assembling) {
          set({
            toast: makeToast(
              state.assembling ? 'Assembly in progress' : 'Wait for the current part to lock in',
              'denied',
            ),
          })
          return
        }
        if (state.installed.length === 0) {
          set({ toast: makeToast('Install a part first', 'denied') })
          return
        }
        set({
          exploded: true,
          inspecting: null,
          hovered: null,
          touring: false,
          cameraRequest: { kind: 'preset', preset: 'exploded', nonce: nextNonce() },
        })
      },

      startAssembly: () => {
        const state = get()
        if (state.assembling) return
        if (state.installed.length === PART_COUNT) {
          set({ toast: makeToast('Assembly already complete', 'info') })
          return
        }
        if (state.exploded) {
          set({ toast: makeToast('Collapse the exploded view first', 'denied') })
          return
        }
        if (state.installing) {
          set({ toast: makeToast('Wait for the current part to lock in', 'denied') })
          return
        }
        set({ assembling: true, inspecting: null, hovered: null, touring: false })
      },

      stopAssembly: () => set((state) => (state.assembling ? { assembling: false } : {})),

      finishAssembly: () =>
        set((state) => ({
          installed: [...state.installed, ...remainingIds(state.installed)],
          installing: null,
          assembling: false,
          inspecting: null,
          hovered: null,
          ...completion(),
        })),

      requestCamera: (preset) =>
        set({ cameraRequest: { kind: 'preset', preset, nonce: nextNonce() } }),

      focusPart: (part) => set({ cameraRequest: { kind: 'focus', part, nonce: nextNonce() } }),

      toggleMute: () => set((state) => ({ muted: !state.muted })),

      notify: (text, tone = 'info') => set({ toast: makeToast(text, tone) }),

      dismissToast: () => set({ toast: null }),

      setLivery: (livery) => set((state) => ({ livery: { ...state.livery, ...livery } })),

      resetLivery: () => set({ livery: DEFAULT_LIVERY }),

      toggleLivery: () => {
        const state = get()
        if (state.driving) return
        if (state.liveryOpen) {
          set({ liveryOpen: false })
          return
        }
        if (state.installed.length < PART_COUNT) {
          set({ toast: makeToast('Complete the car to unlock the paint shop', 'denied') })
          return
        }
        set({
          liveryOpen: true,
          inspecting: null,
          hovered: null,
          engineer: null,
          // The hero angle shows the nose, a sidepod and the fin: every surface the livery paints.
          ...(state.exploded
            ? {}
            : {
                cameraRequest: {
                  kind: 'preset' as const,
                  preset: 'hero' as const,
                  nonce: nextNonce(),
                },
              }),
        })
      },

      closeLivery: () => set((state) => (state.liveryOpen ? { liveryOpen: false } : {})),

      startDrive: () => {
        if (!TEST_DRIVE_ENABLED) return
        const state = get()
        if (state.driving) return
        if (state.installed.length < PART_COUNT) {
          set({ toast: makeToast('Complete the car to unlock the test drive', 'denied') })
          return
        }
        if (state.exploded) {
          set({ toast: makeToast('Collapse the exploded view first', 'denied') })
          return
        }
        set({
          driving: true,
          inspecting: null,
          hovered: null,
          dragging: null,
          liveryOpen: false,
          engineer: null,
          photoMode: false,
          touring: false,
          toast: null,
        })
      },

      stopDrive: () =>
        set((state) =>
          state.driving
            ? {
                driving: false,
                engineer: null,
                photoMode: false,
                // The chase camera leaves the camera near the car; the rig flies it back to hero.
                cameraRequest: { kind: 'preset', preset: 'hero', nonce: nextNonce() },
              }
            : {},
        ),

      setTrackScene: (mounted) =>
        set((state) => (state.trackScene === mounted ? {} : { trackScene: mounted })),

      setSetup: (setup) => set((state) => ({ setup: { ...state.setup, ...setup } })),

      resetSetup: () => set({ setup: DEFAULT_SETUP }),

      saveSheet: (rawName) => {
        const state = get()
        const name = sanitizeSheetName(rawName, `Setup ${state.setupSheets.length + 1}`)
        const existing = state.setupSheets.find(
          (sheet) => sheet.circuit === state.circuit && sheet.name === name,
        )
        const sheet: SetupSheet = {
          id: existing?.id ?? newSheetId(),
          name,
          circuit: state.circuit,
          setup: state.setup,
          savedAt: Date.now(),
          bestMs: existing && sameSetup(existing.setup, state.setup) ? existing.bestMs : null,
        }
        const others = state.setupSheets.filter((entry) => entry.id !== sheet.id)
        if (!existing && others.length >= MAX_SHEETS) {
          set({
            toast: makeToast(`Only ${MAX_SHEETS} sheets can be kept. Delete one first.`, 'denied'),
          })
          return null
        }
        set({
          setupSheets: [...others, sheet],
          toast: makeToast(
            existing ? `Sheet "${name}" updated` : `Sheet "${name}" saved`,
            'success',
          ),
        })
        return sheet
      },

      loadSheet: (id) => {
        const sheet = get().setupSheets.find((entry) => entry.id === id)
        if (!sheet) return
        set({ setup: sheet.setup, toast: makeToast(`Setup "${sheet.name}" loaded`, 'info') })
      },

      renameSheet: (id, rawName) =>
        set((state) => ({
          setupSheets: state.setupSheets.map((sheet) =>
            sheet.id === id ? { ...sheet, name: sanitizeSheetName(rawName, sheet.name) } : sheet,
          ),
        })),

      deleteSheet: (id) =>
        set((state) => ({ setupSheets: state.setupSheets.filter((sheet) => sheet.id !== id) })),

      importSheets: (incoming) => {
        const state = get()
        const kept = [...state.setupSheets]
        let added = 0
        for (const sheet of incoming) {
          if (kept.length >= MAX_SHEETS) break
          const duplicate = kept.some(
            (entry) =>
              entry.id === sheet.id ||
              (entry.circuit === sheet.circuit &&
                entry.name === sheet.name &&
                sameSetup(entry.setup, sheet.setup)),
          )
          if (duplicate) continue
          kept.push(sheet)
          added += 1
        }
        if (added > 0) set({ setupSheets: kept })
        return added
      },

      recordSheetLap: (circuit, setup, ms) =>
        set((state) => {
          let changed = false
          const setupSheets = state.setupSheets.map((sheet) => {
            if (sheet.circuit !== circuit || !sameSetup(sheet.setup, setup)) return sheet
            if (sheet.bestMs !== null && sheet.bestMs <= ms) return sheet
            changed = true
            return { ...sheet, bestMs: ms }
          })
          return changed ? { setupSheets } : {}
        }),

      openEngineer: (view) => {
        lastEngineerView = view
        set((state) => ({
          engineer: view,
          photoMode: false,
          touring: false,
          // The panel takes the middle of the screen, so the side cards close.
          ...(state.driving ? {} : { inspecting: null, hovered: null, liveryOpen: false }),
        }))
      },

      closeEngineer: () => set((state) => (state.engineer === null ? {} : { engineer: null })),

      toggleEngineer: () => {
        const state = get()
        if (state.engineer !== null) {
          set({ engineer: null })
          return
        }
        state.openEngineer(lastEngineerView)
      },

      setGamepad: (name) =>
        set((state) =>
          state.gamepad === name
            ? {}
            : {
                gamepad: name,
                toast: makeToast(
                  name ? `Gamepad connected: ${name}` : 'Gamepad disconnected',
                  name ? 'success' : 'info',
                ),
              },
        ),

      setCircuit: (circuit) => set((state) => (state.circuit === circuit ? {} : { circuit })),

      startTour: () => {
        const state = get()
        if (state.touring || state.driving) return
        if (state.assembling) {
          set({ toast: makeToast('Assembly in progress', 'denied') })
          return
        }
        useTour.getState().setIndex(0)
        useTour.getState().setPlaying(true)
        set({
          touring: true,
          exploded: false,
          inspecting: null,
          hovered: null,
          dragging: null,
          liveryOpen: false,
          engineer: null,
          photoMode: false,
        })
      },

      stopTour: () => set((state) => (state.touring ? { touring: false } : {})),

      tourInstall: (part) => {
        const state = get()
        const order = PARTS.map((entry) => entry.id)
        const before = order
          .slice(0, order.indexOf(part))
          .filter((id) => !state.installed.includes(id))
        const installed = before.length ? [...state.installed, ...before] : state.installed
        // A part still in flight that the chapter has overtaken lands at once.
        const installing =
          state.installing && before.includes(state.installing) ? null : state.installing
        if (before.length || installing !== state.installing) set({ installed, installing })
        if (installed.includes(part) || installing) return
        const check = checkInstall(part, installed, 'free', null)
        if (check.ok) set({ installing: part, inspecting: null, hovered: null })
      },

      togglePhoto: () => {
        const state = get()
        if (state.photoMode) {
          set({ photoMode: false })
          return
        }
        if (!state.driving && state.installed.length === 0) {
          set({ toast: makeToast('Install a part first', 'denied') })
          return
        }
        if (state.installing || state.assembling) {
          set({ toast: makeToast('Wait for the assembly to finish', 'denied') })
          return
        }
        set({
          photoMode: true,
          engineer: null,
          inspecting: null,
          hovered: null,
          dragging: null,
          liveryOpen: false,
          touring: false,
        })
      },

      closePhoto: () => set((state) => (state.photoMode ? { photoMode: false } : {})),

      recordPitStop: (ms, mistakes) => {
        const state = get()
        const best = state.pitBestMs === null || ms < state.pitBestMs
        if (best) set({ pitBestMs: ms })
        if (ms <= 5000 && mistakes === 0) state.awardBadge('pit-crew')
      },

      recordQuiz: (score, total) => {
        const state = get()
        if (state.quizBest === null || score > state.quizBest) set({ quizBest: score })
        if (score === total && total > 0) state.awardBadge('race-engineer')
      },

      awardBadge: (badge) => {
        const state = get()
        if (state.badges.includes(badge)) return
        set({
          badges: [...state.badges, badge],
          toast: makeToast(`Badge unlocked: ${BADGES[badge].name}`, 'success'),
        })
      },

      reset: () =>
        set({
          installed: [],
          installing: null,
          inspecting: null,
          hovered: null,
          dragging: null,
          exploded: false,
          assembling: false,
          celebration: null,
          liveryOpen: false,
          driving: false,
          engineer: null,
          photoMode: false,
          touring: false,
          cameraRequest: { kind: 'preset', preset: 'hero', nonce: nextNonce() },
        }),
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage<PersistedState>(() => createSafeStorage()),
      partialize: (state) => pickPersisted(state),
      // Older or newer schema versions are salvaged field by field rather than thrown away.
      migrate: (persisted) => sanitizePersisted(persisted),
      merge: (persisted, current) => ({ ...current, ...sanitizePersisted(persisted) }),
      // Runs after hydration. Unreadable storage is dropped by the adapter, so this always fires.
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
)
