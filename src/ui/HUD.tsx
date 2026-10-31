import { motion } from 'framer-motion'
import { useWorkshop } from '../state/store'
import '../styles/hud.css'
import { Brand } from './Brand'
import { CameraPresets } from './CameraPresets'
import { HoverLabel } from './HoverLabel'
import { InfoCard } from './InfoCard'
import { KeyLegend } from './KeyLegend'
import { ModeControls } from './ModeControls'
import { Objective } from './Objective'
import { StageChecklist } from './StageChecklist'
import { StageProgress } from './StageProgress'
import { SystemsOnline } from './SystemsOnline'
import { Toast } from './Toast'

export function HUD() {
  const ready = useWorkshop((state) => state.ready)

  return (
    <div className="hud">
      <div className="hud-scanlines" />
      <div className="hud-sweep" />
      <span className="hud-corner tl" />
      <span className="hud-corner tr" />
      <span className="hud-corner bl" />
      <span className="hud-corner br" />

      <motion.div
        className="hud-layer"
        initial={{ opacity: 0 }}
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{ duration: 0.9, delay: 1.6 }}
      >
        <header className="hud-top">
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
          </aside>
        </section>

        <footer className="hud-bottom">
          <KeyLegend />
          <Objective />
          <CameraPresets />
        </footer>
      </motion.div>

      <HoverLabel />
      <SystemsOnline />
      <Toast />
    </div>
  )
}
