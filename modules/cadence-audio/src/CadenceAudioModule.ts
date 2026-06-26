import { NativeModule, requireNativeModule } from 'expo';

import { CadenceAudioModuleEvents, CadenceSoundId } from './CadenceAudio.types';

export declare class CadenceAudioModule extends NativeModule<CadenceAudioModuleEvents> {
  /** Configure the audio session/engine. `mixWithOthers` = coexist (PRD §3.2). */
  prepare(mixWithOthers: boolean): void;
  /** Begin scheduling beats at the given BPM. */
  start(bpm: number): void;
  /** Stop scheduling; keeps the engine prepared. */
  stop(): void;
  /** Re-rate. Applies at the next beat boundary ("natural finish, instant re-rate"). */
  setBpm(bpm: number): void;
  /** Beat gain, 0..1, independent of system media volume. */
  setVolume(volume: number): void;
  /** Pick the active click timbre. */
  setSound(sound: CadenceSoundId): void;
  /** Toggle coexist (mix) vs. exclusive at runtime. */
  setMixWithOthers(mixWithOthers: boolean): void;
  /** Lower other apps' audio while beats play (PRD §3.2 Ducking). */
  setDucking(ducking: boolean): void;
  readonly isRunning: boolean;
}

// `requireNativeModule` throws when the native module isn't linked (e.g. Expo Go).
// Resolve to null in that case so the JS fallback can take over.
let nativeModule: CadenceAudioModule | null = null;
try {
  nativeModule = requireNativeModule<CadenceAudioModule>('CadenceAudio');
} catch {
  nativeModule = null;
}

export default nativeModule;
