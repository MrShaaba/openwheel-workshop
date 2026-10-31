import type { Vector3 } from 'three'

/**
 * Tiny pub/sub for one-shot scene effects (lock-in flash, denied pulse) so that
 * interaction components can trigger them without threading props through the tree.
 */
type FlashListener = (position: Vector3) => void
type DeniedListener = () => void

const flashListeners = new Set<FlashListener>()
const deniedListeners = new Set<DeniedListener>()

export function onFlash(listener: FlashListener): () => void {
  flashListeners.add(listener)
  return () => flashListeners.delete(listener)
}

export function emitFlash(position: Vector3): void {
  flashListeners.forEach((listener) => listener(position))
}

export function onDenied(listener: DeniedListener): () => void {
  deniedListeners.add(listener)
  return () => deniedListeners.delete(listener)
}

export function emitDenied(): void {
  deniedListeners.forEach((listener) => listener())
}


/** 0..1 glow level the completion sequence pushes into the platform materials each frame. */
export const completionGlow = { value: 0 }
