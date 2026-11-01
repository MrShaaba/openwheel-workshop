/**
 * Arcade car model for the test drive: a kinematic bicycle with a speed-dependent steering lock,
 * a grip limit that turns into understeer, aerodynamic and rolling drag, and a six-speed gearbox
 * that only exists so the engine note has something to climb and fall through.
 */
import { clamp, clamp01, damp, lerp } from '../lib/math'

/** Metres per second. 72 m/s is roughly 260 km/h. */
export const MAX_SPEED = 72
export const REVERSE_MAX = 9
export const WHEELBASE = 3.4
export const WHEEL_RADIUS = 0.36

export interface CarState {
  x: number
  z: number
  /** Yaw in radians. Forward is (sin heading, 0, cos heading): the nose points along +Z at zero. */
  heading: number
  /** Signed speed in m/s along the heading; negative while reversing. */
  speed: number
  /** Front wheel angle in radians, left positive. */
  steer: number
  /** Accumulated wheel rotation in radians, for spinning the rims. */
  wheelSpin: number
  roll: number
  pitch: number
  longAccel: number
  latAccel: number
  /** 1 to 6; 0 is reverse. */
  gear: number
  /** 0 to 1 of the rev range. */
  revs: number
  /** 0 to 1: how hard the tyres are scrubbing past the grip limit. */
  slip: number
  offTrack: boolean
}

export interface CarPose {
  x: number
  z: number
  heading: number
}

export function createCarState(pose: CarPose): CarState {
  return {
    ...pose,
    speed: 0,
    steer: 0,
    wheelSpin: 0,
    roll: 0,
    pitch: 0,
    longAccel: 0,
    latAccel: 0,
    gear: 1,
    revs: 0,
    slip: 0,
    offTrack: false,
  }
}

export function placeCar(car: CarState, pose: CarPose): void {
  Object.assign(car, createCarState(pose))
}

// Keep the helpers referenced until the stepping lands in the next commit.
void clamp
void clamp01
void damp
void lerp
