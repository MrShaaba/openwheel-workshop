import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import {
  AdditiveBlending,
  DoubleSide,
  type Mesh,
  type MeshBasicMaterial,
  type PointLight,
} from 'three'
import { easeOutCubic } from '../lib/easing'
import { clamp01, damp, lerp } from '../lib/math'
import { useWorkshop } from '../state/store'
import { HOLO_COLOR, PLATFORM_HEIGHT, PLATFORM_RADIUS } from './constants'
import { completionGlow } from './effectsBus'

const WAVE_SECONDS = 2.4
const WAVE_DELAYS = [0, 0.38]
const WAVE_REACH = 17
const LIGHT_SECONDS = 1.4
const GLOW_RISE = 0.4
const GLOW_FALL = 3.4
const TOTAL = GLOW_RISE + GLOW_FALL

/**
 * Fires when the car is complete: two additive shockwave rings race across the floor from the
 * platform edge, a light bursts at the car and the platform glow rises then settles.
 */
export function CompletionFX() {
  const seen = useRef<number | null>(useWorkshop.getState().celebration)
  const elapsed = useRef<number | null>(null)
  const waves = useRef<(Mesh | null)[]>([])
  const light = useRef<PointLight>(null)

  useFrame((_, dt) => {
    const celebration = useWorkshop.getState().celebration
    if (celebration !== seen.current) {
      seen.current = celebration
      if (celebration !== null) elapsed.current = 0
    }
    if (elapsed.current === null) {
      completionGlow.value = damp(completionGlow.value, 0, 3, dt)
      return
    }
    const t = (elapsed.current += dt)

    waves.current.forEach((wave, i) => {
      if (!wave) return
      const k = clamp01((t - WAVE_DELAYS[i]) / WAVE_SECONDS)
      const live = k > 0 && k < 1
      wave.visible = live
      if (!live) return
      wave.scale.setScalar(lerp(PLATFORM_RADIUS, WAVE_REACH, easeOutCubic(k)))
      ;(wave.material as MeshBasicMaterial).opacity = 0.55 * Math.pow(1 - k, 1.6)
    })

    if (light.current) {
      const k = clamp01(t / LIGHT_SECONDS)
      light.current.intensity = 320 * Math.sin(Math.PI * k)
    }

    completionGlow.value =
      t < GLOW_RISE ? t / GLOW_RISE : Math.max(0, 1 - (t - GLOW_RISE) / GLOW_FALL)

    if (t > TOTAL) {
      elapsed.current = null
      if (light.current) light.current.intensity = 0
    }
  })

  return (
    <group name="completion-fx">
      {WAVE_DELAYS.map((delay) => (
        <mesh
          key={delay}
          ref={(node) => {
            waves.current[WAVE_DELAYS.indexOf(delay)] = node
          }}
          rotation-x={-Math.PI / 2}
          position-y={PLATFORM_HEIGHT + 0.012}
          visible={false}
        >
          <ringGeometry args={[0.965, 1, 128]} />
          <meshBasicMaterial
            color={HOLO_COLOR}
            transparent
            opacity={0}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
            side={DoubleSide}
          />
        </mesh>
      ))}
      <pointLight
        ref={light}
        position={[0, 1.3, 0.3]}
        intensity={0}
        distance={14}
        decay={2}
        color="#bff6ff"
      />
    </group>
  )
}
