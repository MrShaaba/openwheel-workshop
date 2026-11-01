import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  Float32BufferAttribute,
  Matrix4,
  PlaneGeometry,
  RingGeometry,
  type BufferGeometry,
  type Group,
  type MeshBasicMaterial,
  type ShaderMaterial,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { damp, TAU } from '../lib/math'
import { prefersReducedMotion } from '../lib/motion'
import { useWorkshop } from '../state/store'
import {
  HOLO_COLOR,
  HOLO_COLOR_SOFT,
  HOLO_HEX,
  PLATFORM_HEIGHT,
  PLATFORM_RADIUS,
} from './constants'
import { completionGlow } from './effectsBus'
import { idleSeconds } from './interaction'

const IDLE_DELAY_SECONDS = 3
const IDLE_SPEED = 0.09 // radians per second

/** How far the under-glow spills onto the floor beyond the platform edge. */
const GLOW_REACH = 2.1

const glowVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

/** Soft radial spill: bright at the platform edge, gone by GLOW_REACH, breathing slowly. */
const glowFragment = /* glsl */ `
  uniform float uTime;
  uniform float uGlow;
  uniform float uInner;
  uniform float uOuter;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float radius = length(vUv - 0.5) * 2.0 * uOuter;
    float t = clamp((radius - uInner) / (uOuter - uInner), 0.0, 1.0);
    float falloff = pow(1.0 - t, 2.6);
    float breathe = 0.9 + 0.1 * sin(uTime * 0.8);
    float alpha = falloff * (0.26 * breathe + 1.1 * uGlow);
    gl_FragColor = vec4(uColor * alpha, alpha);
  }
`

/**
 * Every static line on the platform top (tick marks, guide rings, centre reticle) in one geometry
 * and one draw call. Brightness differences ride in a vertex colour attribute.
 */
function buildOverlay(): BufferGeometry {
  const pieces: BufferGeometry[] = []
  const add = (geometry: BufferGeometry, brightness: number) => {
    const count = geometry.getAttribute('position').count
    const colors = new Float32Array(count * 3).fill(brightness)
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
    pieces.push(geometry)
  }
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
    add(geometry, 1)
  }
  add(new RingGeometry(2.18, 2.2, 128).rotateX(-Math.PI / 2), 0.75)
  add(new RingGeometry(0.6, 0.615, 64).rotateX(-Math.PI / 2), 0.75)
  add(new PlaneGeometry(2.4, 0.012).rotateX(-Math.PI / 2), 0.56)
  add(new PlaneGeometry(0.012, 6.2).rotateX(-Math.PI / 2), 0.56)
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
  const overlay = useMemo(() => buildOverlay(), [])
  const ringMaterial = useRef<MeshBasicMaterial>(null)
  const glowMaterial = useRef<ShaderMaterial>(null)
  const glowUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uGlow: { value: 0 },
      uInner: { value: PLATFORM_RADIUS - 0.2 },
      uOuter: { value: PLATFORM_RADIUS + GLOW_REACH },
      uColor: { value: new Color(HOLO_HEX).multiplyScalar(1.1) },
    }),
    [],
  )

  useEffect(() => () => overlay.dispose(), [overlay])

  useFrame(({ clock }, dt) => {
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
    // Write through the material: the fiber gives the ShaderMaterial its own copy of `uniforms`.
    if (glowMaterial.current) {
      glowMaterial.current.uniforms.uTime.value = clock.elapsedTime
      glowMaterial.current.uniforms.uGlow.value = glow
    }
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

      {/* Tick marks, guide rings and reticle: one merged geometry */}
      <mesh geometry={overlay} position-y={top + 0.003}>
        <meshBasicMaterial
          color={HOLO_COLOR_SOFT}
          vertexColors
          toneMapped={false}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Soft under-glow spilling onto the floor */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.0008}>
        <ringGeometry args={[PLATFORM_RADIUS - 0.2, PLATFORM_RADIUS + GLOW_REACH, 96]} />
        <shaderMaterial
          ref={glowMaterial}
          vertexShader={glowVertex}
          fragmentShader={glowFragment}
          uniforms={glowUniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>

      <group position-y={top}>{children}</group>
    </group>
  )
}
