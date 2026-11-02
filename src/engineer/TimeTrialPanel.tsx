import { useId, useState } from 'react'
import {
  describeWhen,
  HOT_LAP_MS,
  LEADERBOARD_SIZE,
  MAX_TAG_LENGTH,
  useRecords,
} from '../drive/records'
import { formatLap, formatSector } from '../drive/session'
import { TEST_DRIVE_ENABLED } from '../lib/flags'
import { TYRES } from '../state/setup'
import { useWorkshop } from '../state/store'

/**
 * Time trial: the local leaderboard of the ten quickest clean laps with their sectors and setup,
 * the best sector times, the driver tag that new laps are filed under, and a way to wipe it all.
 */
export function TimeTrialPanel() {
  const leaderboard = useRecords((state) => state.leaderboard)
  const bestLap = useRecords((state) => state.bestLap)
  const bestSectors = useRecords((state) => state.bestSectors)
  const driverTag = useRecords((state) => state.driverTag)
  const setDriverTag = useRecords((state) => state.setDriverTag)
  const clear = useRecords((state) => state.clear)
  const trackScene = useWorkshop((state) => state.trackScene)
  const notify = useWorkshop((state) => state.notify)
  const [confirmClear, setConfirmClear] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)
  const tagId = useId()

  const commitTag = () => {
    if (draft !== null) setDriverTag(draft)
    setDraft(null)
  }

  const theoretical = bestSectors.every((ms) => ms !== null)
    ? bestSectors.reduce<number>((sum, ms) => sum + (ms ?? 0), 0)
    : null

  return (
    <div className="trial">
      <div className="trial-top">
        <div className="trial-stat">
          <span className="label">Best lap</span>
          <span className="trial-stat-value">{formatLap(bestLap?.ms ?? null)}</span>
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="trial-stat purple">
            <span className="label">Best S{i + 1}</span>
            <span className="trial-stat-value">{formatSector(bestSectors[i])}</span>
          </div>
        ))}
        <div className="trial-stat">
          <span className="label">Ideal lap</span>
          <span className="trial-stat-value">{formatLap(theoretical)}</span>
        </div>
      </div>

      <p className="trial-text">
        Clean laps only: a lap that leaves the track is timed but not recorded. Your best lap runs
        ahead of you on the circuit as a hologram ghost, sector splits show in the lap panel, and a
        lap under {formatLap(HOT_LAP_MS).replace(/^0:/, '')} earns the Hot lap badge.
      </p>

      {leaderboard.length === 0 ? (
        <p className="trial-empty">
          {TEST_DRIVE_ENABLED
            ? trackScene
              ? 'No laps yet. Cross the line, go round, cross it again.'
              : 'No laps yet. Press D to take the car out.'
            : 'The leaderboard fills in once the test drive is switched on (VITE_ENABLE_TEST_DRIVE).'}
        </p>
      ) : (
        <table className="trial-table">
          <caption className="visually-hidden">Leaderboard, quickest first</caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Driver</th>
              <th scope="col">Lap</th>
              <th scope="col">S1</th>
              <th scope="col">S2</th>
              <th scope="col">S3</th>
              <th scope="col">Setup</th>
              <th scope="col">When</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((lap, index) => (
              <tr key={`${lap.at}-${lap.ms}`} className={index === 0 ? 'top' : ''}>
                <td>{index + 1}</td>
                <td className="trial-tag">{lap.tag}</td>
                <td className="trial-time">{formatLap(lap.ms)}</td>
                {lap.sectors.map((ms, i) => (
                  <td key={i} className={`trial-time ${bestSectors[i] === ms ? 'purple' : ''}`}>
                    {formatSector(ms)}
                  </td>
                ))}
                <td className="trial-setup">
                  <span
                    className="tyre-dot"
                    style={{ borderColor: TYRES[lap.compound].colour }}
                    aria-hidden="true"
                  />
                  <span className="visually-hidden">{TYRES[lap.compound].name} tyres, </span>F
                  {lap.wings[0]} R{lap.wings[1]}
                </td>
                <td className="trial-when">{describeWhen(lap.at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="trial-foot">
        <div className="trial-tag-row">
          <label className="label" htmlFor={tagId}>
            Driver tag
          </label>
          <input
            id={tagId}
            className="trial-tag-input"
            type="text"
            maxLength={MAX_TAG_LENGTH}
            value={draft ?? driverTag}
            onFocus={() => setDraft(driverTag)}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitTag}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commitTag()
                event.currentTarget.blur()
              }
            }}
          />
          <span className="trial-hint">New laps are filed under this name.</span>
        </div>
        <div className="btn-group">
          {confirmClear ? (
            <>
              <button
                type="button"
                className="hud-btn danger"
                onClick={() => {
                  clear()
                  setConfirmClear(false)
                  notify('Lap records cleared')
                }}
              >
                Yes, clear {leaderboard.length} lap{leaderboard.length === 1 ? '' : 's'}
              </button>
              <button type="button" className="hud-btn" onClick={() => setConfirmClear(false)}>
                Keep them
              </button>
            </>
          ) : (
            <button
              type="button"
              className="hud-btn danger"
              disabled={leaderboard.length === 0 && bestLap === null}
              onClick={() => setConfirmClear(true)}
            >
              Clear records
            </button>
          )}
        </div>
      </div>
      <p className="trial-hint">Top {LEADERBOARD_SIZE} laps are kept in this browser only.</p>
    </div>
  )
}
