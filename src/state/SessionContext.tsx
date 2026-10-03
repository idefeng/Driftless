import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CadenceSteps from '../../modules/cadence-steps';
import { useCadence } from './CadenceContext';
import { CadenceEstimator, SessionRecorder, SessionRecord, isValidRecord } from './sessionStats';
import { logger } from '../utils/logger';

// 训练记录与实测步频开关单独存档，和 CadenceContext 的设置存档互不影响。
const STORAGE_KEY = 'driftless.session.v1';
// 只保留最近这么多条记录（每条含 10 秒粒度曲线，约 1–3 KB）。
const MAX_RECORDS = 300;
const TICK_MS = 1000;

interface SessionApi {
  /** 设备有计步硬件且原生模块已链接（Web / Expo Go 为 false）。 */
  measureSupported: boolean;
  /** 用户开启了「实测步频」且已授权。 */
  measureEnabled: boolean;
  /** 开启时会申请 ACTIVITY_RECOGNITION（Android 10+）；返回最终是否开启成功。 */
  setMeasureEnabled: (on: boolean) => Promise<boolean>;
  /** 播放中的实测步频；未开启 / 没在跑时为 null。 */
  liveSpm: number | null;
  /** 本次训练至今的跟随率（0..1）；数据不足时为 null。 */
  liveFollow: number | null;
  /** 训练记录，新的在前。 */
  history: SessionRecord[];
  deleteRecord: (id: string) => void;
  clearHistory: () => void;
}

const Ctx = createContext<SessionApi | null>(null);

async function requestActivityPermission(): Promise<boolean> {
  // Android 10 (API 29) 起计步传感器需要运行时授权；iOS 由 CMPedometer 首次启动时系统弹窗。
  if (Platform.OS !== 'android' || (Platform.Version as number) < 29) return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

async function hasActivityPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || (Platform.Version as number) < 29) return true;
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION);
}

/**
 * 训练闭环（v1.2）：节拍播放期间按秒记录目标步频与实测步频，结束后把一条
 * SessionRecord 存到本机。数据只在设备上，不联网。
 *
 * 一次「训练」= 播放开始到彻底停止；结构化训练中途暂停不切分（running 仍为 true），
 * 自由节拍暂停即结束。进入 / 退出结构化训练也会切分，保证记录的计划名准确。
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { bpm, isPlaying, running, plans, activePlanId } = useCadence();
  const measureSupported = useMemo(() => CadenceSteps.isSupported(), []);

  const [hydrated, setHydrated] = useState(false);
  const [measureEnabled, setMeasureEnabledState] = useState(false);
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [liveSpm, setLiveSpm] = useState<number | null>(null);
  const [liveFollow, setLiveFollow] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (Array.isArray(saved.records)) setHistory(saved.records.filter(isValidRecord));
          // 用户可能在系统设置里撤销了授权：撤销后自动视为关闭，避免静默无数据。
          if (saved.measureEnabled === true && measureSupported && (await hasActivityPermission())) {
            setMeasureEnabledState(true);
          }
        }
      } catch (error) {
        logger.warn('读取训练记录失败。', error);
      } finally {
        setHydrated(true);
      }
    })();
  }, [measureSupported]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ measureEnabled, records: history })).catch((error) => {
      logger.warn('保存训练记录失败。', error);
    });
  }, [hydrated, measureEnabled, history]);

  const setMeasureEnabled = useCallback(
    async (on: boolean) => {
      if (!on) {
        setMeasureEnabledState(false);
        return false;
      }
      if (!measureSupported) return false;
      let granted = false;
      try {
        granted = await requestActivityPermission();
      } catch (error) {
        logger.warn('运动权限请求失败。', error);
      }
      setMeasureEnabledState(granted);
      return granted;
    },
    [measureSupported],
  );

  // ── 录制 ──────────────────────────────────────────────────────────
  const recorderRef = useRef<SessionRecorder | null>(null);
  const estimatorRef = useRef(new CadenceEstimator());
  const liveRef = useRef({ bpm, isPlaying });
  liveRef.current = { bpm, isPlaying };
  const planName = running ? (plans.find((p) => p.id === activePlanId) ?? plans[0]).name : null;
  const planNameRef = useRef(planName);
  planNameRef.current = planName;

  const sessionOpen = isPlaying || running;

  useEffect(() => {
    if (!sessionOpen) return;
    const recorder = new SessionRecorder(Date.now(), planNameRef.current);
    recorderRef.current = recorder;
    estimatorRef.current.reset();
    const tick = () => {
      const now = Date.now();
      const { bpm: target, isPlaying: playing } = liveRef.current;
      const spm = playing ? estimatorRef.current.spm(now) : null;
      recorder.sample(now, playing, target, spm);
      setLiveSpm(spm);
      setLiveFollow(recorder.followRate);
    };
    tick();
    const timer = setInterval(tick, TICK_MS);
    return () => {
      clearInterval(timer);
      tick();
      recorderRef.current = null;
      setLiveSpm(null);
      setLiveFollow(null);
      const record = recorder.finish(`s${recorder.startedAt}`);
      if (record) setHistory((prev) => [record, ...prev].slice(0, MAX_RECORDS));
    };
    // running 变化也切分：自由节拍 → 结构化训练时，计划名要跟着变。
  }, [sessionOpen, running]);

  // 计步器只在真正播放时工作：暂停即释放传感器（恢复后累计值归零，由 recorder/estimator 续接）。
  const measuring = measureEnabled && isPlaying;
  useEffect(() => {
    if (!measuring) return;
    const sub = CadenceSteps.addStepsListener(({ steps, timestampMs }) => {
      estimatorRef.current.push(steps, timestampMs);
      recorderRef.current?.addSteps(steps);
    });
    CadenceSteps.start();
    return () => {
      CadenceSteps.stop();
      sub?.remove();
    };
  }, [measuring]);

  const deleteRecord = useCallback((id: string) => {
    setHistory((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const value = useMemo<SessionApi>(
    () => ({
      measureSupported,
      measureEnabled,
      setMeasureEnabled,
      liveSpm: measureEnabled ? liveSpm : null,
      liveFollow: measureEnabled ? liveFollow : null,
      history,
      deleteRecord,
      clearHistory,
    }),
    [measureSupported, measureEnabled, setMeasureEnabled, liveSpm, liveFollow, history, deleteRecord, clearHistory],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession must be used within SessionProvider');
  return v;
}
