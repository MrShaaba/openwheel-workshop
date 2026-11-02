import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { PerspectiveCamera, Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { synth } from '../audio/synth'
import { damp } from '../lib/math'
import { prefersReducedMotion } from '../lib/motion'
import { markInteraction } from '../scene/interaction'
import { useWorkshop } from '../state/store'
import { carFocus, photoFileName, usePhoto } from './photoState'

const UP = new Vector3(0, 1, 0)
/** Radians per second for the turntable. */
const TURNTABLE_SPEED = 0.16

/**
 * Photo mode inside the canvas: on the track it brings its own orbit controls around the paused car
 * (the chase camera stands down); in the workshop the rig's controls stay and are relaxed by the rig.
 * Either way it drives the field of view and the turntable, and writes the PNG when asked.
 */
export function PhotoRig() {
  const trackScene = useWorkshop((state) => state.trackScene)
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const controls = useThree((state) => state.controls) as OrbitControlsImpl | null
  const orbit = useRef<OrbitControlsImpl>(null)
  const lastCapture = useRef(usePhoto.getState().captureNonce)
  const savedFov = useRef<number | null>(null)

  // The field of view starts from wherever the camera is and goes back there on exit.
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return
    savedFov.current = camera.fov
    usePhoto.getState().setFov(camera.fov)
    const saved = camera.fov
    return () => {
      camera.fov = saved
      camera.updateProjectionMatrix()
    }
  }, [camera])

  useFrame((_, dt) => {
    const photo = usePhoto.getState()
    const active = orbit.current ?? controls
    if (camera instanceof PerspectiveCamera) {
      const fov = damp(camera.fov, photo.fov, 10, dt)
      if (Math.abs(fov - camera.fov) > 0.01) {
        camera.fov = fov
        camera.updateProjectionMatrix()
      }
    }
    if (photo.turntable && active && !prefersReducedMotion()) {
      const offset = camera.position
        .clone()
        .sub(active.target)
        .applyAxisAngle(UP, TURNTABLE_SPEED * dt)
      camera.position.copy(active.target).add(offset)
      active.update()
    }
  })

  // The capture runs after the composer has drawn the frame, while the buffer is still intact.
  useFrame(() => {
    const photo = usePhoto.getState()
    if (photo.captureNonce === lastCapture.current) return
    lastCapture.current = photo.captureNonce
    photo.setCapturing(true)
    const number = useWorkshop.getState().livery.number
    gl.domElement.toBlob((blob) => {
      photo.setCapturing(false)
      if (!blob) {
        useWorkshop.getState().notify('Could not read the frame', 'denied')
        return
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = photoFileName(number)
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 2000)
      synth.blip(1800)
      useWorkshop.getState().notify(`Saved ${link.download}`, 'success')
    }, 'image/png')
  }, 2)

  if (!trackScene) return null
  return (
    <OrbitControls
      ref={orbit}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.55}
      zoomSpeed={0.7}
      enablePan
      minDistance={1.2}
      maxDistance={40}
      minPolarAngle={0.02}
      maxPolarAngle={Math.PI / 2 - 0.01}
      target={[carFocus.x, carFocus.y, carFocus.z]}
      onStart={markInteraction}
    />
  )
}
