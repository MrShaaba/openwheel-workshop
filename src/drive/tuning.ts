/**
 * Turns a car setup into the numbers the physics integrates, and predicts what the driver will
 * feel so the setup panel can say "top speed about 223 km/h" before a wheel turns.
 */
import { SETUP_STEPS, TYRES, type CarSetup } from '../state/setup'

export interface Tuning {
  /** Lateral grip from the tyres alone, in m/s², before wear. */
  mechanicalGrip: number
  /** Extra lateral grip per (m/s)² from the wings and the floor. */
  aeroGrip: number
  /** Aerodynamic drag per (m/s)², in m/s². */
  airDrag: number
  /** -1 (all the wing at the rear) to 1 (all of it at the front). */
  balance: number
  /** Share of the braking on the front axle, 0.5 to 0.65. */
  brakeFront: number
  /** 0 (lowest) to 1 (highest). */
  rideHeight: number
  /** Tyre wear per second of hard driving. */
  wearRate: number
  /** Share of grip gone when the tyre is fully worn. */
  wearLoss: number
}

/** Lateral grip of the medium tyre with no wings, m/s². */
const BASE_MECHANICAL_GRIP = 17
/** Aero grip per wing step per (m/s)². */
const AERO_PER_STEP = 0.0007
/** Drag of the body alone and the extra drag per wing step, per (m/s)². */
const BODY_DRAG = 0.00135
const DRAG_PER_STEP = 0.00008
/** Brake bias where the car stops shortest. */
export const BEST_BRAKE_FRONT = 0.58

export function tuningFor(setup: CarSetup): Tuning {
  const tyre = TYRES[setup.tyre]
  const rideHeight = setup.rideHeight / SETUP_STEPS
  const wingSum = setup.frontWing + setup.rearWing
  return {
    mechanicalGrip: BASE_MECHANICAL_GRIP * tyre.grip,
    // A low floor works harder: 15% more aero grip at the lowest setting, 15% less at the highest.
    aeroGrip: AERO_PER_STEP * wingSum * (1.15 - 0.3 * rideHeight),
    airDrag: BODY_DRAG + DRAG_PER_STEP * wingSum,
    balance: (setup.frontWing - setup.rearWing) / SETUP_STEPS,
    brakeFront: 0.5 + (setup.brakeBias / SETUP_STEPS) * 0.15,
    rideHeight,
    wearRate: 1 / tyre.life,
    wearLoss: tyre.wearLoss,
  }
}

/** Grip multiplier for a tyre at `wear` (0 fresh, 1 gone): gentle at first, then a cliff. */
export function wearGrip(tuning: Tuning, wear: number): number {
  return 1 - tuning.wearLoss * wear * wear
}

export interface SetupPrediction {
  /** km/h on a long straight. */
  topSpeed: number
  /** km/h through a 36 m radius corner (turn one), on fresh tyres. */
  cornerSpeed: number
  /** Laps of hard driving before the tyres are gone. */
  tyreLaps: number
  /** Metres to stop from 200 km/h. */
  brakingDistance: number
}

export const ENGINE_ACCEL_CAP = 12
/** Engine power as acceleration times speed: accel = POWER / speed, capped above. */
export const ENGINE_POWER = 560
export const ROLLING_DRAG = 0.7
export const BRAKE_DECEL = 24
export const MAX_SPEED = 72

/** Turn one's radius in metres, for the prediction only. */
const REFERENCE_RADIUS = 36
const LAP_SECONDS = 28
/** Average of the wear effort term over a lap driven hard. */
const LAP_EFFORT = 0.8

/** How much of the best braking survives a bias off the sweet spot (0 = on it, 1 = at an end). */
export function brakeEfficiency(brakeFront: number): number {
  return 1 - 0.3 * Math.min(1, Math.abs(brakeFront - BEST_BRAKE_FRONT) / 0.08)
}

export function predictSetup(setup: CarSetup): SetupPrediction {
  const tuning = tuningFor(setup)
  // Top speed: where the engine's power runs out against drag.
  let top = MAX_SPEED
  for (let v = 10; v <= MAX_SPEED; v += 0.25) {
    const engine = Math.min(ENGINE_ACCEL_CAP, ENGINE_POWER / v)
    if (engine - ROLLING_DRAG - tuning.airDrag * v * v <= 0) {
      top = v
      break
    }
  }
  // Corner speed: v²/r = mechanical + aero v², so v² = mechanical r / (1 - aero r).
  const denominator = Math.max(0.2, 1 - tuning.aeroGrip * REFERENCE_RADIUS)
  const corner = Math.sqrt((tuning.mechanicalGrip * REFERENCE_RADIUS) / denominator)
  const decel = BRAKE_DECEL * brakeEfficiency(tuning.brakeFront)
  const from = 200 / 3.6
  return {
    topSpeed: Math.round(top * 3.6),
    cornerSpeed: Math.round(Math.min(corner, top) * 3.6),
    tyreLaps: Math.max(1, Math.round(1 / tuning.wearRate / (LAP_SECONDS * LAP_EFFORT))),
    brakingDistance: Math.round((from * from) / (2 * decel)),
  }
}
