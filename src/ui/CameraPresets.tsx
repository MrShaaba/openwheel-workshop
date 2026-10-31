import { CAMERA_PRESETS, useWorkshop, type CameraPreset } from '../state/store'

const LABELS: Record<CameraPreset, string> = {
  front: 'Front',
  side: 'Side',
  top: 'Top',
  rear: 'Rear',
  cockpit: 'Cockpit',
  hero: 'Hero',
}

export function CameraPresets() {
  const requestCamera = useWorkshop((state) => state.requestCamera)
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
    </div>
  )
}
