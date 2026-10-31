import { useEffect, useMemo } from 'react'
import { getPartModel } from '../parts/model'
import { PART_BY_ID } from '../parts/registry'
import type { PartId } from '../parts/types'
import { useWorkshop } from '../state/store'
import { toVector3 } from './constants'
import { createFinishMaterial } from './materials'

interface InstalledPartProps {
  id: PartId
}

/** A part that has locked into the car: solid PBR meshes at the registry transform. */
export function InstalledPart({ id }: InstalledPartProps) {
  const definition = PART_BY_ID[id]
  const model = getPartModel(id)
  const livery = useWorkshop((state) => state.livery)
  const hover = useWorkshop((state) => state.hover)

  const materials = useMemo(
    () => model.pieces.map((piece) => createFinishMaterial(piece.finish, livery)),
    [model, livery],
  )
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials])

  const position = useMemo(() => toVector3(definition.transform.position), [definition])
  const rotation = definition.transform.rotation ?? [0, 0, 0]

  return (
    <group
      name={`part:${id}`}
      position={position}
      rotation={[rotation[0], rotation[1], rotation[2]]}
      onPointerOver={(event) => {
        event.stopPropagation()
        hover(id)
      }}
      onPointerOut={() => hover(null)}
    >
      {model.pieces.map((piece, index) => (
        <mesh key={piece.finish} geometry={piece.geometry} material={materials[index]} />
      ))}
    </group>
  )
}
