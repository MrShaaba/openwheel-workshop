/**
 * Tracks the last moment the user did anything, so the platform can start
 * turning when the workshop is idle and stop as soon as they come back.
 */
let lastInteraction = typeof performance !== 'undefined' ? performance.now() : 0

export function markInteraction(): void {
  lastInteraction = performance.now()
}

export function idleSeconds(): number {
  return (performance.now() - lastInteraction) / 1000
}
