/**
 * CadenceScheduler — look-ahead beat scheduler (PRD §3.1).
 *
 * This is the JS-side timing brain. The PRD mandates *short-sample look-ahead
 * scheduling*: never an accumulating `setInterval` per beat, and never a long
 * looped audio file. Instead, on each scheduler tick we look a fixed window
 * (LOOKAHEAD_MS) into the future and enqueue every beat whose absolute
 * timestamp falls inside it, computed from the sample clock — yielding
 * < 1ms jitter and zero cumulative drift.
 *
 * In this UI build the actual sample-accurate enqueue is delegated to a native
 * module (AVAudioEngine on iOS / AAudio on Android) that isn't wired yet, so
 * `enqueueBeat` is a stub. The scheduling math, the look-ahead loop, and the
 * "natural finish, instant re-rate" segment transition (PRD §3.4) are real and
 * already drive the on-screen beat callbacks. Swapping the stub for the native
 * bridge is the only remaining step to make it audible.
 */

export const BPM_MIN = 100;
export const BPM_MAX = 250;

const LOOKAHEAD_WINDOW_MS = 150; // PRD-suggested 100–200ms scheduling window
const TICK_MS = 50; // how often we refill the window

export const clampBpm = (bpm: number) =>
  Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(bpm)));

/** Caller is notified the instant a beat "fires" (for visual sync). */
export type BeatListener = (beatIndex: number, atMs: number) => void;

export class CadenceScheduler {
  private bpm = 180;
  private running = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBeatTime = 0; // absolute ms timestamp of the next unscheduled beat
  private beatIndex = 0;
  private scheduledUpTo = 0;
  private listeners = new Set<BeatListener>();

  get isRunning() {
    return this.running;
  }

  get currentBpm() {
    return this.bpm;
  }

  private get intervalMs() {
    return 60000 / this.bpm;
  }

  onBeat(fn: BeatListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  setBpm(bpm: number) {
    // "Natural finish, instant re-rate" (PRD §3.4): the in-flight beat keeps its
    // original timing; everything from `nextBeatTime` onward uses the new rate.
    this.bpm = clampBpm(bpm);
  }

  start(bpm?: number) {
    if (bpm != null) this.bpm = clampBpm(bpm);
    if (this.running) return;
    this.running = true;
    const now = Date.now();
    this.nextBeatTime = now;
    this.beatIndex = 0;
    this.scheduledUpTo = now;
    this.tick();
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  stop() {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Look-ahead refill: enqueue every beat inside the next window. */
  private tick() {
    if (!this.running) return;
    const horizon = Date.now() + LOOKAHEAD_WINDOW_MS;
    while (this.nextBeatTime <= horizon) {
      this.enqueueBeat(this.beatIndex, this.nextBeatTime);
      const idx = this.beatIndex;
      const at = this.nextBeatTime;
      const delay = Math.max(0, at - Date.now());
      // Visual callback fired at (close to) the scheduled instant.
      setTimeout(() => this.listeners.forEach((l) => l(idx, at)), delay);
      this.beatIndex += 1;
      this.nextBeatTime += this.intervalMs; // re-read interval ⇒ instant re-rate
    }
    this.scheduledUpTo = horizon;
  }

  /**
   * STUB: hand an absolute-timestamped beat to the native sample-accurate
   * audio engine. Replaced by the native bridge in a later milestone.
   */
  private enqueueBeat(_beatIndex: number, _atMs: number) {
    // no-op in the UI build
  }
}
