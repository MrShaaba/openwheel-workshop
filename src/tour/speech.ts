/**
 * A thin wrapper over the Web Speech API's synthesis side, so the tour can speak without audio
 * files. Browsers load their voice list late and in their own time, so callers subscribe.
 */

export function speechAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window
  )
}

/** English voices, with the browser's default first. */
export function englishVoices(): SpeechSynthesisVoice[] {
  if (!speechAvailable()) return []
  return window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.toLowerCase().startsWith('en'))
    .sort((a, b) => Number(b.default) - Number(a.default) || a.name.localeCompare(b.name))
}

/** Calls back with the voices now and whenever the list changes. */
export function watchVoices(callback: (voices: SpeechSynthesisVoice[]) => void): () => void {
  if (!speechAvailable()) {
    callback([])
    return () => undefined
  }
  const update = () => callback(englishVoices())
  update()
  window.speechSynthesis.addEventListener('voiceschanged', update)
  return () => window.speechSynthesis.removeEventListener('voiceschanged', update)
}

export interface SpeakOptions {
  voiceURI: string | null
  rate: number
  onStart: () => void
  onEnd: () => void
}

/** Speak one chapter. Anything still speaking is cut off first. Returns a function that cancels it. */
export function speak(text: string, options: SpeakOptions): () => void {
  const synthesis = window.speechSynthesis
  synthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = englishVoices().find((candidate) => candidate.voiceURI === options.voiceURI)
  if (voice) utterance.voice = voice
  utterance.lang = voice?.lang ?? 'en-GB'
  utterance.rate = options.rate
  let live = true
  utterance.onstart = () => {
    if (live) options.onStart()
  }
  const finish = () => {
    if (!live) return
    live = false
    options.onEnd()
  }
  utterance.onend = finish
  utterance.onerror = finish
  synthesis.speak(utterance)
  return () => {
    live = false
    synthesis.cancel()
  }
}
