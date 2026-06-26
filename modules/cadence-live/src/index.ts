import type { EventSubscription } from 'expo-modules-core';

import Native from './CadenceLiveModule';
import type { LiveAction, LiveSessionState } from './CadenceLive.types';

export * from './CadenceLive.types';

/**
 * Facade over the live-session presentation: an iOS Live Activity (lock screen +
 * Dynamic Island) or an Android foreground-service notification. The ±1 / skip
 * controls on those surfaces come back through `addActionListener`.
 */
export const CadenceLive = {
  isSupported(): boolean {
    try {
      return Native?.isSupported() ?? false;
    } catch {
      return false;
    }
  },
  start(state: LiveSessionState): void {
    Native?.start(state);
  },
  update(state: LiveSessionState): void {
    Native?.update(state);
  },
  stop(): void {
    Native?.stop();
  },
  addActionListener(
    listener: (event: { action: LiveAction }) => void,
  ): EventSubscription | null {
    return Native ? Native.addListener('onAction', listener) : null;
  },
};

export default CadenceLive;
