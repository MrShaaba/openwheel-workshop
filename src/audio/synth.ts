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

class Synth {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private muted = false
  private servoVoice: ServoVoice | null = null

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
