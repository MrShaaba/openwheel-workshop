import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  type ShaderMaterial,
} from 'three'
import { createRng } from '../lib/math'

const COUNT = 1400
const EXTENT = 26
const HEIGHT = 8

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aSeed;
  attribute float aSize;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float rise = uTime * (0.06 + aSeed * 0.07);
    p.y = mod(p.y + rise, ${HEIGHT.toFixed(1)});
    p.x += sin(uTime * 0.27 + aSeed * 6.2831) * 0.4;
    p.z += cos(uTime * 0.21 + aSeed * 6.2831) * 0.4;
    float fadeIn = smoothstep(0.0, 0.9, p.y);
    float fadeOut = 1.0 - smoothstep(${(HEIGHT * 0.7).toFixed(1)}, ${HEIGHT.toFixed(1)}, p.y);
    float twinkle = 0.65 + 0.35 * sin(uTime * (1.2 + aSeed * 2.0) + aSeed * 40.0);
    vAlpha = fadeIn * fadeOut * twinkle * (0.3 + 0.7 * fract(aSeed * 7.31));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = aSize * uPixelRatio * (14.0 / max(-mv.z, 0.5));
    gl_Position = projectionMatrix * mv;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d) * vAlpha;
    gl_FragColor = vec4(uColor * a, a);
  }
`

function buildGeometry(): BufferGeometry {
  const rng = createRng(1337)
  const positions = new Float32Array(COUNT * 3)
  const seeds = new Float32Array(COUNT)
  const sizes = new Float32Array(COUNT)
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = (rng() - 0.5) * EXTENT
    positions[i * 3 + 1] = rng() * HEIGHT
    positions[i * 3 + 2] = (rng() - 0.5) * EXTENT
    seeds[i] = rng()
    sizes[i] = 0.6 + rng() * 1.6
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1))
  geometry.setAttribute('aSize', new BufferAttribute(sizes, 1))
  return geometry
}

/** Slowly rising, drifting motes that catch the light. */
export function Dust() {
  const dpr = useThree((state) => state.viewport.dpr)
  const material = useRef<ShaderMaterial>(null)
  const geometry = useMemo(() => buildGeometry(), [])
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uColor: { value: new Color('#8fdcff').multiplyScalar(0.9) },
    }),
    [],
  )

  useFrame(({ clock }) => {
    if (!material.current) return
    material.current.uniforms.uTime.value = clock.elapsedTime
    material.current.uniforms.uPixelRatio.value = dpr
  })

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  )
}
