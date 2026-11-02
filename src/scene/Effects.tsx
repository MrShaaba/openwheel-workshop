import {
  Bloom,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  SMAA,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing'
import { useFrame, useThree } from '@react-three/fiber'
import { ToneMappingMode, type DepthOfFieldEffect } from 'postprocessing'
import { useRef } from 'react'
import { HalfFloatType, PerspectiveCamera, Vector3 } from 'three'
import { focusPoint, usePhoto } from '../photo/photoState'
import { useWorkshop } from '../state/store'

/** Above this pixel ratio the density hides edge aliasing, so the three SMAA passes are skipped. */
const SMAA_MAX_DPR = 1.5

/** Bokeh scale at the strongest aperture setting. */
const MAX_BOKEH = 5.5

/**
 * The hologram look depends on bloom: anything with colour values above 1.0 glows.
 * Tone mapping runs inside the composer so the HDR buffer reaches bloom untouched.
 * Photo mode adds depth of field, focused on the car or at a chosen distance.
 */
export function Effects() {
  const dpr = useThree((state) => state.viewport.dpr)
  const photoMode = useWorkshop((state) => state.photoMode)

  return (
    <EffectComposer multisampling={0} frameBufferType={HalfFloatType}>
      {photoMode ? <PhotoDepthOfField /> : null}
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

/** Depth of field for photo mode, steered every frame from the photo settings. */
function PhotoDepthOfField() {
  const effect = useRef<DepthOfFieldEffect>(null)
  const target = useRef(new Vector3())
  const camera = useThree((state) => state.camera)

  useFrame(() => {
    const dof = effect.current
    if (!dof || !(camera instanceof PerspectiveCamera)) return
    const photo = usePhoto.getState()
    dof.target = focusPoint(camera, target.current)
    dof.bokehScale = photo.aperture * MAX_BOKEH
  })

  return <DepthOfField ref={effect} focalLength={0.02} worldFocusRange={3} bokehScale={0} />
}
