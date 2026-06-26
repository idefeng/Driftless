// Public types for the CadenceAudio native module.

export type CadenceSoundId = 'beep' | 'woodfish' | 'click';

/** Emitted (best-effort, on a non-realtime thread) when a beat is voiced. */
export type BeatEvent = {
  beatIndex: number;
};

export type CadenceAudioModuleEvents = {
  onBeat: (event: BeatEvent) => void;
};
