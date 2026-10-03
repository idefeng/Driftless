import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CadenceScheduler, clampBpm } from '../audio/CadenceScheduler';
import { brand } from '../theme/tokens';
import { Platform, PermissionsAndroid } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import CadenceAudio from '../../modules/cadence-audio';
import CadenceLive, { LiveSessionState } from '../../modules/cadence-live';
import { useI18n } from '../i18n/I18nContext';
import type { Translator } from '../i18n/resources';
import { logger } from '../utils/logger';

const KEEP_AWAKE_TAG = 'driftless-cadence';

// Bump the version suffix if the persisted shape ever changes incompatibly —
// the load effect below discards anything that fails validation rather than
// crashing on it.
const STORAGE_KEY = 'driftless.cadence.v1';
const PERSIST_DEBOUNCE_MS = 400;
// 锁屏推送（Live Activity / 前台通知）节流：长按 ±1 连续步进时不会每步都推原生。
const LIVE_UPDATE_DEBOUNCE_MS = 400;

export type SoundId = 'beep' | 'woodfish' | 'click' | 'bubble' | 'droplet';
export type CoexistMode = 'mix' | 'exclusive';

export interface SoundDef {
  id: SoundId;
}

export const SOUNDS: SoundDef[] = [
  { id: 'beep' },
  { id: 'woodfish' },
  { id: 'click' },
  { id: 'bubble' },
  { id: 'droplet' },
];

export interface PlanPhase {
  id: string;
  name: string;
  durationSec: number;
  bpm: number;
  color: string; // accent bar color
}

export interface TrainingPlan {
  id: string;
  name: string;
  phases: PlanPhase[];
}

export function createDefaultPlan(t: Translator): PlanPhase[] {
  return [
    { id: 'p1', name: t('plan.defaultWarmup'), durationSec: 5 * 60, bpm: 170, color: brand.light },
    { id: 'p2', name: t('plan.defaultCruise'), durationSec: 20 * 60, bpm: 180, color: brand.base },
    { id: 'p3', name: t('plan.defaultSprint'), durationSec: 5 * 60, bpm: 190, color: brand.deep },
  ];
}

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
  plans: TrainingPlan[];
  activePlanId: string;
  plan: PlanPhase[];
  // running session
  running: boolean;
  phaseIndex: number;
  /** 当前阶段结束的绝对时间戳（ms），仅 running 时有效；秒级倒计时由 running 页本地推导。 */
  phaseEndAtMs: number;
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
  setActivePlanId: (id: string) => void;
  createPlan: () => string;
  importPlan: (importedPlan: { name: string; phases: Array<{ name: string; durationSec: number; bpm: number }> }) => string;
  renamePlan: (id: string, name: string) => void;
  deletePlan: (id: string) => void;
  startWorkout: () => void;
  stopWorkout: () => void;
  skipPhase: () => void;
  addPhase: () => void;
  removePhase: (id: string) => void;
  updatePhase: (id: string, patch: Partial<Pick<PlanPhase, 'bpm' | 'durationSec' | 'name'>>) => void;
}

const Ctx = createContext<CadenceApi | null>(null);

export function CadenceProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
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
  // Start paused: launching (or mis-tapping) the app must never blast a
  // metronome in a quiet room — the user explicitly presses play.
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSoundState] = useState<SoundId>('woodfish');
  const [coexist, setCoexistState] = useState<CoexistMode>('mix');
  const [beatVolume, setBeatVolumeState] = useState(0.72);
  const [ducking, setDuckingState] = useState(false);
  const [keepAwake, setKeepAwake] = useState(true);
  const [plans, setPlans] = useState<TrainingPlan[]>(() => [
    { id: 'default', name: t('plan.defaultName', { number: 1 }), phases: createDefaultPlan(t) },
  ]);
  const [activePlanId, setActivePlanId] = useState('default');
  const plan = useMemo(
    () => plans.find((p) => p.id === activePlanId)?.phases ?? plans[0].phases,
    [plans, activePlanId],
  );

  // If the active plan was deleted, fall back to the first remaining plan.
  useEffect(() => {
    if (!plans.some((p) => p.id === activePlanId)) {
      setActivePlanId(plans[0].id);
    }
  }, [plans, activePlanId]);

  const [running, setRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  // 当前阶段结束的绝对时间戳（ms）。只在阶段切换/暂停恢复时变化，
  // 秒级倒计时移出共享 context（running 页本地推导），避免每秒重建 context value。
  const [phaseEndAtMs, setPhaseEndAtMs] = useState(0);

  // Absolute end time of the current phase — drives native lock-screen countdowns.
  const phaseEndRef = useRef(0);
  // 暂停时冻结的剩余秒数；恢复播放时据此重建 phaseEndRef。
  const pausedRemainingRef = useRef<number | null>(null);

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

  // Android 13+ 需要运行时通知授权，前台服务卡片才能正常显示。
  // 延迟到首次播放/开始训练时再请求，避免 App 一启动就弹权限框。
  const notifPermissionRequestedRef = useRef(false);
  const requestNotificationPermission = useCallback(() => {
    if (notifPermissionRequestedRef.current) return;
    notifPermissionRequestedRef.current = true;
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      void PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      ).catch((error) => {
        logger.warn('通知权限请求失败。', error);
      });
    }
  }, []);

  // 暂停播放：停引擎，并冻结训练倒计时（记住剩余秒数，恢复时按绝对时间戳重建）。
  // 耳机拔出/蓝牙断开等系统打断（onInterrupted）也走同一路径。
  const pausePlayback = useCallback(() => {
    if (running) {
      pausedRemainingRef.current = Math.max(0, Math.ceil((phaseEndRef.current - Date.now()) / 1000));
    }
    engine.stop();
    setIsPlaying(false);
  }, [engine, running]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pausePlayback();
      return;
    }
    if (running && pausedRemainingRef.current != null) {
      // 恢复播放：用暂停时冻结的剩余秒数重建绝对结束时间。
      phaseEndRef.current = Date.now() + pausedRemainingRef.current * 1000;
      setPhaseEndAtMs(phaseEndRef.current);
      pausedRemainingRef.current = null;
    }
    requestNotificationPermission();
    engine.start(bpm);
    setIsPlaying(true);
  }, [isPlaying, running, engine, bpm, pausePlayback, requestNotificationPermission]);

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

  // ── Persistence (PRD §4.2: plans + usual cadence settings survive restarts) ──
  // Session-only fields (isPlaying/running/phase progress) are deliberately
  // excluded — the app always launches paused, and mid-workout progress isn't
  // resumable across a process kill anyway.
  const [hydrated, setHydrated] = useState(false);
  const isValidSound = (s: unknown): s is SoundId =>
    s === 'beep' || s === 'woodfish' || s === 'click' || s === 'bubble' || s === 'droplet';
  const isValidPhase = (p: unknown): p is PlanPhase =>
    !!p &&
    typeof (p as PlanPhase).id === 'string' &&
    typeof (p as PlanPhase).name === 'string' &&
    Number.isFinite((p as PlanPhase).durationSec) &&
    Number.isFinite((p as PlanPhase).bpm) &&
    typeof (p as PlanPhase).color === 'string';
  const isValidPlan = (p: unknown): p is TrainingPlan =>
    !!p &&
    typeof (p as TrainingPlan).id === 'string' &&
    typeof (p as TrainingPlan).name === 'string' &&
    Array.isArray((p as TrainingPlan).phases) &&
    (p as TrainingPlan).phases.length > 0 &&
    (p as TrainingPlan).phases.every(isValidPhase);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (Number.isFinite(saved.bpm)) setBpm(saved.bpm);
          if (isValidSound(saved.sound)) setSound(saved.sound);
          if (saved.coexist === 'mix' || saved.coexist === 'exclusive') {
            setCoexist(saved.coexist);
          }
          if (Number.isFinite(saved.beatVolume)) setBeatVolume(saved.beatVolume);
          if (typeof saved.ducking === 'boolean') setDucking(saved.ducking);
          if (typeof saved.keepAwake === 'boolean') setKeepAwake(saved.keepAwake);
          if (Array.isArray(saved.plans) && saved.plans.length > 0 && saved.plans.every(isValidPlan)) {
            // 旧版本/异常数据可能存有越界数值，水合时统一钳制到合法范围。
            const sanitizedPlans = (saved.plans as TrainingPlan[]).map((p) => ({
              ...p,
              phases: p.phases.map((ph) => ({
                ...ph,
                bpm: clampBpm(ph.bpm),
                durationSec: Math.min(3600, Math.max(30, Math.round(ph.durationSec))),
              })),
            }));
            setPlans(sanitizedPlans);
            if (typeof saved.activePlanId === 'string') setActivePlanId(saved.activePlanId);
          }
        }
      } catch (error) {
        logger.warn('读取本地存档失败，使用默认值。', error);
      } finally {
        setHydrated(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced so rapid changes (e.g. long-press ±BPM stepping) don't hammer
  // AsyncStorage with a write per tick.
  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => {
      const payload = JSON.stringify({ bpm, sound, coexist, beatVolume, ducking, keepAwake, plans, activePlanId });
      AsyncStorage.setItem(STORAGE_KEY, payload).catch((error) => {
        logger.warn('保存本地存档失败。', error);
      });
    }, PERSIST_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [hydrated, bpm, sound, coexist, beatVolume, ducking, keepAwake, plans, activePlanId]);

  // 仅在用户开启常亮且节拍播放时保持屏幕唤醒，停止播放后立即释放。
  useEffect(() => {
    if (keepAwake && isPlaying) {
      void activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch((error) => {
        logger.warn('屏幕常亮启用失败。', error);
      });
      return () => {
        void deactivateKeepAwake(KEEP_AWAKE_TAG).catch((error) => {
          logger.warn('屏幕常亮释放失败。', error);
        });
      };
    }
  }, [keepAwake, isPlaying]);

  // 冷启动恒为暂停态：清理上次进程被杀残留的锁屏展示（Live Activity / 前台通知）。
  useEffect(() => {
    CadenceLive.stop();
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

  // Android: the native engine pauses itself on headphone unplug / Bluetooth
  // disconnect (PRD §4.1) without going through `togglePlay`, so it reports
  // back via "onInterrupted" — otherwise the play button and lock-screen
  // notification would keep showing "playing" while the beat is actually silent.
  useEffect(() => {
    const sub = CadenceAudio.addInterruptedListener(pausePlayback);
    return () => sub?.remove();
  }, [pausePlayback]);

  // ── Workout session ──────────────────────────────────────────────
  const startWorkout = useCallback(() => {
    const first = plan[0];
    const firstBpm = clampBpm(first.bpm);
    pausedRemainingRef.current = null;
    phaseEndRef.current = Date.now() + first.durationSec * 1000;
    setPhaseEndAtMs(phaseEndRef.current);
    setRunning(true);
    setPhaseIndex(0);
    setBpmState(firstBpm);
    setIsPlaying(true);
    requestNotificationPermission();
    engine.setBpm(firstBpm);
    engine.start(firstBpm);
  }, [plan, engine, requestNotificationPermission]);

  const stopWorkout = useCallback(() => {
    pausedRemainingRef.current = null;
    setPhaseEndAtMs(0);
    setRunning(false);
    engine.stop();
    setIsPlaying(false);
  }, [engine]);

  // 普通函数而非 setState updater：写 ref、engine.setBpm 等副作用移出 updater，
  // 避免并发渲染下被重复执行。变速遵循 PRD §3.4「自然完成，瞬时变速」。
  const advancePhase = useCallback(() => {
    const next = phaseIndex + 1;
    if (next >= plan.length) {
      // 训练自然结束：停引擎、退出播放态；running 页监听 running 变 false 后自动退出。
      pausedRemainingRef.current = null;
      setPhaseEndAtMs(0);
      setRunning(false);
      engine.stop();
      setIsPlaying(false);
      return;
    }
    phaseEndRef.current = Date.now() + plan[next].durationSec * 1000;
    setPhaseEndAtMs(phaseEndRef.current);
    // 若当前处于暂停，切到下一阶段后按新阶段时长冻结剩余时间。
    pausedRemainingRef.current = plan[next].durationSec;
    setPhaseIndex(next);
    setBpmState(plan[next].bpm);
    engine.setBpm(plan[next].bpm);
  }, [plan, engine, phaseIndex]);

  const skipPhase = useCallback(() => advancePhase(), [advancePhase]);

  // ── Plan management (multiple named training plans) ────────────────
  const createPlan = useCallback(() => {
    const id = `plan${Date.now()}`;
    const newPlan: TrainingPlan = {
      id,
      name: t('plan.defaultName', { number: plans.length + 1 }),
      phases: [
        {
          id: `p${Date.now()}`,
          name: t('plan.defaultPhase', { number: 1 }),
          durationSec: 20 * 60,
          bpm: 180,
          color: brand.base,
        },
      ],
    };
    setPlans((prev) => [...prev, newPlan]);
    setActivePlanId(id);
    return id;
  }, [t, plans.length]);

  const importPlan = useCallback(
    (importedPlan: { name: string; phases: Array<{ name: string; durationSec: number; bpm: number }> }) => {
      const newId = `plan_${Date.now()}`;
      const palette = [brand.light, brand.base, brand.deep];
      const newPlan: TrainingPlan = {
        id: newId,
        name: importedPlan.name || t('plan.defaultName', { number: plans.length + 1 }),
        phases: (importedPlan.phases && importedPlan.phases.length > 0
          ? importedPlan.phases
          : [{ name: t('plan.defaultPhase', { number: 1 }), durationSec: 20 * 60, bpm: 180 }]
        ).map((ph, idx) => ({
          id: `p_${Date.now()}_${idx}`,
          name: ph.name || `Phase ${idx + 1}`,
          durationSec: Math.max(10, ph.durationSec || 300),
          bpm: clampBpm(ph.bpm || 180),
          color: palette[idx % palette.length],
        })),
      };
      setPlans((prev) => [...prev, newPlan]);
      setActivePlanId(newId);
      return newId;
    },
    [t, plans.length],
  );

  const renamePlan = useCallback((id: string, name: string) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  }, []);

  const deletePlan = useCallback((id: string) => {
    // Keep at least one plan so there is always something to train with.
    setPlans((prev) => (prev.length <= 1 ? prev : prev.filter((p) => p.id !== id)));
  }, []);

  // ── Phase editing (operates on the active plan's phases) ───────────
  const addPhase = useCallback(() => {
    setPlans((prev) =>
      prev.map((pl) => {
        if (pl.id !== activePlanId) return pl;
        const palette = [brand.light, brand.base, brand.deep];
        const last = pl.phases[pl.phases.length - 1];
        const next: PlanPhase = {
          id: `p${Date.now()}`,
          name: t('plan.defaultPhase', { number: pl.phases.length + 1 }),
          durationSec: 5 * 60,
          // Start from the previous phase's rate; the user edits it freely.
          bpm: clampBpm(last?.bpm ?? 180),
          color: palette[pl.phases.length % palette.length],
        };
        return { ...pl, phases: [...pl.phases, next] };
      }),
    );
  }, [t, activePlanId]);

  const removePhase = useCallback(
    (id: string) => {
      // Keep at least one phase so a workout always has something to run.
      setPlans((prev) =>
        prev.map((pl) => {
          if (pl.id !== activePlanId) return pl;
          if (pl.phases.length <= 1) return pl;
          return { ...pl, phases: pl.phases.filter((p) => p.id !== id) };
        }),
      );
    },
    [activePlanId],
  );

  const updatePhase = useCallback<CadenceApi['updatePhase']>(
    (id, patch) => {
      setPlans((prev) =>
        prev.map((pl) => {
          if (pl.id !== activePlanId) return pl;
          return {
            ...pl,
            phases: pl.phases.map((p) => {
              if (p.id !== id) return p;
              const next = { ...p };
              if (patch.bpm != null) next.bpm = clampBpm(patch.bpm);
              if (patch.durationSec != null) next.durationSec = Math.max(30, Math.round(patch.durationSec));
              if (patch.name != null) next.name = patch.name;
              return next;
            }),
          };
        }),
      );
    },
    [activePlanId],
  );

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
    phaseProgressText: '',
    remainingLabel: t('live.remaining'),
    skipActionLabel: t('live.skipPhase'),
    channelName: t('live.channelName'),
    channelDescription: t('live.channelDescription'),
  });
  // During a workout: show the phase, its index, and a live countdown. On the
  // home screen (free metronome): just the rate — phaseCount 1 tells the native
  // surface to drop the "第 x/n 段" line and the skip control, no countdown.
  // 渲染期不直接写 ref——放进 effect（声明在下方 start/update effect 之前，
  // 保证它们读到的是最新快照）。
  useEffect(() => {
    liveStateRef.current = running
      ? {
          bpm,
          phaseName: (plan[phaseIndex] ?? plan[0]).name,
          phaseIndex,
          phaseCount: plan.length,
          endTimeMs: phaseEndRef.current,
          running: true,
          phaseProgressText: t('live.phaseProgress', { current: phaseIndex + 1, total: plan.length }),
          remainingLabel: t('live.remaining'),
          skipActionLabel: t('live.skipPhase'),
          channelName: t('live.channelName'),
          channelDescription: t('live.channelDescription'),
        }
      : {
          bpm,
          phaseName: '',
          phaseIndex: 0,
          phaseCount: 1,
          endTimeMs: 0,
          running: isPlaying,
          phaseProgressText: '',
          remainingLabel: t('live.remaining'),
          skipActionLabel: t('live.skipPhase'),
          channelName: t('live.channelName'),
          channelDescription: t('live.channelDescription'),
        };
  });

  // Lock-screen ±1 / skip controls feed back into cadence state.
  useEffect(() => {
    const sub = CadenceLive.addActionListener(({ action }) => {
      if (action === 'inc') step(1);
      else if (action === 'dec') step(-1);
      else if (action === 'skip') skipPhase();
    });
    return () => sub?.remove();
  }, [step, skipPhase]);

  // Show the lock-screen / notification card whenever the metronome is sounding,
  // from the home screen on — not only during a structured workout.
  useEffect(() => {
    if (isPlaying) CadenceLive.start(liveStateRef.current);
    else CadenceLive.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // Push fresh content when the rate or phase changes (iOS counts the timer down
  // natively from endTimeMs, so per-second updates aren't needed). Debounced so
  // long-press ±1 stepping doesn't push to native on every tick.
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setTimeout(() => CadenceLive.update(liveStateRef.current), LIVE_UPDATE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm, phaseIndex, running, isPlaying, t]);

  // 训练倒计时：唯一时间源是 phaseEndRef 的绝对时间戳（不随渲染/节流漂移），
  // 且只在播放中推进——暂停或系统打断时阶段计时冻结（见 pausePlayback）。
  useEffect(() => {
    if (!running || !isPlaying) return;
    const timer = setInterval(() => {
      if (Date.now() >= phaseEndRef.current) advancePhase();
    }, 1000);
    return () => clearInterval(timer);
  }, [running, isPlaying, advancePhase]);

  const value = useMemo<CadenceApi>(
    () => ({
      bpm,
      isPlaying,
      sound,
      coexist,
      beatVolume,
      ducking,
      keepAwake,
      plans,
      activePlanId,
      plan,
      running,
      phaseIndex,
      phaseEndAtMs,
      audioReady,
      setBpm,
      step,
      togglePlay,
      setSound,
      setCoexist,
      setBeatVolume,
      setDucking,
      setKeepAwake,
      setActivePlanId,
      createPlan,
      importPlan,
      renamePlan,
      deletePlan,
      startWorkout,
      stopWorkout,
      skipPhase,
      addPhase,
      removePhase,
      updatePhase,
    }),
    [
      bpm, isPlaying, sound, coexist, beatVolume, ducking, keepAwake, plans,
      activePlanId, plan, running, phaseIndex, phaseEndAtMs, audioReady,
      setBpm, step, togglePlay, setSound, setCoexist, setBeatVolume, setDucking,
      createPlan, importPlan, renamePlan, deletePlan, startWorkout,
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

export function formatClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
