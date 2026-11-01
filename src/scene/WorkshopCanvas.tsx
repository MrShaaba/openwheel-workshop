import { PerformanceMonitor } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Suspense, useRef, useState } from 'react'
import { exposeDebugHandle } from '../debug'
import { DriveScene } from '../drive/lazy'
import { useWorkshop } from '../state/store'
import { AssemblyDirector } from './AssemblyDirector'
import { CameraRig } from './CameraRig'
import { HERO_POSE } from './cameraPoses'
import { BACKGROUND, toVector3 } from './constants'
import { Effects } from './Effects'
import { markInteraction } from './interaction'
import { Workshop } from './Workshop'

/** Retina screens render at 1.5x: with SMAA below that and the pixel density above, 2x is not visible. */
const MAX_DPR = 1.5

type FogArgs = [color: string, near: number, far: number]
const WORKSHOP_FOG: FogArgs = [BACKGROUND, 18, 48]
/** The circuit is hundreds of metres across, so its fog starts and ends much further out. */
const TRACK_FOG: FogArgs = [BACKGROUND, 40, 360]

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
  const trackScene = useWorkshop((state) => state.trackScene)

  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      camera={{ position: toVector3(HERO_POSE.position), fov: 38, near: 0.1, far: 120 }}
      onPointerDown={markInteraction}
      onWheel={markInteraction}
      onCreated={exposeDebugHandle}
      onPointerMissed={() => {
        const state = useWorkshop.getState()
        if (state.inspecting) state.inspect(null)
      }}
    >
      <color attach="background" args={[BACKGROUND]} />
      <fog attach="fog" args={trackScene ? TRACK_FOG : WORKSHOP_FOG} />
      {/* Averages over about four seconds so a one-off hitch (many parts mounting at once) does not
          drop the pixel ratio; it moves in quarter steps between 1 and the ceiling. */}
      <PerformanceMonitor
        ms={300}
        iterations={14}
        flipflops={4}
        onDecline={() => setDpr((value) => Math.max(1, value - 0.25))}
        onIncline={() => setDpr((value) => Math.min(ceiling, value + 0.25))}
        onFallback={() => setDpr(1)}
      />
      <Suspense fallback={null}>
        {trackScene ? (
          // Its own boundary, so the chunk loading never blanks the effects or the ready signal.
          <Suspense fallback={null}>
            <DriveScene />
          </Suspense>
        ) : (
          <>
            <Workshop />
            <CameraRig />
          </>
        )}
        <AssemblyDirector />
        <Effects />
        <ReadySignal />
      </Suspense>
    </Canvas>
  )
}
