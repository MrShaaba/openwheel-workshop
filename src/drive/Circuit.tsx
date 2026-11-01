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
import { CIRCUIT, HALF_WIDTH, headingAt, KERB_RADIUS, TRACK_WIDTH } from './track'

const EDGE_COLOR = new Color(HOLO_HEX).multiplyScalar(1.7)
const KERB_RED = new Color('#ff3457')
const KERB_WHITE = new Color('#eef3f7')
const GRID_CELL = new Color('#0a2a33')
const GRID_SECTION = new Color(HOLO_HEX).multiplyScalar(0.75)
const WALL_COLOR = new Color(HOLO_HEX)

const ROAD_Y = 0
const LINE_Y = 0.012
const KERB_Y = 0.008
/** Painted edge line: from inside the edge to just short of it. */
const LINE_INNER = HALF_WIDTH - 0.32
const LINE_OUTER = HALF_WIDTH - 0.06
const KERB_INNER = HALF_WIDTH + 0.04
const KERB_OUTER = HALF_WIDTH + 1.3
/** Kerbs start a few metres before a corner and run a few metres past it. */
const KERB_RUN_IN = 6
/** Length of each red or white block along a kerb, in metres. */
const KERB_BLOCK = 2.6
const POST_SPACING = 12
const POST_OFFSET = HALF_WIDTH + 3.2
const WALL_HEIGHT = 1.4

interface RibbonSpec {
  /** Signed lateral offsets, left positive. */
  inner: number
  outer: number
  y: number
  /** Which samples get a quad to the next sample (default all). */
  include?: (index: number) => boolean
  /** Per-quad colour, duplicated to its four vertices so blocks stay crisp. */
  color?: (index: number) => Color
}

/** Lateral position at a sample: centreline plus `offset` along the left normal. */
function lateral(index: number, offset: number, out: [number, number]): [number, number] {
  const { points, tangents } = CIRCUIT
  const tx = tangents[index * 2]
  const tz = tangents[index * 2 + 1]
  out[0] = points[index * 2] + tz * offset
  out[1] = points[index * 2 + 1] - tx * offset
  return out
}

/**
 * A strip following the centreline between two lateral offsets. Quads are emitted per sample pair
 * with their own vertices, so the strip can have gaps and hard colour changes.
 */
function buildRibbon(spec: RibbonSpec): BufferGeometry {
  const { count } = CIRCUIT
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const a: [number, number] = [0, 0]
  const b: [number, number] = [0, 0]
  const c: [number, number] = [0, 0]
  const d: [number, number] = [0, 0]
  for (let i = 0; i < count; i++) {
    if (spec.include && !spec.include(i)) continue
    const j = (i + 1) % count
    lateral(i, spec.inner, a)
    lateral(i, spec.outer, b)
    lateral(j, spec.inner, c)
    lateral(j, spec.outer, d)
    const base = positions.length / 3
    for (const [x, z] of [a, b, c, d]) {
      positions.push(x, spec.y, z)
      normals.push(0, 1, 0)
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
function kerbMask(): Uint8Array {
  const { count, curvature, ds } = CIRCUIT
  const mask = new Uint8Array(count)
  const reach = Math.round(KERB_RUN_IN / ds)
  for (let i = 0; i < count; i++) {
    if (Math.abs(curvature[i]) <= 1 / KERB_RADIUS) continue
    for (let k = -reach; k <= reach; k++) mask[(i + k + count) % count] = 1
  }
  return mask
}

function buildKerbs(): BufferGeometry {
  const mask = kerbMask()
  const block = (index: number) => Math.floor((index * CIRCUIT.ds) / KERB_BLOCK) % 2 === 0
  const left = buildRibbon({
    inner: KERB_INNER,
    outer: KERB_OUTER,
    y: KERB_Y,
    include: (i) => mask[i] === 1,
    color: (i) => (block(i) ? KERB_RED : KERB_WHITE),
  })
  const right = buildRibbon({
    inner: -KERB_OUTER,
    outer: -KERB_INNER,
    y: KERB_Y,
    include: (i) => mask[i] === 1,
    color: (i) => (block(i) ? KERB_WHITE : KERB_RED),
  })
  const merged = mergeGeometries([left, right])
  left.dispose()
  right.dispose()
  return merged
}

function buildEdgeLines(): BufferGeometry {
  const left = buildRibbon({ inner: LINE_INNER, outer: LINE_OUTER, y: LINE_Y })
  const right = buildRibbon({ inner: -LINE_OUTER, outer: -LINE_INNER, y: LINE_Y })
  const merged = mergeGeometries([left, right])
  left.dispose()
  right.dispose()
  return merged
}

/** Glowing marker posts either side of the road, one instanced mesh. */
function buildPosts(): InstancedMesh {
  const { count, ds } = CIRCUIT
  const step = Math.max(1, Math.round(POST_SPACING / ds))
  const total = Math.ceil(count / step) * 2
  const geometry = new BoxGeometry(0.1, 1.05, 0.1).translate(0, 0.525, 0)
  const material = new MeshBasicMaterial({ color: HOLO_COLOR_SOFT, toneMapped: false })
  const posts = new InstancedMesh(geometry, material, total)
  const matrix = new Matrix4()
  const p: [number, number] = [0, 0]
  let n = 0
  for (let i = 0; i < count; i += step) {
    const heading = headingAt(i)
    for (const side of [1, -1]) {
      lateral(i, POST_OFFSET * side, p)
      matrix.makeRotationY(heading).setPosition(p[0], 0, p[1])
      posts.setMatrixAt(n++, matrix)
    }
  }
  posts.count = n
  posts.instanceMatrix.needsUpdate = true
  posts.frustumCulled = false
  return posts
}

/** A low translucent wall around the arena with a bright top edge: the soft boundary of the drive. */
function buildWall(): { panels: BufferGeometry; edge: BufferGeometry } {
  const { minX, maxX, minZ, maxZ } = CIRCUIT.arena
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
  const result = { panels: mergeGeometries(panels), edge: mergeGeometries(edges) }
  panels.forEach((g) => g.dispose())
  edges.forEach((g) => g.dispose())
  return result
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
function StartGantry() {
  const heading = headingAt(0)
  const x = CIRCUIT.points[0]
  const z = CIRCUIT.points[1]
  const span = TRACK_WIDTH + 3.6
  const checker = useMemo(() => buildCheckerTexture(), [])
  useEffect(() => () => checker.dispose(), [checker])
  return (
    <group position={[x, 0, z]} rotation-y={heading}>
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
 * The circuit as meshes: a dark road ribbon, glowing edge lines, red and white kerbs through the
 * corners, marker posts, the start gantry, the arena wall and a night ground with the workshop's
 * grid stretched to circuit scale.
 */
export function Circuit() {
  const road = useMemo(() => buildRibbon({ inner: -HALF_WIDTH, outer: HALF_WIDTH, y: ROAD_Y }), [])
  const lines = useMemo(() => buildEdgeLines(), [])
  const kerbs = useMemo(() => buildKerbs(), [])
  const posts = useMemo(() => buildPosts(), [])
  const wall = useMemo(() => buildWall(), [])

  useEffect(
    () => () => {
      road.dispose()
      lines.dispose()
      kerbs.dispose()
      posts.geometry.dispose()
      ;(posts.material as MeshBasicMaterial).dispose()
      wall.panels.dispose()
      wall.edge.dispose()
    },
    [road, lines, kerbs, posts, wall],
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
      <mesh geometry={road}>
        <meshStandardMaterial color="#141d28" roughness={0.9} metalness={0.2} />
      </mesh>
      <mesh geometry={lines}>
        <meshBasicMaterial color={EDGE_COLOR} toneMapped={false} />
      </mesh>
      <mesh geometry={kerbs}>
        <meshBasicMaterial vertexColors toneMapped={false} />
      </mesh>
      <primitive object={posts} />
      <mesh geometry={wall.panels}>
        <meshBasicMaterial
          color={WALL_COLOR}
          transparent
          opacity={0.1}
          side={DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh geometry={wall.edge}>
        <meshBasicMaterial color={HOLO_COLOR_SOFT} toneMapped={false} />
      </mesh>
      <StartGantry />
    </group>
  )
}
