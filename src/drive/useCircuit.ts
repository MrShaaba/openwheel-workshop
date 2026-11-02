import { useWorkshop } from '../state/store'
import { getCircuit, type Circuit } from './track'

/** The circuit the store has selected, as built data. Re-renders when the selection changes. */
export function useCircuit(): Circuit {
  const id = useWorkshop((state) => state.circuit)
  return getCircuit(id)
}
