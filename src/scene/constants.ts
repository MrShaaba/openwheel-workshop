import { Color, Vector3 } from 'three'
import type { Vec3 } from '../parts/types'

export const BACKGROUND = '#04070d'
export const HOLO_HEX = '#38e7ff'

/** Hologram colour pushed above 1.0 so bloom picks it up. */
export const HOLO_COLOR = new Color(HOLO_HEX).multiplyScalar(2.2)
export const HOLO_COLOR_SOFT = new Color(HOLO_HEX).multiplyScalar(1.3)

export const PLATFORM_RADIUS = 3.4
export const PLATFORM_HEIGHT = 0.14
/** Y of the platform's top surface, where the car's reference plane sits. */
export const CAR_BASE_Y = PLATFORM_HEIGHT

export const toVector3 = (v: Vec3): Vector3 => new Vector3(v[0], v[1], v[2])
