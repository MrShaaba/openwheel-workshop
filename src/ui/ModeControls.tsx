import { useState } from 'react'
import { preloadEngineer } from '../engineer/lazy'
import { PART_COUNT } from '../parts/registry'
import { useWorkshop } from '../state/store'
import { ConfirmDialog } from './ConfirmDialog'

export function ModeControls() {
  const mode = useWorkshop((state) => state.mode)
  const muted = useWorkshop((state) => state.muted)
  const installedCount = useWorkshop((state) => state.installed.length)
  const assembling = useWorkshop((state) => state.assembling)
  const setMode = useWorkshop((state) => state.setMode)
  const toggleMute = useWorkshop((state) => state.toggleMute)
  const reset = useWorkshop((state) => state.reset)
  const notify = useWorkshop((state) => state.notify)
  const engineerOpen = useWorkshop((state) => state.engineer !== null)
  const toggleEngineer = useWorkshop((state) => state.toggleEngineer)
  const [confirming, setConfirming] = useState(false)

  const canReset = installedCount > 0 || assembling

  return (
    <div className="mode-controls">
      <div className="btn-group" role="group" aria-label="Build mode">
        <button
          type="button"
          className={`hud-btn ${mode === 'guided' ? 'active' : ''}`}
          onClick={() => setMode('guided')}
          aria-pressed={mode === 'guided'}
        >
          Guided build
        </button>
        <button
          type="button"
          className={`hud-btn ${mode === 'free' ? 'active' : ''}`}
          onClick={() => setMode('free')}
          aria-pressed={mode === 'free'}
        >
          Free build
        </button>
      </div>
      <div className="btn-group">
        <button
          type="button"
          className={`hud-btn ${engineerOpen ? 'active' : ''}`}
          onClick={toggleEngineer}
          onPointerEnter={preloadEngineer}
          onFocus={preloadEngineer}
          aria-pressed={engineerOpen}
          aria-keyshortcuts="G"
        >
          Race engineer
          <kbd aria-hidden="true">G</kbd>
        </button>
        <button
          type="button"
          className={`hud-btn ${muted ? 'active' : ''}`}
          onClick={toggleMute}
          aria-pressed={muted}
          aria-keyshortcuts="M"
        >
          {muted ? 'Sound off' : 'Sound on'}
          <kbd aria-hidden="true">M</kbd>
        </button>
        <button
          type="button"
          className="hud-btn danger"
          disabled={!canReset}
          onClick={() => setConfirming(true)}
        >
          Reset build
        </button>
      </div>
      <ConfirmDialog
        open={confirming}
        title="Reset the build?"
        confirmLabel="Reset"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false)
          reset()
          notify('Build reset')
          // The Reset button disables itself once the build is empty, so focus moves to the objective.
          document.getElementById('objective')?.focus({ preventScroll: true })
        }}
      >
        <p>
          This removes {installedCount === PART_COUNT ? 'all' : 'the'} {installedCount} installed
          part{installedCount === 1 ? '' : 's'} and clears the saved build. The camera returns to
          the hero angle.
        </p>
      </ConfirmDialog>
    </div>
  )
}
