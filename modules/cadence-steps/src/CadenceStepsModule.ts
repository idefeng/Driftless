import { NativeModule, requireNativeModule } from 'expo';

import { CadenceStepsModuleEvents } from './CadenceSteps.types';

export declare class CadenceStepsModule extends NativeModule<CadenceStepsModuleEvents> {
  /** 设备是否有可用的计步硬件（Android 步伐检测器 / 计步器，iOS CMPedometer）。 */
  isSupported(): boolean;
  /** 开始计步，累计步数归零。权限需事先由 JS 申请（Android ACTIVITY_RECOGNITION）。 */
  start(): void;
  /** 停止计步并释放传感器。 */
  stop(): void;
}

// Expo Go 等未链接原生模块的环境下 requireNativeModule 会抛错，此时视为不支持。
let nativeModule: CadenceStepsModule | null = null;
try {
  nativeModule = requireNativeModule<CadenceStepsModule>('CadenceSteps');
} catch {
  nativeModule = null;
}

export default nativeModule;
