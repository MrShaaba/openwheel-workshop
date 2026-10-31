import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { BufferGeometry, Float32BufferAttribute, Line, LineDashedMaterial } from 'three'
import { PART_BY_ID } from '../parts/registry'
import type { PartId } from '../parts/types'
import { HOLO_COLOR_SOFT, toVector3 } from './constants'
import { floatingPositions } from './ring'

interface GuideBeamProps {
  id: PartId
}

/** Dashed line from the highlighted hologram to the ghost outline it belongs in. */
export function GuideBeam({ id }: GuideBeamProps) {
  const target = useMemo(() => toVector3(PART_BY_ID[id].transform.position), [id])
  const line = useMemo(() => {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(6), 3))
    const material = new LineDashedMaterial({
      color: HOLO_COLOR_SOFT,
      dashSize: 0.14,
      gapSize: 0.1,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      toneMapped: false,
    })
    const object = new Line(geometry, material)
    object.frustumCulled = false
    return object
  }, [])

  useEffect(
    () => () => {
      line.geometry.dispose()
      ;(line.material as LineDashedMaterial).dispose()
    },
    [line],
  )

  useFrame(() => {
    const from = floatingPositions.get(id)
    if (!from) return
    const attribute = line.geometry.getAttribute('position') as Float32BufferAttribute
    attribute.setXYZ(0, from.x, from.y, from.z)
    attribute.setXYZ(1, target.x, target.y, target.z)
    attribute.needsUpdate = true
    line.computeLineDistances()
  })

  return <primitive object={line} />
}
