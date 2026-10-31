import { Environment, Lightformer } from '@react-three/drei'
import { BackSide } from 'three'

/**
 * Dim, cool workshop lighting. The procedural Environment gives PBR surfaces something
 * to reflect without loading any external HDR file.
 */
export function Lighting() {
  return (
    <>
      <ambientLight intensity={0.12} color="#6fb6ff" />
      <spotLight
        position={[0, 10, 0]}
        angle={0.62}
        penumbra={0.7}
        intensity={220}
        distance={40}
        decay={2}
        color="#d6ecff"
      />
      <pointLight position={[-6, 3.5, -4]} intensity={40} distance={20} decay={2} color="#38e7ff" />
      <pointLight
        position={[6.5, 2.5, 4.5]}
        intensity={16}
        distance={18}
        decay={2}
        color="#ff4fa3"
      />
      <pointLight position={[0, 1.2, 6.5]} intensity={10} distance={14} decay={2} color="#7fd8ff" />

      <Environment resolution={128} frames={1} background={false}>
        <mesh scale={60}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color="#070c14" side={BackSide} />
        </mesh>
        <Lightformer
          form="rect"
          intensity={2.4}
          color="#cfe6ff"
          position={[0, 7, 0]}
          rotation-x={Math.PI / 2}
          scale={[9, 9, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.6}
          color="#38e7ff"
          position={[-7, 2.5, 0]}
          rotation-y={Math.PI / 2}
          scale={[7, 1.2, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.6}
          color="#38e7ff"
          position={[7, 2.5, 0]}
          rotation-y={-Math.PI / 2}
          scale={[7, 1.2, 1]}
        />
        <Lightformer
          form="ring"
          intensity={1.0}
          color="#ff6fb8"
          position={[0, 2, -9]}
          scale={[3, 3, 1]}
        />
        <Lightformer
          form="rect"
          intensity={0.8}
          color="#9fd9ff"
          position={[0, 1.5, 9]}
          rotation-y={Math.PI}
          scale={[6, 0.8, 1]}
        />
      </Environment>
    </>
  )
}
