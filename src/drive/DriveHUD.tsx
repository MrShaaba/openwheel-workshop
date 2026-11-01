import { motion } from 'framer-motion'
import { useWorkshop } from '../state/store'
import '../styles/drive.css'
import { Brand } from '../ui/Brand'
import { resetCar } from './session'

/** HUD for the test drive: the brand, a way back, and the driving readouts. */
export default function DriveHUD() {
  const stopDrive = useWorkshop((state) => state.stopDrive)

  return (
    <motion.div
      className="drive-hud"
      role="region"
      aria-label="Test drive"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.25 }}
    >
      <header className="drive-top">
        <div>
          <Brand />
          <div className="drive-mode label">Test drive · flat circuit</div>
        </div>
        <div className="btn-group" id="drive-controls" tabIndex={-1}>
          <button type="button" className="hud-btn" onClick={resetCar} aria-keyshortcuts="R">
            Reset car
            <kbd aria-hidden="true">R</kbd>
          </button>
          <button type="button" className="hud-btn" onClick={stopDrive} aria-keyshortcuts="Escape">
            Back to workshop
            <kbd aria-hidden="true">ESC</kbd>
          </button>
        </div>
      </header>
      <div />
      <footer className="drive-bottom">
        <div className="legend" aria-label="Driving controls">
          <span>
            <kbd>W</kbd>
            <kbd>↑</kbd> throttle
          </span>
          <span>
            <kbd>S</kbd>
            <kbd>↓</kbd> brake, reverse
          </span>
          <span>
            <kbd>A</kbd>
            <kbd>D</kbd>
            <kbd>←</kbd>
            <kbd>→</kbd> steer
          </span>
          <span>
            <kbd>SPACE</kbd> handbrake
          </span>
          <span>
            <kbd>R</kbd> reset car
          </span>
          <span>
            <kbd>ESC</kbd> workshop
          </span>
        </div>
      </footer>
    </motion.div>
  )
}
