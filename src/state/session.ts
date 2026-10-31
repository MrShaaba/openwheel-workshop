import type { PartId } from '../parts/types'

/**
 * Session-only mutable state shared between the store and the scene without re-renders.
 * Parts committed during this session; InstalledPart plays the materialise wipe for these only.
 */
export const freshInstalls = new Set<PartId>()
