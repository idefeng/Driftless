import { registerWebModule, NativeModule } from 'expo';

import { CadenceAudioModuleEvents, CadenceSoundId } from './CadenceAudio.types';

/**
 * WebAudio implementation of the cadence engine, mirroring the native one.
 *
 * Uses the look-ahead pattern (Chris Wilson's "A Tale of Two Clocks"): a coarse
 * JS timer wakes every LOOKAHEAD_MS and schedules every beat whose *absolute*
 * AudioContext time falls inside the SCHEDULE_AHEAD window. Beat times are
 * derived from a sample-accurate `nextBeatTime` accumulator re-read against the
 * live BPM each beat, so there is no accumulating-timer drift.
 */

const SCHEDULE_AHEAD = 0.12; // seconds of audio scheduled in advance
const LOOKAHEAD_MS = 25; // how often the JS timer refills the window

type ClickGrain = { freq: number; decay: number; dur: number; noise: number };

const GRAINS: Record<CadenceSoundId, ClickGrain> = {
  beep: { freq: 1900, decay: 0.012, dur: 0.035, noise: 0 },
  woodfish: { freq: 720, decay: 0.018, dur: 0.055, noise: 0.06 },
  click: { freq: 3000, decay: 0.004, dur: 0.014, noise: 0.15 },
};

class CadenceAudioModule extends NativeModule<CadenceAudioModuleEvents> {
  private ctx: AudioContext | null = null;
  private buffers: Partial<Record<CadenceSoundId, AudioBuffer>> = {};
  private sound: CadenceSoundId = 'woodfish';
  private bpm = 180;
  private volume = 0.72;
  private running = false;
  private nextBeatTime = 0;
  private beatIndex = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  get isRunning(): boolean {
    return this.running;
  }

  private ensureContext() {
    if (this.ctx) return;
    const Ctx =
      (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    (Object.keys(GRAINS) as CadenceSoundId[]).forEach((id) => {
      this.buffers[id] = this.synth(GRAINS[id]);
    });
  }

  private synth(g: ClickGrain): AudioBuffer {
    const ctx = this.ctx!;
    const sr = ctx.sampleRate;
    const len = Math.max(1, Math.floor(g.dur * sr));
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    const fadeOut = Math.floor(0.002 * sr); // 2ms tail fade → ends exactly at 0
    let peak = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t / g.decay);
      const tone = Math.sin(2 * Math.PI * g.freq * t);
      const noise = g.noise ? (Math.random() * 2 - 1) * g.noise : 0;
      let s = (tone + noise) * env;
      if (i < 32) s *= i / 32; // ~sub-ms attack from 0 (zero-silence edge)
      if (i > len - fadeOut) s *= (len - i) / fadeOut;
      data[i] = s;
      peak = Math.max(peak, Math.abs(s));
    }
    if (peak > 0) {
      const norm = 0.9 / peak;
      for (let i = 0; i < len; i++) data[i] *= norm;
    }
    return buf;
  }

  private intervalSec(): number {
    return 60 / this.bpm;
  }

  private scheduleClick(at: number) {
    const ctx = this.ctx!;
    const buf = this.buffers[this.sound];
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = this.volume;
    src.connect(gain).connect(ctx.destination);
    src.start(at);
    const idx = this.beatIndex;
    const delayMs = Math.max(0, (at - ctx.currentTime) * 1000);
    setTimeout(() => this.emit('onBeat', { beatIndex: idx }), delayMs);
  }

  private tick = () => {
    if (!this.ctx || !this.running) return;
    const horizon = this.ctx.currentTime + SCHEDULE_AHEAD;
    while (this.nextBeatTime < horizon) {
      this.scheduleClick(this.nextBeatTime);
      this.beatIndex += 1;
      this.nextBeatTime += this.intervalSec(); // re-read BPM ⇒ instant re-rate
    }
  };

  prepare(_mixWithOthers: boolean): void {
    this.ensureContext();
  }

  start(bpm: number): void {
    this.bpm = clampBpm(bpm);
    this.ensureContext();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.running) return;
    this.running = true;
    this.beatIndex = 0;
    this.nextBeatTime = this.ctx.currentTime + 0.05;
    this.tick();
    this.timer = setInterval(this.tick, LOOKAHEAD_MS);
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  setBpm(bpm: number): void {
    this.bpm = clampBpm(bpm);
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  setSound(sound: CadenceSoundId): void {
    this.sound = sound;
  }

  setMixWithOthers(_mix: boolean): void {
    // Browser tabs always mix; nothing to do.
  }

  setDucking(_ducking: boolean): void {
    // The browser has no cross-tab ducking API; nothing to do.
  }
}

function clampBpm(b: number) {
  return Math.max(100, Math.min(250, Math.round(b)));
}

export default registerWebModule(CadenceAudioModule, 'CadenceAudioModule');
