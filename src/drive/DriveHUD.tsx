import { motion } from 'framer-motion'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { preloadEngineer } from '../engineer/lazy'
import { preloadPhoto } from '../photo/lazy'
import { TYRES } from '../state/setup'
import { useWorkshop } from '../state/store'
import '../styles/drive.css'
import { Brand } from '../ui/Brand'
import { useRecords } from './records'
import {
  car,
  formatDelta,
  formatLap,
  formatSector,
  laps,
  padUsed,
  resetCar,
  SPLIT_SHOW_MS,
  type LapResult,
  type Split,
} from './session'
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
  /** The floor is scraping over a kerb or the run-off. */
  scraping: boolean
  timing: boolean
  /** Tyre wear in whole percent, so the bar only re-renders when it moves. */
  wear: number
  /** Which sector the car is in and the sectors done so far this lap. */
  sector: number
  sectors: [number | null, number | null, number | null]
  lastSectors: readonly [number, number, number] | null
  dirty: boolean
  /** The last lap's result, while its flash is showing. */
  result: LapResult | null
  /** The latest split, while it is showing. */
  split: Split | null
  /** A gamepad has driven the car this session. */
  pad: boolean
}

/** How long the lap result stays up. */
const RESULT_SHOW_MS = 4200

const readSlow = (now: number): SlowTelemetry => ({
  lap: laps.lap,
  lastMs: laps.lastMs,
  bestMs: laps.bestMs,
  moved: laps.moved,
  offTrack: car.offTrack,
  scraping: car.bottoming > 0.35,
  timing: laps.startedAt !== null,
  wear: Math.round(car.tyreWear * 100),
  sector: laps.sector,
  sectors: laps.sectors,
  lastSectors: laps.lastSectors,
  dirty: laps.dirty,
  result: laps.result && now - laps.result.at < RESULT_SHOW_MS ? laps.result : null,
  split: laps.split && now - laps.split.at < SPLIT_SHOW_MS ? laps.split : null,
  pad: padUsed.value,
})

const sameSlow = (a: SlowTelemetry, b: SlowTelemetry) =>
  a.lap === b.lap &&
  a.lastMs === b.lastMs &&
  a.bestMs === b.bestMs &&
  a.moved === b.moved &&
  a.offTrack === b.offTrack &&
  a.scraping === b.scraping &&
  a.timing === b.timing &&
  a.wear === b.wear &&
  a.sector === b.sector &&
  a.sectors[0] === b.sectors[0] &&
  a.sectors[1] === b.sectors[1] &&
  a.lastSectors === b.lastSectors &&
  a.dirty === b.dirty &&
  a.result === b.result &&
  a.split === b.split &&
  a.pad === b.pad

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
  const openEngineer = useWorkshop((state) => state.openEngineer)
  const togglePhoto = useWorkshop((state) => state.togglePhoto)
  const compound = useWorkshop((state) => state.setup.tyre)
  const tyre = TYRES[compound]
  const bestSectors = useRecords((state) => state.bestSectors)
  const bestLap = useRecords((state) => state.bestLap)
  const gamepad = useWorkshop((state) => state.gamepad)
  const speedRef = useRef<HTMLSpanElement>(null)
  const gearRef = useRef<HTMLSpanElement>(null)
  const revsRef = useRef<HTMLDivElement>(null)
  const timeRef = useRef<HTMLSpanElement>(null)
  const sectorRef = useRef<HTMLSpanElement>(null)
  const dotRef = useRef<SVGCircleElement>(null)
  const [slow, setSlow] = useState<SlowTelemetry>(() => readSlow(performance.now()))

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
      const now = performance.now()
      if (timeRef.current) {
        timeRef.current.textContent =
          laps.startedAt === null ? formatLap(null) : formatLap(now - laps.startedAt)
      }
      if (sectorRef.current) {
        // The sector in progress ticks live; done sectors are rendered from state.
        sectorRef.current.textContent =
          laps.startedAt === null
            ? formatSector(null)
            : formatSector(now - (laps.sectorStartedAt ?? laps.startedAt))
      }
      if (dotRef.current) {
        const [u, v] = toMinimap(car.x, car.z)
        dotRef.current.setAttribute('cx', u.toFixed(1))
        dotRef.current.setAttribute('cy', v.toFixed(1))
      }
      setSlow((previous) => {
        const next = readSlow(now)
        return sameSlow(previous, next) ? previous : next
      })
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  const lapLabel = slow.lap === 0 ? 'Out lap' : `Lap ${slow.lap}`
  const result = slow.result
  const split = slow.split
  /** Colour class for a finished sector of the current lap. */
  const sectorTone = (i: number, ms: number | null): string => {
    if (ms === null) return ''
    if (bestSectors[i] !== null && ms <= (bestSectors[i] as number)) return 'purple'
    if (bestLap && ms < bestLap.sectors[i]) return 'green'
    return 'white'
  }

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
            {gamepad ? <span className="pad-chip">PAD · {gamepad}</span> : null}
          </div>
        </div>
        <div className="btn-group" id="drive-controls" tabIndex={-1}>
          <button
            type="button"
            className="hud-btn"
            onClick={() => openEngineer('setup')}
            onPointerEnter={preloadEngineer}
            onFocus={preloadEngineer}
            aria-keyshortcuts="T"
          >
            Setup
            <kbd aria-hidden="true">T</kbd>
          </button>
          <button
            type="button"
            className="hud-btn"
            onClick={() => openEngineer('pitstop')}
            onPointerEnter={preloadEngineer}
            onFocus={preloadEngineer}
            aria-keyshortcuts="B"
          >
            Box
            <kbd aria-hidden="true">B</kbd>
          </button>
          <button
            type="button"
            className="hud-btn"
            onClick={togglePhoto}
            onPointerEnter={preloadPhoto}
            onFocus={preloadPhoto}
            aria-keyshortcuts="P"
          >
            Photo
            <kbd aria-hidden="true">P</kbd>
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
        <div
          className={`drive-flash ${slow.offTrack || slow.scraping ? 'show' : ''} ${
            !slow.offTrack && slow.scraping ? 'amber' : ''
          }`}
          role="status"
        >
          {slow.offTrack ? 'Track limits' : slow.scraping ? 'Floor scraping' : ''}
        </div>
        <div className={`drive-hint ${slow.moved ? '' : 'show'}`} aria-hidden={slow.moved}>
          {gamepad ? (
            <>
              <kbd>RT</kbd> to drive · left stick to steer
            </>
          ) : (
            <>
              <kbd>W</kbd> or <kbd>↑</kbd> to drive · <kbd>A</kbd> <kbd>D</kbd> to steer
            </>
          )}
        </div>
        <div
          className={`drive-split ${split && !result ? 'show' : ''} ${split && split.delta < 0 ? 'faster' : 'slower'}`}
          aria-hidden={!split}
        >
          {split ? (
            <>
              <span className="label">S{split.sector + 1}</span>
              {formatDelta(split.delta)}
            </>
          ) : null}
        </div>
        <div
          className={`drive-result ${result ? 'show' : ''} ${result?.newBest ? 'best' : ''} ${result?.dirty ? 'dirty' : ''}`}
          role="status"
        >
          {result ? (
            <>
              <span className="drive-result-time">{formatLap(result.ms)}</span>
              <span className="drive-result-note">
                {result.dirty
                  ? 'Track limits: lap not counted'
                  : result.newBest
                    ? 'New best lap'
                    : result.position
                      ? `P${result.position} on the board`
                      : 'Lap complete'}
              </span>
            </>
          ) : null}
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
          <div
            className={`tyre-strip ${slow.wear >= 80 ? 'gone' : ''}`}
            style={{ '--tyre': tyre.colour } as CSSProperties}
            aria-label={`${tyre.name} tyres, ${slow.wear} percent worn`}
          >
            <span className="tyre-dot" aria-hidden="true" />
            <span className="tyre-strip-name">{tyre.name}</span>
            <span className="tyre-strip-bar" aria-hidden="true">
              <i style={{ width: `${100 - slow.wear}%` }} />
            </span>
            <span className="tyre-strip-pct">{100 - slow.wear}%</span>
          </div>
        </div>

        <div className="panel drive-laps" aria-label="Lap times">
          <div className="lap-row">
            <span className="label">{lapLabel}</span>
            <span ref={timeRef} className="lap-time current">
              {formatLap(null)}
            </span>
          </div>
          <div className="sector-row" aria-label="Sectors">
            {[0, 1, 2].map((i) => {
              const live = slow.timing && slow.sector === i
              const done = slow.sectors[i]
              // Until this lap reaches a sector, the previous lap's time for it stays up, dimmed.
              const previous = done === null && !live ? (slow.lastSectors?.[i] ?? null) : null
              return (
                <span
                  key={i}
                  className={`sector ${live ? 'live' : ''} ${sectorTone(i, done)} ${
                    previous !== null ? 'prev' : ''
                  } ${slow.dirty && done !== null ? 'dirty' : ''}`}
                >
                  <span className="label">S{i + 1}</span>
                  {live ? (
                    // Its own key: the live span is written by the frame loop, so React must not reuse it.
                    <span key="live" ref={sectorRef}>
                      {formatSector(null)}
                    </span>
                  ) : (
                    <span key="done">{formatSector(done ?? previous)}</span>
                  )}
                </span>
              )
            })}
          </div>
          <div className="lap-row" aria-live="polite">
            <span className="label">
              Last{slow.lastMs !== null && laps.result?.dirty ? ' *' : ''}
            </span>
            <span className="lap-time">{formatLap(slow.lastMs)}</span>
          </div>
          <div className="lap-row">
            <span className="label">Best</span>
            <span className="lap-time best">{formatLap(slow.bestMs)}</span>
          </div>
        </div>
      </footer>

      {slow.pad || gamepad ? (
        <div className="drive-legend" aria-label="Gamepad controls">
          <span>
            <kbd>RT</kbd> throttle
          </span>
          <span>
            <kbd>LT</kbd> brake, reverse
          </span>
          <span>
            <kbd>STICK</kbd>
            <kbd>D-PAD</kbd> steer
          </span>
          <span>
            <kbd>A</kbd> handbrake
          </span>
          <span>
            <kbd>Y</kbd> reset car
          </span>
          <span>
            <kbd>START</kbd> setup
          </span>
          <span>
            <kbd>B</kbd> close panel
          </span>
          <span>
            <kbd>ESC</kbd> workshop
          </span>
        </div>
      ) : (
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
            <kbd>T</kbd> setup
          </span>
          <span>
            <kbd>B</kbd> pit stop
          </span>
          <span>
            <kbd>P</kbd> photo
          </span>
          <span>
            <kbd>G</kbd> engineer
          </span>
          <span>
            <kbd>ESC</kbd> workshop
          </span>
        </div>
      )}
    </motion.div>
  )
}
