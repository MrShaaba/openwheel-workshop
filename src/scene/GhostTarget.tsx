import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color } from 'three'
import { getPartModel } from '../parts/model'
import { PART_BY_ID } from '../parts/registry'
import type { PartId } from '../parts/types'
import { HOLO_COLOR, HOLO_COLOR_SOFT, toVector3 } from './constants'
import { onDenied } from './effectsBus'
import { createHologramMaterials, disposeHologramMaterials } from './materials'

const DENIED_COLOR = new Color('#ff3b5c').multiplyScalar(2.2)
const DENIED_SOFT = new Color('#ff3b5c').multiplyScalar(1.2)

interface GhostTargetProps {
  id: PartId
}

/** Pulsing wireframe outline showing where the next part belongs. Flashes red when denied. */
export function GhostTarget({ id }: GhostTargetProps) {
  const definition = PART_BY_ID[id]
  const model = getPartModel(id)
  const materials = useMemo(() => createHologramMaterials(), [])
  const denied = useRef(0)

  useEffect(() => () => disposeHologramMaterials(materials), [materials])
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
    materials.wire.color.copy(HOLO_COLOR).lerp(DENIED_COLOR, k)
    materials.fill.color.copy(HOLO_COLOR_SOFT).lerp(DENIED_SOFT, k)
    materials.wire.opacity = 0.22 + 0.2 * pulse + 0.4 * k
    materials.fill.opacity = 0.05 + 0.05 * pulse + 0.1 * k
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
      {model.pieces.map((piece) => (
        <group key={piece.finish}>
          <mesh geometry={piece.geometry} material={materials.fill} raycast={() => null} />
          <mesh geometry={piece.geometry} material={materials.wire} raycast={() => null} />
        </group>
      ))}
    </group>
  )
}
