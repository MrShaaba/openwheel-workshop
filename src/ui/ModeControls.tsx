import { useWorkshop } from '../state/store'

export function ModeControls() {
  const mode = useWorkshop((state) => state.mode)
  const muted = useWorkshop((state) => state.muted)
  const setMode = useWorkshop((state) => state.setMode)
  const toggleMute = useWorkshop((state) => state.toggleMute)

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
          className={`hud-btn ${muted ? 'active' : ''}`}
          onClick={toggleMute}
          aria-pressed={muted}
        >
          {muted ? 'Sound off' : 'Sound on'}
          <kbd>M</kbd>
        </button>
      </div>
    </div>
  )
}
