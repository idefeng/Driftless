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
}

export type CadenceLiveModuleEvents = {
  /** Fired when the user taps ±1 / skip on the lock screen, Dynamic Island, or notification. */
  onAction: (event: { action: LiveAction }) => void;
};
