import { Grid, MeshReflectorMaterial } from '@react-three/drei'
import { Color } from 'three'
import { HOLO_HEX } from './constants'

const SECTION_COLOR = new Color(HOLO_HEX).multiplyScalar(1.05)
const CELL_COLOR = new Color('#0e3b46')

/** Dark reflective floor with a glowing cyan grid laid on top. */
export function Floor() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.004}>
        <planeGeometry args={[80, 80]} />
        <MeshReflectorMaterial
          resolution={768}
          blur={[400, 120]}
          mixBlur={1}
          mixStrength={12}
          mixContrast={1}
          depthScale={1.2}
          minDepthThreshold={0.5}
          maxDepthThreshold={1.6}
          mirror={0.6}
          color="#070f19"
          metalness={0.7}
          roughness={0.85}
        />
      </mesh>
      <Grid
        position-y={0.002}
        args={[80, 80]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor={CELL_COLOR}
        sectionSize={2.5}
        sectionThickness={1.0}
        sectionColor={SECTION_COLOR}
        fadeDistance={26}
        fadeStrength={2.2}
        infiniteGrid
      />
    </group>
  )
}
