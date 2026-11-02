import { useEffect, useId, useState, type CSSProperties } from 'react'
import { car, fitTyres } from '../drive/session'
import { predictSetup } from '../drive/tuning'
import { TEST_DRIVE_ENABLED } from '../lib/flags'
import {
  brakeBiasPercent,
  SETUP_HELP,
  SETUP_PRESETS,
  SETUP_STEPS,
  TYRE_COMPOUNDS,
  TYRES,
  type CarSetup,
} from '../state/setup'
import { useWorkshop } from '../state/store'
import { SheetsSection } from './SheetsSection'

type SliderKey = 'frontWing' | 'rearWing' | 'rideHeight' | 'brakeBias'

interface SliderSpec {
  key: SliderKey
  label: string
  /** Text at the two ends of the slider. */
  ends: [string, string]
  format: (value: number) => string
}

const SLIDERS: readonly SliderSpec[] = [
  {
    key: 'frontWing',
    label: 'Front wing angle',
    ends: ['Flat', 'Steep'],
    format: (v) => `${v} / 10`,
  },
  {
    key: 'rearWing',
    label: 'Rear wing angle',
    ends: ['Flat', 'Steep'],
    format: (v) => `${v} / 10`,
  },
  { key: 'rideHeight', label: 'Ride height', ends: ['Low', 'High'], format: (v) => `${v} / 10` },
  {
    key: 'brakeBias',
    label: 'Brake bias',
    ends: ['Rear', 'Front'],
    format: (v) => `${brakeBiasPercent(v)}% front`,
  },
]

/** Live tyre wear while the car is on the track, refreshed a few times a second. */
function useTyreWear(active: boolean): number {
  const [wear, setWear] = useState(() => (active ? car.tyreWear : 0))
  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => setWear(car.tyreWear), 250)
    return () => window.clearInterval(timer)
  }, [active])
  return wear
}

/**
 * Car setup: wings, tyres, ride height and brake bias, each with a plain one-line explanation and
 * a prediction of what the driver will feel. Changes apply to the next frame on the track.
 */
export function SetupPanel() {
  const setup = useWorkshop((state) => state.setup)
  const setSetup = useWorkshop((state) => state.setSetup)
  const resetSetup = useWorkshop((state) => state.resetSetup)
  const notify = useWorkshop((state) => state.notify)
  const trackScene = useWorkshop((state) => state.trackScene)
  const id = useId()
  const prediction = predictSetup(setup)
  const wear = useTyreWear(trackScene)
  const tyre = TYRES[setup.tyre]

  const isPreset = (preset: Omit<CarSetup, 'tyre'>) =>
    preset.frontWing === setup.frontWing &&
    preset.rearWing === setup.rearWing &&
    preset.rideHeight === setup.rideHeight &&
    preset.brakeBias === setup.brakeBias

  return (
    <div className="setup">
      <div className="setup-predict" aria-label="What this setup does">
        <Stat label="Top speed" value={`${prediction.topSpeed}`} unit="km/h" />
        <Stat label="Turn 1" value={`${prediction.cornerSpeed}`} unit="km/h" />
        <Stat label="Tyre life" value={`${prediction.tyreLaps}`} unit="laps" />
        <Stat label="Stop from 200" value={`${prediction.brakingDistance}`} unit="m" />
      </div>

      <div className="setup-grid">
        {SLIDERS.map((slider) => {
          const inputId = `${id}-${slider.key}`
          const value = setup[slider.key]
          return (
            <div key={slider.key} className="setup-row">
              <div className="setup-row-head">
                <label htmlFor={inputId}>{slider.label}</label>
                <output htmlFor={inputId} className="setup-value">
                  {slider.format(value)}
                </output>
              </div>
              <div className="setup-slider">
                <span className="setup-end">{slider.ends[0]}</span>
                <input
                  id={inputId}
                  type="range"
                  min={0}
                  max={SETUP_STEPS}
                  step={1}
                  value={value}
                  style={{ '--fill': `${(value / SETUP_STEPS) * 100}%` } as CSSProperties}
                  onChange={(event) => setSetup({ [slider.key]: Number(event.target.value) })}
                />
                <span className="setup-end">{slider.ends[1]}</span>
              </div>
              <p className="setup-help">{SETUP_HELP[slider.key]}</p>
            </div>
          )
        })}

        <div className="setup-row setup-tyres">
          <div className="setup-row-head">
            <span id={`${id}-tyre`}>Tyre compound</span>
            <span className="setup-value">{tyre.name}</span>
          </div>
          <div className="tyre-options" role="group" aria-labelledby={`${id}-tyre`}>
            {TYRE_COMPOUNDS.map((compound) => {
              const info = TYRES[compound]
              const active = compound === setup.tyre
              return (
                <button
                  key={compound}
                  type="button"
                  className={`hud-btn tyre-btn ${active ? 'active' : ''}`}
                  aria-pressed={active}
                  onClick={() => {
                    if (!active) setSetup({ tyre: compound })
                  }}
                >
                  <span
                    className="tyre-swatch"
                    style={{ '--tyre': info.colour } as CSSProperties}
                    aria-hidden="true"
                  />
                  <span className="tyre-name">{info.name}</span>
                  <span className="tyre-bars" aria-hidden="true">
                    <i style={{ width: `${Math.round((info.grip - 0.85) * 400)}%` }} />
                    <i style={{ width: `${Math.round((info.life / 360) * 100)}%` }} />
                  </span>
                  <span className="visually-hidden">
                    {`Grip ${Math.round(info.grip * 100)} percent, lasts about ${Math.round(info.life / 22)} laps.`}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="setup-help">
            {SETUP_HELP.tyre} {tyre.blurb}
          </p>
          {trackScene && (
            <div className="tyre-wear" aria-live="polite">
              <span className="label">Wear</span>
              <span className="tyre-wear-bar" aria-hidden="true">
                <i
                  style={{ width: `${Math.round(wear * 100)}%`, background: tyre.colour }}
                  className={wear > 0.8 ? 'gone' : ''}
                />
              </span>
              <span className="setup-value">{Math.round(wear * 100)}%</span>
              <button
                type="button"
                className="hud-btn"
                disabled={wear < 0.02}
                onClick={() => {
                  fitTyres()
                  notify(`Fresh ${tyre.name.toLowerCase()} tyres fitted`, 'success')
                }}
              >
                Fit new tyres
              </button>
            </div>
          )}
        </div>
      </div>

      <SheetsSection />

      <div className="setup-foot">
        <div className="btn-group" role="group" aria-label="Setup presets">
          {SETUP_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className={`hud-btn ${isPreset(preset.setup) ? 'active' : ''}`}
              aria-pressed={isPreset(preset.setup)}
              title={preset.hint}
              onClick={() => setSetup(preset.setup)}
            >
              {preset.name}
            </button>
          ))}
          <button type="button" className="hud-btn" onClick={resetSetup}>
            Default
          </button>
        </div>
        <p className="setup-note">
          {TEST_DRIVE_ENABLED
            ? trackScene
              ? 'Changes apply straight away. Close the panel and feel the difference.'
              : 'Saved with your build. Press D to take it onto the circuit.'
            : 'Saved with your build. Switch on the test drive (VITE_ENABLE_TEST_DRIVE) to feel it on track.'}
        </p>
      </div>
    </div>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="setup-stat">
      <span className="label">{label}</span>
      <span className="setup-stat-value">
        {value}
        <small>{unit}</small>
      </span>
    </div>
  )
}
