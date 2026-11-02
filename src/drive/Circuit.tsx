import { Grid } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  DataTexture,
  DoubleSide,
  Float32BufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  NearestFilter,
  PlaneGeometry,
  RGBAFormat,
  SRGBColorSpace,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { HOLO_COLOR_SOFT, HOLO_HEX } from '../scene/constants'
import {
  HALF_WIDTH,
  headingAt,
  KERB_BAND,
  KERB_RADIUS,
  surfaceHeight,
  TRACK_WIDTH,
  type Circuit as CircuitData,
} from './track'

const EDGE_COLOR = new Color(HOLO_HEX).multiplyScalar(1.7)
const KERB_RED = new Color('#ff3457')
const KERB_WHITE = new Color('#eef3f7')
const GRID_CELL = new Color('#0a2a33')
const GRID_SECTION = new Color(HOLO_HEX).multiplyScalar(0.75)
const WALL_COLOR = new Color(HOLO_HEX)
const CONTOUR_COLOR = new Color(HOLO_HEX).multiplyScalar(0.35)

const ROAD_Y = 0
const LINE_Y = 0.012
const KERB_Y = 0.008
/** Painted edge line: from inside the edge to just short of it. */
const LINE_INNER = HALF_WIDTH - 0.32
const LINE_OUTER = HALF_WIDTH - 0.06
const KERB_INNER = HALF_WIDTH + 0.04
const KERB_OUTER = HALF_WIDTH + KERB_BAND
/** Kerbs start a few metres before a corner and run a few metres past it. */
const KERB_RUN_IN = 6
/** Length of each red or white block along a kerb, in metres. */
const KERB_BLOCK = 2.6
const POST_SPACING = 12
const POST_OFFSET = HALF_WIDTH + 3.2
const WALL_HEIGHT = 1.4
/** Faint lines down the embankment at these distances beyond the kerb, so the hills read. */
const CONTOUR_OFFSETS = [6, 14, 24]

interface RibbonSpec {
  /** Signed lateral offsets, left positive. */
  inner: number
  outer: number
  /** Height above the ground surface at (sample, offset). */
  lift: number
  /** Which samples get a quad to the next sample (default all). */
  include?: (index: number) => boolean
  /** Per-quad colour, duplicated to its four vertices so blocks stay crisp. */
  color?: (index: number) => Color
}

type Point = [number, number, number]

/** Position at a sample and a lateral offset: centreline plus `offset` along the left normal, on the ground. */
function lateral(circuit: CircuitData, index: number, offset: number, lift: number, out: Point) {
  const { points, tangents } = circuit
  const tx = tangents[index * 2]
  const tz = tangents[index * 2 + 1]
  out[0] = points[index * 2] + tz * offset
  out[1] = surfaceHeight(circuit, index, offset) + lift
  out[2] = points[index * 2 + 1] - tx * offset
  return out
}

/**
 * A strip following the centreline between two lateral offsets, draped over the ground. Quads are
 * emitted per sample pair with their own vertices, so the strip can have gaps and hard colour changes.
 */
function buildRibbon(circuit: CircuitData, spec: RibbonSpec): BufferGeometry {
  const { count } = circuit
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const a: Point = [0, 0, 0]
  const b: Point = [0, 0, 0]
  const c: Point = [0, 0, 0]
  const d: Point = [0, 0, 0]
  for (let i = 0; i < count; i++) {
    if (spec.include && !spec.include(i)) continue
    const j = (i + 1) % count
    lateral(circuit, i, spec.inner, spec.lift, a)
    lateral(circuit, i, spec.outer, spec.lift, b)
    lateral(circuit, j, spec.inner, spec.lift, c)
    lateral(circuit, j, spec.outer, spec.lift, d)
    const base = positions.length / 3
    // One normal per quad from its diagonal, good enough for a dark matte surface.
    const ux = d[0] - a[0]
    const uy = d[1] - a[1]
    const uz = d[2] - a[2]
    const vx = c[0] - b[0]
    const vy = c[1] - b[1]
    const vz = c[2] - b[2]
    let nx = uy * vz - uz * vy
    let ny = uz * vx - ux * vz
    let nz = ux * vy - uy * vx
    const length = Math.hypot(nx, ny, nz) || 1
    nx /= length
    ny /= length
    nz /= length
    if (ny < 0) {
      nx = -nx
      ny = -ny
      nz = -nz
    }
    for (const [x, y, z] of [a, b, c, d]) {
      positions.push(x, y, z)
      normals.push(nx, ny, nz)
    }
    uvs.push(0, i, 1, i, 0, i + 1, 1, i + 1)
    if (spec.color) {
      const color = spec.color(i)
      for (let k = 0; k < 4; k++) colors.push(color.r, color.g, color.b)
    }
    indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  if (spec.color) geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  return geometry
}

/** Samples inside a corner (or within the run-in either side of one) wear kerbs. */
function kerbMask(circuit: CircuitData): Uint8Array {
  const { count, curvature, ds } = circuit
  const mask = new Uint8Array(count)
  const reach = Math.round(KERB_RUN_IN / ds)
  for (let i = 0; i < count; i++) {
    if (Math.abs(curvature[i]) <= 1 / KERB_RADIUS) continue
    for (let k = -reach; k <= reach; k++) mask[(i + k + count) % count] = 1
  }
  return mask
}

function mergeAndDispose(parts: BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(parts)
  parts.forEach((part) => part.dispose())
  return merged
}

function buildKerbs(circuit: CircuitData): BufferGeometry {
  const mask = kerbMask(circuit)
  const block = (index: number) => Math.floor((index * circuit.ds) / KERB_BLOCK) % 2 === 0
  return mergeAndDispose([
    buildRibbon(circuit, {
      inner: KERB_INNER,
      outer: KERB_OUTER,
      lift: KERB_Y,
      include: (i) => mask[i] === 1,
      color: (i) => (block(i) ? KERB_RED : KERB_WHITE),
    }),
    buildRibbon(circuit, {
      inner: -KERB_OUTER,
      outer: -KERB_INNER,
      lift: KERB_Y,
      include: (i) => mask[i] === 1,
      color: (i) => (block(i) ? KERB_WHITE : KERB_RED),
    }),
  ])
}

function buildEdgeLines(circuit: CircuitData): BufferGeometry {
  return mergeAndDispose([
    buildRibbon(circuit, { inner: LINE_INNER, outer: LINE_OUTER, lift: LINE_Y }),
    buildRibbon(circuit, { inner: -LINE_OUTER, outer: -LINE_INNER, lift: LINE_Y }),
  ])
}

/** The ground beside a raised road, sloping back down to the plain. Only built where there are hills. */
function buildEmbankment(circuit: CircuitData): BufferGeometry | null {
  if (circuit.maxHeight === 0 && circuit.minHeight === 0) return null
  const reach = HALF_WIDTH + KERB_BAND + circuit.embankment + 2
  return mergeAndDispose([
    buildRibbon(circuit, { inner: KERB_OUTER, outer: reach, lift: -0.004 }),
    buildRibbon(circuit, { inner: -reach, outer: -KERB_OUTER, lift: -0.004 }),
  ])
}

/** Thin lines down the embankment so the slopes show against the dark ground. */
function buildContours(circuit: CircuitData): BufferGeometry | null {
  if (circuit.maxHeight === 0 && circuit.minHeight === 0) return null
  const parts: BufferGeometry[] = []
  for (const offset of CONTOUR_OFFSETS) {
    const at = HALF_WIDTH + KERB_BAND + offset
    parts.push(buildRibbon(circuit, { inner: at, outer: at + 0.12, lift: 0.004 }))
    parts.push(buildRibbon(circuit, { inner: -at - 0.12, outer: -at, lift: 0.004 }))
  }
  return mergeAndDispose(parts)
}

/** Glowing marker posts either side of the road, one instanced mesh. */
function buildPosts(circuit: CircuitData): InstancedMesh {
  const { count, ds } = circuit
  const step = Math.max(1, Math.round(POST_SPACING / ds))
  const total = Math.ceil(count / step) * 2
  const geometry = new BoxGeometry(0.1, 1.05, 0.1).translate(0, 0.525, 0)
  const material = new MeshBasicMaterial({ color: HOLO_COLOR_SOFT, toneMapped: false })
  const posts = new InstancedMesh(geometry, material, total)
  const matrix = new Matrix4()
  const p: Point = [0, 0, 0]
  let n = 0
  for (let i = 0; i < count; i += step) {
    const heading = headingAt(circuit, i)
    for (const side of [1, -1]) {
      lateral(circuit, i, POST_OFFSET * side, 0, p)
      matrix.makeRotationY(heading).setPosition(p[0], p[1], p[2])
      posts.setMatrixAt(n++, matrix)
    }
  }
  posts.count = n
  posts.instanceMatrix.needsUpdate = true
  posts.frustumCulled = false
  return posts
}

/** A low translucent wall around the arena with a bright top edge: the soft boundary of the drive. */
function buildWall(circuit: CircuitData): { panels: BufferGeometry; edge: BufferGeometry } {
  const { minX, maxX, minZ, maxZ } = circuit.arena
  const sides: [number, number, number, number][] = [
    [minX, minZ, maxX, minZ],
    [maxX, minZ, maxX, maxZ],
    [maxX, maxZ, minX, maxZ],
    [minX, maxZ, minX, minZ],
  ]
  const panels: BufferGeometry[] = []
  const edges: BufferGeometry[] = []
  for (const [x0, z0, x1, z1] of sides) {
    const length = Math.hypot(x1 - x0, z1 - z0)
    const angle = Math.atan2(x1 - x0, z1 - z0)
    const panel = new PlaneGeometry(length, WALL_HEIGHT)
    panel.rotateY(angle + Math.PI / 2)
    panel.translate((x0 + x1) / 2, WALL_HEIGHT / 2, (z0 + z1) / 2)
    panels.push(panel)
    const edge = new BoxGeometry(0.08, 0.08, length)
    edge.rotateY(angle)
    edge.translate((x0 + x1) / 2, WALL_HEIGHT, (z0 + z1) / 2)
    edges.push(edge)
  }
  return { panels: mergeAndDispose(panels), edge: mergeAndDispose(edges) }
}

/** A two-row chequerboard for the start line, 8 squares across. */
function buildCheckerTexture(): DataTexture {
  const columns = 16
  const rows = 2
  const data = new Uint8Array(columns * rows * 4)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const light = (x + y) % 2 === 0
      const value = light ? 235 : 20
      const index = (y * columns + x) * 4
      data[index] = value
      data[index + 1] = value
      data[index + 2] = light ? 240 : 28
      data[index + 3] = 255
    }
  }
  const texture = new DataTexture(data, columns, rows, RGBAFormat)
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

/** Pillars, beam and a light strip over the start line, in local coordinates (X across, Z along). */
function StartGantry({ circuit }: { circuit: CircuitData }) {
  const heading = headingAt(circuit, 0)
  const x = circuit.points[0]
  const y = circuit.heights[0]
  const z = circuit.points[1]
  const span = TRACK_WIDTH + 3.6
  const checker = useMemo(() => buildCheckerTexture(), [])
  useEffect(() => () => checker.dispose(), [checker])
  return (
    <group position={[x, y, z]} rotation-y={heading}>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[(side * span) / 2, 3.4, 0]}>
          <boxGeometry args={[0.5, 6.8, 0.5]} />
          <meshStandardMaterial color="#2a3038" metalness={0.85} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 6.6, 0]}>
        <boxGeometry args={[span + 0.5, 0.7, 0.9]} />
        <meshStandardMaterial color="#2a3038" metalness={0.85} roughness={0.4} />
      </mesh>
      <mesh position={[0, 6.2, 0]}>
        <boxGeometry args={[span - 1, 0.1, 0.12]} />
        <meshBasicMaterial color={EDGE_COLOR} toneMapped={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={LINE_Y + 0.002}>
        <planeGeometry args={[TRACK_WIDTH - 0.5, 1.6]} />
        <meshBasicMaterial map={checker} toneMapped={false} />
      </mesh>
    </group>
  )
}

/**
 * A circuit as meshes: a dark road ribbon draped over its height profile, glowing edge lines, red and
 * white kerbs through the corners, an embankment with contour lines where the road is raised, marker
 * posts, the start gantry, the arena wall and a night ground with the workshop's grid at circuit scale.
 */
export function Circuit({ circuit }: { circuit: CircuitData }) {
  const built = useMemo(
    () => ({
      road: buildRibbon(circuit, { inner: -HALF_WIDTH, outer: HALF_WIDTH, lift: ROAD_Y }),
      lines: buildEdgeLines(circuit),
      kerbs: buildKerbs(circuit),
      embankment: buildEmbankment(circuit),
      contours: buildContours(circuit),
      posts: buildPosts(circuit),
      wall: buildWall(circuit),
    }),
    [circuit],
  )

  useEffect(
    () => () => {
      built.road.dispose()
      built.lines.dispose()
      built.kerbs.dispose()
      built.embankment?.dispose()
      built.contours?.dispose()
      built.posts.geometry.dispose()
      ;(built.posts.material as MeshBasicMaterial).dispose()
      built.wall.panels.dispose()
      built.wall.edge.dispose()
    },
    [built],
  )

  return (
    <group name="circuit">
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02}>
        <planeGeometry args={[1400, 1400]} />
        <meshStandardMaterial color="#05080e" roughness={1} metalness={0} />
      </mesh>
      <Grid
        position-y={-0.006}
        args={[20, 20]}
        cellSize={2}
        cellThickness={0.5}
        cellColor={GRID_CELL}
        sectionSize={10}
        sectionThickness={1}
        sectionColor={GRID_SECTION}
        fadeDistance={130}
        fadeStrength={3}
        infiniteGrid
      />
      {built.embankment && (
        <mesh geometry={built.embankment}>
          <meshStandardMaterial color="#080d16" roughness={1} metalness={0} />
        </mesh>
      )}
      {built.contours && (
        <mesh geometry={built.contours}>
          <meshBasicMaterial color={CONTOUR_COLOR} toneMapped={false} />
        </mesh>
      )}
      <mesh geometry={built.road}>
        <meshStandardMaterial color="#141d28" roughness={0.9} metalness={0.2} />
      </mesh>
      <mesh geometry={built.lines}>
        <meshBasicMaterial color={EDGE_COLOR} toneMapped={false} />
      </mesh>
      <mesh geometry={built.kerbs}>
        <meshBasicMaterial vertexColors toneMapped={false} />
      </mesh>
      <primitive object={built.posts} />
      <mesh geometry={built.wall.panels}>
        <meshBasicMaterial
          color={WALL_COLOR}
          transparent
          opacity={0.1}
          side={DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh geometry={built.wall.edge}>
        <meshBasicMaterial color={HOLO_COLOR_SOFT} toneMapped={false} />
      </mesh>
      <StartGantry circuit={circuit} />
    </group>
  )
}
