import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useWorkshop } from '../state/store'
import '../styles/drive.css'
import { Brand } from '../ui/Brand'
import { car, formatLap, laps, resetCar } from './session'
import { CIRCUIT, MINIMAP_HEIGHT, MINIMAP_PATH, MINIMAP_WIDTH, toMinimap } from './track'

const REV_SEGMENTS = 20
/** Segments from this one up are the red line. */
const REDLINE_FROM = 16

/** Values that change rarely enough to go through React state. */
interface SlowTelemetry {
  lap: number
  lastMs: number | null
  bestMs: number | null
  moved: boolean
  offTrack: boolean
  timing: boolean
}

const readSlow = (): SlowTelemetry => ({
  lap: laps.lap,
  lastMs: laps.lastMs,
  bestMs: laps.bestMs,
  moved: laps.moved,
  offTrack: car.offTrack,
  timing: laps.startedAt !== null,
})

const sameSlow = (a: SlowTelemetry, b: SlowTelemetry) =>
  a.lap === b.lap &&
  a.lastMs === b.lastMs &&
  a.bestMs === b.bestMs &&
  a.moved === b.moved &&
  a.offTrack === b.offTrack &&
  a.timing === b.timing

/** The circuit outline with the start line marked and a dot for the car. */
function Minimap({ dot }: { dot: React.RefObject<SVGCircleElement | null> }) {
  const [sx, sz] = toMinimap(CIRCUIT.points[0], CIRCUIT.points[1])
  const tx = CIRCUIT.tangents[0]
  const tz = CIRCUIT.tangents[1]
  // The start line runs across the track: along the left normal (tz, -tx), which maps to (tz, tx) on
  // the minimap because the map's vertical axis is flipped.
  const half = 5
  return (
    <svg
      className="minimap"
      viewBox={`0 0 ${MINIMAP_WIDTH} ${MINIMAP_HEIGHT}`}
      width={MINIMAP_WIDTH}
      height={MINIMAP_HEIGHT}
      aria-hidden="true"
    >
      <path d={MINIMAP_PATH} className="minimap-road" />
      <path d={MINIMAP_PATH} className="minimap-line" />
      <line
        className="minimap-start"
        x1={sx - tz * half}
        y1={sz - tx * half}
        x2={sx + tz * half}
        y2={sz + tx * half}
      />
      <circle ref={dot} className="minimap-car" r={3.2} cx={sx} cy={sz} />
    </svg>
  )
}

/** HUD for the test drive: speed, gear, revs, laps and a minimap, plus the way back. */
export default function DriveHUD() {
  const stopDrive = useWorkshop((state) => state.stopDrive)
  const muted = useWorkshop((state) => state.muted)
  const toggleMute = useWorkshop((state) => state.toggleMute)
  const speedRef = useRef<HTMLSpanElement>(null)
  const gearRef = useRef<HTMLSpanElement>(null)
  const revsRef = useRef<HTMLDivElement>(null)
  const timeRef = useRef<HTMLSpanElement>(null)
  const dotRef = useRef<SVGCircleElement>(null)
  const [slow, setSlow] = useState<SlowTelemetry>(readSlow)

  // One animation frame loop writes the fast readouts straight into the DOM.
  useEffect(() => {
    let frame = 0
    const tick = () => {
      if (speedRef.current) {
        speedRef.current.textContent = String(Math.round(Math.abs(car.speed) * 3.6))
      }
      if (gearRef.current) gearRef.current.textContent = car.gear === 0 ? 'R' : String(car.gear)
      if (revsRef.current) {
        const lit = Math.round(car.revs * REV_SEGMENTS)
        const segments = revsRef.current.children
        for (let i = 0; i < segments.length; i++) {
          segments[i].classList.toggle('lit', i < lit)
        }
      }
      if (timeRef.current) {
        timeRef.current.textContent =
          laps.startedAt === null ? formatLap(null) : formatLap(performance.now() - laps.startedAt)
      }
      if (dotRef.current) {
        const [u, v] = toMinimap(car.x, car.z)
        dotRef.current.setAttribute('cx', u.toFixed(1))
        dotRef.current.setAttribute('cy', v.toFixed(1))
      }
      setSlow((previous) => {
        const next = readSlow()
        return sameSlow(previous, next) ? previous : next
      })
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  const lapLabel = slow.lap === 0 ? 'Out lap' : `Lap ${slow.lap}`

  return (
    <motion.div
      className="drive-hud"
      role="region"
      aria-label="Test drive"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.25 }}
    >
      <header className="drive-top">
        <div>
          <Brand />
          <div className="drive-mode label">
            Test drive · flat circuit · {Math.round(CIRCUIT.length)} m
          </div>
        </div>
        <div className="btn-group" id="drive-controls" tabIndex={-1}>
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
          <button type="button" className="hud-btn" onClick={resetCar} aria-keyshortcuts="R">
            Reset car
            <kbd aria-hidden="true">R</kbd>
          </button>
          <button type="button" className="hud-btn" onClick={stopDrive} aria-keyshortcuts="Escape">
            Back to workshop
            <kbd aria-hidden="true">ESC</kbd>
          </button>
        </div>
      </header>

      <div className="drive-middle">
        <div className={`drive-flash ${slow.offTrack ? 'show' : ''}`} role="status">
          {slow.offTrack ? 'Track limits' : ''}
        </div>
        <div className={`drive-hint ${slow.moved ? '' : 'show'}`} aria-hidden={slow.moved}>
          <kbd>W</kbd> or <kbd>↑</kbd> to drive · <kbd>A</kbd> <kbd>D</kbd> to steer
        </div>
      </div>

      <footer className="drive-bottom">
        <div className="panel drive-minimap" aria-label="Circuit map">
          <span className="label">Circuit</span>
          <Minimap dot={dotRef} />
        </div>

        <div className="panel drive-dash" aria-label="Speed and gear">
          <div className="dash-row">
            <div className="dash-gear">
              <span className="label">Gear</span>
              <span ref={gearRef} className="dash-gear-value">
                1
              </span>
            </div>
            <div className="dash-speed">
              <span ref={speedRef} className="dash-speed-value">
                0
              </span>
              <span className="dash-speed-unit">km/h</span>
            </div>
          </div>
          <div ref={revsRef} className="rev-bar" aria-hidden="true">
            {Array.from({ length: REV_SEGMENTS }, (_, index) => (
              <i key={index} className={index >= REDLINE_FROM ? 'red' : ''} />
            ))}
          </div>
        </div>

        <div className="panel drive-laps" aria-label="Lap times">
          <div className="lap-row">
            <span className="label">{lapLabel}</span>
            <span ref={timeRef} className="lap-time current">
              {formatLap(null)}
            </span>
          </div>
          <div className="lap-row" aria-live="polite">
            <span className="label">Last</span>
            <span className="lap-time">{formatLap(slow.lastMs)}</span>
          </div>
          <div className="lap-row">
            <span className="label">Best</span>
            <span className="lap-time best">{formatLap(slow.bestMs)}</span>
          </div>
        </div>
      </footer>

      <div className="drive-legend" aria-label="Driving controls">
        <span>
          <kbd>W</kbd>
          <kbd>↑</kbd> throttle
        </span>
        <span>
          <kbd>S</kbd>
          <kbd>↓</kbd> brake, reverse
        </span>
        <span>
          <kbd>A</kbd>
          <kbd>D</kbd>
          <kbd>←</kbd>
          <kbd>→</kbd> steer
        </span>
        <span>
          <kbd>SPACE</kbd> handbrake
        </span>
        <span>
          <kbd>R</kbd> reset car
        </span>
        <span>
          <kbd>ESC</kbd> workshop
        </span>
      </div>
    </motion.div>
  )
}
