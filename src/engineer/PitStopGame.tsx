import { useCallback, useEffect, useRef, useState } from 'react'
import { synth } from '../audio/synth'
import { fitTyres } from '../drive/session'
import { TYRES } from '../state/setup'
import { useWorkshop } from '../state/store'
import {
  BADGE_MS,
  createPitStop,
  currentStep,
  elapsedMs,
  formatStop,
  jacksUp,
  keysFor,
  PIT_FACTS,
  press,
  promptFor,
  rateStop,
  startClock,
  WHEEL_KEYS,
  WHEEL_NAMES,
  WHEELS,
  wheelsOff,
  wheelsOn,
  type PitStop,
  type Wheel,
} from './pitstop'

type Phase = 'ready' | 'arriving' | 'stopping' | 'done'

/** How long the car takes to roll into the box. */
const ARRIVE_MS = 1700
const KEYS = new Set([' ', 'Enter', '1', '2', '3', '4'])

/** Where each wheel sits on the top-down car drawing, in SVG units. */
const WHEEL_POS: Record<Wheel, [number, number]> = {
  fl: [62, 78],
  fr: [138, 78],
  rl: [60, 212],
  rr: [140, 212],
}

/**
 * The pit-stop challenge: call the car in, then hit the prompts in order (jacks, four wheels off,
 * four new tyres on, jacks down, release) as fast as you can. Wrong keys cost half a second.
 * Clicking a wheel or the jacks works as well as the keys. On the track a finished stop fits fresh tyres.
 */
export function PitStopGame() {
  const bestMs = useWorkshop((state) => state.pitBestMs)
  const recordPitStop = useWorkshop((state) => state.recordPitStop)
  const trackScene = useWorkshop((state) => state.trackScene)
  const compound = useWorkshop((state) => state.setup.tyre)
  const [phase, setPhase] = useState<Phase>('ready')
  const [stop, setStop] = useState<PitStop>(() => createPitStop())
  const [, bump] = useState(0)
  const [shake, setShake] = useState(0)
  const [fact] = useState(() => PIT_FACTS[Math.floor(Math.random() * PIT_FACTS.length)])
  const clock = useRef<HTMLSpanElement>(null)
  const arrival = useRef<number | null>(null)
  const finished = useRef(false)
  const cta = useRef<HTMLButtonElement>(null)

  // Before and after a stop, the button Space should press is the focused one.
  useEffect(() => {
    if (phase === 'ready' || phase === 'done') cta.current?.focus()
  }, [phase])

  const begin = useCallback(() => {
    setStop(createPitStop())
    finished.current = false
    arrival.current = performance.now()
    setPhase('arriving')
    synth.blip(700)
  }, [])

  // The car rolls in; the clock starts the moment it stops.
  useEffect(() => {
    if (phase !== 'arriving') return
    const timer = window.setTimeout(() => {
      setStop((current) => {
        startClock(current, performance.now())
        return current
      })
      setPhase('stopping')
      synth.clunk()
    }, ARRIVE_MS)
    return () => window.clearTimeout(timer)
  }, [phase])

  // The running clock writes straight into the DOM.
  useEffect(() => {
    if (phase !== 'stopping') return
    let frame = 0
    const tick = () => {
      if (clock.current) clock.current.textContent = formatStop(elapsedMs(stop, performance.now()))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [phase, stop])

  const feed = useCallback(
    (key: string) => {
      if (phase === 'ready' || phase === 'done') {
        if (key === ' ' || key === 'Enter') begin()
        return
      }
      if (phase !== 'stopping') return
      const step = currentStep(stop)
      const result = press(stop, key, performance.now())
      if (result === 'ignored') return
      if (result === 'wrong') {
        synth.denied()
        setShake((n) => n + 1)
      } else {
        if (step?.kind === 'wheel-off' || step?.kind === 'wheel-on') synth.wheelGun()
        else if (step?.kind === 'go') synth.engineRev()
        else synth.clunk()
      }
      if (result === 'done' && !finished.current) {
        finished.current = true
        const ms = elapsedMs(stop, performance.now())
        recordPitStop(ms, stop.mistakes)
        if (trackScene) {
          fitTyres()
          useWorkshop
            .getState()
            .notify(`Fresh ${TYRES[compound].name.toLowerCase()} tyres fitted`, 'success')
        }
        setPhase('done')
      }
      bump((n) => n + 1)
    },
    [phase, stop, begin, recordPitStop, trackScene, compound],
  )

  // The game's keys are taken before anything else sees them; Esc and Tab pass through.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return
      if (!KEYS.has(event.key)) return
      // Outside a stop, Space on the focused button is that button's own click.
      if (event.key === ' ' && event.target instanceof HTMLButtonElement && phase !== 'stopping')
        return
      event.preventDefault()
      event.stopPropagation()
      feed(event.key)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [feed, phase])

  const step = phase === 'stopping' ? currentStep(stop) : null
  const prompt = step ? promptFor(step) : null
  const off = wheelsOff(stop)
  const on = wheelsOn(stop)
  const up = phase === 'stopping' && jacksUp(stop)
  // The running clock is written by the animation frame above; render only reads a finished one.
  const total = phase === 'done' ? elapsedMs(stop, stop.finishedAt ?? 0) : 0
  const rating = phase === 'done' ? rateStop(total, stop.mistakes) : null
  const stepIndex = Math.min(stop.index, stop.steps.length)
  const wantsWheel =
    step && (step.kind === 'wheel-off' || step.kind === 'wheel-on') ? step.wheel : null
  const wantsJacks = step?.kind === 'jacks-up' || step?.kind === 'jacks-down'
  const wantsGo = step?.kind === 'go'
  const carY = phase === 'ready' ? -300 : phase === 'arriving' ? 0 : phase === 'done' ? -320 : 0

  return (
    <div className="pit" aria-live="off">
      <div className="pit-top">
        <div className="pit-clock-block">
          <span className="label">{phase === 'done' ? 'Your stop' : 'Stop clock'}</span>
          <span ref={clock} className="pit-clock" aria-live={phase === 'done' ? 'polite' : 'off'}>
            {phase === 'stopping'
              ? formatStop(total)
              : phase === 'done'
                ? formatStop(total)
                : '0.000'}
          </span>
        </div>
        <div className="pit-best">
          <span className="label">Best</span>
          <span className="pit-best-value">{bestMs === null ? '--.---' : formatStop(bestMs)}</span>
        </div>
        <div className="pit-progress" aria-label={`Step ${stepIndex} of ${stop.steps.length}`}>
          {stop.steps.map((_, index) => (
            <i
              key={index}
              className={index < stepIndex ? 'done' : index === stepIndex ? 'now' : ''}
            />
          ))}
        </div>
      </div>

      <div className={`pit-stage ${shake % 2 ? 'shake-a' : 'shake-b'} ${shake ? 'shaken' : ''}`}>
        <svg
          className="pit-box"
          viewBox="0 0 200 300"
          role="img"
          aria-label="Pit box, car from above"
        >
          {/* The box and its marks. */}
          <rect x="14" y="26" width="172" height="248" className="pit-box-floor" />
          <path
            d="M20 40h20M20 40v20M180 40h-20M180 40v20M20 260h20M20 260v-20M180 260h-20M180 260v-20"
            className="pit-box-mark"
          />
          <line x1="100" y1="26" x2="100" y2="274" className="pit-box-centre" />
          <g
            style={{
              transform: `translateY(${carY}px)`,
              transition:
                phase === 'arriving'
                  ? `transform ${ARRIVE_MS}ms cubic-bezier(0.2, 0.9, 0.3, 1)`
                  : phase === 'done'
                    ? 'transform 0.9s cubic-bezier(0.6, 0, 0.9, 0.6)'
                    : 'none',
            }}
          >
            {/* Jacks */}
            <rect x="88" y="22" width="24" height="12" className={`pit-jack ${up ? 'up' : ''}`} />
            <rect x="88" y="266" width="24" height="12" className={`pit-jack ${up ? 'up' : ''}`} />
            {/* Body */}
            <path
              d="M100 32 L108 60 L124 70 L124 95 L112 100 L112 160 L126 170 L136 198 L136 232 L118 240 L82 240 L64 232 L64 198 L74 170 L88 160 L88 100 L76 95 L76 70 L92 60 Z"
              className="pit-body"
            />
            <rect x="60" y="238" width="80" height="8" className="pit-wing" />
            <rect x="70" y="40" width="60" height="6" className="pit-wing" />
            <circle cx="100" cy="128" r="9" className="pit-halo" />
            {WHEELS.map((wheel) => {
              const [x, y] = WHEEL_POS[wheel]
              const state = on.has(wheel) ? 'new' : off.has(wheel) ? 'off' : 'old'
              const wanted = wantsWheel === wheel
              return (
                <g key={wheel} className={`pit-wheel ${state} ${wanted ? 'wanted' : ''}`}>
                  <rect x={x - 11} y={y - 17} width="22" height="34" rx="4" className="pit-tyre" />
                  <text x={x} y={y + 4} textAnchor="middle" className="pit-key">
                    {WHEEL_KEYS[wheel]}
                  </text>
                </g>
              )
            })}
          </g>
          {/* Gantry light */}
          <circle
            cx="100"
            cy="12"
            r="7"
            className={`pit-light ${wantsGo ? 'green' : phase === 'stopping' ? 'red' : ''}`}
          />
        </svg>

        <div className="pit-side">
          {phase === 'ready' && (
            <>
              <p className="pit-title">Box, box!</p>
              <p className="pit-text">
                Call the car in, then hit each prompt as fast as you can: jacks up, four wheels off,
                four new tyres on, jacks down, and release when the light goes green.
              </p>
              <p className="pit-text">
                Press the number on the wheel (or click it) and <kbd>SPACE</kbd> for the jacks and
                the release. A wrong key costs half a second.
              </p>
              <button ref={cta} type="button" className="hud-btn active pit-cta" onClick={begin}>
                Call the car in
                <kbd aria-hidden="true">SPACE</kbd>
              </button>
            </>
          )}
          {phase === 'arriving' && (
            <>
              <p className="pit-title">Car coming in…</p>
              <p className="pit-text">Hands on the guns. The clock starts when it stops.</p>
            </>
          )}
          {phase === 'stopping' && prompt && (
            <>
              <p className="pit-prompt" role="status" aria-live="assertive">
                {prompt.title}
              </p>
              <p className="pit-prompt-key">
                <kbd>{prompt.hint}</kbd>
              </p>
              <div className="pit-buttons">
                <button
                  type="button"
                  className={`hud-btn ${wantsJacks || wantsGo ? 'active' : ''}`}
                  onClick={() => feed(' ')}
                >
                  {wantsGo ? 'Release' : 'Jacks'}
                  <kbd aria-hidden="true">SPACE</kbd>
                </button>
                {WHEELS.map((wheel) => (
                  <button
                    key={wheel}
                    type="button"
                    className={`hud-btn ${wantsWheel === wheel ? 'active' : ''}`}
                    aria-label={`${WHEEL_NAMES[wheel]} wheel`}
                    onClick={() => feed(WHEEL_KEYS[wheel])}
                  >
                    {WHEEL_NAMES[wheel]
                      .replace(' ', ' ')
                      .split(' ')
                      .map((word) => word[0])
                      .join('')}
                    <kbd aria-hidden="true">{WHEEL_KEYS[wheel]}</kbd>
                  </button>
                ))}
              </div>
              {stop.mistakes > 0 && (
                <p className="pit-text warn">
                  {stop.mistakes} wrong key{stop.mistakes === 1 ? '' : 's'}: +
                  {formatStop(stop.penaltyMs)} s
                </p>
              )}
            </>
          )}
          {phase === 'done' && rating && (
            <>
              <p className="pit-title">{rating.title}</p>
              <p className="pit-result">
                {formatStop(total)} s
                {stop.mistakes > 0 && <small> incl. {formatStop(stop.penaltyMs)} s penalty</small>}
              </p>
              <p className="pit-text">{rating.blurb}</p>
              {bestMs !== null && total <= bestMs && (
                <p className="pit-text best">New best time!</p>
              )}
              {total <= BADGE_MS && stop.mistakes === 0 ? null : (
                <p className="pit-text">
                  Under {formatStop(BADGE_MS)} s with no mistakes earns the Pit crew badge.
                </p>
              )}
              <button ref={cta} type="button" className="hud-btn active pit-cta" onClick={begin}>
                Again
                <kbd aria-hidden="true">SPACE</kbd>
              </button>
            </>
          )}
          <p className="pit-fact">
            <span className="label">Did you know</span> {fact}
          </p>
        </div>
      </div>
      <p className="visually-hidden">
        Keys: {step ? keysFor(step).join(' or ') : 'Space to start'}
      </p>
    </div>
  )
}
