import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { PART_COUNT } from '../parts/registry'
import {
  LIVERY_PATTERNS,
  LIVERY_SCHEMES,
  LIVERY_SWATCHES,
  MAX_CAR_NUMBER,
  MIN_CAR_NUMBER,
  PATTERN_LABELS,
  type Livery,
} from '../state/livery'
import { useWorkshop } from '../state/store'

type ColourKey = 'primary' | 'secondary' | 'accent'

const COLOURS: readonly { key: ColourKey; label: string }[] = [
  { key: 'primary', label: 'Primary' },
  { key: 'secondary', label: 'Secondary' },
  { key: 'accent', label: 'Accent' },
]

const clampNumber = (value: number) =>
  Math.min(MAX_CAR_NUMBER, Math.max(MIN_CAR_NUMBER, Math.round(value)))

/** Slide-in paint shop: pattern, three colours, car number and a few original schemes. */
export function LiveryPanel() {
  const open = useWorkshop((state) => state.liveryOpen && state.installed.length === PART_COUNT)

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="livery"
          className="panel side-card livery-panel"
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 28, transition: { duration: 0.18 } }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          aria-label="Paint shop"
        >
          <LiveryControls />
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

function LiveryControls() {
  const livery = useWorkshop((state) => state.livery)
  const setLivery = useWorkshop((state) => state.setLivery)
  const resetLivery = useWorkshop((state) => state.resetLivery)
  const closeLivery = useWorkshop((state) => state.closeLivery)
  const headingId = useId()
  const numberId = useId()
  const first = useRef<HTMLButtonElement>(null)
  /** Text in the number field while it is being edited; null shows the saved number. */
  const [draft, setDraft] = useState<string | null>(null)

  // Opening moves focus into the panel; closing hands it back to whatever opened it.
  useEffect(() => {
    const previous = document.activeElement
    first.current?.focus()
    return () => {
      if (previous instanceof HTMLElement && document.contains(previous)) previous.focus()
    }
  }, [])

  const commitNumber = () => {
    if (draft !== null) {
      const parsed = Number.parseInt(draft, 10)
      if (Number.isFinite(parsed)) setLivery({ number: clampNumber(parsed) })
    }
    setDraft(null)
  }

  const onNumberKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitNumber()
      event.currentTarget.blur()
    }
  }

  const stepNumber = (delta: number) => setLivery({ number: clampNumber(livery.number + delta) })

  const swatchVars = {
    '--p': livery.primary,
    '--s': livery.secondary,
    '--a': livery.accent,
  } as CSSProperties

  return (
    <>
      <div className="info-head">
        <span className="label">Paint shop · unlocked</span>
        <h2 id={headingId}>Livery</h2>
      </div>

      <section className="livery-section" aria-labelledby={`${headingId}-pattern`}>
        <div className="label" id={`${headingId}-pattern`}>
          Pattern
        </div>
        <div className="livery-patterns" role="group" aria-label="Pattern" style={swatchVars}>
          {LIVERY_PATTERNS.map((pattern, index) => (
            <button
              key={pattern}
              ref={index === 0 ? first : undefined}
              type="button"
              className={`hud-btn pattern-btn ${livery.pattern === pattern ? 'active' : ''}`}
              aria-pressed={livery.pattern === pattern}
              onClick={() => setLivery({ pattern })}
            >
              <span className={`pattern-swatch ${pattern}`} aria-hidden="true" />
              {PATTERN_LABELS[pattern]}
            </button>
          ))}
        </div>
      </section>

      <section className="livery-section" aria-label="Colours">
        {COLOURS.map(({ key, label }) => {
          const inputId = `${headingId}-${key}`
          return (
            <div key={key} className="colour-row">
              <div className="colour-head">
                <label htmlFor={inputId}>{label}</label>
                <span className="colour-value" aria-hidden="true">
                  {livery[key]}
                </span>
                <input
                  id={inputId}
                  className="colour-input"
                  type="color"
                  value={livery[key]}
                  onChange={(event) => setLivery({ [key]: event.target.value } as Partial<Livery>)}
                />
              </div>
              <div className="swatches" role="group" aria-label={`${label} swatches`}>
                {LIVERY_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.hex}
                    type="button"
                    className={`swatch ${livery[key] === swatch.hex ? 'active' : ''}`}
                    style={{ background: swatch.hex }}
                    aria-label={swatch.name}
                    aria-pressed={livery[key] === swatch.hex}
                    onClick={() => setLivery({ [key]: swatch.hex } as Partial<Livery>)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </section>

      <section className="livery-section" aria-labelledby={`${numberId}-label`}>
        <label className="label" id={`${numberId}-label`} htmlFor={numberId}>
          Car number
        </label>
        <div className="number-row">
          <button
            type="button"
            className="hud-btn"
            aria-label="Previous number"
            disabled={livery.number <= MIN_CAR_NUMBER}
            onClick={() => stepNumber(-1)}
          >
            −
          </button>
          <input
            id={numberId}
            className="number-input"
            type="number"
            inputMode="numeric"
            min={MIN_CAR_NUMBER}
            max={MAX_CAR_NUMBER}
            value={draft ?? String(livery.number)}
            onFocus={() => setDraft(String(livery.number))}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitNumber}
            onKeyDown={onNumberKey}
          />
          <button
            type="button"
            className="hud-btn"
            aria-label="Next number"
            disabled={livery.number >= MAX_CAR_NUMBER}
            onClick={() => stepNumber(1)}
          >
            +
          </button>
        </div>
      </section>

      <section className="livery-section" aria-labelledby={`${headingId}-schemes`}>
        <div className="label" id={`${headingId}-schemes`}>
          Schemes
        </div>
        <div className="btn-group">
          {LIVERY_SCHEMES.map((scheme) => (
            <button
              key={scheme.name}
              type="button"
              className="hud-btn"
              onClick={() => setLivery(scheme.livery)}
            >
              <span className="scheme-dots" aria-hidden="true">
                <i style={{ background: scheme.livery.primary }} />
                <i style={{ background: scheme.livery.secondary }} />
                <i style={{ background: scheme.livery.accent }} />
              </span>
              {scheme.name}
            </button>
          ))}
        </div>
      </section>

      <div className="info-actions">
        <button type="button" className="hud-btn" onClick={resetLivery}>
          Default
        </button>
        <button type="button" className="hud-btn" onClick={closeLivery}>
          Close
          <kbd>ESC</kbd>
        </button>
      </div>
    </>
  )
}
