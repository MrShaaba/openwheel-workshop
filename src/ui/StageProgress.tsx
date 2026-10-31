import { motion } from 'framer-motion'
import { PART_COUNT, STAGE_BY_ID } from '../parts/registry'
import { useCurrentStage, useStageProgress } from '../state/selectors'
import { useWorkshop } from '../state/store'

const pad = (n: number) => n.toString().padStart(2, '0')

export function StageProgress() {
  const progress = useStageProgress()
  const current = useCurrentStage()
  const installedCount = useWorkshop((state) => state.installed.length)

  return (
    <div className="stage-progress" role="status" aria-label="Build progress">
      <div className="stage-count">
        <strong>
          {pad(installedCount)} / {pad(PART_COUNT)}
        </strong>
        <span>PARTS INSTALLED</span>
      </div>
      <div className="stage-segments">
        {progress.map((entry) => {
          const stage = STAGE_BY_ID[entry.stage]
          const done = entry.done === entry.total
          const className = [
            'stage-segment',
            entry.stage === current && !done ? 'current' : '',
            done ? 'done' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <div key={entry.stage} className={className}>
              <div className="bar">
                <motion.span
                  initial={false}
                  animate={{ scaleX: entry.total === 0 ? 0 : entry.done / entry.total }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                />
              </div>
              <div className="tag">
                <span>
                  {stage.code} <span className="stage-name">{stage.name.toUpperCase()}</span>
                </span>
                <span>
                  {entry.done}/{entry.total}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
