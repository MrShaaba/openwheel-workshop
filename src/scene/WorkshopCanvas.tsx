import { PerformanceMonitor } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Suspense, useRef, useState } from 'react'
import { useWorkshop } from '../state/store'
import { CameraRig } from './CameraRig'
import { HERO_POSE } from './cameraPoses'
import { BACKGROUND, toVector3 } from './constants'
import { Effects } from './Effects'
import { markInteraction } from './interaction'
import { Workshop } from './Workshop'

const MAX_DPR = 2

/** Flips the store's `ready` flag once the first frame has rendered, so the boot screen can clear. */
function ReadySignal() {
  const fired = useRef(false)
  useFrame(() => {
    if (fired.current) return
    fired.current = true
    useWorkshop.getState().setReady()
  })
  return null
}

export function WorkshopCanvas() {
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, MAX_DPR))
  const ceiling = Math.min(window.devicePixelRatio || 1, MAX_DPR)

  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      camera={{ position: toVector3(HERO_POSE.position), fov: 38, near: 0.1, far: 120 }}
      onPointerDown={markInteraction}
      onWheel={markInteraction}
    >
      <color attach="background" args={[BACKGROUND]} />
      <fog attach="fog" args={[BACKGROUND, 18, 48]} />
      <PerformanceMonitor
        flipflops={3}
        onDecline={() => setDpr((value) => Math.max(1, value - 0.5))}
        onIncline={() => setDpr((value) => Math.min(ceiling, value + 0.5))}
        onFallback={() => setDpr(1)}
      />
      <Suspense fallback={null}>
        <Workshop />
        <CameraRig />
        <Effects />
        <ReadySignal />
      </Suspense>
    </Canvas>
  )
}
