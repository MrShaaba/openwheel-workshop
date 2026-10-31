import { Vector3 } from 'three'
import { TAU } from '../lib/math'
import type { PartId } from '../parts/types'

export const RING_RADIUS = 4.4
export const RING_Y = 1.3
/** Radians per second the whole inventory ring drifts around the platform. */
export const RING_SPIN = 0.045

const scratch = new Vector3()

/** Where the `index`-th of `count` remaining parts floats at `time`, in platform space. */
export function ringSlot(
  index: number,
  count: number,
  time: number,
  seed: number,
  out: Vector3 = scratch,
): Vector3 {
  const angle = (index / Math.max(count, 1)) * TAU + time * RING_SPIN + 0.6
  out.set(
    Math.cos(angle) * RING_RADIUS,
    RING_Y + Math.sin(time * 1.1 + seed * TAU) * 0.07,
    Math.sin(angle) * RING_RADIUS,
  )
  return out
}

/** Live positions of floating parts, shared with the guide beam. */
export const floatingPositions = new Map<PartId, Vector3>()

/** Stable 0..1 value from a string, used to de-synchronise bobbing. */
export function hashString(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return ((hash >>> 0) % 10007) / 10007
}
