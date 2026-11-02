import { TEST_DRIVE_ENABLED } from '../lib/flags'

export function KeyLegend() {
  return (
    <div className="legend" aria-label="Keyboard shortcuts">
      <span>
        <kbd>SPACE</kbd> install next
      </span>
      <span>
        <kbd>E</kbd> exploded view
      </span>
      <span>
        <kbd>L</kbd> paint shop
      </span>
      {TEST_DRIVE_ENABLED && (
        <span>
          <kbd>D</kbd> test drive
        </span>
      )}
      <span>
        <kbd>G</kbd> race engineer
      </span>
      <span>
        <kbd>B</kbd> pit stop
      </span>
      <span>
        <kbd>Q</kbd> quiz
      </span>
      <span>
        <kbd>P</kbd> photo
      </span>
      <span>
        <kbd>N</kbd> tour
      </span>
      <span>
        <kbd>1-6</kbd> views
      </span>
      <span>
        <kbd>R</kbd> hero camera
      </span>
      <span>
        <kbd>M</kbd> mute
      </span>
      <span>
        <kbd>ESC</kbd> close
      </span>
      <span>
        <kbd>DRAG</kbd> orbit
      </span>
    </div>
  )
}
