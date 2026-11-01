/**
 * The test-drive circuit: a closed centreline made of straights joined by circular arcs, sampled at
 * equal arc length, plus the queries the physics, the lap timer, the kerbs and the minimap need.
 * Everything is in metres on the XZ plane. The car's heading convention applies (forward is
 * (sin h, 0, cos h), a left turn raises h), so "left" of a tangent (tx, tz) is the normal (tz, -tx).
 */
import type { CarPose } from './physics'

interface Corner {
  x: number
  z: number
  /** Fillet radius at this vertex. Shrunk automatically if two fillets would overlap. */
  radius: number
}

/**
 * Corner vertices in lap order. The edge from the last vertex to the first is the main straight,
 * and the start line sits part-way along it. A fast first corner, a right-right-left S into the
 * infield, a right-hander onto the back straight, a left-right chicane, a hairpin-like right, a
 * left kink and a wide final corner back onto the main straight.
 */
const CORNERS: readonly Corner[] = [
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
]

/** Where along the main straight the start line sits (0 = exit of the last corner). */
const START_FRACTION = 0.42

export const TRACK_WIDTH = 13
export const HALF_WIDTH = TRACK_WIDTH / 2
/** Beyond the kerbs the car is on the run-off and loses grip and speed. */
export const RUNOFF_MARGIN = 1.2
/** How far outside the circuit's bounding box the arena wall stands. */
const ARENA_MARGIN = 34
/** Sample spacing in metres. */
const SAMPLE_SPACING = 1
/** Corners tighter than this radius get kerbs. */
export const KERB_RADIUS = 60

export interface Circuit {
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
  arena: { minX: number; maxX: number; minZ: number; maxZ: number }
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
function buildFillets(): Fillet[] {
  const n = CORNERS.length
  const dirIn: [number, number][] = []
  const turn: number[] = []
  for (let i = 0; i < n; i++) {
    const prev = CORNERS[(i - 1 + n) % n]
    const here = CORNERS[i]
    const next = CORNERS[(i + 1) % n]
    const inX = here.x - prev.x
    const inZ = here.z - prev.z
    const inLength = Math.hypot(inX, inZ)
    const outX = next.x - here.x
    const outZ = next.z - here.z
    dirIn.push([inX / inLength, inZ / inLength])
    turn.push(wrap(Math.atan2(outX, outZ) - Math.atan2(inX, inZ)))
  }
  const radii = CORNERS.map((corner) => corner.radius)
  const setback = (i: number) => radii[i] * Math.tan(Math.abs(turn[i]) / 2)
  // Two passes are enough for the fillets of adjacent corners to fit on their shared edge.
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      const edge = Math.hypot(CORNERS[j].x - CORNERS[i].x, CORNERS[j].z - CORNERS[i].z) * 0.98
      const needed = setback(i) + setback(j)
      if (needed > edge) {
        const scale = edge / needed
        radii[i] *= scale
        radii[j] *= scale
      }
    }
  }
  return CORNERS.map((corner, i) => {
    const [ix, iz] = dirIn[i]
    const d = setback(i)
    const radius = radii[i]
    const side = Math.sign(turn[i]) || 1
    const ax = corner.x - ix * d
    const az = corner.z - iz * d
    const next = CORNERS[(i + 1) % n]
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

function buildCircuit(): Circuit {
  const fillets = buildFillets()
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
  const startDistance = pieces[0].length * START_FRACTION
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (let i = 0; i < count; i++) {
    pointAt((startDistance + i * ds) % length, points, i * 2)
    minX = Math.min(minX, points[i * 2])
    maxX = Math.max(maxX, points[i * 2])
    minZ = Math.min(minZ, points[i * 2 + 1])
    maxZ = Math.max(maxZ, points[i * 2 + 1])
  }
  for (let i = 0; i < count; i++) {
    const a = (i - 1 + count) % count
    const b = (i + 1) % count
    const tx = points[b * 2] - points[a * 2]
    const tz = points[b * 2 + 1] - points[a * 2 + 1]
    const norm = Math.hypot(tx, tz) || 1
    tangents[i * 2] = tx / norm
    tangents[i * 2 + 1] = tz / norm
  }
  for (let i = 0; i < count; i++) {
    const a = (i - 1 + count) % count
    const b = (i + 1) % count
    const ha = Math.atan2(tangents[a * 2], tangents[a * 2 + 1])
    const hb = Math.atan2(tangents[b * 2], tangents[b * 2 + 1])
    curvature[i] = wrap(hb - ha) / (2 * ds)
  }
  return {
    count,
    length,
    ds,
    points,
    tangents,
    curvature,
    arena: {
      minX: minX - ARENA_MARGIN,
      maxX: maxX + ARENA_MARGIN,
      minZ: minZ - ARENA_MARGIN,
      maxZ: maxZ + ARENA_MARGIN,
    },
  }
}

export const CIRCUIT: Circuit = buildCircuit()

export interface TrackFix {
  /** Nearest sample index. */
  index: number
  /** 0 to 1 progress around the lap. */
  progress: number
  /** Signed distance from the centreline, left positive. */
  lateral: number
}

/** Brute force over the samples: a few hundred distance checks is nothing next to a frame. */
export function locateOnTrack(x: number, z: number, out: TrackFix): TrackFix {
  const { count, points, tangents } = CIRCUIT
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
  return out
}

/** Heading of the centreline at a sample. */
export function headingAt(index: number): number {
  return Math.atan2(CIRCUIT.tangents[index * 2], CIRCUIT.tangents[index * 2 + 1])
}

/** Where the car waits: a few car lengths behind the start line, pointing down the straight. */
export function gridPose(): CarPose {
  const back = 14
  return {
    x: CIRCUIT.points[0] - CIRCUIT.tangents[0] * back,
    z: CIRCUIT.points[1] - CIRCUIT.tangents[1] * back,
    heading: headingAt(0),
  }
}

/** Minimap projection: the circuit's bounding box fitted into a small landscape viewBox. */
export const MINIMAP_WIDTH = 168
export const MINIMAP_HEIGHT = 120
const MINIMAP_PAD = 10

const minimapFit = (() => {
  const minX = CIRCUIT.arena.minX + ARENA_MARGIN
  const maxX = CIRCUIT.arena.maxX - ARENA_MARGIN
  const minZ = CIRCUIT.arena.minZ + ARENA_MARGIN
  const maxZ = CIRCUIT.arena.maxZ - ARENA_MARGIN
  const scale = Math.min(
    (MINIMAP_WIDTH - 2 * MINIMAP_PAD) / (maxX - minX),
    (MINIMAP_HEIGHT - 2 * MINIMAP_PAD) / (maxZ - minZ),
  )
  return {
    minX,
    maxZ,
    scale,
    offsetX: (MINIMAP_WIDTH - (maxX - minX) * scale) / 2,
    offsetZ: (MINIMAP_HEIGHT - (maxZ - minZ) * scale) / 2,
  }
})()

/** World XZ to minimap pixels, with +Z up. */
export function toMinimap(x: number, z: number): [number, number] {
  const { minX, maxZ, scale, offsetX, offsetZ } = minimapFit
  return [offsetX + (x - minX) * scale, offsetZ + (maxZ - z) * scale]
}

export const MINIMAP_PATH: string = (() => {
  const parts: string[] = []
  for (let i = 0; i < CIRCUIT.count; i += 4) {
    const [u, v] = toMinimap(CIRCUIT.points[i * 2], CIRCUIT.points[i * 2 + 1])
    parts.push(`${i === 0 ? 'M' : 'L'}${u.toFixed(1)} ${v.toFixed(1)}`)
  }
  return parts.join('') + 'Z'
})()
