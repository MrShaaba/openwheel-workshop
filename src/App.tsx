import { MotionConfig } from 'framer-motion'
import { useEffect } from 'react'
import { useAudio } from './audio/useAudio'
import { useGamepadEvents } from './hooks/useGamepadEvents'
import { useKeyboard } from './hooks/useKeyboard'
import { useResumeNotice } from './hooks/useResumeNotice'
import { markInteraction } from './scene/interaction'
import { WorkshopCanvas } from './scene/WorkshopCanvas'
import { HUD } from './ui/HUD'
import { LoadingScreen } from './ui/LoadingScreen'

export default function App() {
  useKeyboard()
  useGamepadEvents()
  useAudio()
  useResumeNotice()

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
    <MotionConfig reducedMotion="user">
      <div
        className="scene-layer"
        role="region"
        aria-label="Holographic workshop. Drag to orbit, scroll to zoom; every action is also in the panels and on the keyboard."
      >
        <WorkshopCanvas />
      </div>
      <HUD />
      <LoadingScreen />
    </MotionConfig>
  )
}
