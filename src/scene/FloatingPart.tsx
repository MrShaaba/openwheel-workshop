import { useCursor } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Plane, QuadraticBezierCurve3, Quaternion, Vector3, type Group } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { easeInOutCubic, easeOutBack, easeOutCubic } from '../lib/easing'
import { clamp, damp, lerp } from '../lib/math'
import { getPartModel } from '../parts/model'
import { PART_BY_ID } from '../parts/registry'
import type { PartId } from '../parts/types'
import { useWorkshop } from '../state/store'
import { toVector3 } from './constants'
import { freshInstalls } from '../state/session'
import { emitDenied, emitFlash } from './effectsBus'
import { markInteraction } from './interaction'
import { createHologramPair, disposeHologramPair } from './materials'
import { floatingPositions, hashString, ringSlot } from './ring'

export type Highlight = 'next' | 'available' | 'locked'

type Phase = 'idle' | 'drag' | 'fly' | 'bounce' | 'return'

interface Motion {
  phase: Phase
  t: number
  duration: number
  from: Vector3
  fromScale: number
  fromQuaternion: Quaternion
  curve: QuadraticBezierCurve3 | null
}

interface PointerState {
  id: number
  startX: number
  startY: number
  dragging: boolean
  plane: Plane
  hit: Vector3
}

interface FloatingPartProps {
  id: PartId
  index: number
  count: number
  highlight: Highlight
}

const SNAP_TOLERANCE = 0.8
const FLY_SECONDS = 1.05
/** Assemble All runs flights faster so the whole car comes together in about half a minute. */
const ASSEMBLY_FLY_SECONDS = 0.75
const BOUNCE_SECONDS = 0.6
const RETURN_SECONDS = 0.55
const DRAG_THRESHOLD_PX = 5
const IDENTITY = new Quaternion()

/** Pointer capture keeps a drag alive when the cursor outruns the hologram. Best effort. */
function capturePointer(target: EventTarget | null, pointerId: number, capture: boolean): void {
  const element = target as Element | null
  if (!element) return
  try {
    if (capture) element.setPointerCapture(pointerId)
    else element.releasePointerCapture(pointerId)
  } catch {
    // Some pointers (synthetic events, lost touches) cannot be captured; dragging still works.
  }
}

/**
 * One remaining part, floating on the inventory ring as a hologram. Click or drag it
 * towards its ghost outline to install it; it flies in along an arc and snaps home.
 */
export const FloatingPart = memo(function FloatingPart({
  id,
  index,
  count,
  highlight,
}: FloatingPartProps) {
  const definition = PART_BY_ID[id]
  const model = getPartModel(id)
  const target = useMemo(() => toVector3(definition.transform.position), [definition])
  const displayScale = useMemo(() => clamp(0.9 / model.maxDimension, 0.6, 3.2), [model])
  // Local radius chosen so the grab sphere is about 0.4 m in the world regardless of part size.
  const hitRadius = useMemo(
    () => Math.max(0.12, Math.min(model.maxDimension * 0.5, 0.42 / displayScale)),
    [model, displayScale],
  )
  const seed = useMemo(() => hashString(id), [id])
  const materials = useMemo(() => createHologramPair(model.bounds), [model])

  const group = useRef<Group>(null)
  const motion = useRef<Motion>({
    phase: 'idle',
    t: 0,
    duration: 0,
    from: new Vector3(),
    fromScale: displayScale,
    fromQuaternion: new Quaternion(),
    curve: null,
  })
  const pointer = useRef<PointerState | null>(null)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls) as OrbitControlsImpl | null

  useEffect(() => () => disposeHologramPair(materials), [materials])

  useEffect(() => {
    const position = new Vector3()
    floatingPositions.set(id, position)
    return () => {
      floatingPositions.delete(id)
    }
  }, [id])

  const startFlight = (node: Group) => {
    const m = motion.current
    m.phase = 'fly'
    m.t = 0
    m.duration = useWorkshop.getState().assembling ? ASSEMBLY_FLY_SECONDS : FLY_SECONDS
    m.from.copy(node.position)
    m.fromScale = node.scale.x
    m.fromQuaternion.copy(node.quaternion)
    const control = m.from.clone().lerp(target, 0.5)
    control.y += 0.9 + m.from.distanceTo(target) * 0.12
    m.curve = new QuadraticBezierCurve3(m.from.clone(), control, target.clone())
  }

  const startReturn = (node: Group) => {
    const m = motion.current
    m.phase = 'return'
    m.t = 0
    m.duration = RETURN_SECONDS
    m.from.copy(node.position)
    m.fromScale = node.scale.x
  }

  const startBounce = () => {
    const m = motion.current
    m.phase = 'bounce'
    m.t = 0
    m.duration = BOUNCE_SECONDS
  }

  const onPointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setHovered(true)
    useWorkshop.getState().hover(id)
  }

  const onPointerOut = () => {
    setHovered(false)
    const state = useWorkshop.getState()
    if (state.hovered === id) state.hover(null)
  }

  const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (motion.current.phase !== 'idle' || !group.current) return
    event.stopPropagation()
    markInteraction()
    capturePointer(event.target, event.pointerId, true)
    // Drag on a camera-facing plane through the target, so the part sits at the right
    // depth to snap when the cursor reaches the ghost outline.
    const targetWorld = group.current.parent
      ? group.current.parent.localToWorld(target.clone())
      : target.clone()
    const normal = camera.getWorldDirection(new Vector3())
    pointer.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
      plane: new Plane().setFromNormalAndCoplanarPoint(normal, targetWorld),
      hit: new Vector3(),
    }
  }

  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    const state = pointer.current
    const node = group.current
    if (!state || event.pointerId !== state.id || !node?.parent) return
    if (!state.dragging) {
      const dx = event.clientX - state.startX
      const dy = event.clientY - state.startY
      if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return
      state.dragging = true
      motion.current.phase = 'drag'
      useWorkshop.getState().setDragging(id)
      if (controls) controls.enabled = false
    }
    event.stopPropagation()
    if (event.ray.intersectPlane(state.plane, state.hit)) {
      const local = node.parent.worldToLocal(state.hit.clone())
      // Magnetic pull: ease towards the target once inside the snap radius.
      const distance = local.distanceTo(target)
      if (distance < SNAP_TOLERANCE) local.lerp(target, 0.35 * (1 - distance / SNAP_TOLERANCE))
      node.position.copy(local)
    }
  }

  const onPointerUp = (event: ThreeEvent<PointerEvent>) => {
    const state = pointer.current
    const node = group.current
    if (!state || event.pointerId !== state.id) return
    pointer.current = null
    capturePointer(event.target, event.pointerId, false)
    event.stopPropagation()
    if (!node) return
    const workshop = useWorkshop.getState()

    if (state.dragging) {
      workshop.setDragging(null)
      if (controls) controls.enabled = true
      if (node.position.distanceTo(target) <= SNAP_TOLERANCE) {
        const check = workshop.attemptInstall(id)
        if (check.ok) {
          startFlight(node)
          return
        }
        emitDenied()
      }
      startReturn(node)
      return
    }

    const check = workshop.attemptInstall(id)
    if (check.ok) startFlight(node)
    else if (check.reason !== 'busy') {
      emitDenied()
      startBounce()
    }
  }

  useFrame(({ clock }, dt) => {
    const node = group.current
    if (!node) return
    const m = motion.current
    const time = clock.elapsedTime
    const workshop = useWorkshop.getState()

    // Space bar or the HUD button asked for this part: take off from wherever we are.
    if (workshop.installing === id && m.phase !== 'fly') startFlight(node)

    switch (m.phase) {
      case 'idle': {
        const slot = ringSlot(index, count, time, seed)
        node.position.x = damp(node.position.x, slot.x, 6, dt)
        node.position.y = damp(node.position.y, slot.y, 6, dt)
        node.position.z = damp(node.position.z, slot.z, 6, dt)
        node.rotation.y += dt * 0.45
        node.rotation.x = Math.sin(time * 0.7 + seed * 6) * 0.08
        node.rotation.z = 0
        const scale = damp(node.scale.x, displayScale * (hovered ? 1.1 : 1), 8, dt)
        node.scale.setScalar(scale)
        break
      }
      case 'drag': {
        node.rotation.y += dt * 0.25
        const distance = node.position.distanceTo(target)
        const near = clamp(1 - distance / 2.5, 0, 1)
        const scale = damp(node.scale.x, lerp(displayScale, 1, near * near), 8, dt)
        node.scale.setScalar(scale)
        node.quaternion.slerp(IDENTITY, 1 - Math.exp(-dt * 4 * near))
        break
      }
      case 'fly': {
        m.t = Math.min(1, m.t + dt / m.duration)
        const k =
          m.t < 0.84
            ? easeInOutCubic(m.t / 0.84) * 0.965
            : 0.965 + 0.035 * easeOutBack((m.t - 0.84) / 0.16)
        m.curve?.getPoint(k, node.position)
        node.scale.setScalar(lerp(m.fromScale, 1, easeOutCubic(m.t)))
        node.quaternion.slerpQuaternions(
          m.fromQuaternion,
          IDENTITY,
          easeInOutCubic(Math.min(1, m.t * 1.25)),
        )
        if (m.t >= 1) {
          node.position.copy(target)
          emitFlash(target)
          m.phase = 'idle'
          freshInstalls.add(id)
          workshop.commitInstall(id)
        }
        break
      }
      case 'bounce': {
        m.t = Math.min(1, m.t + dt / m.duration)
        const slot = ringSlot(index, count, time, seed)
        const lunge = Math.sin(Math.PI * m.t) * 0.18
        node.position.lerpVectors(slot, target, lunge)
        node.rotation.z = Math.sin(m.t * 42) * 0.1 * (1 - m.t)
        if (m.t >= 1) {
          node.rotation.z = 0
          m.phase = 'idle'
        }
        break
      }
      case 'return': {
        m.t = Math.min(1, m.t + dt / m.duration)
        const slot = ringSlot(index, count, time, seed)
        const k = easeOutCubic(m.t)
        node.position.lerpVectors(m.from, slot, k)
        node.scale.setScalar(lerp(m.fromScale, displayScale, k))
        if (m.t >= 1) m.phase = 'idle'
        break
      }
    }

    floatingPositions.get(id)?.copy(node.position)

    const pulse = 0.5 + 0.5 * Math.sin(time * 2.6 + seed * 6)
    const base = highlight === 'next' ? 0.5 + 0.35 * pulse : highlight === 'available' ? 0.42 : 0.14
    const boost = hovered ? 0.3 : 0
    const flying = m.phase === 'fly' || m.phase === 'drag' ? 0.3 : 0
    materials.shell.time = time
    materials.wire.time = time
    materials.wire.alpha = Math.min(1, base + boost + flying)
    materials.shell.alpha = (highlight === 'locked' ? 0.26 : 0.55) + boost * 0.4 + flying * 0.3
  })

  return (
    <group
      ref={group}
      name={`floating:${id}`}
      scale={displayScale}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Invisible grab sphere: thin parts like the halo would otherwise be hard to click. */}
      <mesh visible={false} position={model.centre}>
        <sphereGeometry args={[hitRadius, 12, 8]} />
      </mesh>
      <mesh geometry={model.hologram} material={materials.shell} raycast={() => null} />
      <mesh geometry={model.hologram} material={materials.wire} raycast={() => null} />
    </group>
  )
})
