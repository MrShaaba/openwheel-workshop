import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  checkInstall,
  dependentsOf,
  remainingIds,
  type BuildMode,
  type InstallCheck,
} from '../parts/graph'
import { PART_BY_ID, PART_COUNT } from '../parts/registry'
import type { PartId } from '../parts/types'
import { DEFAULT_LIVERY, type Livery } from './livery'
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
  reset: () => void
}

let nonce = 0
const nextNonce = (): number => ++nonce

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
        set({ assembling: true, inspecting: null, hovered: null })
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
