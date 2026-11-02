import { useEffect, useRef } from 'react'
import { exposeDriveHandle } from '../debug'
import { StudioEnvironment } from '../scene/Lighting'
import { ChaseCamera } from './ChaseCamera'
import { Circuit } from './Circuit'
import { DriveCar } from './DriveCar'
import { GhostCar } from './GhostCar'
import { useRecords } from './records'
import { car, laps, resetCar } from './session'
import { useCircuit } from './useCircuit'

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
  const circuit = useCircuit()
  const first = useRef(true)

  useEffect(() => {
    exposeDriveHandle({ car, laps, resetCar, track: circuit, records: useRecords })
    return () => exposeDriveHandle(undefined)
  }, [circuit])

  // A new circuit means a new grid: the car goes back to the line and the clock stops.
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    resetCar()
  }, [circuit])

  return (
    <group name="track">
      <TrackLighting />
      <Circuit key={circuit.id} circuit={circuit} />
      <DriveCar />
      <GhostCar />
      <ChaseCamera />
    </group>
  )
}
