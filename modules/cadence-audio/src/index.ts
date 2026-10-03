// Only `.remove()` is used by callers; avoids a direct expo-modules-core dependency (expo-doctor).
export type EventSubscription = { remove(): void };

import Native from './CadenceAudioModule';
import type { BeatEvent, CadenceSoundId, InterruptedEvent } from './CadenceAudio.types';

export * from './CadenceAudio.types';

/**
 * High-level facade over the native (iOS/Android) or WebAudio cadence engine.
 * Safe to import everywhere: when no native module is linked (e.g. Expo Go),
 * `isAvailable()` returns false and callers fall back to the JS-only scheduler.
 */
export const CadenceAudio = {
  isAvailable(): boolean {
    return Native != null;
  },
  prepare(mixWithOthers = true): void {
    Native?.prepare(mixWithOthers);
  },
  start(bpm: number): void {
    Native?.start(bpm);
  },
  stop(): void {
    Native?.stop();
  },
  setBpm(bpm: number): void {
    Native?.setBpm(bpm);
  },
  rampTo(bpm: number, durationMs: number): void {
    Native?.rampTo(bpm, durationMs);
  },
  setAccent(every: number): void {
    Native?.setAccent(every);
  },
  cue(): void {
    Native?.cue();
  },
  setVolume(volume: number): void {
    Native?.setVolume(volume);
  },
  setSound(sound: CadenceSoundId): void {
    Native?.setSound(sound);
  },
  setMixWithOthers(mixWithOthers: boolean): void {
    Native?.setMixWithOthers(mixWithOthers);
  },
  setDucking(ducking: boolean): void {
    Native?.setDucking(ducking);
  },
  addBeatListener(listener: (event: BeatEvent) => void): EventSubscription | null {
    return Native ? Native.addListener('onBeat', listener) : null;
  },
  addInterruptedListener(listener: (event: InterruptedEvent) => void): EventSubscription | null {
    return Native ? Native.addListener('onInterrupted', listener) : null;
  },
};

export default CadenceAudio;
