import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, type Group } from 'three'
import { damp } from '../lib/math'
import { getPartModel } from '../parts/model'
import { PART_BY_ID, PARTS } from '../parts/registry'
import { HologramMaterial } from '../shaders/hologram'
import { traceAt, useCircuitRecords, type TracePose } from './records'
import { laps } from './session'
import { createTrackFix, locateOnTrack } from './track'
import { useCircuit } from './useCircuit'

const GHOST_COLOR = new Color('#38e7ff').multiplyScalar(1.6)
const SHELL_OPACITY = 0.22
const WIRE_OPACITY = 0.3

/**
 * The best lap replayed as a hologram: the whole car drawn with the workshop's hologram shaders,
 * following the saved trace from the moment the line is crossed. It fades in when a timed lap
 * begins and out again when the lap is over, and it never collides with anything.
 */
export function GhostCar() {
  const bestLap = useCircuitRecords().bestLap
  const circuit = useCircuit()
  const root = useRef<Group>(null)
  const pose = useRef<TracePose>({ x: 0, z: 0, heading: 0, steer: 0 })
  const fix = useRef(createTrackFix())
  const opacity = useRef(0)
  const materials = useMemo(
    () => ({
      shell: new HologramMaterial({ color: GHOST_COLOR, opacity: 0 }),
      wire: new HologramMaterial({ color: GHOST_COLOR, opacity: 0, wireframe: true }),
    }),
    [],
  )

  useEffect(() => {
    // A full hologram: no wipe front, no edge band.
    for (const material of [materials.shell, materials.wire]) {
      material.progress = 0
      material.edge = 0
    }
    return () => {
      materials.shell.dispose()
      materials.wire.dispose()
    }
  }, [materials])

  useFrame(({ clock }, dt) => {
    const node = root.current
    if (!node) return
    const trace = bestLap?.trace
    const active = trace !== undefined && laps.startedAt !== null
    const target = active ? 1 : 0
    opacity.current = damp(opacity.current, target, active ? 4 : 8, dt)
    const visible = opacity.current > 0.01
    node.visible = visible
    if (!visible) return
    materials.shell.alpha = SHELL_OPACITY * opacity.current
    materials.wire.alpha = WIRE_OPACITY * opacity.current
    materials.shell.time = clock.elapsedTime
    materials.wire.time = clock.elapsedTime
    if (active && trace && laps.startedAt !== null) {
      traceAt(trace, performance.now() - laps.startedAt, pose.current)
      // The ghost sits on the ground wherever the trace puts it, tilted with the slope.
      locateOnTrack(circuit, pose.current.x, pose.current.z, fix.current)
      node.position.set(pose.current.x, fix.current.height, pose.current.z)
      node.rotation.set(-Math.atan(fix.current.grade), pose.current.heading, 0)
    }
  })

  return (
    <group ref={root} name="ghost-car" visible={false} rotation-order="YXZ">
      {PARTS.map((part) => {
        const model = getPartModel(part.id)
        const { position, rotation = [0, 0, 0] } = PART_BY_ID[part.id].transform
        return (
          <group
            key={part.id}
            position={[position[0], position[1], position[2]]}
            rotation={[rotation[0], rotation[1], rotation[2]]}
          >
            <mesh geometry={model.hologram} material={materials.shell} />
            <mesh geometry={model.hologram} material={materials.wire} />
          </group>
        )
      })}
    </group>
  )
}
