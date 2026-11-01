import { Color, Vector2, Vector3, type Box3, type IUniform, type MeshStandardMaterial } from 'three'
import type { Vec3 } from '../parts/types'
import type { LiveryShaderUniforms } from '../scene/liveryTextures'
import { HASH_GLSL } from './hologram'

export interface MaterializeUniforms {
  uProgress: IUniform<number>
  uBounds: IUniform<Vector2>
  uGlowColor: IUniform<Color>
  uHighlight: IUniform<number>
  /** 1 shows the glowing band at the wipe front, 0 hides it. */
  uEdge: IUniform<number>
  /** The part's pivot in car space, so the livery can be painted in car coordinates. */
  uPivot: IUniform<Vector3>
}

export function createMaterializeUniforms(bounds: Box3, pivot: Vec3): MaterializeUniforms {
  return {
    uProgress: { value: 1 },
    uBounds: { value: new Vector2(bounds.min.y, bounds.max.y) },
    uGlowColor: { value: new Color('#38e7ff').multiplyScalar(3) },
    uHighlight: { value: 0 },
    uEdge: { value: 1 },
    uPivot: { value: new Vector3(pivot[0], pivot[1], pivot[2]) },
  }
}

/**
 * Livery in car space. The plan view (top half of the atlas) covers surfaces that face up or along
 * the car; the side view (bottom half) covers surfaces that face sideways. Number decals are placed
 * on the nose (plan) and on the shark fin and sidepod flanks (side), flipped so that they read
 * correctly from either side. The constants mirror liveryTextures.ts.
 */
const LIVERY_GLSL = /* glsl */ `
  uniform vec3 uPrimary;
  uniform vec3 uSecondary;
  uniform vec3 uAccent;
  uniform sampler2D uPatternMap;
  uniform sampler2D uNumberMap;
  varying vec3 vLiveryNormal;
  const vec2 CAR_X = vec2(-1.0, 1.0);
  const vec2 CAR_Y = vec2(0.0, 1.2);
  const vec2 CAR_Z = vec2(-2.6, 3.0);
  const float PLAN_V0 = 0.51;
  const float SIDE_V1 = 0.49;
  const vec4 DECAL_NOSE = vec4(-0.12, 0.12, 1.98, 2.16);
  const vec4 DECAL_FIN = vec4(-1.76, -1.44, 0.70, 0.94);
  const vec4 DECAL_POD = vec4(-0.68, -0.20, 0.12, 0.48);

  float liveryRange(float value, vec2 r) {
    return (value - r.x) / (r.y - r.x);
  }

  vec3 liveryDecal(vec2 uv) {
    vec2 inside = step(vec2(0.0), uv) * step(uv, vec2(1.0));
    return texture2D(uNumberMap, clamp(uv, 0.0, 1.0)).rgb * inside.x * inside.y;
  }

  vec3 liveryColor(vec3 p, vec3 n) {
    bool side = abs(n.x) > 0.55;
    float zt = liveryRange(p.z, CAR_Z);
    vec2 uv = side
      ? vec2(zt, SIDE_V1 * liveryRange(p.y, CAR_Y))
      : vec2(liveryRange(p.x, CAR_X), PLAN_V0 + (1.0 - PLAN_V0) * zt);
    vec3 mask = texture2D(uPatternMap, clamp(uv, 0.0, 1.0)).rgb;
    vec3 color = mix(mix(uPrimary, uSecondary, mask.r), uAccent, mask.g);

    vec3 decal = vec3(0.0);
    if (side) {
      float flip = step(0.0, n.x);
      vec2 fin = vec2(liveryRange(p.z, DECAL_FIN.xy), liveryRange(p.y, DECAL_FIN.zw));
      vec2 pod = vec2(liveryRange(p.z, DECAL_POD.xy), liveryRange(p.y, DECAL_POD.zw));
      fin.x = mix(fin.x, 1.0 - fin.x, flip);
      pod.x = mix(pod.x, 1.0 - pod.x, flip);
      decal = max(liveryDecal(fin), liveryDecal(pod));
    } else if (n.y > 0.3) {
      vec2 nose = vec2(liveryRange(p.x, DECAL_NOSE.xy), 1.0 - liveryRange(p.z, DECAL_NOSE.zw));
      decal = liveryDecal(nose);
    }
    color = mix(color, uSecondary, decal.g);
    color = mix(color, uAccent, decal.r);
    return color;
  }
`

/**
 * Patch a standard or physical material so it only draws below a rising wipe front, with a
 * glowing band at the edge. Paired with HologramMaterial (which draws above the front) this
 * gives the hologram-to-solid transition. `uHighlight` adds a cyan emissive pulse for Inspect.
 * Pass `livery` for paint pieces: their colour then comes from the shared livery masks and uniforms.
 */
export function applyMaterialize(
  material: MeshStandardMaterial,
  uniforms: MaterializeUniforms,
  livery?: LiveryShaderUniforms,
): void {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, livery ?? {})
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vMaterializePos;
        ${livery ? 'varying vec3 vLiveryNormal;' : ''}`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
        ${livery ? 'vLiveryNormal = objectNormal;' : ''}`,
      )
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
        uniform vec3 uPivot;
        varying vec3 vMaterializePos;
        ${HASH_GLSL}
        ${livery ? LIVERY_GLSL : ''}`,
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        // The margin exceeds the 0.07 jitter below, so nothing is cut once the wipe has finished.
        float materializeFront = mix(uBounds.x - 0.08, uBounds.y + 0.09, uProgress);
        float materializeHeight = vMaterializePos.y + hash21(floor(vMaterializePos.xz * 38.0)) * 0.07;
        if (materializeHeight > materializeFront) discard;
        float materializeEdge = (1.0 - smoothstep(0.0, 0.1, materializeFront - materializeHeight)) * (1.0 - step(0.999, uProgress)) * uEdge;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        ${livery ? 'diffuseColor.rgb = liveryColor(vMaterializePos + uPivot, normalize(vLiveryNormal));' : ''}`,
      )
      .replace(
        '#include <opaque_fragment>',
        `#include <opaque_fragment>
        gl_FragColor.rgb += uGlowColor * materializeEdge;
        gl_FragColor.rgb += uGlowColor * 0.06 * uHighlight;`,
      )
  }
  material.customProgramCacheKey = () => (livery ? 'materialize-livery' : 'materialize')
  material.needsUpdate = true
}
