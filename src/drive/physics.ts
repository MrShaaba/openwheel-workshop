/**
 * Arcade car model for the test drive: a kinematic bicycle with a speed-dependent steering lock,
 * a grip limit that turns into understeer, aerodynamic and rolling drag, run-off that saps speed,
 * a soft arena boundary, and a six-speed gearbox that exists so the engine note has something to
 * climb and fall through.
 */
import { clamp, clamp01, damp, TAU } from '../lib/math'
import type { DriveInput } from './input'
import { CIRCUIT, HALF_WIDTH, RUNOFF_MARGIN, type TrackFix } from './track'

/** Metres per second. 72 m/s is roughly 260 km/h; drag settles the car a little below it. */
export const MAX_SPEED = 72
export const REVERSE_MAX = 9
export const WHEELBASE = 3.4
export const WHEEL_RADIUS = 0.36

/** m/s² at a standstill, tapering to nothing at MAX_SPEED. */
const ENGINE_ACCEL = 13
const BRAKE_DECEL = 24
const HANDBRAKE_DECEL = 16
const REVERSE_ACCEL = 5
const ROLLING_DRAG = 0.7
/** m/s² per m/s. */
const AIR_DRAG = 0.0115
/**
 * Extra drag on the run-off: a constant that fades in over the first few m/s (so the car can still
 * crawl or reverse back onto the road) plus a per m/s term. Caps speed off the road near 25 m/s.
 */
const RUNOFF_DRAG = 5
const RUNOFF_DRAG_PER_MS = 0.1
const RUNOFF_DRAG_FADE_SPEED = 6
/** Full steering lock at rest, in radians; the lock shrinks as speed rises. */
const STEER_LOCK = 0.62
const STEER_FALLOFF_SPEED = 7
/** Lateral acceleration the tyres can hold on the road, on the run-off and with the handbrake on. */
const GRIP = 26
const RUNOFF_GRIP = 11
const HANDBRAKE_GRIP = 14
/** Speeds at which each gear runs out, in m/s. */
const GEAR_TOPS = [15, 26, 38, 50, 62, MAX_SPEED + 6]
const IDLE_REVS = 0.12
/** Hitting the wall bleeds this much speed. */
const WALL_RETAIN = 0.3

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
  /** 0 to 1: the throttle as applied, for the engine note. */
  throttle: number
  /** 0 to 1: brake pedal or handbrake, for the rain light. */
  brake: number
  /** 0 to 1: how hard the tyres are scrubbing past the grip limit. */
  slip: number
  offTrack: boolean
  /** Set for one frame when the arena wall is hit. */
  wallHit: boolean
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
    revs: IDLE_REVS,
    throttle: 0,
    brake: 0,
    slip: 0,
    offTrack: false,
    wallHit: false,
  }
}

export function placeCar(car: CarState, pose: CarPose): void {
  Object.assign(car, createCarState(pose))
}

/** Gear for a forward speed, with hysteresis so the box does not hunt at a boundary. */
function selectGear(current: number, speed: number): number {
  if (speed < 0.3) return 1
  let gear = Math.max(1, current)
  while (gear < GEAR_TOPS.length && speed >= GEAR_TOPS[gear - 1]) gear++
  while (gear > 1 && speed < GEAR_TOPS[gear - 2] - 1.5) gear--
  return gear
}

function targetRevs(car: CarState, input: DriveInput): number {
  const speed = car.speed
  if (speed < -0.3) return 0.2 + 0.6 * clamp01(-speed / REVERSE_MAX)
  if (speed < 0.3) return input.throttle > 0 ? 0.5 : IDLE_REVS
  const top = GEAR_TOPS[car.gear - 1]
  const bottom = car.gear > 1 ? GEAR_TOPS[car.gear - 2] : 0
  return 0.3 + 0.7 * clamp01((speed - bottom) / (top - bottom))
}

/** Advance the car by `dt` seconds. `fix` is where the car sat relative to the track last frame. */
export function stepCar(car: CarState, input: DriveInput, dt: number, fix: TrackFix): void {
  const speed = car.speed
  const absSpeed = Math.abs(speed)
  const direction = Math.sign(speed)
  car.offTrack = Math.abs(fix.lateral) > HALF_WIDTH + RUNOFF_MARGIN
  car.throttle = input.throttle
  car.brake = Math.max(input.brake, input.handbrake ? 1 : 0)

  // Longitudinal forces.
  let accel = 0
  if (input.throttle > 0) {
    accel += input.throttle * ENGINE_ACCEL * clamp(1 - speed / MAX_SPEED, 0, 1)
  }
  if (input.brake > 0) {
    if (speed > 0.3) accel -= BRAKE_DECEL
    else if (speed > -REVERSE_MAX) accel -= REVERSE_ACCEL
  }
  if (input.handbrake && absSpeed > 0.1) accel -= direction * HANDBRAKE_DECEL
  let drag = ROLLING_DRAG + AIR_DRAG * absSpeed
  if (car.offTrack) {
    drag += RUNOFF_DRAG * clamp01(absSpeed / RUNOFF_DRAG_FADE_SPEED) + RUNOFF_DRAG_PER_MS * absSpeed
  }
  if (absSpeed > 0.05) accel -= direction * drag

  let next = speed + accel * dt
  // Drag never pushes the car through zero on its own.
  const coasting = input.throttle === 0 && input.brake === 0
  if (coasting && direction !== 0 && Math.sign(next) !== direction) next = 0
  if (Math.abs(next) < 0.02 && input.throttle === 0 && input.brake === 0) next = 0
  next = clamp(next, -REVERSE_MAX, MAX_SPEED)
  car.longAccel = (next - speed) / Math.max(dt, 1e-4)
  car.speed = next

  // Steering and yaw: bicycle model with a grip limit.
  const lock = STEER_LOCK / (1 + Math.abs(car.speed) / STEER_FALLOFF_SPEED)
  const steerTarget = input.steer * lock
  car.steer = damp(car.steer, steerTarget, input.steer !== 0 ? 9 : 12, dt)
  const grip = input.handbrake ? HANDBRAKE_GRIP : car.offTrack ? RUNOFF_GRIP : GRIP
  let yawRate = (car.speed / WHEELBASE) * Math.tan(car.steer)
  const wantedLateral = car.speed * yawRate
  const limit = grip / Math.max(Math.abs(car.speed), 0.1)
  if (Math.abs(yawRate) > limit) {
    yawRate = Math.sign(yawRate) * limit
    car.slip = damp(car.slip, clamp01((Math.abs(wantedLateral) - grip) / grip), 8, dt)
  } else {
    car.slip = damp(car.slip, 0, 6, dt)
  }
  car.heading += yawRate * dt
  if (car.heading > Math.PI || car.heading < -Math.PI) car.heading -= Math.sign(car.heading) * TAU
  car.latAccel = car.speed * yawRate

  // Position, then the soft wall around the arena.
  car.x += Math.sin(car.heading) * car.speed * dt
  car.z += Math.cos(car.heading) * car.speed * dt
  const { minX, maxX, minZ, maxZ } = CIRCUIT.arena
  car.wallHit = false
  if (car.x < minX || car.x > maxX || car.z < minZ || car.z > maxZ) {
    car.x = clamp(car.x, minX, maxX)
    car.z = clamp(car.z, minZ, maxZ)
    car.speed *= WALL_RETAIN
    car.wallHit = true
  }

  // Wheels, body attitude and the gearbox.
  car.wheelSpin = (car.wheelSpin + (car.speed / WHEEL_RADIUS) * dt) % TAU
  car.roll = damp(car.roll, (car.latAccel / GRIP) * 0.045, 6, dt)
  car.pitch = damp(car.pitch, (-car.longAccel / ENGINE_ACCEL) * 0.03, 6, dt)
  car.gear = car.speed < -0.3 ? 0 : selectGear(car.gear, car.speed)
  car.revs = damp(car.revs, targetRevs(car, input), 10, dt)
}
