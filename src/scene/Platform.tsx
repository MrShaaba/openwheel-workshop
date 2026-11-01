import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import {
  BoxGeometry,
  Matrix4,
  type BufferGeometry,
  type Group,
  type MeshBasicMaterial,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { damp, TAU } from '../lib/math'
import { prefersReducedMotion } from '../lib/motion'
import { useWorkshop } from '../state/store'
import { HOLO_COLOR, HOLO_COLOR_SOFT, PLATFORM_HEIGHT, PLATFORM_RADIUS } from './constants'
import { completionGlow } from './effectsBus'
import { idleSeconds } from './interaction'

const IDLE_DELAY_SECONDS = 3
const IDLE_SPEED = 0.09 // radians per second

function buildTickMarks(): BufferGeometry {
  const pieces: BufferGeometry[] = []
  const count = 72
  for (let i = 0; i < count; i++) {
    const major = i % 6 === 0
    const length = major ? 0.26 : 0.12
    const geometry = new BoxGeometry(0.018, 0.004, length)
    const angle = (i / count) * TAU
    const radius = PLATFORM_RADIUS - 0.42 - length / 2
    const matrix = new Matrix4()
      .makeRotationY(angle)
      .setPosition(Math.sin(angle) * radius, 0, Math.cos(angle) * radius)
    geometry.applyMatrix4(matrix)
    pieces.push(geometry)
  }
  const merged = mergeGeometries(pieces)
  pieces.forEach((piece) => piece.dispose())
  return merged
}

interface PlatformProps {
  children?: ReactNode
}

/**
 * Circular build platform. Everything placed on it (car, ghost, inventory ring) is a child,
 * so the slow idle rotation never affects part targeting.
 */
export function Platform({ children }: PlatformProps) {
  const group = useRef<Group>(null)
  const speed = useRef(0)
  const ticks = useMemo(() => buildTickMarks(), [])
  const ringMaterial = useRef<MeshBasicMaterial>(null)
  const glowMaterial = useRef<MeshBasicMaterial>(null)

  useEffect(() => () => ticks.dispose(), [ticks])

  useFrame((_, dt) => {
    const state = useWorkshop.getState()
    const idle =
      idleSeconds() > IDLE_DELAY_SECONDS &&
      !prefersReducedMotion() &&
      state.installing === null &&
      state.inspecting === null &&
      state.dragging === null
    speed.current = damp(speed.current, idle ? IDLE_SPEED : 0, 1.6, dt)
    if (group.current && speed.current > 1e-4) {
      group.current.rotation.y += speed.current * dt
    }
    // Completion sequence: the outer ring and floor spill flare up, then settle.
    const glow = completionGlow.value
    if (ringMaterial.current) {
      ringMaterial.current.color.copy(HOLO_COLOR).multiplyScalar(1 + 1.8 * glow)
    }
    if (glowMaterial.current) glowMaterial.current.opacity = 0.07 + 0.3 * glow
  })

  const top = PLATFORM_HEIGHT

  return (
    <group ref={group}>
      {/* Base slab */}
      <mesh position-y={top / 2}>
        <cylinderGeometry args={[PLATFORM_RADIUS, PLATFORM_RADIUS + 0.08, top, 96]} />
        <meshStandardMaterial color="#0b121b" metalness={0.85} roughness={0.45} />
      </mesh>

      {/* Glowing outer ring */}
      <mesh rotation-x={-Math.PI / 2} position-y={top + 0.002}>
        <ringGeometry args={[PLATFORM_RADIUS - 0.14, PLATFORM_RADIUS - 0.02, 128]} />
        <meshBasicMaterial ref={ringMaterial} color={HOLO_COLOR} toneMapped={false} />
      </mesh>

      {/* Inner guide rings */}
      <mesh rotation-x={-Math.PI / 2} position-y={top + 0.002}>
        <ringGeometry args={[2.18, 2.2, 128]} />
        <meshBasicMaterial color={HOLO_COLOR_SOFT} toneMapped={false} transparent opacity={0.6} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={top + 0.002}>
        <ringGeometry args={[0.6, 0.615, 64]} />
        <meshBasicMaterial color={HOLO_COLOR_SOFT} toneMapped={false} transparent opacity={0.6} />
      </mesh>

      {/* Tick marks around the perimeter */}
      <mesh geometry={ticks} position-y={top + 0.003}>
        <meshBasicMaterial color={HOLO_COLOR_SOFT} toneMapped={false} transparent opacity={0.8} />
      </mesh>

      {/* Centre reticle */}
      <group position-y={top + 0.003}>
        <mesh rotation-x={-Math.PI / 2}>
          <planeGeometry args={[2.4, 0.012]} />
          <meshBasicMaterial
            color={HOLO_COLOR_SOFT}
            toneMapped={false}
            transparent
            opacity={0.45}
          />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} rotation-z={Math.PI / 2}>
          <planeGeometry args={[6.2, 0.012]} />
          <meshBasicMaterial
            color={HOLO_COLOR_SOFT}
            toneMapped={false}
            transparent
            opacity={0.45}
          />
        </mesh>
      </group>

      {/* Soft under-glow spilling onto the floor */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.0005}>
        <ringGeometry args={[PLATFORM_RADIUS + 0.08, PLATFORM_RADIUS + 1.1, 96]} />
        <meshBasicMaterial
          ref={glowMaterial}
          color={HOLO_COLOR_SOFT}
          toneMapped={false}
          transparent
          opacity={0.07}
        />
      </mesh>

      <group position-y={top}>{children}</group>
    </group>
  )
}
