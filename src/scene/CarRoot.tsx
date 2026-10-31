import { useInstallable, useNextGuided } from '../state/selectors'
import { useWorkshop } from '../state/store'
import { GhostTarget } from './GhostTarget'
import { InstalledPart } from './InstalledPart'
import { LockFlashes } from './LockFlashes'

/** Everything that has been installed, plus the ghost outline for what comes next. */
export function CarRoot() {
  const installed = useWorkshop((state) => state.installed)
  const installing = useWorkshop((state) => state.installing)
  const mode = useWorkshop((state) => state.mode)
  const hovered = useWorkshop((state) => state.hovered)
  const exploded = useWorkshop((state) => state.exploded)
  const next = useNextGuided()
  const installable = useInstallable()

  const guidedGhost = mode === 'guided' ? next : null
  const freeGhost = mode === 'free' && hovered && installable.includes(hovered) ? hovered : null
  // The ghost would sit inside the exploded cloud, so it hides while the view is exploded.
  const ghost = exploded ? null : (installing ?? guidedGhost ?? freeGhost)

  return (
    <group name="car-root">
      {installed.map((id) => (
        <InstalledPart key={id} id={id} />
      ))}
      {ghost ? <GhostTarget key={ghost} id={ghost} /> : null}
      <LockFlashes />
    </group>
  )
}
