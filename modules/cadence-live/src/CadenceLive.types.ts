// Public types for the CadenceLive module (iOS Live Activity / Android foreground notification).

export type LiveAction = 'inc' | 'dec' | 'skip';

export interface LiveSessionState {
  bpm: number;
  phaseName: string;
  /** 0-based index of the current phase. */
  phaseIndex: number;
  phaseCount: number;
  /** Epoch milliseconds when the current phase ends — drives native countdowns. */
  endTimeMs: number;
  running: boolean;
  /** JS 按当前语言生成的“第 1/3 段 / Phase 1/3”文本。 */
  phaseProgressText: string;
  /** 原生实时界面使用的剩余时间标签。 */
  remainingLabel: string;
  /** 通知控制按钮使用的跳过阶段标签。 */
  skipActionLabel: string;
  /** Android 通知渠道名称。 */
  channelName: string;
  /** Android 通知渠道描述。 */
  channelDescription: string;
}

export type CadenceLiveModuleEvents = {
  /** Fired when the user taps ±1 / skip on the lock screen, Dynamic Island, or notification. */
  onAction: (event: { action: LiveAction }) => void;
};
