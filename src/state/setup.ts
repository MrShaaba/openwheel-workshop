/**
 * Car setup for the test drive: the five things a race engineer changes between runs, in plain
 * numbers a child can read. The physics turns these into grip, drag and balance in
 * `src/drive/tuning.ts`; this module only knows the values, their limits and how to explain them.
 */

export type TyreCompound = 'soft' | 'medium' | 'hard'

export const TYRE_COMPOUNDS: readonly TyreCompound[] = ['soft', 'medium', 'hard']

export interface CarSetup {
  /** 0 (flat) to 10 (steep). */
  frontWing: number
  rearWing: number
  tyre: TyreCompound
  /** 0 (lowest) to 10 (highest). */
  rideHeight: number
  /** 0 (50% front) to 10 (65% front). */
  brakeBias: number
}

export const SETUP_STEPS = 10

export const DEFAULT_SETUP: CarSetup = {
  frontWing: 5,
  rearWing: 5,
  tyre: 'medium',
  rideHeight: 4,
  brakeBias: 5,
}

export interface TyreInfo {
  name: string
  /** Swatch colour on the HUD and in the setup panel. */
  colour: string
  /** Grip relative to the medium compound. */
  grip: number
  /** Seconds of hard driving before the tyre is fully worn. */
  life: number
  /** Share of grip lost when fully worn. */
  wearLoss: number
  blurb: string
}

export const TYRES: Record<TyreCompound, TyreInfo> = {
  soft: {
    name: 'Soft',
    colour: '#ff3b5c',
    grip: 1.1,
    life: 90,
    wearLoss: 0.32,
    blurb: 'Grippiest and fastest, but worn out after a few laps.',
  },
  medium: {
    name: 'Medium',
    colour: '#ffd21f',
    grip: 1,
    life: 190,
    wearLoss: 0.26,
    blurb: 'A little less grip than the soft, lasts twice as long.',
  },
  hard: {
    name: 'Hard',
    colour: '#eef3f7',
    grip: 0.92,
    life: 360,
    wearLoss: 0.2,
    blurb: 'Least grip, but it keeps going lap after lap.',
  },
}

/** One-line explanations, in the order the panel shows them. */
export const SETUP_HELP = {
  frontWing:
    'More front wing = sharper turn-in and more grip at the front. Too much and the tail can step out.',
  rearWing: 'More rear wing = more grip in corners, slower on the straights.',
  tyre: 'Softer tyres grip harder but wear out faster. Harder tyres last longer.',
  rideHeight:
    'Lower = the floor makes more grip. Too low and the car scrapes over kerbs and the run-off.',
  brakeBias:
    'More to the front = steady braking, but the nose runs wide. More to the rear = sharper, but the tail can swing.',
} as const satisfies Record<keyof CarSetup, string>

/** Brake bias as the share of braking on the front axle, 50% to 65%. */
export function brakeBiasPercent(step: number): number {
  return Math.round(50 + (step / SETUP_STEPS) * 15)
}

export interface SetupPreset {
  name: string
  hint: string
  setup: Omit<CarSetup, 'tyre'>
}

export const SETUP_PRESETS: readonly SetupPreset[] = [
  {
    name: 'Balanced',
    hint: 'Good everywhere',
    setup: { frontWing: 5, rearWing: 5, rideHeight: 4, brakeBias: 5 },
  },
  {
    name: 'Low drag',
    hint: 'Fast on the straights, slippery in corners',
    setup: { frontWing: 2, rearWing: 1, rideHeight: 6, brakeBias: 6 },
  },
  {
    name: 'High downforce',
    hint: 'Glued to the road, slower top speed',
    setup: { frontWing: 8, rearWing: 9, rideHeight: 1, brakeBias: 5 },
  },
]

const clampStep = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(SETUP_STEPS, Math.max(0, Math.round(value)))
    : fallback

/** Validate a setup from storage field by field, falling back to the default values. */
export function sanitizeSetup(value: unknown): CarSetup {
  const raw = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
  return {
    frontWing: clampStep(raw.frontWing, DEFAULT_SETUP.frontWing),
    rearWing: clampStep(raw.rearWing, DEFAULT_SETUP.rearWing),
    tyre: (TYRE_COMPOUNDS as readonly string[]).includes(raw.tyre as string)
      ? (raw.tyre as TyreCompound)
      : DEFAULT_SETUP.tyre,
    rideHeight: clampStep(raw.rideHeight, DEFAULT_SETUP.rideHeight),
    brakeBias: clampStep(raw.brakeBias, DEFAULT_SETUP.brakeBias),
  }
}
