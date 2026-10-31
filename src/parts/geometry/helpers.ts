/**
 * Small procedural-modelling toolkit. Every factory in this folder builds its part in
 * CAR SPACE (origin on the platform at the wheelbase midpoint, +Z towards the nose,
 * +Y up, metres) using these helpers; `getPartModel` re-centres the result on the
 * part's pivot afterwards.
 */
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Matrix4,
  Quaternion,
  Shape,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { TAU } from '../../lib/math'
import type { Vec3 } from '../types'

export const v3 = (v: Vec3): Vector3 => new Vector3(v[0], v[1], v[2])

const UP = new Vector3(0, 1, 0)

/** Apply rotation (Euler, radians) then translation to a geometry in place. */
export function place(geometry: BufferGeometry, position?: Vec3, rotation?: Vec3): BufferGeometry {
  const matrix = new Matrix4()
  if (rotation) matrix.makeRotationFromEuler(new Euler(rotation[0], rotation[1], rotation[2]))
  if (position) matrix.setPosition(position[0], position[1], position[2])
  geometry.applyMatrix4(matrix)
  return geometry
}

function toNonIndexed(geometry: BufferGeometry): BufferGeometry {
  if (!geometry.index) return geometry
  const converted = geometry.toNonIndexed()
  geometry.dispose()
  return converted
}

/** Merge geometries into one. Inputs are disposed. */
export function merge(geometries: BufferGeometry[]): BufferGeometry {
  const parts = geometries.map((g) => {
    const plain = toNonIndexed(g)
    // mergeGeometries needs matching attribute sets; drop anything beyond position/normal/uv.
    for (const name of Object.keys(plain.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') plain.deleteAttribute(name)
    }
    if (!plain.getAttribute('uv')) {
      const count = plain.getAttribute('position').count
      plain.setAttribute('uv', new Float32BufferAttribute(new Float32Array(count * 2), 2))
    }
    if (!plain.getAttribute('normal')) plain.computeVertexNormals()
    return plain
  })
  if (parts.length === 1) return parts[0]
  const merged = mergeGeometries(parts, false)
  parts.forEach((g) => g.dispose())
  if (!merged) throw new Error('Geometry merge failed: incompatible attributes')
  return merged
}

/** Reverse triangle winding of a non-indexed geometry (after a mirror transform). */
function flipWinding(geometry: BufferGeometry): void {
  for (const name of ['position', 'normal', 'uv']) {
    const attribute = geometry.getAttribute(name)
    if (!(attribute instanceof BufferAttribute)) continue
    const array = attribute.array as Float32Array
    const size = attribute.itemSize
    for (let i = 0; i < attribute.count; i += 3) {
      const b = (i + 1) * size
      const c = (i + 2) * size
      for (let k = 0; k < size; k++) {
        const t = array[b + k]
        array[b + k] = array[c + k]
        array[c + k] = t
      }
    }
    attribute.needsUpdate = true
  }
}

/** A mirrored copy across the car's centre plane (x = 0). Input is left untouched. */
export function mirrorX(geometry: BufferGeometry): BufferGeometry {
  const copy = toNonIndexed(geometry.clone())
  copy.applyMatrix4(new Matrix4().makeScale(-1, 1, 1))
  flipWinding(copy)
  return copy
}

/** Both sides of a symmetric part from its +X half. Input is consumed. */
export function withMirror(geometry: BufferGeometry): BufferGeometry {
  return merge([geometry, mirrorX(geometry)])
}

export function box(
  w: number,
  h: number,
  d: number,
  position?: Vec3,
  rotation?: Vec3,
): BufferGeometry {
  return place(new BoxGeometry(w, h, d), position, rotation)
}

export function cylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  radialSegments = 24,
  position?: Vec3,
  rotation?: Vec3,
  openEnded = false,
): BufferGeometry {
  return place(
    new CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, 1, openEnded),
    position,
    rotation,
  )
}

export function sphere(radius: number, position?: Vec3, segments = 16): BufferGeometry {
  return place(new SphereGeometry(radius, segments, segments), position)
}

/** Round rod between two points. */
export function rod(from: Vec3, to: Vec3, radius: number, radialSegments = 10): BufferGeometry {
  const a = v3(from)
  const b = v3(to)
  const direction = b.clone().sub(a)
  const length = direction.length()
  const geometry = new CylinderGeometry(radius, radius, length, radialSegments, 1)
  geometry.applyQuaternion(new Quaternion().setFromUnitVectors(UP, direction.normalize()))
  geometry.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2)
  return geometry
}

/**
 * Aerofoil-section arm between two points (wishbones, push-rods): thin vertically,
 * wide along the car's length.
 */
export function arm(from: Vec3, to: Vec3, chord: number, thickness: number): BufferGeometry {
  const a = v3(from)
  const b = v3(to)
  const direction = b.clone().sub(a)
  const length = direction.length()
  const geometry = new BoxGeometry(thickness, length, chord)
  geometry.applyQuaternion(new Quaternion().setFromUnitVectors(UP, direction.normalize()))
  geometry.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2)
  return geometry
}

/** Smooth tube through a series of points. */
export function tube(
  points: Vec3[],
  radius: number,
  tubularSegments = 32,
  radialSegments = 10,
  closed = false,
): BufferGeometry {
  const curve = new CatmullRomCurve3(points.map(v3), closed, 'catmullrom', 0.5)
  return new TubeGeometry(curve, tubularSegments, radius, radialSegments, closed)
}

/** Lathe around the X axis. Profile points are [radius, axialPosition]. */
export function latheX(profile: [number, number][], segments = 32): BufferGeometry {
  const points = profile.map(([r, a]) => new Vector2(r, a))
  const geometry = new LatheGeometry(points, segments)
  geometry.rotateZ(-Math.PI / 2)
  return geometry
}

// ---------- Lofting ----------

/** Superellipse outline in the XY plane, counter-clockwise when viewed from +Z. */
export function superellipse(
  halfWidth: number,
  halfHeight: number,
  exponent: number,
  segments = 28,
): Vector2[] {
  const points: Vector2[] = []
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * TAU
    const c = Math.cos(t)
    const s = Math.sin(t)
    points.push(
      new Vector2(
        Math.sign(c) * Math.pow(Math.abs(c), 2 / exponent) * halfWidth,
        Math.sign(s) * Math.pow(Math.abs(s), 2 / exponent) * halfHeight,
      ),
    )
  }
  return points
}

export interface Station {
  /** Position along the car. */
  z: number
  /** Half width. */
  hw: number
  /** Bottom and top of the section. */
  y0: number
  y1: number
  /** Superellipse exponent: 2 = ellipse, 4 = squarish. Default 2.6. */
  n?: number
  /** Lateral offset of the section centre. */
  cx?: number
}

/** Skin a series of cross-sections along Z into a closed body. */
export function loftStations(stations: Station[], segments = 28, caps = true): BufferGeometry {
  const rings = stations.map((station) => {
    const cy = (station.y0 + station.y1) / 2
    const hh = (station.y1 - station.y0) / 2
    return superellipse(station.hw, hh, station.n ?? 2.6, segments).map(
      (p) => new Vector3(p.x + (station.cx ?? 0), p.y + cy, station.z),
    )
  })
  return loft(rings, caps)
}

/**
 * Connect rings of equal point count into a surface. Rings must be counter-clockwise
 * when viewed from +Z; they are sorted so Z increases, which keeps normals outward.
 */
export function loft(input: Vector3[][], caps = true): BufferGeometry {
  const rings = input[0][0].z > input[input.length - 1][0].z ? [...input].reverse() : input
  const ringCount = rings.length
  const m = rings[0].length
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  rings.forEach((ring, i) => {
    ring.forEach((p, j) => {
      positions.push(p.x, p.y, p.z)
      uvs.push(j / m, i / (ringCount - 1))
    })
  })

  for (let i = 0; i < ringCount - 1; i++) {
    for (let j = 0; j < m; j++) {
      const jn = (j + 1) % m
      const a = i * m + j
      const b = i * m + jn
      const c = (i + 1) * m + j
      const d = (i + 1) * m + jn
      indices.push(a, b, c, b, d, c)
    }
  }

  if (caps) {
    const addCap = (ring: Vector3[], facingPositiveZ: boolean) => {
      const base = positions.length / 3
      const centre = ring.reduce((acc, p) => acc.add(p), new Vector3()).divideScalar(ring.length)
      positions.push(centre.x, centre.y, centre.z)
      uvs.push(0.5, 0.5)
      ring.forEach((p, j) => {
        positions.push(p.x, p.y, p.z)
        uvs.push(0.5 + Math.cos((j / m) * TAU) * 0.5, 0.5 + Math.sin((j / m) * TAU) * 0.5)
      })
      for (let j = 0; j < m; j++) {
        const p0 = base + 1 + j
        const p1 = base + 1 + ((j + 1) % m)
        if (facingPositiveZ) indices.push(base, p0, p1)
        else indices.push(base, p1, p0)
      }
    }
    addCap(rings[0], false)
    addCap(rings[ringCount - 1], true)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

// ---------- Plates and wings ----------

export function shapeFrom(points: [number, number][]): Shape {
  const shape = new Shape()
  points.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)))
  shape.closePath()
  return shape
}

export function roundedRectShape(width: number, height: number, radius: number): Shape {
  const shape = new Shape()
  const x = -width / 2
  const y = -height / 2
  const r = Math.min(radius, width / 2, height / 2)
  shape.moveTo(x + r, y)
  shape.lineTo(x + width - r, y)
  shape.quadraticCurveTo(x + width, y, x + width, y + r)
  shape.lineTo(x + width, y + height - r)
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  shape.lineTo(x + r, y + height)
  shape.quadraticCurveTo(x, y + height, x, y + height - r)
  shape.lineTo(x, y + r)
  shape.quadraticCurveTo(x, y, x + r, y)
  return shape
}

/** Rounded rectangle with a rounded rectangular hole (a frame or a wheel rim). */
export function frameShape(
  outerWidth: number,
  outerHeight: number,
  innerWidth: number,
  innerHeight: number,
  radius: number,
): Shape {
  const outer = roundedRectShape(outerWidth, outerHeight, radius)
  const inner = roundedRectShape(innerWidth, innerHeight, radius * 0.6)
  outer.holes.push(inner)
  return outer
}

export function extrude(shape: Shape, depth: number, curveSegments = 12): BufferGeometry {
  return new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments })
}

/** Horizontal plate. Outline points are [x, z]; the plate spans y .. y + thickness. */
export function plateXZ(outline: [number, number][], thickness: number, y: number): BufferGeometry {
  const geometry = extrude(shapeFrom(outline.map(([x, z]) => [x, -z])), thickness)
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, y, 0)
  return geometry
}

/** Vertical plate along the car. Outline points are [z, y]; centred on x. */
export function plateYZ(outline: [number, number][], thickness: number, x: number): BufferGeometry {
  const geometry = extrude(shapeFrom(outline.map(([z, y]) => [-z, y])), thickness)
  geometry.rotateY(Math.PI / 2)
  geometry.translate(x - thickness / 2, 0, 0)
  return geometry
}

/** Vertical plate across the car. Outline points are [x, y]; centred on z. */
export function plateXY(outline: [number, number][], thickness: number, z: number): BufferGeometry {
  const geometry = extrude(shapeFrom(outline), thickness)
  geometry.translate(0, 0, z - thickness / 2)
  return geometry
}

/** Flat shape lying in the XZ plane (rounded frames, discs). Shape x -> x, shape y -> z. */
export function flatShape(
  shape: Shape,
  thickness: number,
  y: number,
  zCentre: number,
): BufferGeometry {
  const geometry = extrude(shape, thickness)
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, y, zCentre)
  return geometry
}

export interface WingSpec {
  /** Width across the car. */
  span: number
  chord: number
  thickness: number
  /** Camber as a fraction of chord; positive bows the element downwards (downforce). */
  camber: number
  /** Leading-edge centre in car space. */
  position: Vec3
  /** Angle of attack in degrees; positive raises the trailing edge. */
  angle: number
  /** Lateral offset of the span centre (defaults to position x). */
  segments?: number
}

/** Cambered aerofoil section, leading edge at the origin, chord along +x. */
function aerofoilShape(chord: number, thickness: number, camber: number, segments = 18): Shape {
  const upper: [number, number][] = []
  const lower: [number, number][] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const x = t * chord
    const half = (thickness / 2) * (1.2 * Math.sqrt(t) - 0.4 * t - 0.8 * t * t) * 2.1
    const centre = -camber * chord * 4 * t * (1 - t)
    upper.push([x, centre + Math.max(half, 0)])
    lower.push([x, centre - Math.max(half, 0)])
  }
  const outline = [...upper, ...lower.reverse()]
  return shapeFrom(outline)
}

/** A wing element spanning along X with its leading edge towards +Z. */
export function wing(spec: WingSpec): BufferGeometry {
  const shape = aerofoilShape(spec.chord, spec.thickness, spec.camber, spec.segments)
  const geometry = extrude(shape, spec.span, 8)
  // Extrusion runs along +Z; turn it so span is along X and chord runs towards -Z.
  geometry.rotateY(Math.PI / 2)
  geometry.translate(-spec.span / 2, 0, 0)
  geometry.rotateX((spec.angle * Math.PI) / 180)
  geometry.translate(spec.position[0], spec.position[1], spec.position[2])
  return geometry
}
