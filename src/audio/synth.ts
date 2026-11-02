/**
 * Procedural sound for the workshop. Everything is synthesised with the Web Audio API on
 * demand; there are no audio files. The context is created lazily on the first user gesture.
 */
const MASTER_LEVEL = 0.6
const NOISE_SECONDS = 1.5

interface Ready {
  ctx: AudioContext
  out: AudioNode
  now: number
}

interface ServoVoice {
  osc: OscillatorNode
  lfo: OscillatorNode
  gain: GainNode
}

/** What the engine voice follows each frame. Every value is 0 to 1. */
export interface EngineParams {
  revs: number
  /** Throttle as applied: the note gets louder and brighter under load. */
  load: number
  /** Speed as a fraction of the maximum, for wind. */
  speed: number
  /** Tyre scrub past the grip limit. */
  slip: number
  /** Rumble on the run-off. */
  gravel: number
}

interface EngineVoice {
  oscillators: { osc: OscillatorNode; ratio: number }[]
  filter: BiquadFilterNode
  gain: GainNode
  whistle: OscillatorNode
  whistleGain: GainNode
  windGain: GainNode
  gravelGain: GainNode
  squeal: OscillatorNode
  squealGain: GainNode
  squealNoiseGain: GainNode
  sources: AudioScheduledSourceNode[]
}

/** Fundamental of the engine note at idle and at the red line, in hertz. */
const ENGINE_F0 = [58, 410] as const
/** Time constant for every engine parameter glide, so frame-rate updates never click. */
const ENGINE_GLIDE = 0.035

class Synth {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private muted = false
  private servoVoice: ServoVoice | null = null
  private engine: EngineVoice | null = null

  /** Create or resume the context. Call from a user gesture. */
  unlock(): void {
    const ctx = this.ensure()
    if (ctx && ctx.state === 'suspended') void ctx.resume()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(muted ? 0 : MASTER_LEVEL, this.context.currentTime, 0.02)
    }
  }

  /** Short UI confirmation. */
  blip(frequency = 1200): void {
    const r = this.ready()
    if (!r) return
    const osc = r.ctx.createOscillator()
    const gain = r.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(frequency, r.now)
    osc.frequency.exponentialRampToValueAtTime(frequency * 1.5, r.now + 0.05)
    gain.gain.setValueAtTime(0.0001, r.now)
    gain.gain.exponentialRampToValueAtTime(0.12, r.now + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, r.now + 0.09)
    osc.connect(gain).connect(r.out)
    osc.start(r.now)
    osc.stop(r.now + 0.1)
  }

  /** Servo whir while a part travels. Call `servoStop` when it arrives. */
  servoStart(): void {
    const r = this.ready()
    if (!r) return
    this.servoStop()
    const osc = r.ctx.createOscillator()
    const lfo = r.ctx.createOscillator()
    const lfoGain = r.ctx.createGain()
    const filter = r.ctx.createBiquadFilter()
    const gain = r.ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(150, r.now)
    osc.frequency.linearRampToValueAtTime(290, r.now + 0.95)
    lfo.type = 'sine'
    lfo.frequency.value = 17
    lfoGain.gain.value = 22
    lfo.connect(lfoGain).connect(osc.detune)
    filter.type = 'lowpass'
    filter.Q.value = 5
    filter.frequency.setValueAtTime(800, r.now)
    filter.frequency.linearRampToValueAtTime(2200, r.now + 0.95)
    gain.gain.setValueAtTime(0.0001, r.now)
    gain.gain.exponentialRampToValueAtTime(0.08, r.now + 0.08)
    osc.connect(filter).connect(gain).connect(r.out)
    osc.start(r.now)
    lfo.start(r.now)
    this.servoVoice = { osc, lfo, gain }
  }

  servoStop(): void {
    const voice = this.servoVoice
    if (!voice || !this.context) return
    const now = this.context.currentTime
    voice.gain.gain.cancelScheduledValues(now)
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now)
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)
    voice.osc.stop(now + 0.15)
    voice.lfo.stop(now + 0.15)
    this.servoVoice = null
  }

  /** Metallic lock-in: noise crack, low thump and a short ring. */
  clunk(): void {
    const r = this.ready()
    if (!r) return
    this.noiseBurst(r, 1100, 1.4, 0.5, 0.09)
    const thump = r.ctx.createOscillator()
    const thumpGain = r.ctx.createGain()
    thump.type = 'sine'
    thump.frequency.setValueAtTime(160, r.now)
    thump.frequency.exponentialRampToValueAtTime(52, r.now + 0.2)
    thumpGain.gain.setValueAtTime(0.4, r.now)
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, r.now + 0.26)
    thump.connect(thumpGain).connect(r.out)
    thump.start(r.now)
    thump.stop(r.now + 0.3)
    const ring = r.ctx.createOscillator()
    const ringGain = r.ctx.createGain()
    ring.type = 'triangle'
    ring.frequency.value = 1870
    ringGain.gain.setValueAtTime(0.07, r.now + 0.01)
    ringGain.gain.exponentialRampToValueAtTime(0.0001, r.now + 0.32)
    ring.connect(ringGain).connect(r.out)
    ring.start(r.now)
    ring.stop(r.now + 0.35)
  }

  /** Rising filtered-noise shimmer as the hologram turns solid. */
  materialize(): void {
    const r = this.ready()
    if (!r || !this.noiseBuffer) return
    const source = r.ctx.createBufferSource()
    const filter = r.ctx.createBiquadFilter()
    const gain = r.ctx.createGain()
    source.buffer = this.noiseBuffer
    filter.type = 'bandpass'
    filter.Q.value = 2.5
    filter.frequency.setValueAtTime(380, r.now)
    filter.frequency.exponentialRampToValueAtTime(5200, r.now + 0.85)
    gain.gain.setValueAtTime(0.0001, r.now)
    gain.gain.exponentialRampToValueAtTime(0.14, r.now + 0.12)
    gain.gain.exponentialRampToValueAtTime(0.0001, r.now + 0.9)
    source.connect(filter).connect(gain).connect(r.out)
    source.start(r.now)
    source.stop(r.now + 0.95)
    ;[880, 1320, 1760].forEach((frequency, i) => {
      const osc = r.ctx.createOscillator()
      const oscGain = r.ctx.createGain()
      const start = r.now + 0.08 + i * 0.07
      osc.type = 'sine'
      osc.frequency.value = frequency
      oscGain.gain.setValueAtTime(0.0001, start)
      oscGain.gain.exponentialRampToValueAtTime(0.045, start + 0.02)
      oscGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35)
      osc.connect(oscGain).connect(r.out)
      osc.start(start)
      osc.stop(start + 0.4)
    })
  }

  /** Two falling tones for a rejected action. */
  denied(): void {
    const r = this.ready()
    if (!r) return
    const filter = r.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 1400
    filter.connect(r.out)
    ;[
      [330, 0, 0.11],
      [220, 0.12, 0.17],
    ].forEach(([frequency, offset, length]) => {
      const osc = r.ctx.createOscillator()
      const gain = r.ctx.createGain()
      const start = r.now + offset
      osc.type = 'square'
      osc.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.09, start + 0.01)
      gain.gain.setValueAtTime(0.09, start + length - 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
      osc.connect(gain).connect(filter)
      osc.start(start)
      osc.stop(start + length + 0.02)
    })
  }

  /** Soft release when a part is detached. */
  detach(): void {
    const r = this.ready()
    if (!r) return
    this.noiseBurst(r, 700, 1.0, 0.25, 0.14)
    const osc = r.ctx.createOscillator()
    const gain = r.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(520, r.now)
    osc.frequency.exponentialRampToValueAtTime(180, r.now + 0.3)
    gain.gain.setValueAtTime(0.1, r.now)
    gain.gain.exponentialRampToValueAtTime(0.0001, r.now + 0.32)
    osc.connect(gain).connect(r.out)
    osc.start(r.now)
    osc.stop(r.now + 0.35)
  }

  /** Engine fire-up and rev for the completion moment. */
  engineRev(): void {
    const r = this.ready()
    if (!r) return
    const shaper = r.ctx.createWaveShaper()
    shaper.curve = softClipCurve()
    const filter = r.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(600, r.now)
    filter.frequency.exponentialRampToValueAtTime(3200, r.now + 2.4)
    filter.frequency.exponentialRampToValueAtTime(900, r.now + 3.8)
    const gain = r.ctx.createGain()
    gain.gain.setValueAtTime(0.0001, r.now)
    gain.gain.exponentialRampToValueAtTime(0.16, r.now + 0.3)
    gain.gain.setValueAtTime(0.16, r.now + 3.2)
    gain.gain.exponentialRampToValueAtTime(0.0001, r.now + 4.2)
    shaper.connect(filter).connect(gain).connect(r.out)
    ;[1, 0.5, 1.012, 2.01].forEach((ratio, i) => {
      const osc = r.ctx.createOscillator()
      osc.type = i === 3 ? 'square' : 'sawtooth'
      const base = 44 * ratio
      osc.frequency.setValueAtTime(base, r.now)
      osc.frequency.exponentialRampToValueAtTime(base * 9.5, r.now + 2.4)
      osc.frequency.exponentialRampToValueAtTime(base * 2.6, r.now + 4.0)
      const oscGain = r.ctx.createGain()
      oscGain.gain.value = i === 3 ? 0.25 : 0.6
      osc.connect(oscGain).connect(shaper)
      osc.start(r.now)
      osc.stop(r.now + 4.3)
    })
    if (this.noiseBuffer) {
      const hiss = r.ctx.createBufferSource()
      hiss.buffer = this.noiseBuffer
      hiss.loop = true
      const hissFilter = r.ctx.createBiquadFilter()
      hissFilter.type = 'highpass'
      hissFilter.frequency.value = 2500
      const hissGain = r.ctx.createGain()
      hissGain.gain.setValueAtTime(0.0001, r.now)
      hissGain.gain.exponentialRampToValueAtTime(0.03, r.now + 1.5)
      hissGain.gain.exponentialRampToValueAtTime(0.0001, r.now + 4.0)
      hiss.connect(hissFilter).connect(hissGain).connect(r.out)
      hiss.start(r.now)
      hiss.stop(r.now + 4.2)
    }
  }

  /**
   * Continuous engine note for the test drive. Called every frame; creates the voice the first time
   * audio is available and glides every parameter towards the new values.
   */
  engineUpdate(params: EngineParams): void {
    const r = this.ready()
    if (!r) return
    const voice = this.engine ?? this.createEngine(r)
    const { now } = r
    const revs = Math.min(1, Math.max(0, params.revs))
    const f0 = ENGINE_F0[0] + (ENGINE_F0[1] - ENGINE_F0[0]) * Math.pow(revs, 0.9)
    for (const { osc, ratio } of voice.oscillators) {
      osc.frequency.setTargetAtTime(f0 * ratio, now, ENGINE_GLIDE)
    }
    voice.filter.frequency.setTargetAtTime(380 + 2400 * revs + 900 * params.load, now, ENGINE_GLIDE)
    voice.gain.gain.setTargetAtTime(0.05 + 0.07 * params.load + 0.03 * revs, now, 0.06)
    voice.whistle.frequency.setTargetAtTime(1600 + 2800 * revs * params.load, now, ENGINE_GLIDE)
    voice.whistleGain.gain.setTargetAtTime(0.012 * params.load * revs, now, 0.08)
    voice.windGain.gain.setTargetAtTime(0.07 * params.speed * params.speed, now, 0.1)
    voice.gravelGain.gain.setTargetAtTime(0.14 * params.gravel, now, 0.08)
    const squeal = params.speed > 0.08 ? params.slip : 0
    voice.squeal.frequency.setTargetAtTime(1250 + 350 * squeal, now, ENGINE_GLIDE)
    voice.squealGain.gain.setTargetAtTime(0.03 * squeal, now, 0.05)
    voice.squealNoiseGain.gain.setTargetAtTime(0.05 * squeal, now, 0.05)
  }

  /** Fade the engine out and release its nodes. */
  engineStop(): void {
    const voice = this.engine
    if (!voice || !this.context) return
    const now = this.context.currentTime
    for (const gain of [
      voice.gain,
      voice.whistleGain,
      voice.windGain,
      voice.gravelGain,
      voice.squealGain,
      voice.squealNoiseGain,
    ]) {
      gain.gain.cancelScheduledValues(now)
      gain.gain.setTargetAtTime(0, now, 0.12)
    }
    voice.sources.forEach((source) => source.stop(now + 0.6))
    this.engine = null
  }

  /** A wheel gun: a ratchety buzz for the pit-stop game. */
  wheelGun(): void {
    const r = this.ready()
    if (!r) return
    const osc = r.ctx.createOscillator()
    const am = r.ctx.createOscillator()
    const amGain = r.ctx.createGain()
    const gain = r.ctx.createGain()
    const filter = r.ctx.createBiquadFilter()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(95, r.now)
    osc.frequency.exponentialRampToValueAtTime(140, r.now + 0.16)
    am.type = 'square'
    am.frequency.value = 38
    amGain.gain.value = 0.5
    am.connect(amGain).connect(gain.gain)
    filter.type = 'bandpass'
    filter.frequency.value = 1400
    filter.Q.value = 1.2
    gain.gain.setValueAtTime(0.5, r.now)
    gain.gain.exponentialRampToValueAtTime(0.0001, r.now + 0.2)
    osc.connect(filter).connect(gain).connect(r.out)
    osc.start(r.now)
    am.start(r.now)
    osc.stop(r.now + 0.22)
    am.stop(r.now + 0.22)
    this.noiseBurst(r, 3000, 1.2, 0.12, 0.12)
  }

  /** Four rising notes and a held chord, for a badge or a perfect round. */
  fanfare(): void {
    const r = this.ready()
    if (!r) return
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((frequency, index) => {
      const at = r.now + index * 0.11
      const osc = r.ctx.createOscillator()
      const gain = r.ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = frequency
      const hold = index === notes.length - 1 ? 0.7 : 0.14
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.16, at + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + hold)
      osc.connect(gain).connect(r.out)
      osc.start(at)
      osc.stop(at + hold + 0.02)
    })
    // The chord under the last note.
    const at = r.now + (notes.length - 1) * 0.11
    for (const frequency of [523.25, 783.99]) {
      const osc = r.ctx.createOscillator()
      const gain = r.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.09, at + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.8)
      osc.connect(gain).connect(r.out)
      osc.start(at)
      osc.stop(at + 0.82)
    }
  }

  /** The floor scraping over a kerb: a short, bright grind. Call at most a few times a second. */
  scrape(level = 1): void {
    const r = this.ready()
    if (!r) return
    this.noiseBurst(r, 2400, 0.9, 0.16 * level, 0.14)
    this.noiseBurst(r, 700, 1.5, 0.1 * level, 0.1)
  }

  /** Dull thud for the arena wall. */
  impact(): void {
    const r = this.ready()
    if (!r) return
    this.noiseBurst(r, 240, 0.8, 0.5, 0.18)
    const thump = r.ctx.createOscillator()
    const thumpGain = r.ctx.createGain()
    thump.type = 'sine'
    thump.frequency.setValueAtTime(110, r.now)
    thump.frequency.exponentialRampToValueAtTime(38, r.now + 0.25)
    thumpGain.gain.setValueAtTime(0.5, r.now)
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, r.now + 0.3)
    thump.connect(thumpGain).connect(r.out)
    thump.start(r.now)
    thump.stop(r.now + 0.32)
  }

  private createEngine(r: Ready): EngineVoice {
    const { ctx, out, now } = r
    const sources: AudioScheduledSourceNode[] = []

    // Engine: a stack of oscillators into a soft clip and a low-pass that opens with the revs.
    const shaper = ctx.createWaveShaper()
    shaper.curve = softClipCurve()
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.Q.value = 1.4
    filter.frequency.value = 500
    const gain = ctx.createGain()
    gain.gain.value = 0
    shaper.connect(filter).connect(gain).connect(out)
    const oscillators = [
      { ratio: 1, level: 0.55, type: 'sawtooth' as const },
      { ratio: 0.5, level: 0.35, type: 'sawtooth' as const },
      { ratio: 1.008, level: 0.3, type: 'sawtooth' as const },
      { ratio: 2, level: 0.12, type: 'square' as const },
    ].map(({ ratio, level, type }) => {
      const osc = ctx.createOscillator()
      osc.type = type
      osc.frequency.value = ENGINE_F0[0] * ratio
      const oscGain = ctx.createGain()
      oscGain.gain.value = level
      osc.connect(oscGain).connect(shaper)
      osc.start(now)
      sources.push(osc)
      return { osc, ratio }
    })

    // Turbo whistle.
    const whistle = ctx.createOscillator()
    whistle.type = 'sine'
    whistle.frequency.value = 1600
    const whistleGain = ctx.createGain()
    whistleGain.gain.value = 0
    whistle.connect(whistleGain).connect(out)
    whistle.start(now)
    sources.push(whistle)

    // Wind and run-off rumble are both shaped from the shared noise loop.
    const noise = (filterType: BiquadFilterType, frequency: number, q: number) => {
      const source = ctx.createBufferSource()
      source.buffer = this.noiseBuffer
      source.loop = true
      const noiseFilter = ctx.createBiquadFilter()
      noiseFilter.type = filterType
      noiseFilter.frequency.value = frequency
      noiseFilter.Q.value = q
      const noiseGain = ctx.createGain()
      noiseGain.gain.value = 0
      source.connect(noiseFilter).connect(noiseGain).connect(out)
      source.start(now)
      sources.push(source)
      return noiseGain
    }
    const windGain = noise('bandpass', 900, 0.6)
    const gravelGain = noise('lowpass', 160, 0.9)
    const squealNoiseGain = noise('bandpass', 1500, 14)

    // Tyre scrub: a wavering tone under the narrow noise band above.
    const squeal = ctx.createOscillator()
    squeal.type = 'sine'
    squeal.frequency.value = 1250
    const vibrato = ctx.createOscillator()
    vibrato.frequency.value = 11
    const vibratoGain = ctx.createGain()
    vibratoGain.gain.value = 40
    vibrato.connect(vibratoGain).connect(squeal.detune)
    const squealGain = ctx.createGain()
    squealGain.gain.value = 0
    squeal.connect(squealGain).connect(out)
    squeal.start(now)
    vibrato.start(now)
    sources.push(squeal, vibrato)

    const voice: EngineVoice = {
      oscillators,
      filter,
      gain,
      whistle,
      whistleGain,
      windGain,
      gravelGain,
      squeal,
      squealGain,
      squealNoiseGain,
      sources,
    }
    this.engine = voice
    return voice
  }

  private noiseBurst(r: Ready, frequency: number, q: number, level: number, length: number) {
    if (!this.noiseBuffer) return
    const source = r.ctx.createBufferSource()
    const filter = r.ctx.createBiquadFilter()
    const gain = r.ctx.createGain()
    source.buffer = this.noiseBuffer
    filter.type = 'bandpass'
    filter.frequency.value = frequency
    filter.Q.value = q
    gain.gain.setValueAtTime(level, r.now)
    gain.gain.exponentialRampToValueAtTime(0.0001, r.now + length)
    source.connect(filter).connect(gain).connect(r.out)
    source.start(r.now)
    source.stop(r.now + length + 0.02)
  }

  private ensure(): AudioContext | null {
    if (this.context) return this.context
    if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return null
    const ctx = new AudioContext()
    const master = ctx.createGain()
    master.gain.value = this.muted ? 0 : MASTER_LEVEL
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -16
    compressor.ratio.value = 4
    compressor.attack.value = 0.003
    compressor.release.value = 0.2
    master.connect(compressor).connect(ctx.destination)
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * NOISE_SECONDS), ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    this.context = ctx
    this.master = master
    this.noiseBuffer = buffer
    return ctx
  }

  private ready(): Ready | null {
    const ctx = this.context
    if (!ctx || !this.master || ctx.state !== 'running' || this.muted) return null
    return { ctx, out: this.master, now: ctx.currentTime }
  }
}

function softClipCurve(samples = 1024): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(samples * 4))
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * 2 - 1
    curve[i] = Math.tanh(x * 2.2)
  }
  return curve
}

export const synth = new Synth()
