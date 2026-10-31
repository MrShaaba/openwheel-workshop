import { useEffect } from 'react'
import { markInteraction } from '../scene/interaction'
import { CAMERA_PRESETS, useWorkshop } from '../state/store'

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/** Global shortcuts: R hero camera, 1 to 6 presets, M mute, Esc leaves Inspect. */
export function useKeyboard(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.target instanceof HTMLElement && EDITABLE_TAGS.has(event.target.tagName)) return

      const state = useWorkshop.getState()
      const key = event.key

      if (key >= '1' && key <= '6') {
        const preset = CAMERA_PRESETS[Number(key) - 1]
        if (preset) state.requestCamera(preset)
        markInteraction()
        return
      }

      switch (key.toLowerCase()) {
        case 'r':
          state.requestCamera('hero')
          break
        case 'm':
          state.toggleMute()
          break
        case 'escape':
          state.inspect(null)
          break
        default:
          return
      }
      markInteraction()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
