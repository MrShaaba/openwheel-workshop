import { Color, MeshPhysicalMaterial, MeshStandardMaterial, type Box3 } from 'three'
import type { Finish } from '../parts/types'
import { HologramMaterial } from '../shaders/hologram'
import { HOLO_COLOR } from './constants'

interface FinishPreset {
  color: string
  metalness: number
  roughness: number
  emissive?: string
  emissiveIntensity?: number
  opacity?: number
  clearcoat?: number
}

export const FINISHES: Record<Finish, FinishPreset> = {
  carbon: { color: '#15181d', metalness: 0.45, roughness: 0.42 },
  paint: { color: '#12306e', metalness: 0.35, roughness: 0.32, clearcoat: 0.9 },
  metal: { color: '#b4bbc4', metalness: 1, roughness: 0.3 },
  darkmetal: { color: '#474c55', metalness: 0.9, roughness: 0.45 },
  rubber: { color: '#0e0f11', metalness: 0, roughness: 0.95 },
  glass: { color: '#1b2a3a', metalness: 0.2, roughness: 0.08, opacity: 0.85 },
  emissive: {
    color: '#ff2a2a',
    metalness: 0,
    roughness: 0.4,
    emissive: '#ff2a2a',
    emissiveIntensity: 3,
  },
}

/**
 * Solid PBR material for a finish. Paint pieces get their colour from the shared livery masks once
 * `applyMaterialize` patches them; the preset colour only shows if that patch is skipped.
 */
export function createFinishMaterial(finish: Finish): MeshStandardMaterial {
  const preset = FINISHES[finish]
  const color = preset.color
  if (finish === 'paint' || finish === 'glass') {
    return new MeshPhysicalMaterial({
      color,
      metalness: preset.metalness,
      roughness: preset.roughness,
      clearcoat: preset.clearcoat ?? 0,
      clearcoatRoughness: 0.12,
      transparent: preset.opacity !== undefined,
      opacity: preset.opacity ?? 1,
      envMapIntensity: 1.3,
    })
  }
  const material = new MeshStandardMaterial({
    color,
    metalness: preset.metalness,
    roughness: preset.roughness,
    envMapIntensity: 1.3,
  })
  if (preset.emissive) {
    material.emissive = new Color(preset.emissive)
    material.emissiveIntensity = preset.emissiveIntensity ?? 1
  }
  return material
}

export interface HologramPair {
  /** Fresnel shell. */
  shell: HologramMaterial
  /** Wireframe overlay. */
  wire: HologramMaterial
}

/** Shell plus wireframe hologram for floating parts, ghost targets and the materialise pass. */
export function createHologramPair(bounds: Box3): HologramPair {
  return {
    shell: new HologramMaterial({ bounds, color: HOLO_COLOR, opacity: 0.6 }),
    wire: new HologramMaterial({ bounds, color: HOLO_COLOR, opacity: 0.5, wireframe: true }),
  }
}

export function disposeHologramPair(pair: HologramPair): void {
  pair.shell.dispose()
  pair.wire.dispose()
}
