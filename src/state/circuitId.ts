/** Which test-drive circuit is selected. Lives in the main bundle so the store can save it. */
export type CircuitId = 'flat' | 'ridge'

export const CIRCUIT_IDS: readonly CircuitId[] = ['flat', 'ridge']

export function isCircuitId(value: unknown): value is CircuitId {
  return typeof value === 'string' && (CIRCUIT_IDS as readonly string[]).includes(value)
}
