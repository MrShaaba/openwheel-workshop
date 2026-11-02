import { create } from 'zustand'
import { TOUR } from './script'

export interface TourState {
  /** Chapter on screen. */
  index: number
  playing: boolean
  /** Spoken aloud (false when speech is unavailable or sound is off). */
  spoken: boolean
  /** `voiceURI` of the chosen voice, or null for the browser's default English voice. */
  voiceURI: string | null
  rate: number
  /** The engine is between chapters, so the caption may be fading. */
  between: boolean
  setIndex: (index: number) => void
  setPlaying: (playing: boolean) => void
  setSpoken: (spoken: boolean) => void
  setVoice: (voiceURI: string | null) => void
  setRate: (rate: number) => void
  setBetween: (between: boolean) => void
}

export const RATES: readonly number[] = [0.85, 1, 1.2]

export const useTour = create<TourState>()((set) => ({
  index: 0,
  playing: true,
  spoken: true,
  voiceURI: null,
  rate: 1,
  between: false,
  setIndex: (index) => set({ index: Math.max(0, Math.min(TOUR.length - 1, index)) }),
  setPlaying: (playing) => set({ playing }),
  setSpoken: (spoken) => set({ spoken }),
  setVoice: (voiceURI) => set({ voiceURI }),
  setRate: (rate) => set({ rate }),
  setBetween: (between) => set({ between }),
}))
