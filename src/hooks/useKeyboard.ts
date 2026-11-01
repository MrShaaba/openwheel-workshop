import { useEffect } from 'react'
import { installableIds, nextGuidedPart } from '../parts/graph'
import { markInteraction } from '../scene/interaction'
import { CAMERA_PRESETS, useWorkshop } from '../state/store'

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/** Global shortcuts: Space installs next, E exploded view, L paint shop, R hero camera, 1 to 6 presets, M mute, Esc closes. */
export function useKeyboard(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return
      if (event.target instanceof HTMLElement && EDITABLE_TAGS.has(event.target.tagName)) {
        // Typing in a field never triggers shortcuts; Esc hands focus back to the page.
        if (event.key === 'Escape') event.target.blur()
        return
      }
      // A dialog owns the keyboard while it is open.
      if (document.activeElement?.closest('[role="dialog"]')) return

      const state = useWorkshop.getState()
      const key = event.key

      if (key >= '1' && key <= '6') {
        const preset = CAMERA_PRESETS[Number(key) - 1]
        if (preset) state.requestCamera(preset)
        markInteraction()
        return
      }

      switch (key.toLowerCase()) {
        case ' ': {
          // Space on a focused HUD button activates that button only.
          if (event.target instanceof HTMLButtonElement) return
          event.preventDefault()
          const next =
            state.mode === 'guided'
              ? nextGuidedPart(state.installed)
              : (installableIds(state.installed)[0] ?? null)
          if (next) state.attemptInstall(next)
          else if (!state.installing) state.notify('Nothing left to install')
          break
        }
        case 'r':
          state.requestCamera('hero')
          break
        case 'e':
          state.toggleExploded()
          break
        case 'l':
          state.toggleLivery()
          break
        case 'm':
          state.toggleMute()
          break
        case 'escape':
          if (state.liveryOpen) state.closeLivery()
          else if (state.assembling) state.stopAssembly()
          else state.inspect(null)
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
