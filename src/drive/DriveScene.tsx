import { Grid } from '@react-three/drei'
import { Color } from 'three'
import { StudioEnvironment } from '../scene/Lighting'
import { HOLO_HEX } from '../scene/constants'
import { ChaseCamera } from './ChaseCamera'
import { DriveCar } from './DriveCar'

const CELL_COLOR = new Color('#0a2a33')
const SECTION_COLOR = new Color(HOLO_HEX).multiplyScalar(0.9)

function TrackLighting() {
  return (
    <>
      <ambientLight intensity={0.3} color="#7fb0d8" />
      <directionalLight position={[40, 70, -30]} intensity={1.5} color="#d6ecff" />
      <StudioEnvironment />
    </>
  )
}

/** Night ground: a dark plane with the workshop's cyan grid stretched to circuit scale. */
function Ground() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02}>
        <planeGeometry args={[1400, 1400]} />
        <meshStandardMaterial color="#060a12" roughness={1} metalness={0} />
      </mesh>
      <Grid
        position-y={-0.006}
        args={[20, 20]}
        cellSize={2}
        cellThickness={0.5}
        cellColor={CELL_COLOR}
        sectionSize={10}
        sectionThickness={1}
        sectionColor={SECTION_COLOR}
        fadeDistance={320}
        fadeStrength={1.6}
        infiniteGrid
      />
    </group>
  )
}

/** The test-drive scene, mounted in place of the workshop while `trackScene` is set. */
export default function DriveScene() {
  return (
    <group name="track">
      <TrackLighting />
      <Ground />
      <DriveCar />
      <ChaseCamera />
    </group>
  )
}
