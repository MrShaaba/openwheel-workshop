import { AnimatePresence, motion } from 'framer-motion'
import { PART_BY_ID } from '../parts/registry'
import { useWorkshop } from '../state/store'

/** Name of the part under the cursor, when nothing is being inspected. */
export function HoverLabel() {
  const hovered = useWorkshop((state) => state.hovered)
  const inspecting = useWorkshop((state) => state.inspecting)
  const installed = useWorkshop((state) => state.installed)
  const show = hovered && !inspecting
  const isInstalled = hovered ? installed.includes(hovered) : false

  return (
    <div className="hover-slot">
      <AnimatePresence>
        {show && (
          <motion.div
            key={hovered}
            className="hover-label"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <span className="label">
              {isInstalled ? 'Installed · click to inspect' : 'Hologram'}
            </span>
            <strong>{PART_BY_ID[hovered].name}</strong>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
