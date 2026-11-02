import { useEffect } from 'react'
import { useWorkshop } from '../state/store'

/** Strip vendor codes from a gamepad id for the toast and the HUD chip. */
function describe(id: string): string {
  const cleaned = id
    .replace(/\(.*?\)/g, '')
    .replace(/vendor:?\s*[0-9a-f]+/gi, '')
    .replace(/product:?\s*[0-9a-f]+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.length > 0 ? cleaned.slice(0, 28) : 'Gamepad'
}

function firstConnected(): Gamepad | null {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return null
  for (const pad of navigator.getGamepads()) if (pad && pad.connected) return pad
  return null
}

/**
 * Tells the store when a gamepad comes or goes. Browsers only report a pad after a button is
 * pressed on it, so the first press is what makes the toast appear.
 */
export function useGamepadEvents(): void {
  useEffect(() => {
    const sync = () => {
      const pad = firstConnected()
      useWorkshop.getState().setGamepad(pad ? describe(pad.id) : null)
    }
    const onConnect = (event: Event) => {
      const pad = (event as GamepadEvent).gamepad as Gamepad | undefined
      if (pad) useWorkshop.getState().setGamepad(describe(pad.id))
      else sync()
    }
    window.addEventListener('gamepadconnected', onConnect)
    window.addEventListener('gamepaddisconnected', sync)
    return () => {
      window.removeEventListener('gamepadconnected', onConnect)
      window.removeEventListener('gamepaddisconnected', sync)
    }
  }, [])
}
