import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { nextGuidedPart } from '../parts/graph'
import { PART_BY_ID } from '../parts/registry'
import type { StageId } from '../parts/types'
import { useWorkshop, type CameraPreset } from '../state/store'

/** Pause between one part locking in and the next taking off. */
const GAP_SECONDS = 0.15
/** Pause after a stage-change camera move before the first part of that stage flies. */
const CAMERA_SETTLE_SECONDS = 0.9

const STAGE_CAMERA: Record<StageId, CameraPreset> = {
  core: 'hero',
  'power-unit': 'rear',
  'running-gear': 'side',
  aero: 'front',
  controls: 'cockpit',
}

/**
 * Drives Assemble All from the frame loop: installs the remaining parts in registry order with a
 * short gap, and flies the camera to a stage-specific preset whenever the stage changes. Runs
 * nothing while a part is in flight, so it pauses with the tab like everything else in the scene.
 */
export function AssemblyDirector() {
  const wait = useRef(0)
  const lastStage = useRef<StageId | null>(null)

  useFrame((_, dt) => {
    const state = useWorkshop.getState()
    if (!state.assembling) {
      lastStage.current = null
      wait.current = 0
      return
    }
    if (state.installing) return
    wait.current -= dt
    if (wait.current > 0) return

    const next = nextGuidedPart(state.installed)
    if (!next) {
      state.stopAssembly()
      return
    }
    const stage = PART_BY_ID[next].stage
    if (stage !== lastStage.current) {
      lastStage.current = stage
      state.requestCamera(STAGE_CAMERA[stage])
      wait.current = CAMERA_SETTLE_SECONDS
      return
    }
    const check = state.queueInstall(next)
    wait.current = GAP_SECONDS
    if (!check.ok) state.stopAssembly()
  })

  return null
}
