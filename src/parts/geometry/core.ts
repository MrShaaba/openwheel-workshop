import type { GeometryFactory } from '../types'
import {
  box,
  flatShape,
  frameShape,
  loftStations,
  merge,
  plateYZ,
  tube,
  withMirror,
} from './helpers'

/** Survival cell: the carbon tub the driver sits in, from rear bulkhead to front bulkhead. */
export const monocoque: GeometryFactory = () => {
  const tub = loftStations([
    { z: -0.38, hw: 0.3, y0: 0.14, y1: 0.7, n: 3.2 },
    { z: -0.1, hw: 0.33, y0: 0.1, y1: 0.74, n: 3.4 },
    { z: 0.3, hw: 0.31, y0: 0.08, y1: 0.72, n: 3.4 },
    { z: 0.7, hw: 0.29, y0: 0.08, y1: 0.62, n: 3.2 },
    { z: 1.1, hw: 0.25, y0: 0.1, y1: 0.54, n: 3 },
    { z: 1.4, hw: 0.21, y0: 0.14, y1: 0.48, n: 2.8 },
    { z: 1.58, hw: 0.19, y0: 0.17, y1: 0.45, n: 2.6 },
  ])
  const keel = box(0.5, 0.05, 1.9, [0, 0.085, 0.6])
  return [
    { geometry: tub, finish: 'paint' },
    { geometry: keel, finish: 'carbon' },
  ]
}

/** Cockpit surround, dark cavity, reclined seat, headrest and side head padding. */
export const cockpitSeat: GeometryFactory = () => {
  const surround = flatShape(frameShape(0.56, 0.9, 0.42, 0.76, 0.14), 0.05, 0.7, 0.72)
  const sidePads = withMirror(box(0.05, 0.14, 0.3, [0.2, 0.68, 0.45]))
  const seatBack = box(0.38, 0.5, 0.04, [0, 0.5, 0.42], [-0.6, 0, 0])
  const seatBase = box(0.38, 0.04, 0.5, [0, 0.33, 0.78], [-0.25, 0, 0])
  const cavity = box(0.42, 0.3, 0.78, [0, 0.52, 0.72])
  const headrest = box(0.3, 0.14, 0.1, [0, 0.72, 0.32])
  return [
    { geometry: merge([surround, sidePads, seatBack, seatBase]), finish: 'carbon' },
    { geometry: merge([cavity, headrest]), finish: 'rubber' },
  ]
}

/** Halo: titanium hoop around the cockpit with a single forward strut. */
export const halo: GeometryFactory = () => {
  const hoop = tube(
    [
      [-0.3, 0.73, 0.2],
      [-0.33, 0.9, 0.3],
      [-0.31, 0.97, 0.65],
      [-0.22, 0.98, 1.05],
      [-0.1, 0.98, 1.25],
      [0, 0.98, 1.3],
      [0.1, 0.98, 1.25],
      [0.22, 0.98, 1.05],
      [0.31, 0.97, 0.65],
      [0.33, 0.9, 0.3],
      [0.3, 0.73, 0.2],
    ],
    0.032,
    72,
    12,
  )
  const strut = tube(
    [
      [0, 0.98, 1.3],
      [0, 0.85, 1.4],
      [0, 0.56, 1.48],
    ],
    0.028,
    12,
    10,
  )
  const mounts = withMirror(box(0.08, 0.06, 0.1, [0.3, 0.72, 0.2]))
  return [
    { geometry: merge([hoop, strut]), finish: 'carbon' },
    { geometry: mounts, finish: 'darkmetal' },
  ]
}

/** Roll hoop behind the driver's head with the airbox intake wrapped around it. */
export const rollHoop: GeometryFactory = () => {
  const hoop = tube(
    [
      [-0.22, 0.72, -0.12],
      [-0.2, 0.95, -0.17],
      [-0.1, 1.12, -0.2],
      [0, 1.15, -0.21],
      [0.1, 1.12, -0.2],
      [0.2, 0.95, -0.17],
      [0.22, 0.72, -0.12],
    ],
    0.03,
    40,
    10,
  )
  const airbox = loftStations([
    { z: -0.05, hw: 0.14, y0: 0.82, y1: 1.08, n: 2.2 },
    { z: -0.25, hw: 0.16, y0: 0.78, y1: 1.1, n: 2.6 },
    { z: -0.45, hw: 0.14, y0: 0.76, y1: 1.02, n: 2.6 },
  ])
  const inlet = loftStations([
    { z: -0.03, hw: 0.11, y0: 0.86, y1: 1.04, n: 2 },
    { z: -0.14, hw: 0.1, y0: 0.86, y1: 1.02, n: 2 },
  ])
  return [
    { geometry: hoop, finish: 'carbon' },
    { geometry: airbox, finish: 'paint' },
    { geometry: inlet, finish: 'rubber' },
  ]
}

/** Nose cone and front crash structure, drooping to the wing pylons. */
export const noseCone: GeometryFactory = () => {
  const body = loftStations([
    { z: 1.56, hw: 0.19, y0: 0.17, y1: 0.45, n: 2.6 },
    { z: 1.9, hw: 0.15, y0: 0.18, y1: 0.4, n: 2.4 },
    { z: 2.3, hw: 0.11, y0: 0.19, y1: 0.34, n: 2.2 },
    { z: 2.65, hw: 0.075, y0: 0.2, y1: 0.29, n: 2 },
    { z: 2.9, hw: 0.04, y0: 0.22, y1: 0.26, n: 2 },
  ])
  // Swept vanes dropping from the nose underside to the wing, thin in the airflow.
  const pylons = withMirror(
    plateYZ(
      [
        [2.42, 0.21],
        [2.78, 0.22],
        [2.86, 0.13],
        [2.6, 0.1],
      ],
      0.022,
      0.1,
    ),
  )
  return [
    { geometry: body, finish: 'paint' },
    { geometry: pylons, finish: 'carbon' },
  ]
}
