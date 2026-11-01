import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color } from 'three'
import { getPartModel } from '../parts/model'
import { PART_BY_ID } from '../parts/registry'
import type { PartId } from '../parts/types'
import { HOLO_COLOR, toVector3 } from './constants'
import { onDenied } from './effectsBus'
import { createHologramPair, disposeHologramPair } from './materials'

const DENIED_COLOR = new Color('#ff3b5c').multiplyScalar(2.4)

interface GhostTargetProps {
  id: PartId
}

/** Pulsing wireframe outline showing where the next part belongs. Flashes red when denied. */
export function GhostTarget({ id }: GhostTargetProps) {
  const definition = PART_BY_ID[id]
  const model = getPartModel(id)
  const materials = useMemo(() => createHologramPair(model.bounds), [model])
  const denied = useRef(0)

  useEffect(() => () => disposeHologramPair(materials), [materials])
  useEffect(
    () =>
      onDenied(() => {
        denied.current = 1
      }),
    [],
  )

  useFrame(({ clock }, dt) => {
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 3.2)
    denied.current = Math.max(0, denied.current - dt * 2.2)
    const k = denied.current
    materials.wire.tint.copy(HOLO_COLOR).lerp(DENIED_COLOR, k)
    materials.shell.tint.copy(HOLO_COLOR).lerp(DENIED_COLOR, k)
    materials.wire.time = clock.elapsedTime
    materials.shell.time = clock.elapsedTime
    materials.wire.alpha = 0.22 + 0.2 * pulse + 0.5 * k
    materials.shell.alpha = 0.25 + 0.15 * pulse + 0.5 * k
  })

  const position = useMemo(() => toVector3(definition.transform.position), [definition])
  const rotation = definition.transform.rotation ?? [0, 0, 0]

  return (
    <group
      name={`ghost:${id}`}
      position={position}
      rotation={[rotation[0], rotation[1], rotation[2]]}
      raycast={() => null}
    >
      <mesh geometry={model.hologram} material={materials.shell} raycast={() => null} />
      <mesh geometry={model.hologram} material={materials.wire} raycast={() => null} />
    </group>
  )
}
