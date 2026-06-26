import { registerWebModule, NativeModule } from 'expo';

import { CadenceLiveModuleEvents, LiveSessionState } from './CadenceLive.types';

// Web has no lock-screen surface — a no-op that reports unsupported.
class CadenceLiveModule extends NativeModule<CadenceLiveModuleEvents> {
  isSupported(): boolean {
    return false;
  }
  start(_state: LiveSessionState): void {}
  update(_state: LiveSessionState): void {}
  stop(): void {}
}

export default registerWebModule(CadenceLiveModule, 'CadenceLiveModule');
