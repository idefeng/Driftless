import type { EventSubscription } from 'expo-modules-core';

import Native from './CadenceAudioModule';
import type { BeatEvent, CadenceSoundId } from './CadenceAudio.types';

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
};

export default CadenceAudio;
