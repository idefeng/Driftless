// Public types for the CadenceSteps native module.

/**
 * 累计步数快照。`steps` 从本次 start() 起计（从 0 开始单调递增），
 * `timestampMs` 为最后一步发生的墙钟时间（ms）。步频由 JS 侧按滑动窗口统一推导，
 * 三端只负责上报「累计步数 + 时间」，保证算法一致。
 */
export type StepsEvent = {
  steps: number;
  timestampMs: number;
};

export type CadenceStepsModuleEvents = {
  onSteps: (event: StepsEvent) => void;
};
