/** Badges the Race engineer hands out. Saved with the build. */
export type BadgeId = 'race-engineer' | 'pit-crew' | 'hot-lap'

export interface BadgeInfo {
  name: string
  blurb: string
}

export const BADGES: Record<BadgeId, BadgeInfo> = {
  'race-engineer': { name: 'Race engineer', blurb: 'A perfect round of the quiz' },
  'pit-crew': { name: 'Pit crew', blurb: 'A pit stop under five seconds with no mistakes' },
  'hot-lap': { name: 'Hot lap', blurb: 'A lap of the circuit under 30 seconds' },
}

export const BADGE_IDS = Object.keys(BADGES) as BadgeId[]

export function sanitizeBadges(value: unknown): BadgeId[] {
  if (!Array.isArray(value)) return []
  const kept: BadgeId[] = []
  for (const entry of value) {
    if (typeof entry === 'string' && entry in BADGES && !kept.includes(entry as BadgeId)) {
      kept.push(entry as BadgeId)
    }
  }
  return kept
}
