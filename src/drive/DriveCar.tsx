import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { Group, MeshStandardMaterial } from 'three'
import { getPartModel } from '../parts/model'
import { PART_BY_ID, PARTS } from '../parts/registry'
import type { PartId } from '../parts/types'
import { getLiveryUniforms } from '../scene/liveryTextures'
import { createFinishMaterial } from '../scene/materials'
import { applyMaterialize, createMaterializeUniforms } from '../shaders/materialize'
import { car } from './session'

const WHEEL_IDS = ['wheel-fl', 'wheel-fr', 'wheel-rl', 'wheel-rr'] as const satisfies PartId[]
const FRONT_WHEELS = new Set<PartId>(['wheel-fl', 'wheel-fr'])
const BODY_PARTS = PARTS.filter((part) => !(WHEEL_IDS as readonly PartId[]).includes(part.id))

/**
 * Solid materials for one part: the same finish presets and livery hook as the workshop, with the
 * materialise wipe already finished so the shader only contributes the paint.
 */
function usePartMaterials(id: PartId): MeshStandardMaterial[] {
  const model = getPartModel(id)
  const materials = useMemo(() => {
    const uniforms = createMaterializeUniforms(model.bounds, PART_BY_ID[id].transform.position)
    uniforms.uEdge.value = 0
    return model.pieces.map((piece) => {
      const material = createFinishMaterial(piece.finish)
      applyMaterialize(
        material,
        uniforms,
        piece.finish === 'paint' ? getLiveryUniforms() : undefined,
      )
      return material
    })
  }, [model, id])
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials])
  return materials
}

interface PartMeshesProps {
  id: PartId
  /** Wheels sit inside steer and spin groups that already carry the part's position. */
  atOrigin?: boolean
}

function PartMeshes({ id, atOrigin = false }: PartMeshesProps) {
  const model = getPartModel(id)
  const materials = usePartMaterials(id)
  const { position, rotation = [0, 0, 0] } = PART_BY_ID[id].transform
  return (
    <group
      position={atOrigin ? [0, 0, 0] : [position[0], position[1], position[2]]}
      rotation={[rotation[0], rotation[1], rotation[2]]}
    >
      {model.pieces.map((piece, index) => (
        <mesh key={piece.finish} geometry={piece.geometry} material={materials[index]} />
      ))}
    </group>
  )
}

/**
 * The finished car on the track: every part solid and painted, wheels that steer and spin, and a
 * body that rolls and pitches with the forces on it. The pose comes from the shared car state.
 */
export function DriveCar() {
  const root = useRef<Group>(null)
  const chassis = useRef<Group>(null)
  const steerGroups = useRef<(Group | null)[]>([])
  const spinGroups = useRef<(Group | null)[]>([])

  useFrame(() => {
    const node = root.current
    if (!node) return
    node.position.set(car.x, 0, car.z)
    node.rotation.y = car.heading
    if (chassis.current) chassis.current.rotation.set(car.pitch, 0, car.roll)
    WHEEL_IDS.forEach((id, index) => {
      const steer = steerGroups.current[index]
      const spin = spinGroups.current[index]
      if (steer) steer.rotation.y = FRONT_WHEELS.has(id) ? car.steer : 0
      if (spin) spin.rotation.x = car.wheelSpin
    })
  })

  return (
    <group ref={root} name="drive-car">
      <group ref={chassis}>
        {BODY_PARTS.map((part) => (
          <PartMeshes key={part.id} id={part.id} />
        ))}
        {/* A soft key light rides with the car, so it is lit the same anywhere on the circuit. */}
        <pointLight position={[0, 3.2, 0.4]} intensity={28} distance={14} decay={2} color="#dbeeff" />
        <pointLight position={[0, 0.25, 0]} intensity={5} distance={5} decay={2} color="#38e7ff" />
      </group>
      {WHEEL_IDS.map((id, index) => {
        const [x, y, z] = PART_BY_ID[id].transform.position
        return (
          <group
            key={id}
            position={[x, y, z]}
            ref={(node) => {
              steerGroups.current[index] = node
            }}
          >
            <group
              ref={(node) => {
                spinGroups.current[index] = node
              }}
            >
              <PartMeshes id={id} atOrigin />
            </group>
          </group>
        )
      })}
    </group>
  )
}
