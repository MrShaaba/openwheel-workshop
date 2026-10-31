import { useWorkshop } from '../state/store'
import { CarRoot } from './CarRoot'
import { CompletionFX } from './CompletionFX'
import { Dust } from './Dust'
import { Floor } from './Floor'
import { InventoryRing } from './InventoryRing'
import { Lighting } from './Lighting'
import { LightShafts } from './LightShafts'
import { Platform } from './Platform'

/** The holographic workshop: floor, lights, platform and atmosphere. The car lives on the platform. */
export function Workshop() {
  const exploded = useWorkshop((state) => state.exploded)

  return (
    <group>
      <Lighting />
      <Floor />
      <LightShafts />
      <Dust />
      <CompletionFX />
      <Platform>
        <CarRoot />
        {exploded ? null : <InventoryRing />}
      </Platform>
    </group>
  )
}
