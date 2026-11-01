import { useEffect } from 'react'
import { preloadDrive } from '../drive/lazy'
import { TEST_DRIVE_ENABLED } from '../lib/flags'
import { remainingIds } from '../parts/graph'
import { PART_BY_ID, PART_COUNT } from '../parts/registry'
import { useInstallable, useNextGuided } from '../state/selectors'
import { freshInstalls } from '../state/session'
import { useWorkshop } from '../state/store'

export function Objective() {
  const mode = useWorkshop((state) => state.mode)
  const installedCount = useWorkshop((state) => state.installed.length)
  const installing = useWorkshop((state) => state.installing)
  const inspecting = useWorkshop((state) => state.inspecting)
  const exploded = useWorkshop((state) => state.exploded)
  const assembling = useWorkshop((state) => state.assembling)
  const attemptInstall = useWorkshop((state) => state.attemptInstall)
  const startAssembly = useWorkshop((state) => state.startAssembly)
  const stopAssembly = useWorkshop((state) => state.stopAssembly)
  const finishAssembly = useWorkshop((state) => state.finishAssembly)
  const liveryOpen = useWorkshop((state) => state.liveryOpen)
  const toggleLivery = useWorkshop((state) => state.toggleLivery)
  const startDrive = useWorkshop((state) => state.startDrive)
  const next = useNextGuided()
  const installable = useInstallable()
  const complete = installedCount === PART_COUNT

  // Fetch the drive chunk as soon as it could be wanted, so the swap behind the fade is instant.
  useEffect(() => {
    if (complete && TEST_DRIVE_ENABLED) preloadDrive()
  }, [complete])

  let label = 'CURRENT OBJECTIVE'
  let title: string
  let hint: string

  if (inspecting) {
    label = 'INSPECTING'
    title = PART_BY_ID[inspecting].name
    hint = 'Read the card, detach the part, or press ESC to return'
  } else if (exploded) {
    label = 'EXPLODED VIEW'
    title = 'Assembly breakdown'
    hint = 'Hover a part to identify it. Press E to collapse the car.'
  } else if (complete) {
    label = 'STATUS'
    title = 'Assembly complete'
    hint = liveryOpen
      ? 'Pick a pattern, colours and a number. Changes are saved with the build.'
      : TEST_DRIVE_ENABLED
        ? 'Paint it with L, take it out with D, inspect any part, press E for the exploded view, or Reset build.'
        : 'Open the paint shop with L, inspect any part, press E for the exploded view, or Reset build.'
  } else if (assembling) {
    label = 'ASSEMBLING'
    title = installing ? PART_BY_ID[installing].name : 'Sequencing parts'
    hint = 'Automatic build in progress. Orbit freely, or press ESC to stop.'
  } else if (installing) {
    label = 'INSTALLING'
    title = PART_BY_ID[installing].name
    hint = 'Locking into position'
  } else if (mode === 'guided' && next) {
    title = `Install ${PART_BY_ID[next].name}`
    hint = 'Click the highlighted hologram, drag it to its outline, or press SPACE'
  } else {
    label = 'FREE BUILD'
    title = `${installable.length} part${installable.length === 1 ? '' : 's'} available`
    hint = 'Any hologram with its dependencies met can be installed'
  }

  const candidate = mode === 'guided' ? next : (installable[0] ?? null)
  const canInstall = !complete && !installing && !exploded && candidate !== null

  const skipToEnd = () => {
    // Everything left materialises together, so the whole car wipes in at once.
    remainingIds(useWorkshop.getState().installed).forEach((id) => freshInstalls.add(id))
    finishAssembly()
  }

  return (
    <section
      id="objective"
      className="panel objective"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      tabIndex={-1}
    >
      <div className="label">{label}</div>
      <div className="objective-title">{title}</div>
      <div className="objective-hint">{hint}</div>
      {complete && !inspecting && !exploded && (
        <div className="objective-actions">
          <button
            type="button"
            className={`hud-btn ${liveryOpen ? 'active' : ''}`}
            onClick={toggleLivery}
            aria-pressed={liveryOpen}
            aria-keyshortcuts="L"
          >
            Paint shop
            <kbd aria-hidden="true">L</kbd>
          </button>
          {TEST_DRIVE_ENABLED && (
            <button type="button" className="hud-btn" onClick={startDrive} aria-keyshortcuts="D">
              Test drive
              <kbd aria-hidden="true">D</kbd>
            </button>
          )}
        </div>
      )}
      {!complete && !inspecting && !exploded && (
        <div className="objective-actions">
          {assembling ? (
            <>
              <button
                type="button"
                className="hud-btn"
                onClick={stopAssembly}
                aria-keyshortcuts="Escape"
              >
                Stop
                <kbd aria-hidden="true">ESC</kbd>
              </button>
              <button type="button" className="hud-btn" onClick={skipToEnd}>
                Skip to end
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="hud-btn"
                disabled={!canInstall}
                onClick={() => candidate && attemptInstall(candidate)}
                aria-keyshortcuts="Space"
              >
                Install
                <kbd aria-hidden="true">SPACE</kbd>
              </button>
              <button
                type="button"
                className="hud-btn"
                disabled={installing !== null}
                onClick={startAssembly}
              >
                Assemble all
              </button>
            </>
          )}
        </div>
      )}
    </section>
  )
}
