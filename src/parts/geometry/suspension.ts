import type { GeometryFactory, PartPiece, Vec3 } from '../types'
import { arm, box, cylinder, latheX, merge, mirrorX, rod, withMirror } from './helpers'

const ALONG_X: Vec3 = [0, 0, Math.PI / 2]

/** Push-rod front suspension: twin wishbones, push-rod to a rocker on the chassis, track rod. */
export const frontSuspension: GeometryFactory = () => {
  const side = merge([
    arm([0.2, 0.44, 1.95], [0.6, 0.5, 1.73], 0.045, 0.012),
    arm([0.2, 0.44, 1.5], [0.6, 0.5, 1.67], 0.045, 0.012),
    arm([0.24, 0.2, 1.92], [0.6, 0.2, 1.73], 0.05, 0.014),
    arm([0.24, 0.2, 1.5], [0.6, 0.2, 1.67], 0.05, 0.014),
    arm([0.58, 0.23, 1.66], [0.16, 0.47, 1.56], 0.04, 0.014),
    rod([0.2, 0.3, 1.86], [0.6, 0.3, 1.82], 0.012),
  ])
  const rockers = withMirror(box(0.08, 0.05, 0.1, [0.14, 0.47, 1.56]))
  return [
    { geometry: withMirror(side), finish: 'carbon' },
    { geometry: rockers, finish: 'darkmetal' },
  ]
}

/** Pull-rod rear suspension hung off the gearbox, with driveshafts. */
export const rearSuspension: GeometryFactory = () => {
  const side = merge([
    arm([0.16, 0.58, -1.5], [0.58, 0.52, -1.68], 0.045, 0.012),
    arm([0.12, 0.56, -1.92], [0.58, 0.52, -1.72], 0.045, 0.012),
    arm([0.18, 0.28, -1.48], [0.58, 0.2, -1.68], 0.05, 0.014),
    arm([0.12, 0.3, -1.92], [0.58, 0.2, -1.72], 0.05, 0.014),
    arm([0.56, 0.5, -1.7], [0.14, 0.27, -1.62], 0.04, 0.014),
    rod([0.14, 0.4, -1.86], [0.58, 0.38, -1.8], 0.012),
  ])
  const driveshafts = withMirror(cylinder(0.022, 0.022, 0.42, 12, [0.38, 0.36, -1.7], ALONG_X))
  return [
    { geometry: withMirror(side), finish: 'carbon' },
    { geometry: driveshafts, finish: 'metal' },
  ]
}

function upright(z: number) {
  return withMirror(
    merge([
      box(0.07, 0.3, 0.12, [0.62, 0.36, z]),
      cylinder(0.035, 0.035, 0.16, 12, [0.7, 0.36, z], ALONG_X),
    ]),
  )
}

export const frontUprights: GeometryFactory = () => [
  { geometry: upright(1.7), finish: 'darkmetal' },
]

export const rearUprights: GeometryFactory = () => [
  { geometry: upright(-1.7), finish: 'darkmetal' },
]

/** Carbon disc with a caliper riding on its upper front quadrant. */
function brakes(z: number): PartPiece[] {
  const disc = cylinder(0.145, 0.145, 0.032, 40, [0.72, 0.36, z], ALONG_X)
  const sign = Math.sign(z)
  const caliper = box(
    0.05,
    0.11,
    0.08,
    [0.72, 0.36 + 0.115 * Math.cos(0.8), z + sign * 0.115 * Math.sin(0.8)],
    [sign * -0.8, 0, 0],
  )
  return [
    { geometry: withMirror(disc), finish: 'darkmetal' },
    { geometry: withMirror(caliper), finish: 'metal' },
  ]
}

export const frontBrakes: GeometryFactory = () => brakes(1.7)
export const rearBrakes: GeometryFactory = () => brakes(-1.7)

/**
 * 18 inch wheel: low-profile tyre, rim barrel, outer cover dish and centre nut.
 * Built with the outer face towards +X, then mirrored for the right-hand side.
 */
function wheel(halfWidth: number, side: 1 | -1, position: Vec3): PartPiece[] {
  const hw = halfWidth
  const tyre = latheX(
    [
      [0.235, -hw + 0.02],
      [0.31, -hw + 0.012],
      [0.342, -hw],
      [0.358, -hw + 0.035],
      [0.36, -hw + 0.08],
      [0.36, hw - 0.08],
      [0.358, hw - 0.035],
      [0.342, hw],
      [0.31, hw - 0.012],
      [0.235, hw - 0.02],
    ],
    48,
  )
  const barrel = cylinder(0.235, 0.235, hw * 2 - 0.04, 40, undefined, ALONG_X, true)
  const cover = latheX(
    [
      [0, hw - 0.055],
      [0.1, hw - 0.045],
      [0.2, hw - 0.062],
      [0.236, hw - 0.03],
    ],
    40,
  )
  const nut = cylinder(0.035, 0.03, 0.04, 12, [hw - 0.04, 0, 0], ALONG_X)

  const pieces: PartPiece[] = [
    { geometry: tyre, finish: 'rubber' },
    { geometry: merge([barrel, nut]), finish: 'metal' },
    { geometry: cover, finish: 'darkmetal' },
  ]
  return pieces.map((piece) => {
    const geometry = side === -1 ? mirrorX(piece.geometry) : piece.geometry
    if (side === -1) piece.geometry.dispose()
    geometry.translate(position[0], position[1], position[2])
    return { geometry, finish: piece.finish }
  })
}

export const wheelFrontLeft: GeometryFactory = () => wheel(0.15, 1, [0.8, 0.36, 1.7])
export const wheelFrontRight: GeometryFactory = () => wheel(0.15, -1, [-0.8, 0.36, 1.7])
export const wheelRearLeft: GeometryFactory = () => wheel(0.2, 1, [0.78, 0.36, -1.7])
export const wheelRearRight: GeometryFactory = () => wheel(0.2, -1, [-0.78, 0.36, -1.7])
