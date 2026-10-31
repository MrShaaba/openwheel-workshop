import type { Vector3 } from 'three'
import type { PartId } from '../parts/types'

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

/** Parts committed during this session; InstalledPart plays the materialise wipe for these only. */
export const freshInstalls = new Set<PartId>()
