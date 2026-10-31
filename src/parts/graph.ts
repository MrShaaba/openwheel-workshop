import { PARTS, PART_BY_ID, STAGES } from './registry'
import type { PartId, StageId } from './types'

export type BuildMode = 'guided' | 'free'

export type InstallCheck =
  | { ok: true }
  | {
      ok: false
      reason: 'installed' | 'busy' | 'dependencies' | 'order'
      missing: readonly PartId[]
      expected: PartId | null
    }

export function missingDependencies(id: PartId, installed: readonly PartId[]): PartId[] {
  const have = new Set(installed)
  return PART_BY_ID[id].dependencies.filter((dep) => !have.has(dep))
}

export function dependenciesMet(id: PartId, installed: readonly PartId[]): boolean {
  return missingDependencies(id, installed).length === 0
}

/** Parts that are not installed yet, in canonical order. */
export function remainingIds(installed: readonly PartId[]): PartId[] {
  const have = new Set(installed)
  return PARTS.filter((part) => !have.has(part.id)).map((part) => part.id)
}

/** Parts that could be installed right now in Free Build. */
export function installableIds(installed: readonly PartId[]): PartId[] {
  return remainingIds(installed).filter((id) => dependenciesMet(id, installed))
}

/** The next part Guided Build asks for: first remaining part whose dependencies are met. */
export function nextGuidedPart(installed: readonly PartId[]): PartId | null {
  return installableIds(installed)[0] ?? null
}

export function checkInstall(
  id: PartId,
  installed: readonly PartId[],
  mode: BuildMode,
  installing: PartId | null,
): InstallCheck {
  if (installed.includes(id)) return { ok: false, reason: 'installed', missing: [], expected: null }
  if (installing) return { ok: false, reason: 'busy', missing: [], expected: installing }
  const missing = missingDependencies(id, installed)
  if (missing.length > 0) return { ok: false, reason: 'dependencies', missing, expected: null }
  if (mode === 'guided') {
    const expected = nextGuidedPart(installed)
    if (expected !== id) return { ok: false, reason: 'order', missing: [], expected }
  }
  return { ok: true }
}

/** Every installed part that depends, directly or transitively, on `id`. */
export function dependentsOf(id: PartId, installed: readonly PartId[]): PartId[] {
  const result = new Set<PartId>()
  const queue: PartId[] = [id]
  while (queue.length > 0) {
    const current = queue.pop() as PartId
    for (const candidate of installed) {
      if (!result.has(candidate) && PART_BY_ID[candidate].dependencies.includes(current)) {
        result.add(candidate)
        queue.push(candidate)
      }
    }
  }
  return installed.filter((part) => result.has(part))
}

export interface StageProgress {
  stage: StageId
  done: number
  total: number
}

export function stageProgress(installed: readonly PartId[]): StageProgress[] {
  const have = new Set(installed)
  return STAGES.map((stage) => {
    const parts = PARTS.filter((part) => part.stage === stage.id)
    return {
      stage: stage.id,
      total: parts.length,
      done: parts.filter((part) => have.has(part.id)).length,
    }
  })
}

/** Stage of the next guided part, or the last stage when the build is complete. */
export function currentStage(installed: readonly PartId[]): StageId {
  const next = nextGuidedPart(installed)
  if (next) return PART_BY_ID[next].stage
  return STAGES[STAGES.length - 1].id
}
