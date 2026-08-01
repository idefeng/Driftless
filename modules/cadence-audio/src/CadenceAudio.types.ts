// Public types for the CadenceAudio native module.

export type CadenceSoundId = 'beep' | 'woodfish' | 'click' | 'bubble' | 'droplet';

/** Emitted (best-effort, on a non-realtime thread) when a beat is voiced. */
export type BeatEvent = {
  beatIndex: number;
};

/**
 * Emitted when the native engine pauses itself in response to a real audio
 * interruption it detected directly (e.g. Android headphone unplug / Bluetooth
 * disconnect — PRD §4.1 "耳机插拔/蓝牙断连：默认暂停"). JS state wasn't the one
 * that stopped playback, so it needs to be told to stay in sync.
 */
export type InterruptedEvent = {
  reason: 'routeChanged';
};

export type CadenceAudioModuleEvents = {
  onBeat: (event: BeatEvent) => void;
  onInterrupted: (event: InterruptedEvent) => void;
};
