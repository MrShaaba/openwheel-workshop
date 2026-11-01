import { StudioEnvironment } from '../scene/Lighting'
import { ChaseCamera } from './ChaseCamera'
import { Circuit } from './Circuit'
import { DriveCar } from './DriveCar'

function TrackLighting() {
  return (
    <>
      <ambientLight intensity={0.3} color="#7fb0d8" />
      <directionalLight position={[40, 70, -30]} intensity={1.5} color="#d6ecff" />
      <StudioEnvironment />
    </>
  )
}

/** The test-drive scene, mounted in place of the workshop while `trackScene` is set. */
export default function DriveScene() {
  return (
    <group name="track">
      <TrackLighting />
      <Circuit />
      <DriveCar />
      <ChaseCamera />
    </group>
  )
}
