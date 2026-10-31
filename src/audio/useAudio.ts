import { useEffect } from 'react'
import { useWorkshop } from '../state/store'
import { synth } from './synth'

/**
 * Connects the store to the synth: unlocks audio on the first gesture, follows the mute flag,
 * and plays servo, lock-in, materialise, denied and detach sounds from state transitions.
 */
export function useAudio(): void {
  useEffect(() => {
    const unlock = () => synth.unlock()
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest('.hud-btn')) synth.blip()
    }
    window.addEventListener('pointerdown', unlock, { passive: true })
    window.addEventListener('keydown', unlock)
    document.addEventListener('click', onClick)
    synth.setMuted(useWorkshop.getState().muted)

    const unsubscribe = useWorkshop.subscribe((state, previous) => {
      if (state.muted !== previous.muted) synth.setMuted(state.muted)

      if (state.installing !== previous.installing) {
        if (state.installing) synth.servoStart()
        else {
          synth.servoStop()
          if (state.installed.length > previous.installed.length) {
            synth.clunk()
            synth.materialize()
          }
        }
      }

      if (state.installed.length < previous.installed.length) synth.detach()
      if (state.toast !== previous.toast && state.toast?.tone === 'denied') synth.denied()
      if (state.inspecting !== previous.inspecting && state.inspecting) synth.blip(1500)
    })

    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      document.removeEventListener('click', onClick)
      unsubscribe()
    }
  }, [])
}
