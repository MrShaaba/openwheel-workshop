import { useEffect } from 'react'
import { useKeyboard } from './hooks/useKeyboard'
import { markInteraction } from './scene/interaction'
import { WorkshopCanvas } from './scene/WorkshopCanvas'
import { HUD } from './ui/HUD'
import { LoadingScreen } from './ui/LoadingScreen'

export default function App() {
  useKeyboard()

  useEffect(() => {
    const options: AddEventListenerOptions = { passive: true }
    window.addEventListener('pointerdown', markInteraction, options)
    window.addEventListener('wheel', markInteraction, options)
    return () => {
      window.removeEventListener('pointerdown', markInteraction)
      window.removeEventListener('wheel', markInteraction)
    }
  }, [])

  return (
    <>
      <div className="scene-layer">
        <WorkshopCanvas />
      </div>
      <HUD />
      <LoadingScreen />
    </>
  )
}
