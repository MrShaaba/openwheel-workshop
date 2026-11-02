import { motion } from 'framer-motion'
import { Suspense, useState } from 'react'
import { DriveTransition } from '../drive/DriveTransition'
import { DriveHUD } from '../drive/lazy'
import { EngineerPanel } from '../engineer/lazy'
import { TEST_DRIVE_ENABLED } from '../lib/flags'
import { PhotoToolbar } from '../photo/lazy'
import { usePhoto } from '../photo/photoState'
import { useWorkshop } from '../state/store'
import { TourPlayer } from '../tour/lazy'
import '../styles/hud.css'
import { Brand } from './Brand'
import { CameraPresets } from './CameraPresets'
import { HoverLabel } from './HoverLabel'
import { InfoCard } from './InfoCard'
import { KeyLegend } from './KeyLegend'
import { LiveryPanel } from './LiveryPanel'
import { ModeControls } from './ModeControls'
import { Objective } from './Objective'
import { StageChecklist } from './StageChecklist'
import { StageProgress } from './StageProgress'
import { SystemsOnline } from './SystemsOnline'
import { Toast } from './Toast'

export function HUD() {
  const ready = useWorkshop((state) => state.ready)
  const trackScene = useWorkshop((state) => state.trackScene)
  const engineerOpen = useWorkshop((state) => state.engineer !== null)
  const photoMode = useWorkshop((state) => state.photoMode)
  const touring = useWorkshop((state) => state.touring)
  const uiHidden = usePhoto((state) => state.hideUi) && photoMode
  // Once opened, the panel stays mounted so its exit animation can play.
  const [engineerSeen, setEngineerSeen] = useState(false)
  if (engineerOpen && !engineerSeen) setEngineerSeen(true)
  // The long boot delay applies once; coming back from the track the HUD returns promptly.
  const [booted, setBooted] = useState(false)

  return (
    <div className={`hud ${uiHidden ? 'ui-hidden' : ''}`}>
      <a
        className="skip-link"
        href={photoMode ? '#photo-controls' : trackScene ? '#drive-controls' : '#objective'}
      >
        {photoMode
          ? 'Skip to photo controls'
          : trackScene
            ? 'Skip to drive controls'
            : 'Skip to build controls'}
      </a>
      <div className="hud-scanlines" aria-hidden="true" />
      <div className="hud-sweep" aria-hidden="true" />
      <span className="hud-corner tl" aria-hidden="true" />
      <span className="hud-corner tr" aria-hidden="true" />
      <span className="hud-corner bl" aria-hidden="true" />
      <span className="hud-corner br" aria-hidden="true" />

      {photoMode ? (
        <Suspense fallback={null}>
          <PhotoToolbar />
        </Suspense>
      ) : trackScene ? (
        <Suspense fallback={null}>
          <DriveHUD />
        </Suspense>
      ) : (
        <motion.div
          className="hud-layer"
          initial={{ opacity: 0 }}
          animate={{ opacity: ready ? 1 : 0 }}
          transition={booted ? { duration: 0.5, delay: 0.2 } : { duration: 0.9, delay: 1.6 }}
          onAnimationComplete={() => setBooted(true)}
        >
          <header className="hud-top" aria-label="Build status and settings">
            <Brand />
            <StageProgress />
            <ModeControls />
          </header>

          <section className="hud-middle">
            <aside className="hud-left">
              <StageChecklist />
            </aside>
            <div />
            <aside className="hud-right">
              <InfoCard />
              <LiveryPanel />
            </aside>
          </section>

          <footer className="hud-bottom" aria-label="Objective and camera">
            <KeyLegend />
            {touring ? (
              <Suspense fallback={<Objective />}>
                <TourPlayer />
              </Suspense>
            ) : (
              <Objective />
            )}
            <CameraPresets />
          </footer>
        </motion.div>
      )}

      {trackScene || photoMode ? null : <HoverLabel />}
      {engineerSeen && (
        <Suspense fallback={null}>
          <EngineerPanel />
        </Suspense>
      )}
      <SystemsOnline />
      <Toast />
      {TEST_DRIVE_ENABLED ? <DriveTransition /> : null}
    </div>
  )
}
