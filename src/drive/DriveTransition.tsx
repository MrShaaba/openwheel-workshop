import { useEffect } from 'react'
import { useWorkshop } from '../state/store'

/** How long the fade to black runs before the scene swaps underneath it. */
const SWAP_MS = 340

/**
 * Covers the screen while the workshop and the track trade places. `driving` flips at once in the
 * store; this component flips `trackScene` once the overlay is opaque, then the overlay clears.
 */
export function DriveTransition() {
  const driving = useWorkshop((state) => state.driving)
  const trackScene = useWorkshop((state) => state.trackScene)

  useEffect(() => {
    const timer = window.setTimeout(
      () => useWorkshop.getState().setTrackScene(driving),
      driving === useWorkshop.getState().trackScene ? 0 : SWAP_MS,
    )
    return () => window.clearTimeout(timer)
  }, [driving])

  return <div className={`scene-fade${driving !== trackScene ? ' in' : ''}`} aria-hidden="true" />
}
