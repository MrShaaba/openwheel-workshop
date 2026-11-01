import { useId, useState } from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { missingDependencies } from '../parts/graph'
import { PART_BY_ID, PARTS_BY_STAGE, STAGE_BY_ID } from '../parts/registry'
import type { PartId } from '../parts/types'
import { useCurrentStage, useNextGuided } from '../state/selectors'
import { useWorkshop } from '../state/store'

/**
 * Parts of the current stage. Each row is a button: installed parts open their info card, parts
 * that can be installed fly in, locked parts explain what they need. Collapses to a one-line
 * summary on narrow screens; the header toggles it.
 */
export function StageChecklist() {
  const stageId = useCurrentStage()
  const stage = STAGE_BY_ID[stageId]
  const installed = useWorkshop((state) => state.installed)
  const mode = useWorkshop((state) => state.mode)
  const busy = useWorkshop((state) => state.exploded || state.assembling)
  const next = useNextGuided()
  const parts = PARTS_BY_STAGE[stageId]
  const done = parts.filter((part) => installed.includes(part.id)).length

  const compact = useMediaQuery('(max-width: 1180px)')
  const [userOpen, setUserOpen] = useState<boolean | null>(null)
  const open = userOpen ?? !compact
  const listId = useId()

  const activate = (id: PartId) => {
    const state = useWorkshop.getState()
    if (state.installed.includes(id)) {
      if (state.exploded || state.assembling) return
      state.inspect(id)
      state.focusPart(id)
      return
    }
    state.attemptInstall(id)
  }

  const describe = (id: PartId): { label: string; disabled: boolean } => {
    const name = PART_BY_ID[id].name
    if (installed.includes(id)) {
      return { label: `${name}, installed. Inspect`, disabled: busy }
    }
    const missing = missingDependencies(id, installed)
    if (missing.length > 0) {
      const needs = missing.map((dep) => PART_BY_ID[dep].name).join(', ')
      return { label: `${name}, locked. Requires ${needs}`, disabled: true }
    }
    if (mode === 'guided' && id !== next) {
      return { label: `${name}, waiting for its turn in Guided build`, disabled: true }
    }
    return { label: `${name}. Install`, disabled: busy }
  }

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
      <ul id={listId} hidden={!open} aria-label={`${stage.name} parts`}>
        {parts.map((part) => {
          const isDone = installed.includes(part.id)
          const isNext = part.id === next
          const { label, disabled } = describe(part.id)
          return (
            <li key={part.id} className={isDone ? 'done' : isNext ? 'next' : ''}>
              <button
                type="button"
                className="checklist-row"
                aria-label={label}
                aria-current={isNext ? 'step' : undefined}
                aria-disabled={disabled}
                onClick={() => activate(part.id)}
              >
                <span className="mark" aria-hidden="true" />
                <span>{part.name}</span>
                <span className="code">{part.code}</span>
              </button>
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
