import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, Color, ConeGeometry, type ShaderMaterial } from 'three'
import { TAU } from '../lib/math'

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPosition.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  uniform float uIntensity;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float facing = abs(dot(normalize(vNormal), normalize(vViewDir)));
    float edge = pow(facing, 1.6);
    float vertical = smoothstep(0.0, 0.18, vUv.y) * (0.25 + 0.75 * pow(vUv.y, 1.4));
    float flicker = 0.86 + 0.14 * sin(uTime * 1.7 + uSeed) * sin(uTime * 0.83 + uSeed * 2.1);
    float alpha = edge * vertical * flicker * uIntensity;
    gl_FragColor = vec4(uColor * alpha, alpha);
  }
`

interface ShaftSpec {
  position: [number, number, number]
  tilt: [number, number]
  seed: number
  intensity: number
}

const SHAFTS: ShaftSpec[] = Array.from({ length: 6 }, (_, i) => {
  const angle = (i / 6) * TAU + 0.4
  const radius = 5.6
  return {
    position: [Math.cos(angle) * radius, 5.2, Math.sin(angle) * radius],
    tilt: [Math.sin(angle) * 0.18, -Math.cos(angle) * 0.18],
    seed: i * 1.37,
    intensity: 0.11 + (i % 2) * 0.03,
  }
})

interface ShaftProps {
  spec: ShaftSpec
  geometry: ConeGeometry
}

function Shaft({ spec, geometry }: ShaftProps) {
  const material = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSeed: { value: spec.seed },
      // Front faces only (see below), so the intensity makes up for the missing back wall.
      uIntensity: { value: spec.intensity * 1.6 },
      uColor: { value: new Color('#9fe3ff') },
    }),
    [spec],
  )

  useFrame(({ clock }) => {
    if (material.current) material.current.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <mesh
      geometry={geometry}
      position={spec.position}
      rotation={[Math.PI + spec.tilt[0], 0, spec.tilt[1]]}
      frustumCulled={false}
    >
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </mesh>
  )
}

/** Tall additive cones that read as volumetric light falling from the ceiling rig. */
export function LightShafts() {
  const geometry = useMemo(() => new ConeGeometry(1.7, 10.4, 28, 1, true), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <group>
      {SHAFTS.map((spec) => (
        <Shaft key={spec.seed} spec={spec} geometry={geometry} />
      ))}
    </group>
  )
}
