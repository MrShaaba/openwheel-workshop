import type { RootState } from '@react-three/fiber'
import { useWorkshop } from './state/store'

declare global {
  interface Window {
    __workshop?: { store: typeof useWorkshop; r3f: RootState }
  }
}

/** Dev-only handle for driving the app from the browser console and automated checks. */
export function exposeDebugHandle(r3f: RootState): void {
  if (!import.meta.env.DEV) return
  window.__workshop = { store: useWorkshop, r3f }
}
