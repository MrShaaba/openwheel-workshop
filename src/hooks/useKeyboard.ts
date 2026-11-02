import { useEffect } from 'react'
import { TEST_DRIVE_ENABLED } from '../lib/flags'
import { installableIds, nextGuidedPart } from '../parts/graph'
import { markInteraction } from '../scene/interaction'
import { CAMERA_PRESETS, useWorkshop } from '../state/store'

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/**
 * Global shortcuts: Space installs next, E exploded view, L paint shop, D test drive, G race engineer,
 * B pit stop, R hero camera, 1 to 6 presets, M mute, Esc closes. On the track T opens the setup tab.
 */
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

      if (state.driving) {
        // The track owns the keyboard (src/drive/input.ts); only the panels, leaving and mute stay global.
        const lower = key.toLowerCase()
        if (key === 'Escape') {
          if (state.engineer !== null) state.closeEngineer()
          else state.stopDrive()
        } else if (lower === 'm') state.toggleMute()
        else if (lower === 'g') state.toggleEngineer()
        else if (lower === 't') {
          if (state.engineer === 'setup') state.closeEngineer()
          else state.openEngineer('setup')
        } else if (lower === 'b') {
          if (state.engineer === 'pitstop') state.closeEngineer()
          else state.openEngineer('pitstop')
        } else return
        markInteraction()
        return
      }

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
        case 'd':
          if (!TEST_DRIVE_ENABLED) return
          state.startDrive()
          break
        case 'm':
          state.toggleMute()
          break
        case 'g':
          state.toggleEngineer()
          break
        case 'b':
          if (state.engineer === 'pitstop') state.closeEngineer()
          else state.openEngineer('pitstop')
          break
        case 'escape':
          if (state.engineer !== null) state.closeEngineer()
          else if (state.liveryOpen) state.closeLivery()
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
