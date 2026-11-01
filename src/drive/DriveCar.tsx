import { useFrame } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { Group, MeshStandardMaterial } from 'three'
import { synth } from '../audio/synth'
import { clamp01, damp } from '../lib/math'
import { getPartModel } from '../parts/model'
import { PART_BY_ID, PARTS } from '../parts/registry'
import type { PartId } from '../parts/types'
import { getLiveryUniforms } from '../scene/liveryTextures'
import { createFinishMaterial, FINISHES } from '../scene/materials'
import { applyMaterialize, createMaterializeUniforms } from '../shaders/materialize'
import { useDriveInput } from './input'
import { MAX_SPEED, stepCar } from './physics'
import { car, updateLaps } from './session'
import { locateOnTrack, type TrackFix } from './track'

/** Physics never integrates more than this per frame, so a paused tab does not launch the car. */
const MAX_STEP = 1 / 30
const RAIN_LIGHT_IDLE = FINISHES.emissive.emissiveIntensity ?? 3
const RAIN_LIGHT_BRAKING = 9

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
  /** Hands the live materials to the parent, for the brake light. */
  onMaterials?: (materials: MeshStandardMaterial[]) => void
}

function PartMeshes({ id, atOrigin = false, onMaterials }: PartMeshesProps) {
  const model = getPartModel(id)
  const materials = usePartMaterials(id)
  useEffect(() => onMaterials?.(materials), [materials, onMaterials])
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
 * The finished car on the track: every part solid and painted, wheels that steer and spin, a body
 * that rolls and pitches with the forces on it, and a rain light that brightens under braking.
 * The car's own frame loop steps the physics and the lap timer into the shared session state.
 */
export function DriveCar() {
  const root = useRef<Group>(null)
  const chassis = useRef<Group>(null)
  const steerGroups = useRef<(Group | null)[]>([])
  const spinGroups = useRef<(Group | null)[]>([])
  const rainLight = useRef<MeshStandardMaterial | null>(null)
  const fix = useRef<TrackFix>({ index: 0, progress: 0, lateral: 0 })
  const input = useDriveInput()
  const takeRainLight = useCallback((materials: MeshStandardMaterial[]) => {
    rainLight.current = materials.find((material) => material.emissive.getHex() !== 0) ?? null
  }, [])

  // The engine note lives as long as the car is on the track.
  useEffect(() => () => synth.engineStop(), [])

  useFrame((_, dt) => {
    const step = Math.min(dt, MAX_STEP)
    locateOnTrack(car.x, car.z, fix.current)
    stepCar(car, input.current, step, fix.current)
    updateLaps(fix.current, performance.now())
    const speed01 = clamp01(Math.abs(car.speed) / MAX_SPEED)
    synth.engineUpdate({
      revs: car.revs,
      load: car.throttle,
      speed: speed01,
      slip: car.slip,
      gravel: car.offTrack ? clamp01(Math.abs(car.speed) / 8) : 0,
    })
    if (car.wallHit) synth.impact()

    const node = root.current
    if (!node) return
    if (rainLight.current) {
      rainLight.current.emissiveIntensity = damp(
        rainLight.current.emissiveIntensity,
        car.brake > 0 ? RAIN_LIGHT_BRAKING : RAIN_LIGHT_IDLE,
        14,
        dt,
      )
    }
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
          <PartMeshes
            key={part.id}
            id={part.id}
            onMaterials={part.id === 'rain-light' ? takeRainLight : undefined}
          />
        ))}
        {/* A soft key light rides with the car, so it is lit the same anywhere on the circuit. */}
        <pointLight
          position={[0, 3.2, 0.4]}
          intensity={28}
          distance={14}
          decay={2}
          color="#dbeeff"
        />
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
