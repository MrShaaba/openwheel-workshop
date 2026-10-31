import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { easeInOutCubic } from '../lib/easing'
import { PART_BY_ID } from '../parts/registry'
import type { Vec3 } from '../parts/types'
import { useWorkshop, type CameraRequest } from '../state/store'
import { CAMERA_POSES, HERO_POSE, type CameraPose } from './cameraPoses'
import { CAR_BASE_Y, toVector3 } from './constants'
import { markInteraction } from './interaction'

const FLIGHT_SECONDS = 1.35

interface Flight {
  fromPosition: Vector3
  fromTarget: Vector3
  toPosition: Vector3
  toTarget: Vector3
  t: number
}

function resolvePose(request: CameraRequest): CameraPose {
  if (request.kind === 'preset') return CAMERA_POSES[request.preset]
  // Focus a part: frame its nominal position in car space. Refined with real bounds later.
  const [x, y, z] = PART_BY_ID[request.part].transform.position
  const target: Vec3 = [x, y + CAR_BASE_Y, z]
  const direction = new Vector3(x || 0.6, 0.5, z || 0.6).normalize()
  const position = new Vector3(x, y + CAR_BASE_Y, z).addScaledVector(direction, 3.2)
  position.y = Math.max(position.y, 0.8)
  return { position: [position.x, position.y, position.z], target }
}

/** Orbit controls with sensible limits plus smooth fly-to for the HUD camera presets. */
export function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null)
  const flight = useRef<Flight | null>(null)
  const camera = useThree((state) => state.camera)
  const request = useWorkshop((state) => state.cameraRequest)

  useEffect(() => {
    if (!request || !controls.current) return
    const pose = resolvePose(request)
    flight.current = {
      fromPosition: camera.position.clone(),
      fromTarget: controls.current.target.clone(),
      toPosition: toVector3(pose.position),
      toTarget: toVector3(pose.target),
      t: 0,
    }
    controls.current.enabled = false
    markInteraction()
  }, [request, camera])

  useFrame((_, dt) => {
    const current = flight.current
    const orbit = controls.current
    if (!current || !orbit) return
    current.t = Math.min(1, current.t + dt / FLIGHT_SECONDS)
    const k = easeInOutCubic(current.t)
    camera.position.lerpVectors(current.fromPosition, current.toPosition, k)
    orbit.target.lerpVectors(current.fromTarget, current.toTarget, k)
    orbit.update()
    if (current.t >= 1) {
      flight.current = null
      orbit.enabled = true
    }
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.55}
      zoomSpeed={0.7}
      enablePan={false}
      minDistance={1.2}
      maxDistance={17}
      minPolarAngle={0.1}
      maxPolarAngle={Math.PI / 2 - 0.035}
      target={toVector3(HERO_POSE.target)}
      onStart={markInteraction}
    />
  )
}
