import { useEffect } from 'react'
import { PART_COUNT } from '../parts/registry'
import { useWorkshop } from '../state/store'

/** Boot screen minimum plus its fade, so the toast lands on the live scene. */
const RESUME_TOAST_DELAY_MS = 2400

/** Tells the user once, after boot, that a saved build was restored. */
export function useResumeNotice(): void {
  useEffect(() => {
    let timer = 0
    const announce = () => {
      const count = useWorkshop.getState().installed.length
      if (count === 0) return
      timer = window.setTimeout(() => {
        useWorkshop
          .getState()
          .notify(
            count === PART_COUNT
              ? 'Saved build restored: assembly complete'
              : `Resumed saved build: ${count} of ${PART_COUNT} parts`,
          )
      }, RESUME_TOAST_DELAY_MS)
    }
    if (useWorkshop.getState().ready) announce()
    const unsubscribe = useWorkshop.subscribe((state, previous) => {
      if (state.ready && !previous.ready) announce()
    })
    return () => {
      unsubscribe()
      window.clearTimeout(timer)
    }
  }, [])
}
