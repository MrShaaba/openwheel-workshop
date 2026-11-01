import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  SMAA,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing'
import { useThree } from '@react-three/fiber'
import { ToneMappingMode } from 'postprocessing'
import { HalfFloatType } from 'three'

/** Above this pixel ratio the density hides edge aliasing, so the three SMAA passes are skipped. */
const SMAA_MAX_DPR = 1.5

/**
 * The hologram look depends on bloom: anything with colour values above 1.0 glows.
 * Tone mapping runs inside the composer so the HDR buffer reaches bloom untouched.
 */
export function Effects() {
  const dpr = useThree((state) => state.viewport.dpr)

  return (
    <EffectComposer multisampling={0} frameBufferType={HalfFloatType}>
      <Bloom
        mipmapBlur
        intensity={1.15}
        luminanceThreshold={1}
        luminanceSmoothing={0.3}
        radius={0.75}
        levels={6}
      />
      <ChromaticAberration offset={[0.0006, 0.0004]} radialModulation modulationOffset={0.4} />
      <Vignette offset={0.22} darkness={0.85} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      {dpr < SMAA_MAX_DPR ? <SMAA /> : null}
    </EffectComposer>
  )
}
