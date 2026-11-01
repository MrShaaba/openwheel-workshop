import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { useWorkshop } from '../state/store'

const TOAST_SECONDS = 2.6

export function Toast() {
  const toast = useWorkshop((state) => state.toast)
  const dismiss = useWorkshop((state) => state.dismissToast)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(dismiss, TOAST_SECONDS * 1000)
    return () => window.clearTimeout(timer)
  }, [toast, dismiss])

  return (
    <div className="toast-slot" role="status" aria-live="assertive" aria-atomic="true">
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.nonce}
            className={`toast ${toast.tone}`}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.22 }}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
