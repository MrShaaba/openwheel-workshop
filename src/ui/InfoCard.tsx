import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef } from 'react'
import { dependentsOf } from '../parts/graph'
import { INFO_CARDS } from '../parts/infoCards'
import { PART_BY_ID, STAGE_BY_ID } from '../parts/registry'
import { useWorkshop } from '../state/store'

/** Slide-in card for the inspected part: what it does, two facts, how it connects, detach. */
export function InfoCard() {
  const inspecting = useWorkshop((state) => state.inspecting)
  const installed = useWorkshop((state) => state.installed)
  const inspect = useWorkshop((state) => state.inspect)
  const detach = useWorkshop((state) => state.detach)
  const notify = useWorkshop((state) => state.notify)

  const dependents = useMemo(
    () => (inspecting ? dependentsOf(inspecting, installed) : []),
    [inspecting, installed],
  )
  const heading = useRef<HTMLHeadingElement>(null)

  // Opening moves focus to the card title; closing hands it back to whatever opened the card.
  useEffect(() => {
    if (!inspecting) return
    const opener = document.activeElement
    heading.current?.focus({ preventScroll: true })
    return () => {
      if (opener instanceof HTMLElement && opener !== document.body && document.contains(opener)) {
        opener.focus()
      }
    }
  }, [inspecting])

  return (
    <AnimatePresence>
      {inspecting && (
        <motion.aside
          key={inspecting}
          className="panel info-card"
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 28, transition: { duration: 0.18 } }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          aria-live="polite"
        >
          {(() => {
            const part = PART_BY_ID[inspecting]
            const card = INFO_CARDS[inspecting]
            const stage = STAGE_BY_ID[part.stage]
            return (
              <>
                <div className="info-head">
                  <span className="label">
                    {stage.code} · {stage.name} · {part.code}
                  </span>
                  <h2 ref={heading} tabIndex={-1}>
                    {card.title}
                  </h2>
                </div>
                <p className="info-role">{card.role}</p>
                <div className="label">Engineering notes</div>
                <ul className="info-facts">
                  {card.facts.map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
                <div className="label">How it connects</div>
                <p className="info-connects">{card.connects}</p>
                {dependents.length > 0 && (
                  <p className="info-warning">
                    Detaching also removes {dependents.map((id) => PART_BY_ID[id].name).join(', ')}.
                  </p>
                )}
                <div className="info-actions">
                  <button
                    type="button"
                    className="hud-btn danger"
                    onClick={() => {
                      const removed = dependents.length
                      detach(inspecting)
                      notify(
                        removed > 0
                          ? `Detached ${card.title} and ${removed} dependent part${removed === 1 ? '' : 's'}`
                          : `Detached ${card.title}`,
                      )
                    }}
                  >
                    Detach
                  </button>
                  <button
                    type="button"
                    className="hud-btn"
                    onClick={() => inspect(null)}
                    aria-keyshortcuts="Escape"
                  >
                    Close
                    <kbd aria-hidden="true">ESC</kbd>
                  </button>
                </div>
              </>
            )
          })()}
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
