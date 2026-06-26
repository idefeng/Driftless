import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import { CadenceScheduler, clampBpm } from '../audio/CadenceScheduler';
import { brand } from '../theme/tokens';
import { Platform, PermissionsAndroid } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import CadenceAudio from '../../modules/cadence-audio';
import CadenceLive, { LiveSessionState } from '../../modules/cadence-live';

const KEEP_AWAKE_TAG = 'driftless-cadence';

export type SoundId = 'beep' | 'woodfish' | 'click';
export type CoexistMode = 'mix' | 'exclusive';

export interface SoundDef {
  id: SoundId;
  name: string;
  desc: string;
}

export const SOUNDS: SoundDef[] = [
  { id: 'beep', name: '电子嘀声', desc: '高频穿透 · 嘈杂环境首选' },
  { id: 'woodfish', name: '木鱼', desc: '温暖瞬态 · 音乐背景中清晰' },
  { id: 'click', name: '标准节拍器', desc: '经典鼓点 · 强拍分明' },
];

export interface PlanPhase {
  id: string;
  name: string;
  durationSec: number;
  bpm: number;
  color: string; // accent bar color
}

export const DEFAULT_PLAN: PlanPhase[] = [
  { id: 'p1', name: '热身', durationSec: 5 * 60, bpm: 170, color: brand.light },
  { id: 'p2', name: '巡航', durationSec: 20 * 60, bpm: 180, color: brand.base },
  { id: 'p3', name: '冲刺', durationSec: 5 * 60, bpm: 190, color: brand.deep },
];

/**
 * Engine facade — routes playback to the native (iOS/Android) or WebAudio
 * cadence engine when available, falling back to the JS-only `CadenceScheduler`
 * (no sound, visuals only) inside Expo Go where the native module isn't linked.
 */
interface Engine {
  prepare: (mix: boolean) => void;
  start: (bpm: number) => void;
  stop: () => void;
  setBpm: (bpm: number) => void;
  setVolume: (v: number) => void;
  setSound: (s: SoundId) => void;
  setMix: (mix: boolean) => void;
  setDucking: (duck: boolean) => void;
}

interface CadenceState {
  bpm: number;
  isPlaying: boolean;
  sound: SoundId;
  coexist: CoexistMode;
  beatVolume: number; // 0..1, independent of media volume
  ducking: boolean;
  keepAwake: boolean;
  plan: PlanPhase[];
  // running session
  running: boolean;
  phaseIndex: number;
  phaseRemainingSec: number;
  /** true when real audio output is wired (native or web), false in Expo Go. */
  audioReady: boolean;
}

interface CadenceApi extends CadenceState {
  setBpm: (n: number) => void;
  step: (delta: number) => void;
  togglePlay: () => void;
  setSound: (s: SoundId) => void;
  setCoexist: (m: CoexistMode) => void;
  setBeatVolume: (v: number) => void;
  setDucking: (b: boolean) => void;
  setKeepAwake: (b: boolean) => void;
  startWorkout: () => void;
  stopWorkout: () => void;
  skipPhase: () => void;
  addPhase: () => void;
  removePhase: (id: string) => void;
  updatePhase: (id: string, patch: Partial<Pick<PlanPhase, 'bpm' | 'durationSec' | 'name'>>) => void;
}

const Ctx = createContext<CadenceApi | null>(null);

export function CadenceProvider({ children }: { children: React.ReactNode }) {
  const schedulerRef = useRef(new CadenceScheduler());
  const audioReady = CadenceAudio.isAvailable();

  const engine = useMemo<Engine>(() => {
    if (audioReady) {
      return {
        prepare: (mix) => CadenceAudio.prepare(mix),
        start: (b) => CadenceAudio.start(b),
        stop: () => CadenceAudio.stop(),
        setBpm: (b) => CadenceAudio.setBpm(b),
        setVolume: (v) => CadenceAudio.setVolume(v),
        setSound: (s) => CadenceAudio.setSound(s),
        setMix: (m) => CadenceAudio.setMixWithOthers(m),
        setDucking: (d) => CadenceAudio.setDucking(d),
      };
    }
    const s = schedulerRef.current;
    return {
      prepare: () => {},
      start: (b) => s.start(b),
      stop: () => s.stop(),
      setBpm: (b) => s.setBpm(b),
      setVolume: () => {},
      setSound: () => {},
      setMix: () => {},
      setDucking: () => {},
    };
  }, [audioReady]);

  const [bpm, setBpmState] = useState(180);
  const [isPlaying, setIsPlaying] = useState(true);
  const [sound, setSoundState] = useState<SoundId>('woodfish');
  const [coexist, setCoexistState] = useState<CoexistMode>('mix');
  const [beatVolume, setBeatVolumeState] = useState(0.72);
  const [ducking, setDuckingState] = useState(false);
  const [keepAwake, setKeepAwake] = useState(true);
  const [plan, setPlan] = useState<PlanPhase[]>(DEFAULT_PLAN);

  const [running, setRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseRemainingSec, setPhaseRemainingSec] = useState(0);

  // Absolute end time of the current phase — drives native lock-screen countdowns.
  const phaseEndRef = useRef(0);

  const setBpm = useCallback(
    (n: number) => {
      const v = clampBpm(n);
      setBpmState(v);
      engine.setBpm(v);
    },
    [engine],
  );

  const step = useCallback(
    (delta: number) => {
      setBpmState((prev) => {
        const v = clampBpm(prev + delta);
        engine.setBpm(v);
        return v;
      });
    },
    [engine],
  );

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      if (next) engine.start(bpm);
      else engine.stop();
      return next;
    });
  }, [engine, bpm]);

  const setSound = useCallback(
    (s: SoundId) => {
      setSoundState(s);
      engine.setSound(s);
    },
    [engine],
  );

  const setCoexist = useCallback(
    (m: CoexistMode) => {
      setCoexistState(m);
      engine.setMix(m === 'mix');
    },
    [engine],
  );

  const setBeatVolume = useCallback(
    (v: number) => {
      const clamped = Math.max(0, Math.min(1, v));
      setBeatVolumeState(clamped);
      engine.setVolume(clamped);
    },
    [engine],
  );

  const setDucking = useCallback(
    (b: boolean) => {
      setDuckingState(b);
      engine.setDucking(b);
    },
    [engine],
  );

  // Keep the screen awake while the metronome is sounding (PRD §3.2 "常亮"),
  // but only when the user opted in. Released as soon as playback stops or the
  // toggle is turned off so we never hold the lock longer than needed.
  useEffect(() => {
    if (keepAwake && isPlaying) {
      activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
      return () => {
        deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
      };
    }
  }, [keepAwake, isPlaying]);

  // Android 13+ needs the runtime POST_NOTIFICATIONS grant before the live
  // workout's foreground-service notification (lock-screen card) can show.
  useEffect(() => {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      ).catch(() => {});
    }
  }, []);

  // Initialize the engine once.
  useEffect(() => {
    engine.prepare(coexist === 'mix');
    engine.setSound(sound);
    engine.setVolume(beatVolume);
    engine.setDucking(ducking);
    if (isPlaying) engine.start(bpm);
    return () => engine.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  // ── Workout session ──────────────────────────────────────────────
  const startWorkout = useCallback(() => {
    phaseEndRef.current = Date.now() + plan[0].durationSec * 1000;
    setRunning(true);
    setPhaseIndex(0);
    setPhaseRemainingSec(plan[0].durationSec);
    setBpmState(plan[0].bpm);
    setIsPlaying(true);
    engine.setBpm(plan[0].bpm);
    engine.start(plan[0].bpm);
  }, [plan, engine]);

  const stopWorkout = useCallback(() => {
    setRunning(false);
  }, []);

  const advancePhase = useCallback(() => {
    setPhaseIndex((idx) => {
      const next = idx + 1;
      if (next >= plan.length) {
        setRunning(false);
        return idx;
      }
      phaseEndRef.current = Date.now() + plan[next].durationSec * 1000;
      setPhaseRemainingSec(plan[next].durationSec);
      // "Natural finish, instant re-rate" — switch the rate at the boundary.
      setBpmState(plan[next].bpm);
      engine.setBpm(plan[next].bpm);
      return next;
    });
  }, [plan, engine]);

  const skipPhase = useCallback(() => advancePhase(), [advancePhase]);

  // ── Plan editing ─────────────────────────────────────────────────
  const addPhase = useCallback(() => {
    setPlan((prev) => {
      const palette = [brand.light, brand.base, brand.deep];
      const last = prev[prev.length - 1];
      const next: PlanPhase = {
        id: `p${Date.now()}`,
        name: `阶段 ${prev.length + 1}`,
        durationSec: 5 * 60,
        // Start from the previous phase's rate; the user edits it freely.
        bpm: clampBpm(last?.bpm ?? 180),
        color: palette[prev.length % palette.length],
      };
      return [...prev, next];
    });
  }, []);

  const removePhase = useCallback((id: string) => {
    // Keep at least one phase so a workout always has something to run.
    setPlan((prev) => (prev.length <= 1 ? prev : prev.filter((p) => p.id !== id)));
  }, []);

  const updatePhase = useCallback<CadenceApi['updatePhase']>((id, patch) => {
    setPlan((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const next = { ...p };
        if (patch.bpm != null) next.bpm = clampBpm(patch.bpm);
        if (patch.durationSec != null) next.durationSec = Math.max(30, Math.round(patch.durationSec));
        if (patch.name != null) next.name = patch.name;
        return next;
      }),
    );
  }, []);

  // ── Live presentation (iOS Live Activity / Android foreground notification) ──
  // Keep the latest snapshot in a ref so the start/update effects always push
  // current values without re-subscribing.
  const liveStateRef = useRef<LiveSessionState>({
    bpm,
    phaseName: plan[0].name,
    phaseIndex: 0,
    phaseCount: plan.length,
    endTimeMs: 0,
    running: false,
  });
  liveStateRef.current = {
    bpm,
    phaseName: (plan[phaseIndex] ?? plan[0]).name,
    phaseIndex,
    phaseCount: plan.length,
    endTimeMs: phaseEndRef.current,
    running,
  };

  // Lock-screen ±1 / skip controls feed back into cadence state.
  useEffect(() => {
    const sub = CadenceLive.addActionListener(({ action }) => {
      if (action === 'inc') step(1);
      else if (action === 'dec') step(-1);
      else if (action === 'skip') skipPhase();
    });
    return () => sub?.remove();
  }, [step, skipPhase]);

  // Start/end the presentation with the workout.
  useEffect(() => {
    if (running) CadenceLive.start(liveStateRef.current);
    else CadenceLive.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // Push fresh content when the rate or phase changes (iOS counts the timer down
  // natively from endTimeMs, so per-second updates aren't needed).
  useEffect(() => {
    if (running) CadenceLive.update(liveStateRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm, phaseIndex, running]);

  // running countdown
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setPhaseRemainingSec((s) => {
        if (s <= 1) {
          advancePhase();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, advancePhase]);

  const value = useMemo<CadenceApi>(
    () => ({
      bpm,
      isPlaying,
      sound,
      coexist,
      beatVolume,
      ducking,
      keepAwake,
      plan,
      running,
      phaseIndex,
      phaseRemainingSec,
      audioReady,
      setBpm,
      step,
      togglePlay,
      setSound,
      setCoexist,
      setBeatVolume,
      setDucking,
      setKeepAwake,
      startWorkout,
      stopWorkout,
      skipPhase,
      addPhase,
      removePhase,
      updatePhase,
    }),
    [
      bpm, isPlaying, sound, coexist, beatVolume, ducking, keepAwake, plan,
      running, phaseIndex, phaseRemainingSec, audioReady, setBpm, step,
      togglePlay, setSound, setCoexist, setBeatVolume, setDucking, startWorkout,
      stopWorkout, skipPhase, addPhase, removePhase, updatePhase,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCadence() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCadence must be used within CadenceProvider');
  return v;
}

export const SOUND_NAME: Record<SoundId, string> = {
  beep: '电子嘀声',
  woodfish: '木鱼',
  click: '标准节拍器',
};

export function formatClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
