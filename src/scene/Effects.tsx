import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  SMAA,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { HalfFloatType } from 'three'

/**
 * The hologram look depends on bloom: anything with colour values above 1.0 glows.
 * Tone mapping runs inside the composer so the HDR buffer reaches bloom untouched.
 */
export function Effects() {
  return (
    <EffectComposer multisampling={0} frameBufferType={HalfFloatType}>
      <Bloom
        mipmapBlur
        intensity={1.15}
        luminanceThreshold={1}
        luminanceSmoothing={0.3}
        radius={0.75}
        levels={7}
      />
      <ChromaticAberration offset={[0.0006, 0.0004]} radialModulation modulationOffset={0.4} />
      <Vignette offset={0.22} darkness={0.85} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <SMAA />
    </EffectComposer>
  )
}
