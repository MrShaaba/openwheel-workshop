import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { useWorkshop } from '../state/store'
import { applyLivery, setLiveryAnisotropy } from './liveryTextures'

/** Keeps the shared livery uniforms in step with the store. No React re-renders reach the parts. */
export function LiveryPainter() {
  const gl = useThree((state) => state.gl)

  useEffect(() => {
    setLiveryAnisotropy(gl.capabilities.getMaxAnisotropy())
    applyLivery(useWorkshop.getState().livery)
    return useWorkshop.subscribe((state, previous) => {
      if (state.livery !== previous.livery) applyLivery(state.livery)
    })
  }, [gl])

  return null
}
