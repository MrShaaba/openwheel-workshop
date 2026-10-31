import { PARTS_BY_STAGE, STAGE_BY_ID } from '../parts/registry'
import { useCurrentStage, useNextGuided } from '../state/selectors'
import { useWorkshop } from '../state/store'

export function StageChecklist() {
  const stageId = useCurrentStage()
  const stage = STAGE_BY_ID[stageId]
  const installed = useWorkshop((state) => state.installed)
  const next = useNextGuided()
  const parts = PARTS_BY_STAGE[stageId]
  const done = parts.filter((part) => installed.includes(part.id)).length

  return (
    <div className="panel checklist">
      <div className="checklist-head">
        <strong>
          {stage.code} · {stage.name.toUpperCase()}
        </strong>
        <span className="label">
          {done}/{parts.length}
        </span>
      </div>
      <ul>
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
    </div>
  )
}
