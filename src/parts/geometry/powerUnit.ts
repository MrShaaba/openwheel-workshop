import type { GeometryFactory } from '../types'
import { box, cylinder, loftStations, merge, tube, withMirror } from './helpers'

const ALONG_Z: [number, number, number] = [Math.PI / 2, 0, 0]

/**
 * 1.6 litre V6: block, sump, two cam covers in a V, carbon intake plenum with six trumpets, a bell
 * housing at the back and the exhaust collectors running down each bank.
 */
export const engine: GeometryFactory = () => {
  const block = box(0.46, 0.34, 0.72, [0, 0.4, -0.75])
  const sump = box(0.3, 0.08, 0.6, [0, 0.21, -0.75])
  const bellHousing = cylinder(0.2, 0.2, 0.06, 32, [0, 0.42, -1.1], ALONG_Z)
  const camLeft = box(0.16, 0.16, 0.6, [-0.14, 0.62, -0.75], [0, 0, 0.6])
  const camRight = box(0.16, 0.16, 0.6, [0.14, 0.62, -0.75], [0, 0, -0.6])
  const trumpets = merge(
    [-0.6, -0.75, -0.9].flatMap((z) => [
      cylinder(0.026, 0.034, 0.05, 14, [0.07, 0.815, z]),
      cylinder(0.026, 0.034, 0.05, 14, [-0.07, 0.815, z]),
    ]),
  )
  const collectors = withMirror(
    merge([
      tube(
        [
          [0.24, 0.52, -0.56],
          [0.3, 0.44, -0.66],
          [0.3, 0.4, -0.86],
          [0.24, 0.5, -1.0],
        ],
        0.022,
        20,
        10,
      ),
      cylinder(0.02, 0.02, 0.07, 10, [0.26, 0.5, -0.7], [0, 0, Math.PI / 2]),
      cylinder(0.02, 0.02, 0.07, 10, [0.26, 0.5, -0.85], [0, 0, Math.PI / 2]),
    ]),
  )
  const plenum = box(0.26, 0.1, 0.56, [0, 0.74, -0.72])
  return [
    { geometry: merge([block, sump, bellHousing]), finish: 'darkmetal' },
    { geometry: merge([camLeft, camRight, trumpets, collectors]), finish: 'metal' },
    { geometry: plenum, finish: 'carbon' },
  ]
}

/** Turbocharger: compressor and turbine housings on a common shaft above the bell housing. */
export const turbocharger: GeometryFactory = () => {
  const compressor = cylinder(0.1, 0.1, 0.09, 24, [0, 0.78, -1.05], ALONG_Z)
  const shaft = cylinder(0.03, 0.03, 0.08, 12, [0, 0.78, -1.11], ALONG_Z)
  const inletPipe = tube(
    [
      [0, 0.78, -1.0],
      [0.08, 0.8, -0.95],
      [0.16, 0.76, -0.9],
    ],
    0.035,
    12,
    10,
  )
  const turbine = cylinder(0.08, 0.08, 0.08, 24, [0, 0.78, -1.17], ALONG_Z)
  return [
    { geometry: merge([compressor, shaft, inletPipe]), finish: 'metal' },
    { geometry: turbine, finish: 'darkmetal' },
  ]
}

/** MGU-K: the motor generator on the side of the engine, driven off the crankshaft. */
export const mguK: GeometryFactory = () => {
  const body = cylinder(0.065, 0.065, 0.3, 20, [0.3, 0.32, -0.55], ALONG_Z)
  const caps = merge([
    cylinder(0.072, 0.072, 0.03, 20, [0.3, 0.32, -0.39], ALONG_Z),
    cylinder(0.072, 0.072, 0.03, 20, [0.3, 0.32, -0.71], ALONG_Z),
  ])
  const cable = tube(
    [
      [0.3, 0.38, -0.4],
      [0.28, 0.42, -0.25],
      [0.2, 0.36, -0.1],
    ],
    0.012,
    12,
    8,
  )
  return [
    { geometry: body, finish: 'darkmetal' },
    { geometry: caps, finish: 'metal' },
    { geometry: cable, finish: 'rubber' },
  ]
}

/** Energy store: the battery pack under the fuel cell, behind the seat. */
export const energyStore: GeometryFactory = () => {
  const pack = box(0.48, 0.15, 0.56, [0, 0.27, -0.05])
  const lid = box(0.4, 0.02, 0.48, [0, 0.355, -0.05])
  const terminals = withMirror(cylinder(0.02, 0.02, 0.04, 10, [0.15, 0.38, 0.15]))
  return [
    { geometry: pack, finish: 'carbon' },
    { geometry: merge([lid, terminals]), finish: 'metal' },
  ]
}

/** Gearbox casing tapering back to the rear crash structure. */
export const gearbox: GeometryFactory = () => {
  const casing = loftStations([
    { z: -1.12, hw: 0.21, y0: 0.24, y1: 0.68, n: 3 },
    { z: -1.5, hw: 0.17, y0: 0.26, y1: 0.62, n: 3 },
    { z: -1.85, hw: 0.12, y0: 0.3, y1: 0.56, n: 2.6 },
    { z: -2.02, hw: 0.09, y0: 0.34, y1: 0.54, n: 2.4 },
  ])
  const crashStructure = loftStations([
    { z: -2.02, hw: 0.09, y0: 0.36, y1: 0.54, n: 2.4 },
    { z: -2.4, hw: 0.06, y0: 0.42, y1: 0.52, n: 2.2 },
  ])
  return [
    { geometry: casing, finish: 'darkmetal' },
    { geometry: crashStructure, finish: 'carbon' },
  ]
}

/** Single central tailpipe plus two wastegate pipes. */
export const exhaust: GeometryFactory = () => {
  const main = tube(
    [
      [0, 0.72, -1.2],
      [0, 0.74, -1.5],
      [0, 0.73, -1.85],
      [0, 0.7, -2.15],
    ],
    0.035,
    24,
    12,
  )
  const tip = cylinder(0.04, 0.038, 0.1, 16, [0, 0.7, -2.18], ALONG_Z, true)
  const wastegates = withMirror(
    tube(
      [
        [0.06, 0.7, -1.3],
        [0.07, 0.68, -1.7],
        [0.07, 0.66, -2.1],
      ],
      0.014,
      16,
      8,
    ),
  )
  return [{ geometry: merge([main, tip, wastegates]), finish: 'metal' }]
}
