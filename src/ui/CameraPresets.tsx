import { CAMERA_PRESETS, useWorkshop, type CameraPreset } from '../state/store'

const LABELS: Record<CameraPreset, string> = {
  front: 'Front',
  side: 'Side',
  top: 'Top',
  rear: 'Rear',
  cockpit: 'Cockpit',
  hero: 'Hero',
  exploded: 'Exploded',
}

export function CameraPresets() {
  const requestCamera = useWorkshop((state) => state.requestCamera)
  const exploded = useWorkshop((state) => state.exploded)
  const toggleExploded = useWorkshop((state) => state.toggleExploded)
  const canExplode = useWorkshop(
    (state) => state.installed.length > 0 && !state.installing && !state.assembling,
  )

  return (
    <div className="camera-presets">
      <span className="label">Camera</span>
      <div className="btn-group" role="group" aria-label="Camera presets">
        {CAMERA_PRESETS.map((preset, index) => (
          <button
            key={preset}
            type="button"
            className="hud-btn"
            onClick={() => requestCamera(preset)}
          >
            {LABELS[preset]}
            <kbd>{index + 1}</kbd>
          </button>
        ))}
      </div>
      <div className="btn-group">
        <button
          type="button"
          className={`hud-btn ${exploded ? 'active' : ''}`}
          onClick={toggleExploded}
          aria-pressed={exploded}
          disabled={!exploded && !canExplode}
        >
          Exploded view
          <kbd>E</kbd>
        </button>
      </div>
    </div>
  )
}
