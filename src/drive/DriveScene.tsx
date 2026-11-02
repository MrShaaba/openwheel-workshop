import { useEffect } from 'react'
import { exposeDriveHandle } from '../debug'
import { StudioEnvironment } from '../scene/Lighting'
import { ChaseCamera } from './ChaseCamera'
import { Circuit } from './Circuit'
import { DriveCar } from './DriveCar'
import { GhostCar } from './GhostCar'
import { useRecords } from './records'
import { car, laps, resetCar } from './session'
import { CIRCUIT } from './track'

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
  useEffect(() => {
    exposeDriveHandle({ car, laps, resetCar, track: CIRCUIT, records: useRecords })
    return () => exposeDriveHandle(undefined)
  }, [])

  return (
    <group name="track">
      <TrackLighting />
      <Circuit />
      <DriveCar />
      <GhostCar />
      <ChaseCamera />
    </group>
  )
}
