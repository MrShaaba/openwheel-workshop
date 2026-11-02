import { motion } from 'framer-motion'
import { useEffect, useId, useRef, type CSSProperties } from 'react'
import { useWorkshop } from '../state/store'
import '../styles/photo.css'
import { FOCUS_RANGE, FOV_RANGE, usePhoto } from './photoState'

/**
 * Photo mode's controls: focus, blur, zoom, a turntable, hide everything, save a PNG, leave.
 * The scene is the picture; the HUD is not in the file.
 */
export default function PhotoToolbar() {
  const closePhoto = useWorkshop((state) => state.closePhoto)
  const trackScene = useWorkshop((state) => state.trackScene)
  const focus = usePhoto((state) => state.focus)
  const aperture = usePhoto((state) => state.aperture)
  const fov = usePhoto((state) => state.fov)
  const turntable = usePhoto((state) => state.turntable)
  const hideUi = usePhoto((state) => state.hideUi)
  const capturing = usePhoto((state) => state.capturing)
  const setFocus = usePhoto((state) => state.setFocus)
  const setAperture = usePhoto((state) => state.setAperture)
  const setFov = usePhoto((state) => state.setFov)
  const toggleTurntable = usePhoto((state) => state.toggleTurntable)
  const toggleUi = usePhoto((state) => state.toggleUi)
  const requestCapture = usePhoto((state) => state.requestCapture)
  const id = useId()
  const first = useRef<HTMLButtonElement>(null)

  // The save button takes focus on open; whatever opened photo mode gets it back on close.
  useEffect(() => {
    const opener = document.activeElement
    first.current?.focus()
    return () => {
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus()
    }
  }, [])

  const fill = (value: number, [min, max]: readonly [number, number]) =>
    ({ '--fill': `${((value - min) / (max - min)) * 100}%` }) as CSSProperties
  const manualFocus = focus === 'car' ? 6 : focus

  if (hideUi) {
    return (
      <motion.div
        className="photo-hidden-hint"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ delay: 2.4, duration: 0.8 }}
        aria-live="polite"
      >
        <kbd>H</kbd> shows the controls · <kbd>ENTER</kbd> saves · <kbd>ESC</kbd> leaves
      </motion.div>
    )
  }

  return (
    <motion.div
      className="photo"
      role="region"
      aria-label="Photo mode"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="photo-title">
        <span className="label">Photo mode{trackScene ? ' · car paused' : ''}</span>
        <span className="photo-tip">
          Drag to orbit, scroll to zoom{trackScene ? ', right-drag to pan' : ''}. The picture is the
          scene only.
        </span>
      </div>

      <div className="panel photo-bar" id="photo-controls" tabIndex={-1}>
        <div className="photo-control">
          <div className="photo-control-head">
            <label htmlFor={`${id}-focus`}>Focus</label>
            <button
              type="button"
              className={`hud-btn tiny ${focus === 'car' ? 'active' : ''}`}
              aria-pressed={focus === 'car'}
              onClick={() => setFocus(focus === 'car' ? manualFocus : 'car')}
            >
              {focus === 'car' ? 'On the car' : `${manualFocus.toFixed(0)} m`}
            </button>
          </div>
          <input
            id={`${id}-focus`}
            type="range"
            min={FOCUS_RANGE[0]}
            max={FOCUS_RANGE[1]}
            step={0.5}
            value={manualFocus}
            style={fill(manualFocus, FOCUS_RANGE)}
            aria-label="Focus distance in metres"
            onChange={(event) => setFocus(Number(event.target.value))}
          />
        </div>

        <div className="photo-control">
          <div className="photo-control-head">
            <label htmlFor={`${id}-blur`}>Background blur</label>
            <span className="photo-value">{Math.round(aperture * 100)}%</span>
          </div>
          <input
            id={`${id}-blur`}
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={aperture}
            style={fill(aperture, [0, 1])}
            onChange={(event) => setAperture(Number(event.target.value))}
          />
        </div>

        <div className="photo-control">
          <div className="photo-control-head">
            <label htmlFor={`${id}-zoom`}>Lens</label>
            <span className="photo-value">{Math.round(fov)}°</span>
          </div>
          <input
            id={`${id}-zoom`}
            type="range"
            min={FOV_RANGE[0]}
            max={FOV_RANGE[1]}
            step={1}
            value={fov}
            style={fill(fov, FOV_RANGE)}
            aria-label="Field of view in degrees"
            onChange={(event) => setFov(Number(event.target.value))}
          />
        </div>

        <div className="btn-group photo-actions">
          <button
            type="button"
            className={`hud-btn ${turntable ? 'active' : ''}`}
            aria-pressed={turntable}
            onClick={toggleTurntable}
          >
            Turntable
          </button>
          <button type="button" className="hud-btn" onClick={toggleUi} aria-keyshortcuts="H">
            Hide UI
            <kbd aria-hidden="true">H</kbd>
          </button>
          <button
            ref={first}
            type="button"
            className="hud-btn active"
            disabled={capturing}
            onClick={requestCapture}
            aria-keyshortcuts="Enter"
          >
            {capturing ? 'Saving…' : 'Save PNG'}
            <kbd aria-hidden="true">ENTER</kbd>
          </button>
          <button type="button" className="hud-btn" onClick={closePhoto} aria-keyshortcuts="Escape">
            Done
            <kbd aria-hidden="true">ESC</kbd>
          </button>
        </div>
      </div>
    </motion.div>
  )
}
