import { Color, Vector2, type Box3, type IUniform, type MeshStandardMaterial } from 'three'
import { HASH_GLSL } from './hologram'

export interface MaterializeUniforms {
  uProgress: IUniform<number>
  uBounds: IUniform<Vector2>
  uGlowColor: IUniform<Color>
  uHighlight: IUniform<number>
  /** 1 shows the glowing band at the wipe front, 0 hides it. */
  uEdge: IUniform<number>
}

export function createMaterializeUniforms(bounds: Box3): MaterializeUniforms {
  return {
    uProgress: { value: 1 },
    uBounds: { value: new Vector2(bounds.min.y, bounds.max.y) },
    uGlowColor: { value: new Color('#38e7ff').multiplyScalar(3) },
    uHighlight: { value: 0 },
    uEdge: { value: 1 },
  }
}

/**
 * Patch a standard or physical material so it only draws below a rising wipe front, with a
 * glowing band at the edge. Paired with HologramMaterial (which draws above the front) this
 * gives the hologram-to-solid transition. `uHighlight` adds a cyan emissive pulse for Inspect.
 */
export function applyMaterialize(
  material: MeshStandardMaterial,
  uniforms: MaterializeUniforms,
): void {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMaterializePos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMaterializePos = transformed;')
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uProgress;
        uniform vec2 uBounds;
        uniform vec3 uGlowColor;
        uniform float uHighlight;
        uniform float uEdge;
        varying vec3 vMaterializePos;
        ${HASH_GLSL}`,
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        float materializeFront = mix(uBounds.x - 0.06, uBounds.y + 0.06, uProgress);
        float materializeHeight = vMaterializePos.y + hash21(floor(vMaterializePos.xz * 38.0)) * 0.07;
        if (materializeHeight > materializeFront) discard;
        float materializeEdge = (1.0 - smoothstep(0.0, 0.1, materializeFront - materializeHeight)) * (1.0 - step(0.999, uProgress)) * uEdge;`,
      )
      .replace(
        '#include <opaque_fragment>',
        `#include <opaque_fragment>
        gl_FragColor.rgb += uGlowColor * materializeEdge;
        gl_FragColor.rgb += uGlowColor * 0.06 * uHighlight;`,
      )
  }
  material.customProgramCacheKey = () => 'materialize'
  material.needsUpdate = true
}
