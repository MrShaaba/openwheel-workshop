import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
} from 'three'
import type { Finish } from '../parts/types'
import type { Livery } from '../state/store'
import { HOLO_COLOR, HOLO_COLOR_SOFT } from './constants'

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

/** Solid PBR material for a finish. Paint takes its colour from the livery. */
export function createFinishMaterial(finish: Finish, livery: Livery): MeshStandardMaterial {
  const preset = FINISHES[finish]
  const color = finish === 'paint' ? livery.primary : preset.color
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

export interface HologramMaterials {
  wire: MeshBasicMaterial
  fill: MeshBasicMaterial
}

/** Wireframe-plus-fill hologram look for floating parts and ghost targets. */
export function createHologramMaterials(): HologramMaterials {
  return {
    wire: new MeshBasicMaterial({
      color: HOLO_COLOR,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      toneMapped: false,
    }),
    fill: new MeshBasicMaterial({
      color: HOLO_COLOR_SOFT,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      toneMapped: false,
    }),
  }
}

export function disposeHologramMaterials(materials: HologramMaterials): void {
  materials.wire.dispose()
  materials.fill.dispose()
}
