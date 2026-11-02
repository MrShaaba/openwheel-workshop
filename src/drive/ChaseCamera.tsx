import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { PerspectiveCamera, Vector3 } from 'three'
import { clamp, clamp01, damp, dampAngle, lerp } from '../lib/math'
import { useWorkshop } from '../state/store'
import { MAX_SPEED } from './physics'
import { car } from './session'

/** Camera distance behind the car and height above the road, at rest and at top speed. */
const BACK = [6.6, 8.4] as const
const HEIGHT = [2.2, 2.7] as const
/** The field of view widens with speed, which reads as speed more than the ground does. */
const FOV = [46, 62] as const
const LOOK_AHEAD = 4
const LOOK_HEIGHT = 0.6
const TRACK_FAR = 900
/** Vertical judder on the run-off, scaled by speed. */
const RUNOFF_SHAKE = 0.06

/** Portrait screens lose horizontal field of view, so the camera sits further back and higher. */
function fitScale(aspect: number): number {
  return aspect < 1.1 ? clamp(1.1 / aspect, 1, 1.7) : 1
}

/**
 * Third-person chase camera. Its heading trails the car's so the car swings across the frame in
 * corners, and it snaps into place on mount so no frame of the workshop angle is ever seen.
 * On unmount it hands the camera back exactly as it found it for the workshop's rig.
 */
export function ChaseCamera() {
  const camera = useThree((state) => state.camera)
  const aspect = useThree((state) => state.size.width / state.size.height)
  const heading = useRef(car.heading)
  const target = useRef(new Vector3())
  const desired = useRef(new Vector3())
  const look = useRef(new Vector3())
  const snapped = useRef(false)

  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return
    const saved = { position: camera.position.clone(), fov: camera.fov, far: camera.far }
    camera.far = TRACK_FAR
    camera.updateProjectionMatrix()
    return () => {
      camera.position.copy(saved.position)
      camera.fov = saved.fov
      camera.far = saved.far
      camera.updateProjectionMatrix()
    }
  }, [camera])

  useFrame((_, dt) => {
    // Photo mode has its own orbit controls; the chase picks up again from wherever they left off.
    if (useWorkshop.getState().photoMode) return
    const speed01 = clamp01(Math.abs(car.speed) / MAX_SPEED)
    const snap = !snapped.current
    snapped.current = true

    heading.current = snap ? car.heading : dampAngle(heading.current, car.heading, 3.2, dt)
    const fit = fitScale(aspect)
    const back = lerp(BACK[0], BACK[1], speed01) * fit
    const height = lerp(HEIGHT[0], HEIGHT[1], speed01) * (0.8 + 0.2 * fit)
    desired.current.set(
      car.x - Math.sin(heading.current) * back,
      height,
      car.z - Math.cos(heading.current) * back,
    )
    look.current.set(
      car.x + Math.sin(car.heading) * LOOK_AHEAD,
      LOOK_HEIGHT,
      car.z + Math.cos(car.heading) * LOOK_AHEAD,
    )

    if (snap) {
      camera.position.copy(desired.current)
      target.current.copy(look.current)
    } else {
      const position = camera.position
      position.x = damp(position.x, desired.current.x, 7, dt)
      position.y = damp(position.y, desired.current.y, 5, dt)
      position.z = damp(position.z, desired.current.z, 7, dt)
      target.current.x = damp(target.current.x, look.current.x, 12, dt)
      target.current.y = damp(target.current.y, look.current.y, 12, dt)
      target.current.z = damp(target.current.z, look.current.z, 12, dt)
    }
    if (car.offTrack && speed01 > 0.05) {
      camera.position.y += (Math.random() - 0.5) * RUNOFF_SHAKE * (0.3 + speed01)
    }
    camera.lookAt(target.current)

    if (camera instanceof PerspectiveCamera) {
      const fov = lerp(FOV[0], FOV[1], speed01)
      const next = snap ? fov : damp(camera.fov, fov, 4, dt)
      if (Math.abs(next - camera.fov) > 0.005) {
        camera.fov = next
        camera.updateProjectionMatrix()
      }
    }
  })

  return null
}
