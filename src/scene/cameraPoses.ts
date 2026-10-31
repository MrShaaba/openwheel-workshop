import type { Vec3 } from '../parts/types'
import type { CameraPreset } from '../state/store'

export interface CameraPose {
  position: Vec3
  target: Vec3
}

export const CAMERA_POSES: Record<CameraPreset, CameraPose> = {
  hero: { position: [6.4, 2.7, 7.0], target: [0, 0.55, 0.25] },
  front: { position: [0.2, 1.3, 9.2], target: [0, 0.5, 0] },
  side: { position: [9.2, 1.2, 0.2], target: [0, 0.5, 0] },
  top: { position: [0, 11.5, 0.05], target: [0, 0.2, 0] },
  rear: { position: [-0.2, 1.6, -9.2], target: [0, 0.6, 0] },
  cockpit: { position: [0, 1.35, -0.55], target: [0, 0.75, 2.6] },
  /** Further out and higher than hero so the exploded spread fits in frame. */
  exploded: { position: [8.6, 4.4, 9.4], target: [0, 1.0, 0.1] },
}

export const HERO_POSE = CAMERA_POSES.hero
