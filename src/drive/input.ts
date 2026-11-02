import { useEffect, useRef, type RefObject } from 'react'
import { drivePaused, resetCar } from './session'

export interface DriveInput {
  /** 0 or 1. */
  throttle: number
  /** 0 or 1: the brake pedal, which also engages reverse from a standstill. */
  brake: number
  /** -1 (right) to 1 (left). */
  steer: number
  handbrake: boolean
}

type Held = 'up' | 'down' | 'left' | 'right' | 'handbrake'

const KEY_MAP: Record<string, Held> = {
  w: 'up',
  arrowup: 'up',
  s: 'down',
  arrowdown: 'down',
  a: 'left',
  arrowleft: 'left',
  d: 'right',
  arrowright: 'right',
  ' ': 'handbrake',
}

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/**
 * Keyboard state for the test drive: WASD or the arrow keys, Space for the handbrake and R to put
 * the car back on the grid. Returns a ref the physics reads every frame; no React re-renders.
 * Keys are released when the window loses focus so nothing sticks after a tab switch.
 */
export function useDriveInput(): RefObject<DriveInput> {
  const held = useRef<Record<Held, boolean>>({
    up: false,
    down: false,
    left: false,
    right: false,
    handbrake: false,
  })
  const input = useRef<DriveInput>({ throttle: 0, brake: 0, steer: 0, handbrake: false })

  useEffect(() => {
    const derive = () => {
      const h = held.current
      input.current.throttle = h.up ? 1 : 0
      input.current.brake = h.down ? 1 : 0
      input.current.steer = (h.left ? 1 : 0) - (h.right ? 1 : 0)
      input.current.handbrake = h.handbrake
    }
    const release = () => {
      for (const key of Object.keys(held.current) as Held[]) held.current[key] = false
      derive()
    }
    const onKey = (event: KeyboardEvent, down: boolean) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.target instanceof HTMLElement && EDITABLE_TAGS.has(event.target.tagName)) return
      // A panel over the track owns the keyboard; whatever was held is let go.
      if (drivePaused()) {
        release()
        return
      }
      const key = event.key.toLowerCase()
      // Space on a focused HUD button activates that button only.
      if (key === ' ' && event.target instanceof HTMLButtonElement) return
      if (key === 'r') {
        if (down && !event.repeat) resetCar()
        return
      }
      const name = KEY_MAP[key]
      if (!name) return
      event.preventDefault()
      held.current[name] = down
      derive()
    }
    const onDown = (event: KeyboardEvent) => onKey(event, true)
    const onUp = (event: KeyboardEvent) => onKey(event, false)
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', release)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', release)
      release()
    }
  }, [])

  return input
}
