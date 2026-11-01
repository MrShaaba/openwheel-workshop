import { CanvasTexture, Color, type IUniform } from 'three'
import { DEFAULT_LIVERY, type Livery, type LiveryPattern } from '../state/livery'

/**
 * The livery is painted in car space rather than through UVs, because the paint pieces come from
 * lofts, extrusions and boxes with unrelated UV layouts. Two canvas masks are shared by every paint
 * material: a pattern atlas (plan view in the top half, side view in the bottom half) and the car
 * number. The masks only say "secondary here" (red) and "accent here" (green); the actual colours
 * live in uniforms, so dragging a colour picker never redraws a canvas.
 */

/** Car-space extents the atlas covers, in metres. Mirrored by the constants in materialize.ts. */
const CAR_X: readonly [number, number] = [-1.0, 1.0]
const CAR_Y: readonly [number, number] = [0, 1.2]
const CAR_Z: readonly [number, number] = [-2.6, 3.0]

const ATLAS_SIZE = 1024
/** Guard band between the plan and side halves so mipmaps do not bleed one into the other. */
const PLAN_V0 = 0.51
const SIDE_V1 = 0.49

const NUMBER_WIDTH = 512
const NUMBER_HEIGHT = 384

/** Mask channels. In the pattern atlas R means secondary and G means accent; black is primary. */
const CHANNEL_R = '#ff0000'
const CHANNEL_G = '#00ff00'
const NONE = '#000000'

export interface LiveryShaderUniforms {
  uPrimary: IUniform<Color>
  uSecondary: IUniform<Color>
  uAccent: IUniform<Color>
  uPatternMap: IUniform<CanvasTexture>
  uNumberMap: IUniform<CanvasTexture>
}

interface LiveryTextures {
  uniforms: LiveryShaderUniforms
  pattern: CanvasRenderingContext2D
  number: CanvasRenderingContext2D
  drawnPattern: LiveryPattern | null
  drawnNumber: number | null
}

let shared: LiveryTextures | null = null

function createContext(width: number, height: number): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('2D canvas is not available for the livery textures')
  return context
}

const range = (value: number, [min, max]: readonly [number, number]) => (value - min) / (max - min)

function drawPattern(ctx: CanvasRenderingContext2D, pattern: LiveryPattern): void {
  const size = ATLAS_SIZE
  ctx.fillStyle = NONE
  ctx.fillRect(0, 0, size, size)

  // Plan view: u across the car, v along it with the nose at the top of the canvas.
  const planHeight = (1 - PLAN_V0) * size
  const px = (x: number) => range(x, CAR_X) * size
  const pz = (z: number) => (1 - range(z, CAR_Z)) * planHeight
  // Side view: u along the car (tail to nose), v up the car from the bottom of the canvas.
  const sideHeight = SIDE_V1 * size
  const sz = (z: number) => range(z, CAR_Z) * size
  const sy = (y: number) => size - range(y, CAR_Y) * sideHeight

  const planRect = (x0: number, x1: number, z0: number, z1: number, style: string) => {
    ctx.fillStyle = style
    ctx.fillRect(px(x0), pz(z1), px(x1) - px(x0), pz(z0) - pz(z1))
  }
  const sideRect = (z0: number, z1: number, y0: number, y1: number, style: string) => {
    ctx.fillStyle = style
    ctx.fillRect(sz(z0), sy(y1), sz(z1) - sz(z0), sy(y0) - sy(y1))
  }

  switch (pattern) {
    case 'solid':
      break
    case 'stripe':
      // Spine stripe with accent pinstripes, plus an accent sill line along the sidepods.
      planRect(-0.115, 0.115, CAR_Z[0], CAR_Z[1], CHANNEL_G)
      planRect(-0.09, 0.09, CAR_Z[0], CAR_Z[1], CHANNEL_R)
      sideRect(-1.3, 0.45, 0.12, 0.15, CHANNEL_G)
      break
    case 'split':
      // Two-tone: everything forward of the cockpit in the secondary colour, an accent band at the cut.
      planRect(CAR_X[0], CAR_X[1], 0.15, CAR_Z[1], CHANNEL_R)
      planRect(CAR_X[0], CAR_X[1], 0.08, 0.22, CHANNEL_G)
      sideRect(0.15, CAR_Z[1], CAR_Y[0], CAR_Y[1], CHANNEL_R)
      sideRect(0.08, 0.22, CAR_Y[0], CAR_Y[1], CHANNEL_G)
      break
    case 'fade': {
      // Secondary at the nose fading to primary by the rear axle.
      const plan = ctx.createLinearGradient(0, pz(-1.4), 0, pz(1.6))
      plan.addColorStop(0, NONE)
      plan.addColorStop(1, CHANNEL_R)
      ctx.fillStyle = plan
      ctx.fillRect(0, 0, size, planHeight)
      const side = ctx.createLinearGradient(sz(-1.4), 0, sz(1.6), 0)
      side.addColorStop(0, NONE)
      side.addColorStop(1, CHANNEL_R)
      ctx.fillStyle = side
      ctx.fillRect(0, size - sideHeight, size, sideHeight)
      break
    }
  }
}

function drawNumber(ctx: CanvasRenderingContext2D, value: number): void {
  const width = NUMBER_WIDTH
  const height = NUMBER_HEIGHT
  ctx.fillStyle = NONE
  ctx.fillRect(0, 0, width, height)

  const text = String(value)
  const font = (size: number) =>
    `italic 900 ${size}px Impact, "Arial Narrow", "Helvetica Neue", Arial, sans-serif`
  let size = 300
  ctx.font = font(size)
  const measured = ctx.measureText(text).width
  const maxWidth = width * 0.78
  if (measured > maxWidth) size = Math.floor((size * maxWidth) / measured)
  ctx.font = font(size)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(10, size * 0.075)
  const x = width / 2
  const y = height / 2 + size * 0.05
  // In the number mask G is the secondary outline and R the accent fill, so the digits read on any
  // background: a nose painted in the secondary colour still shows an accent number.
  ctx.strokeStyle = CHANNEL_G
  ctx.strokeText(text, x, y)
  ctx.fillStyle = CHANNEL_R
  ctx.fillText(text, x, y)
}

function create(): LiveryTextures {
  const pattern = createContext(ATLAS_SIZE, ATLAS_SIZE)
  const number = createContext(NUMBER_WIDTH, NUMBER_HEIGHT)
  const patternMap = new CanvasTexture(pattern.canvas)
  const numberMap = new CanvasTexture(number.canvas)
  const textures: LiveryTextures = {
    uniforms: {
      uPrimary: { value: new Color(DEFAULT_LIVERY.primary) },
      uSecondary: { value: new Color(DEFAULT_LIVERY.secondary) },
      uAccent: { value: new Color(DEFAULT_LIVERY.accent) },
      uPatternMap: { value: patternMap },
      uNumberMap: { value: numberMap },
    },
    pattern,
    number,
    drawnPattern: null,
    drawnNumber: null,
  }
  shared = textures
  applyLivery(DEFAULT_LIVERY)
  return textures
}

/** The uniforms every paint material shares. Created on first use. */
export function getLiveryUniforms(): LiveryShaderUniforms {
  return (shared ?? create()).uniforms
}

/** Push a livery into the shared uniforms, redrawing a canvas only when its content changed. */
export function applyLivery(livery: Livery): void {
  const textures = shared ?? create()
  const { uniforms } = textures
  uniforms.uPrimary.value.set(livery.primary)
  uniforms.uSecondary.value.set(livery.secondary)
  uniforms.uAccent.value.set(livery.accent)
  if (textures.drawnPattern !== livery.pattern) {
    drawPattern(textures.pattern, livery.pattern)
    textures.drawnPattern = livery.pattern
    uniforms.uPatternMap.value.needsUpdate = true
  }
  if (textures.drawnNumber !== livery.number) {
    drawNumber(textures.number, livery.number)
    textures.drawnNumber = livery.number
    uniforms.uNumberMap.value.needsUpdate = true
  }
}

/** Sharper decals at grazing angles. Call once with the renderer's maximum. */
export function setLiveryAnisotropy(anisotropy: number): void {
  const { uniforms } = shared ?? create()
  for (const texture of [uniforms.uPatternMap.value, uniforms.uNumberMap.value]) {
    if (texture.anisotropy === anisotropy) continue
    texture.anisotropy = anisotropy
    texture.needsUpdate = true
  }
}
