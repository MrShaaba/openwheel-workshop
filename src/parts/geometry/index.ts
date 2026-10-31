import type { GeometryFactory, PartId } from '../types'
import { bargeboards, diffuser, engineCover, floor, frontWing, rearWing, sidepods } from './aero'
import { mirrors, rainLight, steeringWheel } from './controls'
import { cockpitSeat, halo, monocoque, noseCone, rollHoop } from './core'
import { energyStore, engine, exhaust, gearbox, mguK, turbocharger } from './powerUnit'
import {
  frontBrakes,
  frontSuspension,
  frontUprights,
  rearBrakes,
  rearSuspension,
  rearUprights,
  wheelFrontLeft,
  wheelFrontRight,
  wheelRearLeft,
  wheelRearRight,
} from './suspension'

/** One geometry factory per part. TypeScript fails the build if a part is missing. */
export const GEOMETRY: Record<PartId, GeometryFactory> = {
  monocoque,
  'cockpit-seat': cockpitSeat,
  halo,
  'roll-hoop': rollHoop,
  'nose-cone': noseCone,
  engine,
  turbocharger,
  'mgu-k': mguK,
  'energy-store': energyStore,
  gearbox,
  exhaust,
  'front-suspension': frontSuspension,
  'rear-suspension': rearSuspension,
  'front-uprights': frontUprights,
  'rear-uprights': rearUprights,
  'front-brakes': frontBrakes,
  'rear-brakes': rearBrakes,
  'wheel-fl': wheelFrontLeft,
  'wheel-fr': wheelFrontRight,
  'wheel-rl': wheelRearLeft,
  'wheel-rr': wheelRearRight,
  floor,
  diffuser,
  sidepods,
  'engine-cover': engineCover,
  'front-wing': frontWing,
  'rear-wing': rearWing,
  bargeboards,
  'steering-wheel': steeringWheel,
  mirrors,
  'rain-light': rainLight,
}
