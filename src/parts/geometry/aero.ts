import type { GeometryFactory } from '../types'
import { box, loftStations, merge, plateXZ, plateYZ, wing, withMirror } from './helpers'

/** Flat floor with edge fences and the central plank. */
export const floor: GeometryFactory = () => {
  const plate = plateXZ(
    [
      [0, 1.15],
      [0.3, 1.12],
      [0.5, 0.9],
      [0.62, 0.55],
      [0.8, 0.3],
      [0.8, -1.25],
      [0.6, -1.45],
      [0.5, -1.9],
      [0, -1.95],
      [-0.5, -1.9],
      [-0.6, -1.45],
      [-0.8, -1.25],
      [-0.8, 0.3],
      [-0.62, 0.55],
      [-0.5, 0.9],
      [-0.3, 1.12],
    ],
    0.03,
    0.035,
  )
  const fences = withMirror(box(0.012, 0.05, 1.2, [0.8, 0.09, -0.4]))
  const plank = box(0.3, 0.012, 2.6, [0, 0.03, -0.3])
  return [
    { geometry: merge([plate, fences]), finish: 'carbon' },
    { geometry: plank, finish: 'rubber' },
  ]
}

/** Rising rear diffuser: ramp, outer walls and two inner strakes. */
export const diffuser: GeometryFactory = () => {
  const ramp = box(0.95, 0.02, 0.733, [0, 0.23, -1.925], [0.482, 0, 0])
  const walls = withMirror(
    plateYZ(
      [
        [-1.6, 0.04],
        [-2.25, 0.04],
        [-2.25, 0.42],
        [-1.6, 0.08],
      ],
      0.015,
      0.475,
    ),
  )
  const strakes = withMirror(
    plateYZ(
      [
        [-1.65, 0.05],
        [-2.2, 0.05],
        [-2.2, 0.36],
        [-1.65, 0.08],
      ],
      0.01,
      0.2,
    ),
  )
  return [{ geometry: merge([ramp, walls, strakes]), finish: 'carbon' }]
}

/** Sidepods with radiator inlets, tapering to the floor at the rear. */
export const sidepods: GeometryFactory = () => {
  const pod = loftStations([
    { z: 0.5, cx: 0.47, hw: 0.17, y0: 0.2, y1: 0.56, n: 2.6 },
    { z: 0.2, cx: 0.48, hw: 0.21, y0: 0.1, y1: 0.58, n: 3 },
    { z: -0.3, cx: 0.46, hw: 0.21, y0: 0.08, y1: 0.52, n: 3 },
    { z: -0.8, cx: 0.42, hw: 0.17, y0: 0.08, y1: 0.4, n: 2.8 },
    { z: -1.25, cx: 0.36, hw: 0.1, y0: 0.08, y1: 0.24, n: 2.4 },
    { z: -1.55, cx: 0.32, hw: 0.05, y0: 0.08, y1: 0.14, n: 2 },
  ])
  const inlet = loftStations([
    { z: 0.52, cx: 0.47, hw: 0.13, y0: 0.26, y1: 0.5, n: 2.2 },
    { z: 0.3, cx: 0.47, hw: 0.12, y0: 0.26, y1: 0.48, n: 2.2 },
  ])
  return [
    { geometry: withMirror(pod), finish: 'paint' },
    { geometry: withMirror(inlet), finish: 'rubber' },
  ]
}

/** Engine cover flowing back from the airbox, with a shark fin along the spine. */
export const engineCover: GeometryFactory = () => {
  const cover = loftStations([
    { z: -0.3, hw: 0.2, y0: 0.7, y1: 1.08, n: 2.6 },
    { z: -0.7, hw: 0.2, y0: 0.62, y1: 0.98, n: 2.6 },
    { z: -1.1, hw: 0.17, y0: 0.58, y1: 0.86, n: 2.6 },
    { z: -1.5, hw: 0.12, y0: 0.55, y1: 0.72, n: 2.4 },
    { z: -1.9, hw: 0.07, y0: 0.54, y1: 0.62, n: 2.2 },
  ])
  const fin = plateYZ(
    [
      [-0.75, 0.97],
      [-1.1, 0.86],
      [-1.5, 0.72],
      [-1.85, 0.62],
      [-1.85, 0.9],
      [-1.4, 0.98],
      [-1.0, 1.0],
    ],
    0.02,
    0,
  )
  return [{ geometry: merge([cover, fin]), finish: 'paint' }]
}

/** Front wing: full-span main plane, three flap elements per side, endplates. */
export const frontWing: GeometryFactory = () => {
  const main = wing({
    span: 1.9,
    chord: 0.32,
    thickness: 0.035,
    camber: 0.05,
    position: [0, 0.1, 2.88],
    angle: 4,
  })
  const flaps = withMirror(
    merge([
      wing({
        span: 0.78,
        chord: 0.2,
        thickness: 0.02,
        camber: 0.05,
        position: [0.55, 0.14, 2.6],
        angle: 16,
      }),
      wing({
        span: 0.78,
        chord: 0.16,
        thickness: 0.016,
        camber: 0.05,
        position: [0.55, 0.19, 2.46],
        angle: 26,
      }),
      wing({
        span: 0.78,
        chord: 0.13,
        thickness: 0.014,
        camber: 0.05,
        position: [0.55, 0.25, 2.36],
        angle: 36,
      }),
    ]),
  )
  const endplates = withMirror(
    plateYZ(
      [
        [2.92, 0.06],
        [2.3, 0.06],
        [2.28, 0.3],
        [2.6, 0.3],
        [2.92, 0.16],
      ],
      0.015,
      0.95,
    ),
  )
  return [
    { geometry: main, finish: 'paint' },
    { geometry: merge([flaps, endplates]), finish: 'carbon' },
  ]
}

/** Rear wing: main plane, moveable upper flap, beam wing, endplates and swan-neck pylon. */
export const rearWing: GeometryFactory = () => {
  const main = wing({
    span: 1.0,
    chord: 0.36,
    thickness: 0.04,
    camber: 0.06,
    position: [0, 0.86, -2.0],
    angle: 10,
  })
  const flap = wing({
    span: 1.0,
    chord: 0.24,
    thickness: 0.022,
    camber: 0.05,
    position: [0, 0.95, -2.3],
    angle: 32,
  })
  const beam = wing({
    span: 0.8,
    chord: 0.16,
    thickness: 0.025,
    camber: 0.05,
    position: [0, 0.56, -2.1],
    angle: 14,
  })
  const endplates = withMirror(
    plateYZ(
      [
        [-1.95, 0.52],
        [-2.52, 0.52],
        [-2.52, 1.14],
        [-2.02, 1.14],
        [-1.95, 0.9],
      ],
      0.015,
      0.5,
    ),
  )
  const pylon = plateYZ(
    [
      [-1.9, 0.54],
      [-2.1, 0.54],
      [-2.2, 0.86],
      [-2.05, 0.9],
    ],
    0.025,
    0,
  )
  return [
    { geometry: main, finish: 'paint' },
    { geometry: merge([flap, beam, endplates, pylon]), finish: 'carbon' },
  ]
}

/** Deflector boards and vanes ahead of the sidepod inlets and along the floor edge. */
export const bargeboards: GeometryFactory = () => {
  const board = box(0.012, 0.22, 0.34, [0.5, 0.2, 0.78], [0, 0.35, 0])
  const vane = box(0.25, 0.01, 0.12, [0.62, 0.075, 0.5])
  const strake = box(0.012, 0.08, 0.3, [0.72, 0.1, 0.35], [0, 0.2, 0])
  return [{ geometry: withMirror(merge([board, vane, strake])), finish: 'carbon' }]
}
