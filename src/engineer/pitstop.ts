/**
 * The pit-stop challenge as plain data: a sequence of prompts, the key each one wants, and a clock.
 * The React component only draws it and feeds it key presses.
 */

export type Wheel = 'fl' | 'fr' | 'rl' | 'rr'

export const WHEELS: readonly Wheel[] = ['fl', 'fr', 'rl', 'rr']

export const WHEEL_KEYS: Record<Wheel, string> = { fl: '1', fr: '2', rl: '3', rr: '4' }

export const WHEEL_NAMES: Record<Wheel, string> = {
  fl: 'Front left',
  fr: 'Front right',
  rl: 'Rear left',
  rr: 'Rear right',
}

export type PitStep =
  | { kind: 'jacks-up' }
  | { kind: 'wheel-off'; wheel: Wheel }
  | { kind: 'wheel-on'; wheel: Wheel }
  | { kind: 'jacks-down' }
  | { kind: 'go' }

export interface PitStop {
  steps: PitStep[]
  /** Index of the step waiting for its key. */
  index: number
  startedAt: number | null
  finishedAt: number | null
  mistakes: number
  /** Added to the clock: half a second per wrong key. */
  penaltyMs: number
}

export const PENALTY_MS = 500

/** Keys that advance a step. Space and Enter work for the jacks and the release. */
export function keysFor(step: PitStep): readonly string[] {
  switch (step.kind) {
    case 'wheel-off':
    case 'wheel-on':
      return [WHEEL_KEYS[step.wheel]]
    default:
      return [' ', 'Enter']
  }
}

export function promptFor(step: PitStep): { title: string; hint: string } {
  switch (step.kind) {
    case 'jacks-up':
      return { title: 'Jacks up', hint: 'SPACE' }
    case 'wheel-off':
      return {
        title: `Gun off: ${WHEEL_NAMES[step.wheel].toLowerCase()}`,
        hint: WHEEL_KEYS[step.wheel],
      }
    case 'wheel-on':
      return {
        title: `New tyre on: ${WHEEL_NAMES[step.wheel].toLowerCase()}`,
        hint: WHEEL_KEYS[step.wheel],
      }
    case 'jacks-down':
      return { title: 'Jacks down', hint: 'SPACE' }
    case 'go':
      return { title: 'Green light. Go!', hint: 'SPACE' }
  }
}

function shuffled(random: () => number): Wheel[] {
  const list = [...WHEELS]
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

/** A fresh stop: jacks, four wheels off in one order, four on in another, jacks down, release. */
export function createPitStop(random: () => number = Math.random): PitStop {
  return {
    steps: [
      { kind: 'jacks-up' },
      ...shuffled(random).map((wheel): PitStep => ({ kind: 'wheel-off', wheel })),
      ...shuffled(random).map((wheel): PitStep => ({ kind: 'wheel-on', wheel })),
      { kind: 'jacks-down' },
      { kind: 'go' },
    ],
    index: 0,
    startedAt: null,
    finishedAt: null,
    mistakes: 0,
    penaltyMs: 0,
  }
}

export function currentStep(stop: PitStop): PitStep | null {
  return stop.steps[stop.index] ?? null
}

/** The clock starts when the car stops in the box. */
export function startClock(stop: PitStop, now: number): void {
  stop.startedAt = now
}

export type PressResult = 'ok' | 'wrong' | 'done' | 'ignored'

/** Feed one key. Wrong keys cost a penalty; the right one moves the stop along. */
export function press(stop: PitStop, key: string, now: number): PressResult {
  if (stop.startedAt === null || stop.finishedAt !== null) return 'ignored'
  const step = currentStep(stop)
  if (!step) return 'ignored'
  if (!keysFor(step).includes(key)) {
    // Only the keys the game uses count as mistakes; a stray letter is ignored.
    if (!GAME_KEYS.has(key)) return 'ignored'
    stop.mistakes += 1
    stop.penaltyMs += PENALTY_MS
    return 'wrong'
  }
  stop.index += 1
  if (stop.index >= stop.steps.length) {
    stop.finishedAt = now
    return 'done'
  }
  return 'ok'
}

const GAME_KEYS = new Set([' ', 'Enter', '1', '2', '3', '4'])

/** Time on the clock including penalties. */
export function elapsedMs(stop: PitStop, now: number): number {
  if (stop.startedAt === null) return 0
  return (stop.finishedAt ?? now) - stop.startedAt + stop.penaltyMs
}

/** Wheels already changed, for drawing the new tyres. */
export function wheelsOn(stop: PitStop): Set<Wheel> {
  const on = new Set<Wheel>()
  stop.steps.slice(0, stop.index).forEach((step) => {
    if (step.kind === 'wheel-on') on.add(step.wheel)
  })
  return on
}

export function wheelsOff(stop: PitStop): Set<Wheel> {
  const off = new Set<Wheel>()
  stop.steps.slice(0, stop.index).forEach((step) => {
    if (step.kind === 'wheel-off') off.add(step.wheel)
    if (step.kind === 'wheel-on') off.delete(step.wheel)
  })
  return off
}

export function jacksUp(stop: PitStop): boolean {
  const step = currentStep(stop)
  return stop.index > 0 && step !== null && step.kind !== 'go'
}

export interface Rating {
  title: string
  blurb: string
}

/** Real stops take about two seconds with twenty people; one person on a keyboard gets more time. */
export function rateStop(ms: number, mistakes: number): Rating {
  if (ms <= 3500) {
    return {
      title: 'World class',
      blurb:
        mistakes === 0 ? 'Not a single slip. The pit wall is on its feet.' : 'Blisteringly quick.',
    }
  }
  if (ms <= 5000)
    return { title: 'Pit crew', blurb: 'Fast hands. You would keep your place in the crew.' }
  if (ms <= 7500)
    return { title: 'Getting there', blurb: 'Clean work. Now read the next prompt a beat earlier.' }
  return {
    title: 'Rookie',
    blurb: 'Every crew member started here. Try to spot the wheel before the prompt lands.',
  }
}

/** Time under which a clean stop earns the Pit crew badge. */
export const BADGE_MS = 5000

export const PIT_FACTS: readonly string[] = [
  'A real crew of around twenty people changes all four tyres in about two seconds.',
  'Each wheel is held on by a single nut. The wheel gun spins it off in a fraction of a second.',
  'Three people work on every wheel: one on the gun, one pulling the old wheel off, one fitting the new one.',
  'The car sits on a front jack and a rear jack. Both go in and out in under a second.',
  'A traffic light on the gantry turns green when all four wheels are tight and the lane is clear.',
  'Tyres are kept in heated blankets until the last moment so they grip straight away.',
]

/** m:ss.mmm or ss.mmm, whichever reads best for a few seconds. */
export function formatStop(ms: number): string {
  const total = Math.max(0, Math.round(ms))
  const seconds = Math.floor(total / 1000)
  const millis = total % 1000
  return `${seconds}.${String(millis).padStart(3, '0')}`
}
