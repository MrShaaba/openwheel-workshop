import { useInstallable, useNextGuided, useRemaining } from '../state/selectors'
import { useWorkshop } from '../state/store'
import { FloatingPart, type Highlight } from './FloatingPart'
import { GuideBeam } from './GuideBeam'

/** The remaining parts, orbiting the platform as holograms. */
export function InventoryRing() {
  const remaining = useRemaining()
  const installable = useInstallable()
  const next = useNextGuided()
  const mode = useWorkshop((state) => state.mode)

  const highlightFor = (id: (typeof remaining)[number]): Highlight => {
    if (mode === 'guided') return id === next ? 'next' : 'locked'
    return installable.includes(id) ? 'available' : 'locked'
  }

  return (
    <group name="inventory-ring">
      {remaining.map((id, index) => (
        <FloatingPart
          key={id}
          id={id}
          index={index}
          count={remaining.length}
          highlight={highlightFor(id)}
        />
      ))}
      {mode === 'guided' && next ? <GuideBeam key={next} id={next} /> : null}
    </group>
  )
}
