import { useMemo } from 'react'
import {
  currentStage,
  installableIds,
  nextGuidedPart,
  remainingIds,
  stageProgress,
} from '../parts/graph'
import { PART_COUNT } from '../parts/registry'
import { useWorkshop, type WorkshopState } from './store'

export const selectInstalled = (state: WorkshopState) => state.installed
export const selectMode = (state: WorkshopState) => state.mode
export const selectInstalling = (state: WorkshopState) => state.installing
export const selectInspecting = (state: WorkshopState) => state.inspecting
export const selectHovered = (state: WorkshopState) => state.hovered
export const selectReady = (state: WorkshopState) => state.ready
export const selectMuted = (state: WorkshopState) => state.muted

/** The part Guided Build wants next (null when complete). */
export function useNextGuided() {
  const installed = useWorkshop(selectInstalled)
  return useMemo(() => nextGuidedPart(installed), [installed])
}

/** Parts whose dependencies are met and are not installed yet. */
export function useInstallable() {
  const installed = useWorkshop(selectInstalled)
  return useMemo(() => installableIds(installed), [installed])
}

export function useRemaining() {
  const installed = useWorkshop(selectInstalled)
  return useMemo(() => remainingIds(installed), [installed])
}

export function useStageProgress() {
  const installed = useWorkshop(selectInstalled)
  return useMemo(() => stageProgress(installed), [installed])
}

export function useCurrentStage() {
  const installed = useWorkshop(selectInstalled)
  return useMemo(() => currentStage(installed), [installed])
}

export function useIsComplete() {
  const installed = useWorkshop(selectInstalled)
  return installed.length === PART_COUNT
}
