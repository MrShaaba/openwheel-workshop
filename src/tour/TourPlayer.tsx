import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useId, useRef, useState } from 'react'
import { prefersReducedMotion } from '../lib/motion'
import { PART_BY_ID, STAGES } from '../parts/registry'
import type { StageId } from '../parts/types'
import { useWorkshop, type CameraPreset } from '../state/store'
import '../styles/tour.css'
import { chapterStageName, readingMs, TOUR } from './script'
import { speak, speechAvailable, watchVoices } from './speech'
import { RATES, useTour } from './tourState'

/** Camera for each stage introduction, as Assemble All uses. */
const STAGE_CAMERA: Record<StageId, CameraPreset> = {
  core: 'hero',
  'power-unit': 'rear',
  'running-gear': 'side',
  aero: 'front',
  controls: 'cockpit',
}

/** Pause after a chapter ends before the next begins, and before the camera has settled. */
const GAP_MS = 900
const FOCUS_LEAD_MS = 500
/** If the browser has not started speaking by then, the chapter runs on captions alone. */
const SPEECH_WATCHDOG_MS = 2500

/**
 * Runs the tour: for the chapter on screen it moves the camera, installs the part if the build has
 * not reached it, speaks the text (or just shows it when speech is off) and moves on when done.
 * Pausing cancels the speech; playing again restarts the chapter from the top.
 */
function useTourEngine() {
  const index = useTour((state) => state.index)
  const playing = useTour((state) => state.playing)
  const voiceURI = useTour((state) => state.voiceURI)
  const rate = useTour((state) => state.rate)
  const muted = useWorkshop((state) => state.muted)
  const spoken = speechAvailable() && !muted

  useEffect(() => {
    useTour.getState().setSpoken(spoken)
  }, [spoken])

  useEffect(() => {
    if (!playing) return
    const chapter = TOUR[index]
    const store = useWorkshop.getState()
    const tour = useTour.getState()
    tour.setBetween(false)

    // Scene: the camera and, for a part, the build itself.
    if (chapter.kind === 'part') {
      store.tourInstall(chapter.part)
      if (!prefersReducedMotion()) {
        window.setTimeout(() => {
          if (useWorkshop.getState().touring) useWorkshop.getState().focusPart(chapter.part)
        }, 60)
      }
    } else if (chapter.kind === 'stage') {
      if (!prefersReducedMotion()) store.requestCamera(STAGE_CAMERA[chapter.stage])
    } else if (chapter.kind === 'welcome') {
      if (!prefersReducedMotion()) store.requestCamera('hero')
    }

    // Narration, then the next chapter after a breath.
    let cancelSpeech: (() => void) | null = null
    let timer = 0
    const advance = () => {
      if (!useTour.getState().playing || !useWorkshop.getState().touring) return
      useTour.getState().setBetween(true)
      timer = window.setTimeout(() => {
        const state = useTour.getState()
        if (!state.playing) return
        if (index + 1 >= TOUR.length) {
          state.setPlaying(false)
          state.setBetween(false)
          return
        }
        state.setIndex(index + 1)
      }, GAP_MS)
    }
    let watchdog = 0
    const captionsOnly = () => {
      cancelSpeech?.()
      cancelSpeech = null
      timer = window.setTimeout(advance, readingMs(chapter.text) / rate)
    }
    const startTimer = window.setTimeout(() => {
      if (spoken) {
        let started = false
        cancelSpeech = speak(chapter.text, {
          voiceURI,
          rate,
          onStart: () => {
            started = true
            window.clearTimeout(watchdog)
          },
          onEnd: () => {
            window.clearTimeout(watchdog)
            if (started) advance()
            else captionsOnly()
          },
        })
        // A browser with no voices never starts; the caption then paces the chapter instead.
        watchdog = window.setTimeout(() => {
          if (!started) captionsOnly()
        }, SPEECH_WATCHDOG_MS)
      } else {
        captionsOnly()
      }
    }, FOCUS_LEAD_MS)

    return () => {
      window.clearTimeout(startTimer)
      window.clearTimeout(timer)
      window.clearTimeout(watchdog)
      cancelSpeech?.()
    }
  }, [index, playing, spoken, voiceURI, rate])

  // Leaving the tour, however it happens, silences it.
  useEffect(
    () => () => {
      if (speechAvailable()) window.speechSynthesis.cancel()
    },
    [],
  )
}

/** The tour's controls (in the objective's place) and its caption over the car. */
export default function TourPlayer() {
  useTourEngine()
  const index = useTour((state) => state.index)
  const playing = useTour((state) => state.playing)
  const spoken = useTour((state) => state.spoken)
  const between = useTour((state) => state.between)
  const voiceURI = useTour((state) => state.voiceURI)
  const rate = useTour((state) => state.rate)
  const setIndex = useTour((state) => state.setIndex)
  const setPlaying = useTour((state) => state.setPlaying)
  const setVoice = useTour((state) => state.setVoice)
  const setRate = useTour((state) => state.setRate)
  const stopTour = useWorkshop((state) => state.stopTour)
  const installed = useWorkshop((state) => state.installed)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [chapters, setChapters] = useState(false)
  const playButton = useRef<HTMLButtonElement>(null)
  const id = useId()
  const chapter = TOUR[index]
  const finished = index === TOUR.length - 1 && !playing

  useEffect(() => watchVoices(setVoices), [])
  useEffect(() => {
    playButton.current?.focus()
  }, [])

  const go = (next: number) => {
    setIndex(next)
    setPlaying(true)
    setChapters(false)
  }

  return (
    <>
      <div className="tour-caption-slot" aria-live="polite" aria-atomic="true">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            className={`panel tour-caption ${between ? 'between' : ''}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: between ? 0.55 : 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.18 } }}
            transition={{ duration: 0.3 }}
          >
            <span className="label">
              {chapterStageName(chapter) || 'Guided tour'}
              {chapter.kind === 'part' ? ` · ${PART_BY_ID[chapter.part].code}` : ''}
              {!spoken ? ' · captions' : ''}
            </span>
            <p>{chapter.text}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <section
        className="panel objective tour"
        aria-label="Guided tour"
        id="objective"
        tabIndex={-1}
      >
        <div className="label">
          Guided tour · {index + 1} / {TOUR.length}
        </div>
        <div className="objective-title">{chapter.title}</div>
        <div className="tour-progress" aria-hidden="true">
          <span style={{ width: `${((index + 1) / TOUR.length) * 100}%` }} />
        </div>
        <div className="objective-actions tour-controls">
          <button
            type="button"
            className="hud-btn"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Previous chapter"
            aria-keyshortcuts="ArrowLeft"
          >
            ◀<kbd aria-hidden="true">←</kbd>
          </button>
          <button
            ref={playButton}
            type="button"
            className="hud-btn active"
            onClick={() => (finished ? go(0) : setPlaying(!playing))}
            aria-keyshortcuts="Space"
          >
            {finished ? 'Again' : playing ? 'Pause' : 'Play'}
            <kbd aria-hidden="true">SPACE</kbd>
          </button>
          <button
            type="button"
            className="hud-btn"
            onClick={() => go(index + 1)}
            disabled={index >= TOUR.length - 1}
            aria-label="Next chapter"
            aria-keyshortcuts="ArrowRight"
          >
            ▶<kbd aria-hidden="true">→</kbd>
          </button>
          <button
            type="button"
            className={`hud-btn ${chapters ? 'active' : ''}`}
            onClick={() => setChapters((open) => !open)}
            aria-expanded={chapters}
            aria-controls={`${id}-chapters`}
          >
            Chapters
          </button>
          <button type="button" className="hud-btn" onClick={stopTour} aria-keyshortcuts="Escape">
            End tour
            <kbd aria-hidden="true">ESC</kbd>
          </button>
        </div>
        <div className="tour-settings">
          <label className="label" htmlFor={`${id}-voice`}>
            Voice
          </label>
          <select
            id={`${id}-voice`}
            className="tour-select"
            value={voiceURI ?? ''}
            disabled={!spoken || voices.length === 0}
            onChange={(event) => setVoice(event.target.value || null)}
          >
            <option value="">
              {voices.length ? 'Browser default' : spoken ? 'Loading voices…' : 'Speech off'}
            </option>
            {voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name}
              </option>
            ))}
          </select>
          <span className="label">Pace</span>
          <div className="btn-group" role="group" aria-label="Pace">
            {RATES.map((value) => (
              <button
                key={value}
                type="button"
                className={`hud-btn tiny ${rate === value ? 'active' : ''}`}
                aria-pressed={rate === value}
                onClick={() => setRate(value)}
              >
                {value}×
              </button>
            ))}
          </div>
        </div>
        {chapters && (
          <div className="tour-chapters" id={`${id}-chapters`}>
            {STAGES.map((stage) => (
              <div key={stage.id} className="tour-chapter-stage">
                <span className="label">
                  {stage.code} · {stage.name}
                </span>
                <ul>
                  {TOUR.map((entry, i) =>
                    entry.kind === 'part' && entry.stage === stage.id ? (
                      <li key={entry.part}>
                        <button
                          type="button"
                          className={`tour-chapter ${i === index ? 'now' : ''} ${
                            installed.includes(entry.part) ? 'done' : ''
                          }`}
                          aria-current={i === index ? 'step' : undefined}
                          onClick={() => go(i)}
                        >
                          <span className="mark" aria-hidden="true" />
                          {entry.title}
                        </button>
                      </li>
                    ) : null,
                  )}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
