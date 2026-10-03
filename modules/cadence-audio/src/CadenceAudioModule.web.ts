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
 *
 * Accent / cue / ramp mirror the native engines: accent beats use a pitched-up
 * grain, cues are layered onto an already-scheduled beat time, and ramps
 * re-derive each beat's interval from progress on the AudioContext clock.
 */

// 后台标签页 setInterval 会被节流到 ≥1s，前瞻窗口必须大于该值否则必然欠载断拍；
// 窗口大小只影响 setBpm 生效延迟（最迟一个窗口内生效），不影响节拍精度。
const SCHEDULE_AHEAD = 1.2; // seconds of audio scheduled in advance
const LOOKAHEAD_MS = 25; // how often the JS timer refills the window

type ClickGrain = { freq: number; decay: number; dur: number; noise: number };

const GRAINS: Record<CadenceSoundId, ClickGrain> = {
  beep: { freq: 1900, decay: 0.012, dur: 0.035, noise: 0 },
  woodfish: { freq: 720, decay: 0.018, dur: 0.055, noise: 0.06 },
  click: { freq: 3000, decay: 0.004, dur: 0.014, noise: 0.15 },
  bubble: { freq: 480, decay: 0.025, dur: 0.075, noise: 0.22 },
  droplet: { freq: 2600, decay: 0.02, dur: 0.05, noise: 0.03 },
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
  private accentBuffers: Partial<Record<CadenceSoundId, AudioBuffer>> = {};
  private cueBuffer: AudioBuffer | null = null;
  private accentEvery = 0;
  // Beat times already handed to WebAudio (look-ahead window), oldest first.
  private scheduledBeats: number[] = [];
  private ramp: { from: number; to: number; startTime: number; duration: number } | null = null;

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
      // Accent: same grain a fifth higher — clearly distinct, equally loud.
      this.accentBuffers[id] = this.synth({ ...GRAINS[id], freq: GRAINS[id].freq * 1.5 });
    });
    this.cueBuffer = this.synthCue();
  }

  /** Rising two-note chirp (B5 → E6) marking an upcoming phase change. */
  private synthCue(): AudioBuffer {
    const ctx = this.ctx!;
    const sr = ctx.sampleRate;
    const len = Math.floor(0.17 * sr);
    const split = Math.floor(0.075 * sr);
    const fadeOut = Math.max(1, Math.floor(0.002 * sr));
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < len; i++) {
      const first = i < split;
      const local = first ? i : i - split;
      const t = local / sr;
      let s = Math.sin(2 * Math.PI * (first ? 988 : 1319) * t) * Math.exp(-t / (first ? 0.03 : 0.045));
      if (local < 32) s *= local / 32; // zero-edge attack on both notes
      if (first && i > split - fadeOut) s *= (split - i) / fadeOut;
      if (i > len - fadeOut) s *= (len - i) / fadeOut;
      data[i] = s;
      peak = Math.max(peak, Math.abs(s));
    }
    if (peak > 0) {
      const norm = 0.6 / peak;
      for (let i = 0; i < len; i++) data[i] *= norm;
    }
    return buf;
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

  private intervalSec(at: number): number {
    const r = this.ramp;
    if (!r) return 60 / this.bpm;
    const p = Math.min(1, Math.max(0, (at - r.startTime) / r.duration));
    if (p >= 1) this.ramp = null;
    return 60 / (r.from + (r.to - r.from) * p);
  }

  private scheduleClick(at: number, buf: AudioBuffer | null | undefined) {
    const ctx = this.ctx!;
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = this.volume;
    src.connect(gain).connect(ctx.destination);
    src.start(at);
  }

  private tick = () => {
    if (!this.ctx || !this.running) return;
    const horizon = this.ctx.currentTime + SCHEDULE_AHEAD;
    const now = this.ctx.currentTime;
    while (this.scheduledBeats.length && this.scheduledBeats[0] < now) this.scheduledBeats.shift();
    while (this.nextBeatTime < horizon) {
      const accented = this.accentEvery > 0 && this.beatIndex % this.accentEvery === 0;
      this.scheduleClick(this.nextBeatTime, (accented ? this.accentBuffers : this.buffers)[this.sound]);
      this.scheduledBeats.push(this.nextBeatTime);
      this.beatIndex += 1;
      this.nextBeatTime += this.intervalSec(this.nextBeatTime); // re-read BPM ⇒ instant re-rate
    }
  };

  prepare(_mixWithOthers: boolean): void {
    this.ensureContext();
  }

  async start(bpm: number): Promise<void> {
    this.bpm = clampBpm(bpm);
    this.ensureContext();
    if (!this.ctx) return;
    // 先等 AudioContext 真正恢复，再取 currentTime —— suspended 状态下
    // currentTime 冻结为 0，提前调度会把前几拍排到过去被静默丢弃。
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    if (this.running) return;
    this.running = true;
    this.ramp = null;
    this.scheduledBeats = [];
    this.beatIndex = 0;
    this.nextBeatTime = this.ctx.currentTime + 0.05;
    this.tick();
    this.timer = setInterval(this.tick, LOOKAHEAD_MS);
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    // 暂停时钟以释放资源；下次 start 时再 resume。
    if (this.ctx?.state === 'running') void this.ctx.suspend();
  }

  setBpm(bpm: number): void {
    this.ramp = null; // an explicit rate always wins over an in-flight ramp
    this.bpm = clampBpm(bpm);
  }

  rampTo(bpm: number, durationMs: number): void {
    const target = clampBpm(bpm);
    this.ramp =
      this.running && this.ctx && durationMs > 0 && target !== this.bpm
        ? { from: this.bpm, to: target, startTime: this.ctx.currentTime, duration: durationMs / 1000 }
        : null;
    this.bpm = target;
  }

  setAccent(every: number): void {
    this.accentEvery = Math.max(0, Math.round(every));
  }

  cue(): void {
    if (!this.ctx || !this.running) return;
    // Land on the first already-scheduled beat that is still safely ahead,
    // so the cue is always on-grid (same contract as native).
    const soon = this.ctx.currentTime + 0.02;
    const at = this.scheduledBeats.find((t) => t >= soon) ?? this.nextBeatTime;
    this.scheduleClick(at, this.cueBuffer);
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

export default registerWebModule(CadenceAudioModule, 'CadenceAudio');
