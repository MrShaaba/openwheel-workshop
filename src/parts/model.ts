import { Box3, Vector3, type BufferGeometry } from 'three'
import { GEOMETRY } from './geometry'
import { merge } from './geometry/helpers'
import { PART_BY_ID } from './registry'
import type { Finish, PartId, PartPiece } from './types'

export interface PartModel {
  id: PartId
  /** One merged geometry per finish, in the part's local space (pivot at the origin). */
  pieces: PartPiece[]
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

  const size = bounds.getSize(new Vector3())
  const model: PartModel = {
    id,
    pieces,
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
  for (const model of cache.values()) model.pieces.forEach((piece) => piece.geometry.dispose())
  cache.clear()
}
