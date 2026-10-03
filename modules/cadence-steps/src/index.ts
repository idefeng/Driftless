// Only `.remove()` is used by callers; avoids a direct expo-modules-core dependency (expo-doctor).
export type EventSubscription = { remove(): void };

import Native from './CadenceStepsModule';
import type { StepsEvent } from './CadenceSteps.types';

export * from './CadenceSteps.types';

/**
 * 实测步频的数据源（v1.2）。只上报累计步数，不做任何网络传输；
 * 未链接原生模块（Expo Go / Web）时 isSupported() 为 false，调用均为空操作。
 */
export const CadenceSteps = {
  isSupported(): boolean {
    return Native != null && Native.isSupported();
  },
  start(): void {
    Native?.start();
  },
  stop(): void {
    Native?.stop();
  },
  addStepsListener(listener: (event: StepsEvent) => void): EventSubscription | null {
    return Native ? Native.addListener('onSteps', listener) : null;
  },
};

export default CadenceSteps;
