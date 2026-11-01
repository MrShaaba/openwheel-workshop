import { AdditiveBlending, Color, DoubleSide, ShaderMaterial, Vector2, type Box3 } from 'three'

/** Shared GLSL: cheap 2D hash for the ragged dissolve edge. */
export const HASH_GLSL = /* glsl */ `
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
`

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;
  varying vec3 vWorldPos;
  void main() {
    vLocalPos = position;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPosition.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uProgress;
  uniform vec2 uBounds;
  uniform float uFresnelPower;
  uniform float uFill;
  uniform float uEdge;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;
  varying vec3 vWorldPos;
  ${HASH_GLSL}
  void main() {
    // Wipe front rises through the part as uProgress goes 0 -> 1; the solid pass owns everything below it.
    float front = mix(uBounds.x - 0.08, uBounds.y + 0.09, uProgress);
    float ragged = hash21(floor(vLocalPos.xz * 38.0)) * 0.07;
    float height = vLocalPos.y + ragged;
    if (height < front) discard;

    float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewDir))), uFresnelPower);
    float scan = 0.65 + 0.35 * sin(vWorldPos.y * 70.0 - uTime * 7.0);
    float flicker = 0.93 + 0.07 * sin(uTime * 21.0) * sin(uTime * 6.7 + vWorldPos.x);
    float edge = (1.0 - smoothstep(0.0, 0.12, height - front)) * step(0.001, uProgress) * uEdge;

    float alpha = (uFill + fresnel * (1.0 - uFill)) * scan * flicker * uOpacity + edge * 0.9;
    vec3 color = uColor * (0.55 + fresnel * 0.9) + uColor * edge * 2.5;
    gl_FragColor = vec4(color * alpha, alpha);
  }
`

export interface HologramOptions {
  wireframe?: boolean
  color?: Color
  opacity?: number
  /** Local-space Y range of the geometry, for the materialise wipe. */
  bounds?: Box3
}

/**
 * Additive hologram shell: fresnel rim, moving scanlines, flicker and a wipe cutoff so it can
 * hand over to the solid material from the bottom up.
 */
export class HologramMaterial extends ShaderMaterial {
  constructor(options: HologramOptions = {}) {
    const wire = options.wireframe ?? false
    super({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: (options.color ?? new Color('#38e7ff').multiplyScalar(2.2)).clone() },
        uOpacity: { value: options.opacity ?? 1 },
        uProgress: { value: 0 },
        uBounds: {
          value: options.bounds
            ? new Vector2(options.bounds.min.y, options.bounds.max.y)
            : new Vector2(-1, 1),
        },
        uFresnelPower: { value: wire ? 0.7 : 2.4 },
        uFill: { value: wire ? 0.45 : 0.04 },
        uEdge: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      wireframe: wire,
      toneMapped: false,
    })
  }

  set time(value: number) {
    this.uniforms.uTime.value = value
  }

  get progress(): number {
    return this.uniforms.uProgress.value as number
  }

  set progress(value: number) {
    this.uniforms.uProgress.value = value
  }

  set alpha(value: number) {
    this.uniforms.uOpacity.value = value
  }

  get tint(): Color {
    return this.uniforms.uColor.value as Color
  }

  /** 1 shows the glowing band at the wipe front, 0 hides it (used while dimmed in Inspect). */
  set edge(value: number) {
    this.uniforms.uEdge.value = value
  }
}
