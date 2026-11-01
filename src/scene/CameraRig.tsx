import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Box3, PerspectiveCamera, Sphere, Vector3, type Camera, type Scene } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { easeInOutCubic } from '../lib/easing'
import { clamp } from '../lib/math'
import { PART_BY_ID } from '../parts/registry'
import type { PartId, Vec3 } from '../parts/types'
import { useWorkshop } from '../state/store'
import { CAMERA_POSES, HERO_POSE, type CameraPose } from './cameraPoses'
import { CAR_BASE_Y, toVector3 } from './constants'
import { idleSeconds, markInteraction } from './interaction'

const FLIGHT_SECONDS = 1.35
/** Completion sweep: a slow orbit around the finished car, cut short by any user input. */
const SWEEP_SECONDS = 7
const SWEEP_SPEED = 0.22 // radians per second
const SWEEP_START_ANGLE = -0.7
const UP = new Vector3(0, 1, 0)

interface Flight {
  fromPosition: Vector3
  fromTarget: Vector3
  toPosition: Vector3
  toTarget: Vector3
  t: number
}

interface Sweep {
  startedAt: number
  elapsed: number
}

/** Frame an installed part: keep the current viewing direction, dolly to fit its bounds. */
function focusPose(part: PartId, scene: Scene, camera: Camera, currentTarget: Vector3): CameraPose {
  const object = scene.getObjectByName(`part:${part}`)
  const box = object ? new Box3().setFromObject(object) : null
  const direction = camera.position.clone().sub(currentTarget).normalize()
  if (direction.y < 0.28) {
    direction.y = 0.28
    direction.normalize()
  }
  if (!box || box.isEmpty()) {
    const [x, y, z] = PART_BY_ID[part].transform.position
    const target = new Vector3(x, y + CAR_BASE_Y, z)
    const position = target.clone().addScaledVector(direction, 3.2)
    return {
      position: [position.x, position.y, position.z],
      target: [target.x, target.y, target.z],
    }
  }
  const sphere = box.getBoundingSphere(new Sphere())
  const fov = camera instanceof PerspectiveCamera ? (camera.fov * Math.PI) / 180 : 0.7
  const distance = clamp((sphere.radius / Math.sin(fov / 2)) * 1.6, 1.8, 9)
  const position = sphere.center.clone().addScaledVector(direction, distance)
  position.y = Math.max(position.y, 0.5)
  return {
    position: [position.x, position.y, position.z],
    target: [sphere.center.x, sphere.center.y, sphere.center.z],
  }
}

/** Where the completion sweep begins: the hero angle swung round and lifted a little. */
function sweepStartPose(): CameraPose {
  const target = toVector3(HERO_POSE.target)
  const offset = toVector3(HERO_POSE.position).sub(target).applyAxisAngle(UP, SWEEP_START_ANGLE)
  offset.y += 0.5
  offset.multiplyScalar(1.06)
  const position = target.clone().add(offset)
  return { position: [position.x, position.y, position.z], target: HERO_POSE.target }
}

/** Orbit controls with sensible limits plus smooth fly-to for presets, Inspect focus and the sweep. */
export function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null)
  const flight = useRef<Flight | null>(null)
  const sweep = useRef<Sweep | null>(null)
  const sweepPending = useRef(false)
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  const request = useWorkshop((state) => state.cameraRequest)

  useEffect(() => {
    if (!request || !controls.current) return
    const pose: CameraPose =
      request.kind === 'preset'
        ? CAMERA_POSES[request.preset]
        : request.kind === 'focus'
          ? focusPose(request.part, scene, camera, controls.current.target)
          : sweepStartPose()
    flight.current = {
      fromPosition: camera.position.clone(),
      fromTarget: controls.current.target.clone(),
      toPosition: toVector3(pose.position),
      toTarget: toVector3(pose.target),
      t: 0,
    }
    sweep.current = null
    sweepPending.current = request.kind === 'sweep'
    controls.current.enabled = false
    markInteraction()
  }, [request, camera, scene])

  useFrame((_, dt) => {
    const orbit = controls.current
    if (!orbit) return

    const current = flight.current
    if (current) {
      current.t = Math.min(1, current.t + dt / FLIGHT_SECONDS)
      const k = easeInOutCubic(current.t)
      camera.position.lerpVectors(current.fromPosition, current.toPosition, k)
      orbit.target.lerpVectors(current.fromTarget, current.toTarget, k)
      orbit.update()
      if (current.t >= 1) {
        flight.current = null
        if (sweepPending.current) {
          sweepPending.current = false
          sweep.current = { startedAt: performance.now(), elapsed: 0 }
        } else {
          orbit.enabled = true
        }
      }
      return
    }

    const active = sweep.current
    if (!active) return
    active.elapsed += dt
    const lastInteraction = performance.now() - idleSeconds() * 1000
    if (lastInteraction > active.startedAt || active.elapsed >= SWEEP_SECONDS) {
      sweep.current = null
      orbit.enabled = true
      return
    }
    // Ease in over the first stretch and slow down towards the end.
    const speed =
      SWEEP_SPEED *
      Math.min(1, active.elapsed / 0.8) *
      Math.min(1, (SWEEP_SECONDS - active.elapsed) / 1.2)
    const offset = camera.position
      .clone()
      .sub(orbit.target)
      .applyAxisAngle(UP, speed * dt)
    camera.position.copy(orbit.target).add(offset)
    orbit.update()
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
      target={toVector3(HERO_POSE.target as Vec3)}
      onStart={markInteraction}
    />
  )
}
