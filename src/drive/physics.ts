/**
 * Arcade car model for the test drive: a kinematic bicycle with a speed-dependent steering lock,
 * a grip limit that turns into understeer (or, with a nose-heavy setup, a tail that steps out),
 * aerodynamic grip and drag that both grow with the square of speed, tyre wear, a floor that
 * scrapes when it runs low, run-off that saps speed, a soft arena boundary, and a six-speed gearbox
 * that exists so the engine note has something to climb and fall through.
 */
import { clamp, clamp01, damp, TAU } from '../lib/math'
import type { DriveInput } from './input'
import { HALF_WIDTH, RUNOFF_MARGIN, type Circuit, type TrackFix } from './track'
import {
  BEST_BRAKE_FRONT,
  BRAKE_DECEL,
  brakeEfficiency,
  ENGINE_ACCEL_CAP,
  ENGINE_POWER,
  MAX_SPEED,
  ROLLING_DRAG,
  wearGrip,
  type Tuning,
} from './tuning'

export { MAX_SPEED } from './tuning'
export const REVERSE_MAX = 9
export const WHEELBASE = 3.4
export const WHEEL_RADIUS = 0.36

const HANDBRAKE_DECEL = 16
const REVERSE_ACCEL = 5
/**
 * Extra drag on the run-off: a constant that fades in over the first few m/s (so the car can still
 * crawl or reverse back onto the road) plus a per m/s term. Caps speed off the road near 25 m/s.
 */
const RUNOFF_DRAG = 5
const RUNOFF_DRAG_PER_MS = 0.1
const RUNOFF_DRAG_FADE_SPEED = 6
/** Drag from the floor hitting the ground, at full bottoming. */
const BOTTOMING_DRAG = 6
/** Full steering lock at rest, in radians; the lock shrinks as speed rises. */
const STEER_LOCK = 0.62
const STEER_FALLOFF_SPEED = 7
/** The run-off and the handbrake cap what the tyres can hold, whatever the setup. */
const RUNOFF_GRIP = 11
const HANDBRAKE_GRIP = 14
/** Speeds at which each gear runs out, in m/s. */
const GEAR_TOPS = [15, 26, 38, 50, 62, MAX_SPEED + 6]
const IDLE_REVS = 0.12
/** Hitting the wall bleeds this much speed. */
const WALL_RETAIN = 0.3
/** Yaw rate added at the limit per unit of nose-heavy balance, rad/s. */
const OVERSTEER_YAW = 2.0
/** Beyond this slide angle the car is spinning and sheds speed. */
const SPIN_SLIDE = 0.5
const MAX_SLIDE = 0.75
/** The kerb starts this far inside the painted edge. */
const KERB_INSET = 1.1
const GRAVITY = 9.81
/** How much grip the car loses when a crest takes all the weight off the tyres. */
const CREST_GRIP_LOSS = 0.7

export interface CarState {
  x: number
  z: number
  /** Ground height under the car. */
  y: number
  /** Yaw in radians. Forward is (sin heading, 0, cos heading): the nose points along +Z at zero. */
  heading: number
  /** Tilt of the ground under the car along its length (nose up is negative) and across it. */
  groundPitch: number
  groundRoll: number
  /** 0 to 1: how much a crest has lifted the weight off the tyres. */
  light: number
  /** Signed speed in m/s along the direction of travel; negative while reversing. */
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
  /** Angle between where the nose points and where the car travels, left positive. */
  slide: number
  /** 0 to 1: how hard the floor is hitting the ground over kerbs and run-off. */
  bottoming: number
  /** 0 (fresh) to 1 (gone). */
  tyreWear: number
  /** Lateral grip available this frame, m/s². */
  grip: number
  offTrack: boolean
  onKerb: boolean
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
    y: 0,
    groundPitch: 0,
    groundRoll: 0,
    light: 0,
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
    slide: 0,
    bottoming: 0,
    tyreWear: 0,
    grip: 0,
    offTrack: false,
    onKerb: false,
    wallHit: false,
  }
}

/** Back to a pose with the car at rest. Tyre wear survives: a reset is not a pit stop. */
export function placeCar(car: CarState, pose: CarPose): void {
  const tyreWear = car.tyreWear
  Object.assign(car, createCarState(pose), { tyreWear })
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

/**
 * Advance the car by `dt` seconds. `fix` is where the car sat relative to the track last frame,
 * `tuning` is the current setup turned into coefficients and `circuit` supplies the arena.
 */
export function stepCar(
  car: CarState,
  input: DriveInput,
  dt: number,
  fix: TrackFix,
  tuning: Tuning,
  circuit: Circuit,
) {
  const speed = car.speed
  const absSpeed = Math.abs(speed)
  const direction = Math.sign(speed)
  const lateral = Math.abs(fix.lateral)
  car.offTrack = lateral > HALF_WIDTH + RUNOFF_MARGIN
  car.onKerb = !car.offTrack && lateral > HALF_WIDTH - KERB_INSET
  car.throttle = input.throttle
  car.brake = Math.max(input.brake, input.handbrake ? 1 : 0)

  // The ground under the car: its height, and its tilt along and across the car's own axes.
  const trackHeading = Math.atan2(
    circuit.tangents[fix.index * 2],
    circuit.tangents[fix.index * 2 + 1],
  )
  const along = Math.cos(car.heading - trackHeading)
  const across = Math.sin(car.heading - trackHeading)
  const gradeForward = fix.grade * along + fix.slope * across
  const gradeLeft = fix.grade * across * -1 + fix.slope * along
  car.y = fix.height
  car.groundPitch = -Math.atan(gradeForward)
  car.groundRoll = Math.atan(gradeLeft)
  // Over a crest the road falls away faster than gravity can follow at speed; the tyres go light.
  car.light = clamp01((-fix.crest * speed * speed) / GRAVITY) * clamp01(Math.abs(along))

  // Ride height: a low floor scrapes on the kerbs and the run-off, which costs speed.
  const lowFloor = 1 - tuning.rideHeight
  const roughGround = car.offTrack ? 1 : car.onKerb ? 0.7 : 0
  car.bottoming = damp(
    car.bottoming,
    roughGround * lowFloor * lowFloor * clamp01(absSpeed / 15),
    10,
    dt,
  )

  // Longitudinal forces: a power-limited engine against rolling, aero and run-off drag.
  const brakeFrontExcess = clamp01((tuning.brakeFront - BEST_BRAKE_FRONT) / 0.08)
  const brakeRearExcess = clamp01((BEST_BRAKE_FRONT - tuning.brakeFront) / 0.08)
  let accel = 0
  if (input.throttle > 0) {
    accel += input.throttle * Math.min(ENGINE_ACCEL_CAP, ENGINE_POWER / Math.max(absSpeed, 1))
  }
  if (input.brake > 0) {
    if (speed > 0.3) accel -= input.brake * BRAKE_DECEL * brakeEfficiency(tuning.brakeFront)
    else if (speed > -REVERSE_MAX) accel -= REVERSE_ACCEL
  }
  if (input.handbrake && absSpeed > 0.1) accel -= direction * HANDBRAKE_DECEL
  let drag = ROLLING_DRAG + tuning.airDrag * absSpeed * absSpeed + BOTTOMING_DRAG * car.bottoming
  if (car.offTrack) {
    // A high floor rides the run-off better.
    const runoff = 1 - 0.35 * tuning.rideHeight
    drag +=
      runoff *
      (RUNOFF_DRAG * clamp01(absSpeed / RUNOFF_DRAG_FADE_SPEED) + RUNOFF_DRAG_PER_MS * absSpeed)
  }
  if (absSpeed > 0.05) accel -= direction * drag
  // Gravity along the slope: a climb holds the car back, a descent pushes it on.
  accel -= GRAVITY * gradeForward
  // A spinning car scrubs speed off fast.
  if (Math.abs(car.slide) > SPIN_SLIDE) accel -= direction * 8 * clamp01(absSpeed / 5)

  let next = speed + accel * dt
  // Drag never pushes the car through zero on its own.
  const coasting = input.throttle === 0 && input.brake === 0
  if (coasting && direction !== 0 && Math.sign(next) !== direction) next = 0
  if (Math.abs(next) < 0.02 && input.throttle === 0 && input.brake === 0) next = 0
  next = clamp(next, -REVERSE_MAX, MAX_SPEED)
  car.longAccel = (next - speed) / Math.max(dt, 1e-4)
  car.speed = next

  // Grip this frame: tyres (worn or not) plus the wings and floor, which only work at speed.
  const tyreGrip = tuning.mechanicalGrip * wearGrip(tuning, car.tyreWear)
  const aeroGrip = tuning.aeroGrip * car.speed * car.speed * (car.offTrack ? 0.5 : 1)
  const grounded = 1 - CREST_GRIP_LOSS * car.light
  const grip =
    (input.handbrake
      ? HANDBRAKE_GRIP
      : car.offTrack
        ? Math.min(RUNOFF_GRIP, tyreGrip) + aeroGrip
        : tyreGrip + aeroGrip) * grounded
  car.grip = grip

  // Steering and yaw: bicycle model with a grip limit. Too much front brake makes the nose wash out.
  const lock = STEER_LOCK / (1 + Math.abs(car.speed) / STEER_FALLOFF_SPEED)
  const authority = 1 - 0.7 * brakeFrontExcess * input.brake * clamp01(absSpeed / 10)
  const steerTarget = input.steer * lock * authority
  car.steer = damp(car.steer, steerTarget, input.steer !== 0 ? 9 : 12, dt)
  let yawRate = (car.speed / WHEELBASE) * Math.tan(car.steer)
  const wantedLateral = car.speed * yawRate
  // A rear-heavy wing setup pushes wide: the nose gives up a little earlier.
  const limit = (grip / Math.max(Math.abs(car.speed), 0.1)) * (1 - 0.25 * clamp01(-tuning.balance))
  let excess = 0
  if (Math.abs(yawRate) > limit) {
    excess = clamp01((Math.abs(wantedLateral) - grip) / grip)
    yawRate = Math.sign(yawRate) * limit
    car.slip = damp(car.slip, excess, 8, dt)
  } else {
    car.slip = damp(car.slip, 0, 6, dt)
  }

  // The tail steps out: a nose-heavy setup, a rear-biased brake, or the handbrake, all past the limit.
  const turning = Math.sign(car.steer) || Math.sign(car.slide)
  const forwardFactor = clamp01(car.speed / 6)
  let slideRate = 0
  if (excess > 0 && turning !== 0) {
    slideRate += OVERSTEER_YAW * clamp01(tuning.balance) * excess * turning
  }
  if (input.brake > 0 && brakeRearExcess > 0 && Math.abs(car.steer) > 0.02) {
    slideRate += 1.6 * brakeRearExcess * input.brake * Math.sign(car.steer) * clamp01(absSpeed / 25)
  }
  if (input.handbrake && Math.abs(car.steer) > 0.02) {
    slideRate += 2.2 * Math.sign(car.steer) * clamp01(absSpeed / 20)
  }
  slideRate *= forwardFactor
  car.slide = clamp(car.slide + slideRate * dt, -MAX_SLIDE, MAX_SLIDE)
  // The tyres pull the slide back in, faster when they have grip to spare.
  car.slide = damp(car.slide, 0, 2.5 + 4 * (1 - excess), dt)
  if (Math.abs(car.slide) < 0.002) car.slide = 0
  car.slip = Math.max(car.slip, clamp01(Math.abs(car.slide) / SPIN_SLIDE))

  car.heading += (yawRate + slideRate) * dt
  if (car.heading > Math.PI || car.heading < -Math.PI) car.heading -= Math.sign(car.heading) * TAU
  car.latAccel = car.speed * yawRate

  // Position (along the direction of travel, not the nose), then the soft wall around the arena.
  const travel = car.heading - car.slide
  car.x += Math.sin(travel) * car.speed * dt
  car.z += Math.cos(travel) * car.speed * dt
  const { minX, maxX, minZ, maxZ } = circuit.arena
  car.wallHit = false
  if (car.x < minX || car.x > maxX || car.z < minZ || car.z > maxZ) {
    car.x = clamp(car.x, minX, maxX)
    car.z = clamp(car.z, minZ, maxZ)
    car.speed *= WALL_RETAIN
    car.slide = 0
    car.wallHit = true
  }

  // Tyre wear: sliding, cornering hard and heavy braking all cost rubber; sitting still costs nothing.
  const effort =
    0.5 +
    1.5 * car.slip +
    0.6 * clamp01(Math.abs(car.latAccel) / 30) +
    0.8 * input.brake * clamp01(absSpeed / 40) +
    0.6 * clamp01(Math.abs(car.slide) / SPIN_SLIDE)
  car.tyreWear = clamp01(car.tyreWear + tuning.wearRate * effort * clamp01(absSpeed / 5) * dt)

  // Wheels, body attitude and the gearbox.
  car.wheelSpin = (car.wheelSpin + (car.speed / WHEEL_RADIUS) * dt) % TAU
  const softness = 0.8 + 0.6 * tuning.rideHeight
  car.roll = damp(car.roll, (car.latAccel / 26) * 0.045 * softness, 6, dt)
  car.pitch = damp(car.pitch, (-car.longAccel / ENGINE_ACCEL_CAP) * 0.03 * softness, 6, dt)
  car.gear = car.speed < -0.3 ? 0 : selectGear(car.gear, car.speed)
  car.revs = damp(car.revs, targetRevs(car, input), 10, dt)
}
