/**
 * Gamepad driving through the Gamepad API, polled once per frame. Uses the standard mapping: left
 * stick (or the d-pad) steers, the right trigger is the throttle, the left trigger the brake, A the
 * handbrake, Y puts the car back on the grid and Start opens the setup panel. Triggers and the
 * stick are analogue, so a light squeeze is a light touch.
 */
import { useWorkshop } from '../state/store'
import type { DriveInput } from './input'
import { resetCar } from './session'

const STICK_DEADZONE = 0.12
/** Trigger travel below this counts as released. */
const TRIGGER_DEADZONE = 0.04

const BUTTON = {
  a: 0,
  b: 1,
  y: 3,
  lt: 6,
  rt: 7,
  back: 8,
  start: 9,
  dpadUp: 12,
  dpadDown: 13,
  dpadLeft: 14,
  dpadRight: 15,
} as const

const pressedBefore: Record<number, boolean> = {}

function buttonValue(pad: Gamepad, index: number): number {
  const button = pad.buttons[index]
  if (!button) return 0
  return typeof button.value === 'number' ? button.value : button.pressed ? 1 : 0
}

/** True on the frame a button goes down. */
function justPressed(pad: Gamepad, index: number): boolean {
  const down = buttonValue(pad, index) > 0.5
  const was = pressedBefore[index] ?? false
  pressedBefore[index] = down
  return down && !was
}

/** Stick value with a dead zone, then a gentle curve so small moves steer gently. */
function shapeStick(value: number): number {
  const magnitude = Math.abs(value)
  if (magnitude < STICK_DEADZONE) return 0
  const scaled = (magnitude - STICK_DEADZONE) / (1 - STICK_DEADZONE)
  return Math.sign(value) * Math.pow(scaled, 1.5)
}

function shapeTrigger(value: number): number {
  return value < TRIGGER_DEADZONE ? 0 : (value - TRIGGER_DEADZONE) / (1 - TRIGGER_DEADZONE)
}

/** The first connected gamepad, if the browser offers the API. */
export function firstGamepad(): Gamepad | null {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return null
  for (const pad of navigator.getGamepads()) {
    if (pad && pad.connected) return pad
  }
  return null
}

export interface GamepadReading {
  throttle: number
  brake: number
  steer: number
  handbrake: boolean
  /** Anything on the pad is being used this frame. */
  active: boolean
}

const reading: GamepadReading = { throttle: 0, brake: 0, steer: 0, handbrake: false, active: false }

/**
 * Read the pad. Driving values are returned for the input to merge; Y, Start and B act at once
 * (Start and B work while a panel is open, since a pad user has no Esc key).
 */
export function pollGamepad(paused: boolean): GamepadReading | null {
  const pad = firstGamepad()
  if (!pad) return null

  if (justPressed(pad, BUTTON.start)) {
    const state = useWorkshop.getState()
    if (state.engineer === 'setup') state.closeEngineer()
    else if (!state.photoMode) state.openEngineer('setup')
  }
  if (justPressed(pad, BUTTON.b)) {
    const state = useWorkshop.getState()
    if (state.photoMode) state.closePhoto()
    else if (state.engineer !== null) state.closeEngineer()
  }
  if (!paused && justPressed(pad, BUTTON.y)) resetCar()

  if (paused) {
    reading.throttle = 0
    reading.brake = 0
    reading.steer = 0
    reading.handbrake = false
    reading.active = false
    return reading
  }

  const stick = shapeStick(pad.axes[0] ?? 0)
  const dpad = buttonValue(pad, BUTTON.dpadLeft) - buttonValue(pad, BUTTON.dpadRight)
  // The car's steer is left-positive; the stick's X axis is right-positive.
  reading.steer = Math.max(-1, Math.min(1, -stick + dpad))
  reading.throttle = Math.max(
    shapeTrigger(buttonValue(pad, BUTTON.rt)),
    buttonValue(pad, BUTTON.dpadUp),
  )
  reading.brake = Math.max(
    shapeTrigger(buttonValue(pad, BUTTON.lt)),
    buttonValue(pad, BUTTON.dpadDown),
  )
  reading.handbrake = buttonValue(pad, BUTTON.a) > 0.5
  reading.active =
    reading.throttle > 0 || reading.brake > 0 || reading.steer !== 0 || reading.handbrake
  return reading
}

/** Merge a pad reading over the keyboard: the larger pedal wins, and the stick steers unless a key is held. */
export function mergeGamepad(input: DriveInput, pad: GamepadReading): void {
  input.throttle = Math.max(input.throttle, pad.throttle)
  input.brake = Math.max(input.brake, pad.brake)
  if (input.steer === 0) input.steer = pad.steer
  input.handbrake = input.handbrake || pad.handbrake
}
