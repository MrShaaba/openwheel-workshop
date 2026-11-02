import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useId, useRef, type KeyboardEvent } from 'react'
import { TEST_DRIVE_ENABLED } from '../lib/flags'
import { useWorkshop, type EngineerView } from '../state/store'
import { BADGES } from '../state/badges'
import '../styles/engineer.css'
import { PitStopGame } from './PitStopGame'
import { SetupPanel } from './SetupPanel'

interface Tab {
  id: EngineerView
  label: string
  /** Shown when the test drive flag is off and the tab needs it. */
  needsDrive: boolean
}

const TABS: readonly Tab[] = [
  { id: 'setup', label: 'Car setup', needsDrive: false },
  { id: 'pitstop', label: 'Pit stop', needsDrive: false },
]

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [tabindex="0"]'

/**
 * The Race engineer: a modal over the workshop or the track with one tab per job. On the track
 * the car waits while it is open. Esc closes it; the tab strip takes the arrow keys.
 */
export default function EngineerPanel() {
  const view = useWorkshop((state) => state.engineer)
  const open = view !== null
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="engineer"
          className="engineer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={{ duration: 0.2 }}
          onClick={() => useWorkshop.getState().closeEngineer()}
        >
          <EngineerDialog view={view} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function EngineerDialog({ view }: { view: EngineerView }) {
  const openEngineer = useWorkshop((state) => state.openEngineer)
  const closeEngineer = useWorkshop((state) => state.closeEngineer)
  const trackScene = useWorkshop((state) => state.trackScene)
  const badges = useWorkshop((state) => state.badges)
  const titleId = useId()
  const root = useRef<HTMLDivElement>(null)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  // The active tab (or the first control) takes focus on open; the opener gets it back on close.
  useEffect(() => {
    const opener = document.activeElement
    const index = TABS.findIndex((tab) => tab.id === view)
    const tab = tabs.current[Math.max(0, index)]
    if (tab) tab.focus()
    else root.current?.querySelector<HTMLElement>(`.engineer-body ${FOCUSABLE}`)?.focus()
    return () => {
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus()
    }
    // Only on mount: switching tabs keeps focus where the user put it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Shortcuts on window must not fire while the panel has focus.
    event.stopPropagation()
    if (event.key === 'Escape') {
      event.preventDefault()
      closeEngineer()
      return
    }
    if (event.key === 'Tab' && root.current) {
      const focusable = Array.from(root.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (delta === 0) return
    event.preventDefault()
    const next = TABS[(index + delta + TABS.length) % TABS.length]
    openEngineer(next.id)
    tabs.current[(index + delta + TABS.length) % TABS.length]?.focus()
  }

  return (
    <motion.div
      ref={root}
      className="panel engineer"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      initial={{ opacity: 0, y: 12, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={onKeyDown}
    >
      <header className="engineer-head">
        <div>
          <span className="label">
            Race engineer{trackScene ? ' · car paused' : ''}
            {!TEST_DRIVE_ENABLED ? ' · test drive off' : ''}
          </span>
          <h2 id={titleId}>{TABS.find((tab) => tab.id === view)?.label ?? 'Race engineer'}</h2>
        </div>
        {badges.length > 0 && (
          <ul className="badge-list" aria-label="Badges">
            {badges.map((badge) => (
              <li key={badge} className="badge" title={BADGES[badge].blurb}>
                <span aria-hidden="true">★</span> {BADGES[badge].name}
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="hud-btn"
          onClick={closeEngineer}
          aria-keyshortcuts="Escape"
        >
          Close
          <kbd aria-hidden="true">ESC</kbd>
        </button>
      </header>

      {TABS.length > 1 && (
        <div className="engineer-tabs" role="tablist" aria-label="Race engineer">
          {TABS.map((tab, index) => (
            <button
              key={tab.id}
              ref={(node) => {
                tabs.current[index] = node
              }}
              type="button"
              role="tab"
              className={`hud-btn ${tab.id === view ? 'active' : ''}`}
              aria-selected={tab.id === view}
              tabIndex={tab.id === view ? 0 : -1}
              onClick={() => openEngineer(tab.id)}
              onKeyDown={(event) => onTabKey(event, index)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="engineer-body" role={TABS.length > 1 ? 'tabpanel' : undefined}>
        {view === 'setup' && <SetupPanel />}
        {view === 'pitstop' && <PitStopGame />}
      </div>
    </motion.div>
  )
}
