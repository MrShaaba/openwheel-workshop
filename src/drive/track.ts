/**
 * The test-drive circuits: each is a closed centreline made of straights joined by circular arcs,
 * sampled at equal arc length, with a height profile along the lap, plus the queries the physics,
 * the lap timer, the kerbs and the minimap need. Everything is in metres; X and Z on the ground,
 * Y up. The car's heading convention applies (forward is (sin h, 0, cos h), a left turn raises h),
 * so "left" of a tangent (tx, tz) is the normal (tz, -tx).
 */
import type { CircuitId } from '../state/circuitId'
import type { CarPose } from './physics'

export type { CircuitId } from '../state/circuitId'
export { CIRCUIT_IDS, isCircuitId } from '../state/circuitId'

interface Corner {
  x: number
  z: number
  /** Fillet radius at this vertex. Shrunk automatically if two fillets would overlap. */
  radius: number
}

export interface CircuitDefinition {
  id: CircuitId
  name: string
  /** One line for the circuit switcher. */
  blurb: string
  /**
   * Corner vertices in lap order. The edge from the last vertex to the first is the main straight,
   * and the start line sits part-way along it.
   */
  corners: readonly Corner[]
  /** Where along the main straight the start line sits (0 = exit of the last corner). */
  startFraction: number
  /** How far outside the centreline's bounding box the arena wall stands. */
  arenaMargin: number
  /** Height in metres at fractions of the lap from the start line; smoothed and periodic. */
  profile: readonly (readonly [number, number])[]
  /** How far the ground beside the road takes to fall back to zero on a raised section. */
  embankment: number
}

export const TRACK_WIDTH = 13
export const HALF_WIDTH = TRACK_WIDTH / 2
/** Beyond the kerbs the car is on the run-off and loses grip and speed. */
export const RUNOFF_MARGIN = 1.2
/** The kerb band keeps the road's height; the embankment begins beyond it. */
export const KERB_BAND = 1.3
/** Sample spacing in metres. */
const SAMPLE_SPACING = 1
/** Corners tighter than this radius get kerbs. */
export const KERB_RADIUS = 60

export const CIRCUIT_DEFINITIONS: Record<CircuitId, CircuitDefinition> = {
  flat: {
    id: 'flat',
    name: 'Flat circuit',
    blurb: '715 m, level. A fast first corner, an S into the infield, a chicane and a hairpin.',
    // A fast first corner, a right-right-left S into the infield, a right-hander onto the back
    // straight, a left-right chicane, a hairpin-like right, a left kink and a wide final corner.
    corners: [
      { x: 112, z: -72, radius: 36 },
      { x: 118, z: 0, radius: 22 },
      { x: 92, z: 30, radius: 20 },
      { x: 60, z: 44, radius: 18 },
      { x: 70, z: 84, radius: 24 },
      { x: 30, z: 108, radius: 30 },
      { x: -30, z: 100, radius: 16 },
      { x: -44, z: 112, radius: 16 },
      { x: -90, z: 96, radius: 30 },
      { x: -70, z: 44, radius: 20 },
      { x: -110, z: 10, radius: 26 },
      { x: -112, z: -72, radius: 34 },
    ],
    startFraction: 0.42,
    arenaMargin: 34,
    profile: [[0, 0]],
    embankment: 36,
  },
  ridge: {
    id: 'ridge',
    name: 'Ridge circuit',
    blurb: 'About 1 km with hills: a climb through the esses, a blind crest, a downhill hairpin.',
    // A long main straight into a fast right, a climbing right-left-right through the esses, a
    // left over the crest, a kink along the top, a downhill left into a tight hairpin, then two
    // long descending lefts back onto the straight.
    corners: [
      { x: 163, z: -86, radius: 42 },
      { x: 176, z: -9, radius: 24 },
      { x: 138, z: 34, radius: 20 },
      { x: 159, z: 82, radius: 20 },
      { x: 112, z: 129, radius: 34 },
      { x: 34, z: 142, radius: 56 },
      { x: -26, z: 108, radius: 20 },
      { x: -69, z: 146, radius: 15 },
      { x: -138, z: 120, radius: 30 },
      { x: -168, z: 43, radius: 36 },
      { x: -150, z: -86, radius: 32 },
    ],
    startFraction: 0.45,
    arenaMargin: 52,
    profile: [
      [0, 0],
      [0.12, 0],
      [0.2, 0],
      [0.3, 5],
      [0.4, 12],
      [0.47, 15],
      [0.55, 13],
      [0.63, 7],
      [0.7, 2],
      [0.78, -2],
      [0.87, -1],
      [0.94, 0],
    ],
    embankment: 40,
  },
}

export interface Circuit {
  id: CircuitId
  name: string
  blurb: string
  count: number
  /** Total length in metres and the arc length between samples. */
  length: number
  ds: number
  /** Sample positions as [x0, z0, x1, z1, ...]. */
  points: Float32Array
  /** Unit tangents as [tx0, tz0, ...]. */
  tangents: Float32Array
  /** Signed curvature per sample (1/m); positive turns left. */
  curvature: Float32Array
  /** Road height per sample, metres. */
  heights: Float32Array
  /** Rise per metre along the track at each sample. */
  grades: Float32Array
  /** Second derivative of height along the track: negative over a crest, positive in a dip. */
  heightCurvature: Float32Array
  maxHeight: number
  minHeight: number
  embankment: number
  arena: { minX: number; maxX: number; minZ: number; maxZ: number }
  minimap: Minimap
}

const wrap = (angle: number): number => {
  const w = angle % (Math.PI * 2)
  return w > Math.PI ? w - Math.PI * 2 : w <= -Math.PI ? w + Math.PI * 2 : w
}

interface Fillet {
  /** Arc start, arc end and centre. */
  ax: number
  az: number
  bx: number
  bz: number
  cx: number
  cz: number
  radius: number
  /** Signed sweep; positive is a left turn. */
  sweep: number
}

/** Tangent points and centres for every corner, with radii reduced where two fillets would meet. */
function buildFillets(corners: readonly Corner[]): Fillet[] {
  const n = corners.length
  const dirIn: [number, number][] = []
  const turn: number[] = []
  for (let i = 0; i < n; i++) {
    const prev = corners[(i - 1 + n) % n]
    const here = corners[i]
    const next = corners[(i + 1) % n]
    const inX = here.x - prev.x
    const inZ = here.z - prev.z
    const inLength = Math.hypot(inX, inZ)
    const outX = next.x - here.x
    const outZ = next.z - here.z
    dirIn.push([inX / inLength, inZ / inLength])
    turn.push(wrap(Math.atan2(outX, outZ) - Math.atan2(inX, inZ)))
  }
  const radii = corners.map((corner) => corner.radius)
  const setback = (i: number) => radii[i] * Math.tan(Math.abs(turn[i]) / 2)
  // Two passes are enough for the fillets of adjacent corners to fit on their shared edge.
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      const edge = Math.hypot(corners[j].x - corners[i].x, corners[j].z - corners[i].z) * 0.98
      const needed = setback(i) + setback(j)
      if (needed > edge) {
        const scale = edge / needed
        radii[i] *= scale
        radii[j] *= scale
      }
    }
  }
  return corners.map((corner, i) => {
    const [ix, iz] = dirIn[i]
    const d = setback(i)
    const radius = radii[i]
    const side = Math.sign(turn[i]) || 1
    const ax = corner.x - ix * d
    const az = corner.z - iz * d
    const next = corners[(i + 1) % n]
    const ox = next.x - corner.x
    const oz = next.z - corner.z
    const outLength = Math.hypot(ox, oz)
    return {
      ax,
      az,
      bx: corner.x + (ox / outLength) * d,
      bz: corner.z + (oz / outLength) * d,
      // The centre sits on the inside of the turn: left normal of the incoming direction.
      cx: ax + iz * radius * side,
      cz: az - ix * radius * side,
      radius,
      sweep: turn[i],
    }
  })
}

/**
 * Height at a lap fraction from a periodic Catmull-Rom spline through the profile knots, so the
 * grade is continuous and the straight before the line meets the straight after it.
 */
function profileHeight(profile: readonly (readonly [number, number])[], fraction: number): number {
  const n = profile.length
  if (n === 0) return 0
  if (n === 1) return profile[0][1]
  const u = ((fraction % 1) + 1) % 1
  let k = 0
  while (k < n - 1 && profile[k + 1][0] <= u) k++
  if (u < profile[0][0]) k = n - 1
  const p0 = profile[(k - 1 + n) % n]
  const p1 = profile[k]
  const p2 = profile[(k + 1) % n]
  const p3 = profile[(k + 2) % n]
  // Fractions wrap, so the span to the next knot may cross 1.
  const span = (a: number, b: number) => (b > a ? b - a : b + 1 - a)
  const width = span(p1[0], p2[0])
  const t = Math.max(0, Math.min(1, (u >= p1[0] ? u - p1[0] : u + 1 - p1[0]) / width))
  const t2 = t * t
  const t3 = t2 * t
  const y0 = p0[1]
  const y1 = p1[1]
  const y2 = p2[1]
  const y3 = p3[1]
  return (
    0.5 *
    (2 * y1 +
      (-y0 + y2) * t +
      (2 * y0 - 5 * y1 + 4 * y2 - y3) * t2 +
      (-y0 + 3 * y1 - 3 * y2 + y3) * t3)
  )
}

/** Minimap projection: the circuit's bounding box fitted into a small landscape viewBox. */
export const MINIMAP_WIDTH = 168
export const MINIMAP_HEIGHT = 120
const MINIMAP_PAD = 10

export interface Minimap {
  minX: number
  maxZ: number
  scale: number
  offsetX: number
  offsetZ: number
  path: string
}

function buildCircuit(definition: CircuitDefinition): Circuit {
  const fillets = buildFillets(definition.corners)
  const n = fillets.length
  // Path pieces in lap order, starting with the main straight (last corner exit to first corner).
  type Piece =
    | { kind: 'line'; x0: number; z0: number; x1: number; z1: number; length: number }
    | { kind: 'arc'; fillet: Fillet; length: number }
  const pieces: Piece[] = []
  for (let i = 0; i < n; i++) {
    const from = fillets[(i - 1 + n) % n]
    const to = fillets[i]
    const length = Math.hypot(to.ax - from.bx, to.az - from.bz)
    pieces.push({ kind: 'line', x0: from.bx, z0: from.bz, x1: to.ax, z1: to.az, length })
    pieces.push({ kind: 'arc', fillet: to, length: Math.abs(to.sweep) * to.radius })
  }
  const length = pieces.reduce((sum, piece) => sum + piece.length, 0)
  const count = Math.round(length / SAMPLE_SPACING)
  const ds = length / count

  const pointAt = (distance: number, out: Float32Array, offset: number) => {
    let remaining = distance
    for (const piece of pieces) {
      if (remaining > piece.length) {
        remaining -= piece.length
        continue
      }
      const t = piece.length > 0 ? remaining / piece.length : 0
      if (piece.kind === 'line') {
        out[offset] = piece.x0 + (piece.x1 - piece.x0) * t
        out[offset + 1] = piece.z0 + (piece.z1 - piece.z0) * t
      } else {
        const { fillet } = piece
        const angle = fillet.sweep * t
        const rx = fillet.ax - fillet.cx
        const rz = fillet.az - fillet.cz
        // Rotation about +Y by `angle`, matching how a heading turns.
        out[offset] = fillet.cx + rx * Math.cos(angle) + rz * Math.sin(angle)
        out[offset + 1] = fillet.cz - rx * Math.sin(angle) + rz * Math.cos(angle)
      }
      return
    }
    out[offset] = pieces[0].kind === 'line' ? pieces[0].x0 : 0
    out[offset + 1] = pieces[0].kind === 'line' ? pieces[0].z0 : 0
  }

  const points = new Float32Array(count * 2)
  const tangents = new Float32Array(count * 2)
  const curvature = new Float32Array(count)
  const heights = new Float32Array(count)
  const grades = new Float32Array(count)
  const heightCurvature = new Float32Array(count)
  const startDistance = pieces[0].length * definition.startFraction
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  let maxHeight = -Infinity
  let minHeight = Infinity
  for (let i = 0; i < count; i++) {
    pointAt((startDistance + i * ds) % length, points, i * 2)
    minX = Math.min(minX, points[i * 2])
    maxX = Math.max(maxX, points[i * 2])
    minZ = Math.min(minZ, points[i * 2 + 1])
    maxZ = Math.max(maxZ, points[i * 2 + 1])
    heights[i] = profileHeight(definition.profile, i / count)
    maxHeight = Math.max(maxHeight, heights[i])
    minHeight = Math.min(minHeight, heights[i])
  }
  for (let i = 0; i < count; i++) {
    const a = (i - 1 + count) % count
    const b = (i + 1) % count
    const tx = points[b * 2] - points[a * 2]
    const tz = points[b * 2 + 1] - points[a * 2 + 1]
    const norm = Math.hypot(tx, tz) || 1
    tangents[i * 2] = tx / norm
    tangents[i * 2 + 1] = tz / norm
    grades[i] = (heights[b] - heights[a]) / (2 * ds)
    heightCurvature[i] = (heights[b] - 2 * heights[i] + heights[a]) / (ds * ds)
  }
  for (let i = 0; i < count; i++) {
    const a = (i - 1 + count) % count
    const b = (i + 1) % count
    const ha = Math.atan2(tangents[a * 2], tangents[a * 2 + 1])
    const hb = Math.atan2(tangents[b * 2], tangents[b * 2 + 1])
    curvature[i] = wrap(hb - ha) / (2 * ds)
  }
  const margin = definition.arenaMargin
  const scale = Math.min(
    (MINIMAP_WIDTH - 2 * MINIMAP_PAD) / (maxX - minX),
    (MINIMAP_HEIGHT - 2 * MINIMAP_PAD) / (maxZ - minZ),
  )
  const minimap: Minimap = {
    minX,
    maxZ,
    scale,
    offsetX: (MINIMAP_WIDTH - (maxX - minX) * scale) / 2,
    offsetZ: (MINIMAP_HEIGHT - (maxZ - minZ) * scale) / 2,
    path: '',
  }
  const circuit: Circuit = {
    id: definition.id,
    name: definition.name,
    blurb: definition.blurb,
    count,
    length,
    ds,
    points,
    tangents,
    curvature,
    heights,
    grades,
    heightCurvature,
    maxHeight,
    minHeight,
    embankment: definition.embankment,
    arena: {
      minX: minX - margin,
      maxX: maxX + margin,
      minZ: minZ - margin,
      maxZ: maxZ + margin,
    },
    minimap,
  }
  const parts: string[] = []
  for (let i = 0; i < count; i += 4) {
    const [u, v] = toMinimap(circuit, points[i * 2], points[i * 2 + 1])
    parts.push(`${i === 0 ? 'M' : 'L'}${u.toFixed(1)} ${v.toFixed(1)}`)
  }
  minimap.path = parts.join('') + 'Z'
  return circuit
}

const built = new Map<CircuitId, Circuit>()

/** Circuits are built on first use and kept; a few hundred samples each. */
export function getCircuit(id: CircuitId): Circuit {
  const cached = built.get(id)
  if (cached) return cached
  const circuit = buildCircuit(CIRCUIT_DEFINITIONS[id])
  built.set(id, circuit)
  return circuit
}

export interface TrackFix {
  /** Nearest sample index. */
  index: number
  /** 0 to 1 progress around the lap. */
  progress: number
  /** Signed distance from the centreline, left positive. */
  lateral: number
  /** Ground height under the car. */
  height: number
  /** Rise per metre along the track. */
  grade: number
  /** Rise per metre towards the left of the track (the embankment falling away). */
  slope: number
  /** Height curvature along the track: negative over a crest. */
  crest: number
}

export function createTrackFix(): TrackFix {
  return { index: 0, progress: 0, lateral: 0, height: 0, grade: 0, slope: 0, crest: 0 }
}

/** Smoothstep from 0 at `edge0` to 1 at `edge1`. */
const smooth = (edge0: number, edge1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/** Ground height at a sample and a lateral offset: the road, then an embankment falling to zero. */
export function surfaceHeight(circuit: Circuit, index: number, lateral: number): number {
  const road = circuit.heights[index]
  if (road === 0) return 0
  const outside = Math.abs(lateral) - HALF_WIDTH - KERB_BAND
  if (outside <= 0) return road
  return road * (1 - smooth(0, circuit.embankment, outside))
}

/** Brute force over the samples: a few hundred distance checks is nothing next to a frame. */
export function locateOnTrack(circuit: Circuit, x: number, z: number, out: TrackFix): TrackFix {
  const { count, points, tangents } = circuit
  let best = 0
  let bestDistance = Infinity
  for (let i = 0; i < count; i++) {
    const dx = x - points[i * 2]
    const dz = z - points[i * 2 + 1]
    const d = dx * dx + dz * dz
    if (d < bestDistance) {
      bestDistance = d
      best = i
    }
  }
  const dx = x - points[best * 2]
  const dz = z - points[best * 2 + 1]
  const tx = tangents[best * 2]
  const tz = tangents[best * 2 + 1]
  out.index = best
  out.progress = best / count
  out.lateral = dx * tz - dz * tx
  out.height = surfaceHeight(circuit, best, out.lateral)
  out.grade = circuit.grades[best]
  out.slope =
    (surfaceHeight(circuit, best, out.lateral + 0.5) -
      surfaceHeight(circuit, best, out.lateral - 0.5)) /
    1
  out.crest = circuit.heightCurvature[best]
  return out
}

/** Heading of the centreline at a sample. */
export function headingAt(circuit: Circuit, index: number): number {
  return Math.atan2(circuit.tangents[index * 2], circuit.tangents[index * 2 + 1])
}

/** Where the car waits: a few car lengths behind the start line, pointing down the straight. */
export function gridPose(circuit: Circuit): CarPose {
  const back = 14
  return {
    x: circuit.points[0] - circuit.tangents[0] * back,
    z: circuit.points[1] - circuit.tangents[1] * back,
    heading: headingAt(circuit, 0),
  }
}

/** World XZ to minimap pixels, with +Z up. */
export function toMinimap(circuit: Circuit, x: number, z: number): [number, number] {
  const { minX, maxZ, scale, offsetX, offsetZ } = circuit.minimap
  return [offsetX + (x - minX) * scale, offsetZ + (maxZ - z) * scale]
}
