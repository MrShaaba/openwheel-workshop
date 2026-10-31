import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { PART_COUNT } from '../parts/registry'
import { useWorkshop } from '../state/store'

const MIN_BOOT_MS = 1900

const LINES = [
  'initialising holographic bay',
  'calibrating build platform',
  `loading part manifest [${PART_COUNT} items]`,
  'compiling hologram shaders',
  'linking camera rig',
]

/** Boot-sequence overlay shown until the first frame renders and the sequence has played. */
export function LoadingScreen() {
  const ready = useWorkshop((state) => state.ready)
  const [elapsed, setElapsed] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setElapsed(true), MIN_BOOT_MS)
    return () => window.clearTimeout(timer)
  }, [])

  const show = !(ready && elapsed)

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="boot"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.7, ease: 'easeInOut' } }}
        >
          <div className="boot-inner">
            <div className="boot-title">OPEN-WHEEL WORKSHOP</div>
            <motion.div
              className="boot-lines"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.26 } } }}
            >
              {LINES.map((line) => (
                <motion.div
                  key={line}
                  variants={{ hidden: { opacity: 0, x: -6 }, show: { opacity: 1, x: 0 } }}
                  transition={{ duration: 0.2 }}
                >
                  {'> '}
                  {line} <span className="ok">OK</span>
                </motion.div>
              ))}
              <motion.div
                variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
                className="ok"
              >
                {'> '}SYSTEMS READY
              </motion.div>
            </motion.div>
            <div className="boot-bar">
              <span />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
