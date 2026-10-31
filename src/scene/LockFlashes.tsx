import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, Color, type Mesh, type PointLight, Vector3 } from 'three'
import { onFlash } from './effectsBus'

const POOL = 3
const DURATION = 0.55

interface Flash {
  t: number
  active: boolean
  position: Vector3
}

/** Pool of light bursts and expanding shells that fire when a part locks in. */
export function LockFlashes() {
  const flashes = useMemo<Flash[]>(
    () => Array.from({ length: POOL }, () => ({ t: 0, active: false, position: new Vector3() })),
    [],
  )
  const lights = useRef<(PointLight | null)[]>([])
  const shells = useRef<(Mesh | null)[]>([])
  const color = useMemo(() => new Color('#9ff3ff'), [])

  useEffect(
    () =>
      onFlash((position) => {
        const slot = flashes.find((flash) => !flash.active) ?? flashes[0]
        slot.active = true
        slot.t = 0
        slot.position.copy(position)
      }),
    [flashes],
  )

  useFrame((_, dt) => {
    flashes.forEach((flash, i) => {
      const light = lights.current[i]
      const shell = shells.current[i]
      if (!light || !shell) return
      if (!flash.active) {
        light.intensity = 0
        shell.visible = false
        return
      }
      flash.t += dt
      const k = Math.min(1, flash.t / DURATION)
      light.position.copy(flash.position)
      light.intensity = 60 * Math.pow(1 - k, 2)
      shell.visible = true
      shell.position.copy(flash.position)
      const scale = 0.15 + k * 1.4
      shell.scale.setScalar(scale)
      const material = shell.material
      if (!Array.isArray(material) && 'opacity' in material) {
        material.opacity = 0.6 * Math.pow(1 - k, 1.5)
      }
      if (k >= 1) flash.active = false
    })
  })

  return (
    <group>
      {flashes.map((_, i) => (
        <group key={i}>
          <pointLight
            ref={(node) => {
              lights.current[i] = node
            }}
            intensity={0}
            distance={6}
            decay={2}
            color={color}
          />
          <mesh
            ref={(node) => {
              shells.current[i] = node
            }}
            visible={false}
          >
            <sphereGeometry args={[1, 24, 16]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0}
              depthWrite={false}
              blending={AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}
