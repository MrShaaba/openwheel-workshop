import type { BufferGeometry } from 'three'

export type StageId = 'core' | 'power-unit' | 'running-gear' | 'aero' | 'controls'

export const PART_IDS = [
  'monocoque',
  'cockpit-seat',
  'halo',
  'roll-hoop',
  'nose-cone',
  'engine',
  'turbocharger',
  'mgu-k',
  'energy-store',
  'gearbox',
  'exhaust',
  'front-suspension',
  'rear-suspension',
  'front-uprights',
  'rear-uprights',
  'front-brakes',
  'rear-brakes',
  'wheel-fl',
  'wheel-fr',
  'wheel-rl',
  'wheel-rr',
  'floor',
  'diffuser',
  'sidepods',
  'engine-cover',
  'front-wing',
  'rear-wing',
  'bargeboards',
  'steering-wheel',
  'mirrors',
  'rain-light',
] as const

export type PartId = (typeof PART_IDS)[number]

/** Tuple in metres (x right-to-left, y up, z towards the nose). */
export type Vec3 = readonly [number, number, number]

export interface Transform {
  /** Where the part's local origin sits in car space. */
  position: Vec3
  /** Euler rotation in radians. */
  rotation?: Vec3
}

/** Surface finish of a geometry piece. Maps to a PBR material preset. */
export type Finish = 'carbon' | 'paint' | 'metal' | 'darkmetal' | 'rubber' | 'glass' | 'emissive'

export interface PartPiece {
  geometry: BufferGeometry
  finish: Finish
}

/** Builds a part's geometry around its own local origin. Called once and memoised. */
export type GeometryFactory = () => PartPiece[]

/** Where a part's mesh comes from. GLB loading is a roadmap item; the shape is fixed now. */
export type PartSource = { kind: 'procedural' } | { kind: 'glb'; url: string; scale?: number }

export interface PartDefinition {
  id: PartId
  name: string
  /** Short label for HUD chips, 6 characters or fewer. */
  code: string
  stage: StageId
  dependencies: readonly PartId[]
  transform: Transform
  /** Direction and distance the part moves in Exploded View (roadmap). */
  explodeVector: Vec3
  source: PartSource
}

export interface StageDefinition {
  id: StageId
  index: number
  name: string
  code: string
}

export interface InfoCard {
  title: string
  role: string
  facts: readonly [string, string]
  connects: string
}
