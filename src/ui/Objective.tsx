import { PART_BY_ID, PART_COUNT } from '../parts/registry'
import { useInstallable, useNextGuided } from '../state/selectors'
import { useWorkshop } from '../state/store'

export function Objective() {
  const mode = useWorkshop((state) => state.mode)
  const installedCount = useWorkshop((state) => state.installed.length)
  const installing = useWorkshop((state) => state.installing)
  const next = useNextGuided()
  const installable = useInstallable()
  const complete = installedCount === PART_COUNT

  let label = 'CURRENT OBJECTIVE'
  let title: string
  let hint: string

  if (complete) {
    label = 'STATUS'
    title = 'Assembly complete'
    hint = 'Every part is installed. Click any part to inspect it.'
  } else if (installing) {
    label = 'INSTALLING'
    title = PART_BY_ID[installing].name
    hint = 'Locking into position'
  } else if (mode === 'guided' && next) {
    title = `Install ${PART_BY_ID[next].name}`
    hint = 'Click the highlighted hologram, drag it to its outline, or press SPACE'
  } else {
    label = 'FREE BUILD'
    title = `${installable.length} part${installable.length === 1 ? '' : 's'} available`
    hint = 'Any hologram with its dependencies met can be installed'
  }

  return (
    <div className="panel objective" aria-live="polite">
      <div className="label">{label}</div>
      <div className="objective-title">{title}</div>
      <div className="objective-hint">{hint}</div>
    </div>
  )
}
