import { useEffect } from 'react'
import { encodeSetup, setupFromHash } from '../state/sheets'
import { useWorkshop } from '../state/store'

/**
 * A `#setup=f7r8h2b6s` hash, on arrival or pasted into the address bar later, loads that setup,
 * says so once the scene is up, and clears the hash so a reload does not load it twice.
 */
export function useSetupLink(): void {
  useEffect(() => {
    const apply = () => {
      const setup = setupFromHash()
      if (!setup) return
      useWorkshop.getState().setSetup(setup)
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      const text = `Setup ${encodeSetup(setup)} loaded from the link. Press G to see it.`
      const announce = () =>
        window.setTimeout(() => useWorkshop.getState().notify(text, 'success'), 400)
      if (useWorkshop.getState().ready) announce()
      else {
        const unsubscribe = useWorkshop.subscribe((state, previous) => {
          if (state.ready && !previous.ready) {
            window.setTimeout(() => useWorkshop.getState().notify(text, 'success'), 2600)
            unsubscribe()
          }
        })
      }
    }
    apply()
    window.addEventListener('hashchange', apply)
    return () => window.removeEventListener('hashchange', apply)
  }, [])
}
