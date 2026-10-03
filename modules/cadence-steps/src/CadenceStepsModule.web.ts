import type { CadenceStepsModule } from './CadenceStepsModule';

// 浏览器没有可靠的计步 API：Web 端恒为不支持，界面隐藏实测步频。
const nativeModule: CadenceStepsModule | null = null;

export default nativeModule;
