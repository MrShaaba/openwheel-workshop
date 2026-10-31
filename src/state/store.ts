import { create } from 'zustand'
import { checkInstall, dependentsOf, type BuildMode, type InstallCheck } from '../parts/graph'
import { PART_BY_ID } from '../parts/registry'
import type { PartId } from '../parts/types'

export type { BuildMode } from '../parts/graph'

export type CameraPreset = 'front' | 'side' | 'top' | 'rear' | 'cockpit' | 'hero'

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

export type LiveryPattern = 'solid' | 'stripe' | 'split' | 'fade'

export interface Livery {
  primary: string
  secondary: string
  accent: string
  number: number
  pattern: LiveryPattern
}

export const DEFAULT_LIVERY: Livery = {
  primary: '#12306e',
  secondary: '#e8edf2',
  accent: '#38e7ff',
  number: 1,
  pattern: 'solid',
}

export type ToastTone = 'info' | 'denied' | 'success'

export interface Toast {
  text: string
  tone: ToastTone
  nonce: number
}

export interface WorkshopState {
  // Persisted in a later phase
  installed: PartId[]
  mode: BuildMode
  muted: boolean
  livery: Livery

  // Session only
  ready: boolean
  installing: PartId | null
  inspecting: PartId | null
  hovered: PartId | null
  dragging: PartId | null
  exploded: boolean
  assembling: boolean
  cameraRequest: CameraRequest | null
  toast: Toast | null

  // Actions
  setReady: () => void
  attemptInstall: (id: PartId) => InstallCheck
  commitInstall: (id: PartId) => void
  cancelInstall: () => void
  detach: (id: PartId) => void
  setMode: (mode: BuildMode) => void
  inspect: (id: PartId | null) => void
  hover: (id: PartId | null) => void
  setDragging: (id: PartId | null) => void
  requestCamera: (preset: CameraPreset) => void
  focusPart: (id: PartId) => void
  toggleMute: () => void
  notify: (text: string, tone?: ToastTone) => void
  dismissToast: () => void
  setLivery: (livery: Partial<Livery>) => void
  reset: () => void
}

let nonce = 0
const nextNonce = (): number => ++nonce

function describeDenial(check: Exclude<InstallCheck, { ok: true }>): string {
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
  }
}

export const useWorkshop = create<WorkshopState>()((set, get) => ({
  installed: [],
  mode: 'guided',
  muted: false,
  livery: DEFAULT_LIVERY,

  ready: false,
  installing: null,
  inspecting: null,
  hovered: null,
  dragging: null,
  exploded: false,
  assembling: false,
  cameraRequest: null,
  toast: null,

  setReady: () => set({ ready: true }),

  attemptInstall: (id) => {
    const state = get()
    const check = checkInstall(id, state.installed, state.mode, state.installing)
    if (check.ok) {
      set({ installing: id, inspecting: null, hovered: null })
    } else if (check.reason !== 'busy') {
      set({ toast: { text: describeDenial(check), tone: 'denied', nonce: nextNonce() } })
    }
    return check
  },

  commitInstall: (id) =>
    set((state) => {
      if (state.installing !== id) return {}
      if (state.installed.includes(id)) return { installing: null }
      return { installing: null, installed: [...state.installed, id] }
    }),

  cancelInstall: () => set({ installing: null }),

  detach: (id) =>
    set((state) => {
      const remove = new Set<PartId>([id, ...dependentsOf(id, state.installed)])
      return {
        installed: state.installed.filter((part) => !remove.has(part)),
        inspecting: null,
        hovered: null,
      }
    }),

  setMode: (mode) => set({ mode }),

  inspect: (id) => set((state) => (state.inspecting === id ? {} : { inspecting: id })),

  hover: (id) => set((state) => (state.hovered === id ? {} : { hovered: id })),

  setDragging: (id) => set((state) => (state.dragging === id ? {} : { dragging: id })),

  requestCamera: (preset) => set({ cameraRequest: { kind: 'preset', preset, nonce: nextNonce() } }),

  focusPart: (part) => set({ cameraRequest: { kind: 'focus', part, nonce: nextNonce() } }),

  toggleMute: () => set((state) => ({ muted: !state.muted })),

  notify: (text, tone = 'info') => set({ toast: { text, tone, nonce: nextNonce() } }),

  dismissToast: () => set({ toast: null }),

  setLivery: (livery) => set((state) => ({ livery: { ...state.livery, ...livery } })),

  reset: () =>
    set({
      installed: [],
      installing: null,
      inspecting: null,
      hovered: null,
      dragging: null,
      exploded: false,
      assembling: false,
    }),
}))
