import type { GeometryFactory, PartPiece, Vec3 } from '../types'
import { box, cylinder, extrude, frameShape, merge, place, rod, withMirror } from './helpers'

const WHEEL_POSITION: Vec3 = [0, 0.78, 1.0]
const WHEEL_TILT: Vec3 = [-0.35, 0, 0]

/** Rectangular steering wheel with display, buttons, grips, paddles and column. */
export const steeringWheel: GeometryFactory = () => {
  const rim = extrude(frameShape(0.28, 0.17, 0.18, 0.09, 0.05), 0.035)
  rim.translate(0, 0, -0.0175)
  const paddles = withMirror(box(0.06, 0.04, 0.01, [0.1, -0.06, -0.03]))
  const grips = withMirror(box(0.05, 0.1, 0.045, [0.13, 0, 0]))
  const display = box(0.12, 0.06, 0.012, [0, 0.015, 0.012])
  const buttons = merge(
    (
      [
        [0.06, 0.06],
        [-0.06, 0.06],
        [0.09, 0.03],
        [-0.09, 0.03],
        [0.05, -0.035],
        [-0.05, -0.035],
      ] as [number, number][]
    ).map(([x, y]) => cylinder(0.01, 0.01, 0.014, 10, [x, y, 0.012], [Math.PI / 2, 0, 0])),
  )
  const column = cylinder(0.02, 0.02, 0.16, 12, [0, -0.02, -0.1], [Math.PI / 2, 0, 0])

  const pieces: PartPiece[] = [
    { geometry: merge([rim, paddles]), finish: 'carbon' },
    { geometry: grips, finish: 'rubber' },
    { geometry: display, finish: 'glass' },
    { geometry: buttons, finish: 'metal' },
    { geometry: column, finish: 'darkmetal' },
  ]
  return pieces.map((piece) => ({
    geometry: place(piece.geometry, WHEEL_POSITION, WHEEL_TILT),
    finish: piece.finish,
  }))
}

/** Wing mirrors on stalks beside the cockpit. */
export const mirrors: GeometryFactory = () => {
  const housing = box(0.15, 0.08, 0.07, [0.56, 0.8, 0.95])
  const glass = box(0.13, 0.06, 0.006, [0.56, 0.8, 0.913])
  const stalk = rod([0.36, 0.68, 0.98], [0.52, 0.78, 0.96], 0.01)
  return [
    { geometry: withMirror(housing), finish: 'paint' },
    { geometry: withMirror(glass), finish: 'glass' },
    { geometry: withMirror(stalk), finish: 'carbon' },
  ]
}

/** Rear rain light on the crash structure. */
export const rainLight: GeometryFactory = () => {
  const lamp = box(0.09, 0.07, 0.03, [0, 0.56, -2.45])
  const bracket = box(0.06, 0.05, 0.04, [0, 0.52, -2.42])
  return [
    { geometry: lamp, finish: 'emissive' },
    { geometry: bracket, finish: 'carbon' },
  ]
}
