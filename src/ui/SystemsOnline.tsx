import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { TEST_DRIVE_ENABLED } from '../lib/flags'
import { PART_COUNT } from '../parts/registry'
import { useWorkshop } from '../state/store'

const SHOW_SECONDS = 5.5
const TITLE = 'SYSTEMS ONLINE'
const LETTER_DELAY = 0.065
const TYPE_START = 0.35

/** Typewriter banner that runs once over the build area when the last part locks in. */
export function SystemsOnline() {
  const celebration = useWorkshop((state) => state.celebration)
  const [expired, setExpired] = useState<number | null>(null)

  useEffect(() => {
    if (celebration === null) return
    const timer = window.setTimeout(() => {
      setExpired(celebration)
      useWorkshop
        .getState()
        .notify(
          TEST_DRIVE_ENABLED
            ? 'Paint shop and test drive unlocked: L to paint, D to drive'
            : 'Paint shop unlocked: press L to open it',
          'success',
        )
    }, SHOW_SECONDS * 1000)
    return () => window.clearTimeout(timer)
  }, [celebration])

  const showing = celebration !== null && expired !== celebration ? celebration : null

  return (
    <AnimatePresence>
      {showing !== null && (
        <motion.div
          key={showing}
          className="systems-online"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.7 } }}
          transition={{ duration: 0.3 }}
        >
          <motion.span
            className="systems-online-line"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.1, duration: 0.9, ease: 'easeOut' }}
          />
          <div className="systems-online-title" aria-label={TITLE}>
            {TITLE.split('').map((letter, index) => (
              <motion.span
                key={index}
                aria-hidden
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: TYPE_START + index * LETTER_DELAY, duration: 0.02 }}
              >
                {letter}
              </motion.span>
            ))}
            <span className="caret" aria-hidden />
          </div>
          <motion.div
            className="systems-online-sub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: TYPE_START + TITLE.length * LETTER_DELAY + 0.3, duration: 0.4 }}
          >
            {PART_COUNT} / {PART_COUNT} PARTS LOCKED · ASSEMBLY COMPLETE
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
