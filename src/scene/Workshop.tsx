import { CarRoot } from './CarRoot'
import { Dust } from './Dust'
import { Floor } from './Floor'
import { InventoryRing } from './InventoryRing'
import { Lighting } from './Lighting'
import { LightShafts } from './LightShafts'
import { Platform } from './Platform'

/** The holographic workshop: floor, lights, platform and atmosphere. The car lives on the platform. */
export function Workshop() {
  return (
    <group>
      <Lighting />
      <Floor />
      <LightShafts />
      <Dust />
      <Platform>
        <CarRoot />
        <InventoryRing />
      </Platform>
    </group>
  )
}
