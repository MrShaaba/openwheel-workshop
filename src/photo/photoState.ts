import type { PerspectiveCamera, Vector3 } from 'three'
import { create } from 'zustand'

/** Session-only settings for photo mode. Nothing here is saved. */
export interface PhotoState {
  /** Focus on the car, or at a fixed distance from the camera in metres. */
  focus: 'car' | number
  /** 0 (everything sharp) to 1 (strong background blur). */
  aperture: number
  /** Field of view in degrees. */
  fov: number
  /** The camera circles the car slowly. */
  turntable: boolean
  /** Every control hidden, for an uncluttered view. */
  hideUi: boolean
  /** Bumped to ask the renderer for a PNG. */
  captureNonce: number
  /** Set while a capture is being written. */
  capturing: boolean
  setFocus: (focus: PhotoState['focus']) => void
  setAperture: (aperture: number) => void
  setFov: (fov: number) => void
  toggleTurntable: () => void
  toggleUi: () => void
  requestCapture: () => void
  setCapturing: (capturing: boolean) => void
  resetSettings: () => void
}

export const FOV_RANGE: readonly [number, number] = [18, 75]
export const FOCUS_RANGE: readonly [number, number] = [1, 40]
export const DEFAULT_FOV = 38

const DEFAULTS = {
  focus: 'car' as const,
  aperture: 0.45,
  fov: DEFAULT_FOV,
  turntable: false,
  hideUi: false,
}

export const usePhoto = create<PhotoState>()((set) => ({
  ...DEFAULTS,
  captureNonce: 0,
  capturing: false,
  setFocus: (focus) => set({ focus }),
  setAperture: (aperture) => set({ aperture: Math.min(1, Math.max(0, aperture)) }),
  setFov: (fov) => set({ fov: Math.min(FOV_RANGE[1], Math.max(FOV_RANGE[0], fov)) }),
  toggleTurntable: () => set((state) => ({ turntable: !state.turntable })),
  toggleUi: () => set((state) => ({ hideUi: !state.hideUi })),
  requestCapture: () =>
    set((state) => (state.capturing ? {} : { captureNonce: state.captureNonce + 1 })),
  setCapturing: (capturing) => set({ capturing }),
  resetSettings: () => set(DEFAULTS),
}))

/** File name for a saved frame: the car number and a timestamp, nothing that needs escaping. */
export function photoFileName(carNumber: number, when = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${when.getFullYear()}${pad(when.getMonth() + 1)}${pad(when.getDate())}-${pad(when.getHours())}${pad(when.getMinutes())}${pad(when.getSeconds())}`
  return `open-wheel-workshop-car-${carNumber}-${stamp}.png`
}

/**
 * Where the car is, for the focus point and the track's orbit target. The workshop car sits on the
 * platform; on the track the drive scene writes the car's position here every frame, so this module
 * never has to import the drive code into the main bundle.
 */
export const carFocus = { x: 0, y: 0.55, z: 0.2 }

export function setCarFocus(x: number, y: number, z: number): void {
  carFocus.x = x
  carFocus.y = y
  carFocus.z = z
}

/** World-space point the photo focuses on: the car, or a distance along the camera's view. */
export function focusPoint(camera: PerspectiveCamera, out: Vector3): Vector3 {
  const focus = usePhoto.getState().focus
  if (focus === 'car') return out.set(carFocus.x, carFocus.y, carFocus.z)
  camera.getWorldDirection(out)
  return out.multiplyScalar(focus).add(camera.position)
}
