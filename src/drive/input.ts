import { useEffect, useRef, useState } from 'react'
import { mergeGamepad, pollGamepad } from './gamepad'
import { drivePaused, resetCar } from './session'

export interface DriveInput {
  /** 0 to 1. */
  throttle: number
  /** 0 to 1: the brake pedal, which also engages reverse from a standstill. */
  brake: number
  /** -1 (right) to 1 (left). */
  steer: number
  handbrake: boolean
}

export interface DriveControls {
  /** The merged input for this frame; call `poll()` first. */
  input: DriveInput
  /** Reads the gamepad and merges it over the keyboard. Returns true if the pad did anything. */
  poll: () => boolean
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
 * Keyboard and gamepad state for the test drive: WASD or the arrow keys, Space for the handbrake and
 * R to put the car back on the grid, merged each frame with whatever a connected pad is doing. The
 * physics reads the result every frame; no React re-renders. Keys are released when the window
 * loses focus so nothing sticks after a tab switch.
 */
export function useDriveInput(): DriveControls {
  const held = useRef<Record<Held, boolean>>({
    up: false,
    down: false,
    left: false,
    right: false,
    handbrake: false,
  })
  // One stable object for the life of the component; `poll` runs from the frame loop, never in render.
  const [controls] = useState<DriveControls>(() => {
    const input: DriveInput = { throttle: 0, brake: 0, steer: 0, handbrake: false }
    const poll = () => {
      const h = held.current
      input.throttle = h.up ? 1 : 0
      input.brake = h.down ? 1 : 0
      input.steer = (h.left ? 1 : 0) - (h.right ? 1 : 0)
      input.handbrake = h.handbrake
      const pad = pollGamepad(drivePaused())
      if (!pad) return false
      mergeGamepad(input, pad)
      return pad.active
    }
    return { input, poll }
  })

  useEffect(() => {
    const release = () => {
      for (const key of Object.keys(held.current) as Held[]) held.current[key] = false
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

  return controls
}
