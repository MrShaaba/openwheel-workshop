import type { PartDefinition, PartId, StageDefinition, StageId } from './types'

export const STAGES: readonly StageDefinition[] = [
  { id: 'core', index: 0, name: 'Core', code: 'S1' },
  { id: 'power-unit', index: 1, name: 'Power unit', code: 'S2' },
  { id: 'running-gear', index: 2, name: 'Running gear', code: 'S3' },
  { id: 'aero', index: 3, name: 'Aerodynamics', code: 'S4' },
  { id: 'controls', index: 4, name: 'Controls', code: 'S5' },
]

export const STAGE_BY_ID: Record<StageId, StageDefinition> = STAGES.reduce(
  (acc, stage) => {
    acc[stage.id] = stage
    return acc
  },
  {} as Record<StageId, StageDefinition>,
)

const procedural = { kind: 'procedural' } as const

/**
 * Single source of truth for part metadata, in canonical install order.
 * Guided Build walks this list top to bottom; Free Build only honours `dependencies`.
 * Positions are in car space: origin on the platform at the wheelbase midpoint,
 * +Z towards the nose, +Y up, metres. Wheelbase 3.4 m, front axle at z = 1.7.
 */
export const PARTS: readonly PartDefinition[] = [
  // Stage 1: core
  {
    id: 'monocoque',
    name: 'Survival cell',
    code: 'MONO',
    stage: 'core',
    dependencies: [],
    transform: { position: [0, 0.42, 0.6] },
    explodeVector: [0, 0.6, 0],
    source: procedural,
  },
  {
    id: 'cockpit-seat',
    name: 'Cockpit and seat',
    code: 'SEAT',
    stage: 'core',
    dependencies: ['monocoque'],
    transform: { position: [0, 0.52, 0.6] },
    explodeVector: [0, 1.1, 0],
    source: procedural,
  },
  {
    id: 'halo',
    name: 'Halo',
    code: 'HALO',
    stage: 'core',
    dependencies: ['monocoque'],
    transform: { position: [0, 0.9, 0.75] },
    explodeVector: [0, 1.4, 0],
    source: procedural,
  },
  {
    id: 'roll-hoop',
    name: 'Roll hoop and airbox',
    code: 'HOOP',
    stage: 'core',
    dependencies: ['monocoque'],
    transform: { position: [0, 0.95, -0.25] },
    explodeVector: [0, 1.2, -0.3],
    source: procedural,
  },
  {
    id: 'nose-cone',
    name: 'Nose cone and crash structure',
    code: 'NOSE',
    stage: 'core',
    dependencies: ['monocoque'],
    transform: { position: [0, 0.3, 2.25] },
    explodeVector: [0, 0.3, 1.4],
    source: procedural,
  },

  // Stage 2: power unit
  {
    id: 'engine',
    name: 'Internal combustion engine',
    code: 'ICE',
    stage: 'power-unit',
    dependencies: ['monocoque'],
    transform: { position: [0, 0.48, -0.75] },
    explodeVector: [0, 0.9, -0.2],
    source: procedural,
  },
  {
    id: 'turbocharger',
    name: 'Turbocharger',
    code: 'TURBO',
    stage: 'power-unit',
    dependencies: ['engine'],
    transform: { position: [0, 0.78, -1.1] },
    explodeVector: [0, 1.5, -0.4],
    source: procedural,
  },
  {
    id: 'mgu-k',
    name: 'MGU-K',
    code: 'MGU-K',
    stage: 'power-unit',
    dependencies: ['engine'],
    transform: { position: [0.3, 0.32, -0.55] },
    explodeVector: [1.2, 0.2, 0],
    source: procedural,
  },
  {
    id: 'energy-store',
    name: 'Energy store',
    code: 'ES',
    stage: 'power-unit',
    dependencies: ['monocoque'],
    transform: { position: [0, 0.3, -0.05] },
    explodeVector: [0, -0.1, 0],
    source: procedural,
  },
  {
    id: 'gearbox',
    name: 'Gearbox',
    code: 'GBX',
    stage: 'power-unit',
    dependencies: ['engine'],
    transform: { position: [0, 0.46, -1.7] },
    explodeVector: [0, 0.4, -1.3],
    source: procedural,
  },
  {
    id: 'exhaust',
    name: 'Exhaust',
    code: 'EXH',
    stage: 'power-unit',
    dependencies: ['turbocharger'],
    transform: { position: [0, 0.71, -1.7] },
    explodeVector: [0, 1.2, -1.0],
    source: procedural,
  },

  // Stage 3: running gear
  {
    id: 'front-suspension',
    name: 'Front suspension',
    code: 'F-SUS',
    stage: 'running-gear',
    dependencies: ['monocoque'],
    transform: { position: [0, 0.36, 1.72] },
    explodeVector: [0, 0.8, 0.6],
    source: procedural,
  },
  {
    id: 'rear-suspension',
    name: 'Rear suspension',
    code: 'R-SUS',
    stage: 'running-gear',
    dependencies: ['gearbox'],
    transform: { position: [0, 0.4, -1.7] },
    explodeVector: [0, 0.8, -0.6],
    source: procedural,
  },
  {
    id: 'front-uprights',
    name: 'Front uprights',
    code: 'F-UPR',
    stage: 'running-gear',
    dependencies: ['front-suspension'],
    transform: { position: [0, 0.36, 1.7] },
    explodeVector: [0, 0, 1.0],
    source: procedural,
  },
  {
    id: 'rear-uprights',
    name: 'Rear uprights',
    code: 'R-UPR',
    stage: 'running-gear',
    dependencies: ['rear-suspension'],
    transform: { position: [0, 0.36, -1.7] },
    explodeVector: [0, 0, -1.0],
    source: procedural,
  },
  {
    id: 'front-brakes',
    name: 'Front brakes',
    code: 'F-BRK',
    stage: 'running-gear',
    dependencies: ['front-uprights'],
    transform: { position: [0, 0.4, 1.7] },
    explodeVector: [0, 0.6, 1.2],
    source: procedural,
  },
  {
    id: 'rear-brakes',
    name: 'Rear brakes',
    code: 'R-BRK',
    stage: 'running-gear',
    dependencies: ['rear-uprights'],
    transform: { position: [0, 0.4, -1.7] },
    explodeVector: [0, 0.6, -1.2],
    source: procedural,
  },
  {
    id: 'wheel-fl',
    name: 'Front left wheel',
    code: 'W-FL',
    stage: 'running-gear',
    dependencies: ['front-brakes'],
    transform: { position: [0.8, 0.36, 1.7] },
    explodeVector: [1.6, 0, 0],
    source: procedural,
  },
  {
    id: 'wheel-fr',
    name: 'Front right wheel',
    code: 'W-FR',
    stage: 'running-gear',
    dependencies: ['front-brakes'],
    transform: { position: [-0.8, 0.36, 1.7] },
    explodeVector: [-1.6, 0, 0],
    source: procedural,
  },
  {
    id: 'wheel-rl',
    name: 'Rear left wheel',
    code: 'W-RL',
    stage: 'running-gear',
    dependencies: ['rear-brakes'],
    transform: { position: [0.78, 0.36, -1.7] },
    explodeVector: [1.6, 0, 0],
    source: procedural,
  },
  {
    id: 'wheel-rr',
    name: 'Rear right wheel',
    code: 'W-RR',
    stage: 'running-gear',
    dependencies: ['rear-brakes'],
    transform: { position: [-0.78, 0.36, -1.7] },
    explodeVector: [-1.6, 0, 0],
    source: procedural,
  },

  // Stage 4: aerodynamics
  {
    id: 'floor',
    name: 'Floor',
    code: 'FLOOR',
    stage: 'aero',
    dependencies: ['monocoque', 'gearbox'],
    transform: { position: [0, 0.05, -0.4] },
    explodeVector: [0, -0.9, 0],
    source: procedural,
  },
  {
    id: 'diffuser',
    name: 'Diffuser',
    code: 'DIFF',
    stage: 'aero',
    dependencies: ['floor'],
    transform: { position: [0, 0.22, -1.92] },
    explodeVector: [0, -0.5, -1.2],
    source: procedural,
  },
  {
    id: 'sidepods',
    name: 'Sidepods',
    code: 'PODS',
    stage: 'aero',
    dependencies: ['monocoque', 'engine'],
    transform: { position: [0, 0.32, -0.45] },
    explodeVector: [0, 0.2, 0],
    source: procedural,
  },
  {
    id: 'engine-cover',
    name: 'Engine cover and shark fin',
    code: 'COVER',
    stage: 'aero',
    dependencies: ['engine', 'sidepods', 'roll-hoop'],
    transform: { position: [0, 0.8, -1.05] },
    explodeVector: [0, 1.6, 0],
    source: procedural,
  },
  {
    id: 'front-wing',
    name: 'Front wing',
    code: 'F-WNG',
    stage: 'aero',
    dependencies: ['nose-cone'],
    transform: { position: [0, 0.15, 2.6] },
    explodeVector: [0, 0, 1.6],
    source: procedural,
  },
  {
    id: 'rear-wing',
    name: 'Rear wing',
    code: 'R-WNG',
    stage: 'aero',
    dependencies: ['engine-cover', 'gearbox'],
    transform: { position: [0, 0.85, -2.25] },
    explodeVector: [0, 0.8, -1.6],
    source: procedural,
  },
  {
    id: 'bargeboards',
    name: 'Bargeboards',
    code: 'BARGE',
    stage: 'aero',
    dependencies: ['floor', 'sidepods'],
    transform: { position: [0, 0.15, 0.6] },
    explodeVector: [0, 0.3, 0.8],
    source: procedural,
  },

  // Stage 5: controls
  {
    id: 'steering-wheel',
    name: 'Steering wheel',
    code: 'WHEEL',
    stage: 'controls',
    dependencies: ['cockpit-seat'],
    transform: { position: [0, 0.78, 1.0] },
    explodeVector: [0, 1.0, 0.6],
    source: procedural,
  },
  {
    id: 'mirrors',
    name: 'Mirrors',
    code: 'MIRR',
    stage: 'controls',
    dependencies: ['sidepods'],
    transform: { position: [0, 0.78, 0.95] },
    explodeVector: [0, 0.8, 0],
    source: procedural,
  },
  {
    id: 'rain-light',
    name: 'Rain light',
    code: 'LIGHT',
    stage: 'controls',
    dependencies: ['diffuser'],
    transform: { position: [0, 0.55, -2.44] },
    explodeVector: [0, 0.4, -1.2],
    source: procedural,
  },
]

export const PART_COUNT = PARTS.length

function indexBy<K extends string, V>(items: readonly V[], key: (item: V) => K): Record<K, V> {
  const out = {} as Record<K, V>
  for (const item of items) out[key(item)] = item
  return out
}

export const PART_BY_ID: Record<PartId, PartDefinition> = indexBy(PARTS, (part) => part.id)

export const PARTS_BY_STAGE: Record<StageId, readonly PartDefinition[]> = STAGES.reduce(
  (acc, stage) => {
    acc[stage.id] = PARTS.filter((part) => part.stage === stage.id)
    return acc
  },
  {} as Record<StageId, readonly PartDefinition[]>,
)

export function getPart(id: PartId): PartDefinition {
  return PART_BY_ID[id]
}
