import { useId, useState } from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { PART_BY_ID, PARTS_BY_STAGE, STAGE_BY_ID } from '../parts/registry'
import { useCurrentStage, useNextGuided } from '../state/selectors'
import { useWorkshop } from '../state/store'

/** Parts of the current stage. Collapses to a one-line summary on narrow screens; the header toggles it. */
export function StageChecklist() {
  const stageId = useCurrentStage()
  const stage = STAGE_BY_ID[stageId]
  const installed = useWorkshop((state) => state.installed)
  const next = useNextGuided()
  const parts = PARTS_BY_STAGE[stageId]
  const done = parts.filter((part) => installed.includes(part.id)).length

  const compact = useMediaQuery('(max-width: 1180px)')
  const [userOpen, setUserOpen] = useState<boolean | null>(null)
  const open = userOpen ?? !compact
  const listId = useId()

  return (
    <div className={`panel checklist ${open ? '' : 'collapsed'}`}>
      <button
        type="button"
        className="checklist-toggle"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setUserOpen(!open)}
      >
        <strong>
          {stage.code} · {stage.name.toUpperCase()}
        </strong>
        <span className="label">
          {done}/{parts.length}
        </span>
        <span className="chevron" aria-hidden="true" />
      </button>
      <ul id={listId} hidden={!open}>
        {parts.map((part) => {
          const isDone = installed.includes(part.id)
          const isNext = part.id === next
          return (
            <li key={part.id} className={isDone ? 'done' : isNext ? 'next' : ''}>
              <span className="mark" aria-hidden="true" />
              <span>{part.name}</span>
              <span className="code">{part.code}</span>
            </li>
          )
        })}
      </ul>
      {!open && next && (
        <div className="checklist-next">
          <span className="label">Next</span>
          {PART_BY_ID[next].name}
        </div>
      )}
    </div>
  )
}
