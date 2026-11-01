import { Box3, Vector3, type BufferGeometry } from 'three'
import { GEOMETRY } from './geometry'
import { merge } from './geometry/helpers'
import { PART_BY_ID } from './registry'
import type { Finish, PartId, PartPiece } from './types'

export interface PartModel {
  id: PartId
  /** One merged geometry per finish, in the part's local space (pivot at the origin). */
  pieces: PartPiece[]
  /** Every piece merged into one geometry for the hologram passes, which ignore the finish. */
  hologram: BufferGeometry
  bounds: Box3
  size: Vector3
  centre: Vector3
  /** Largest dimension, used to normalise hologram thumbnails. */
  maxDimension: number
}

const cache = new Map<PartId, PartModel>()

/**
 * Build (once) and return a part's render-ready geometry. Factories model in car space;
 * this re-centres on the registry pivot and merges pieces that share a finish.
 */
export function getPartModel(id: PartId): PartModel {
  const cached = cache.get(id)
  if (cached) return cached

  const definition = PART_BY_ID[id]
  const [px, py, pz] = definition.transform.position
  const byFinish = new Map<Finish, BufferGeometry[]>()
  for (const piece of GEOMETRY[id]()) {
    const list = byFinish.get(piece.finish) ?? []
    list.push(piece.geometry)
    byFinish.set(piece.finish, list)
  }

  const bounds = new Box3()
  const pieces: PartPiece[] = []
  for (const [finish, geometries] of byFinish) {
    const geometry = merge(geometries)
    geometry.translate(-px, -py, -pz)
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
    if (geometry.boundingBox) bounds.union(geometry.boundingBox)
    pieces.push({ geometry, finish })
  }

  // Holograms draw the whole part with one material, so one draw call per pass is enough.
  const hologram =
    pieces.length === 1 ? pieces[0].geometry : merge(pieces.map((piece) => piece.geometry.clone()))

  const size = bounds.getSize(new Vector3())
  const model: PartModel = {
    id,
    pieces,
    hologram,
    bounds,
    size,
    centre: bounds.getCenter(new Vector3()),
    maxDimension: Math.max(size.x, size.y, size.z),
  }
  cache.set(id, model)
  return model
}

/** Release every cached geometry (used on hot reload). */
export function disposePartModels(): void {
  for (const model of cache.values()) {
    model.pieces.forEach((piece) => piece.geometry.dispose())
    if (model.pieces.length > 1) model.hologram.dispose()
  }
  cache.clear()
}
