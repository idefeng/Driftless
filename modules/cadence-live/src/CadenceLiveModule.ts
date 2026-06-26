import { NativeModule, requireNativeModule } from 'expo';

import { CadenceLiveModuleEvents, LiveSessionState } from './CadenceLive.types';

export declare class CadenceLiveModule extends NativeModule<CadenceLiveModuleEvents> {
  /** iOS: Live Activities enabled by the user. Android: notifications permitted. */
  isSupported(): boolean;
  /** Begin the live presentation (Live Activity / foreground notification). */
  start(state: LiveSessionState): void;
  /** Push new content (bpm / phase / countdown). */
  update(state: LiveSessionState): void;
  /** End the presentation. */
  stop(): void;
}

// Null when the native module isn't linked (Expo Go) so callers can no-op.
let nativeModule: CadenceLiveModule | null = null;
try {
  nativeModule = requireNativeModule<CadenceLiveModule>('CadenceLive');
} catch {
  nativeModule = null;
}

export default nativeModule;
