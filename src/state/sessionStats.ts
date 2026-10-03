/**
 * 实测步频与训练记录的纯逻辑（v1.2「闭环」）。
 *
 * 原生计步模块（modules/cadence-steps）三端只上报「累计步数 + 时间」，这里统一推导：
 * - CadenceEstimator：滑动窗口（约 10 秒）内的步数增量 / 时长 → 实测 SPM；
 * - SessionRecorder：按播放中的真实流逝时间累计目标步频、实测步频与跟随率，
 *   结束时产出一条可本地保存的 SessionRecord。
 *
 * 不依赖 React Native，单测直接以 Node 加载。
 */

/** 实测步频的滑动窗口长度。 */
export const CADENCE_WINDOW_MS = 10_000;
/** 窗口至少跨这么久才给出读数，避免起步阶段的抖动值。 */
const MIN_SPAN_MS = 3_000;
/** 超过这么久没有新步数 → 视为没在跑（读数为 null）。iOS 批量上报约 1–3 秒一次。 */
export const STALE_MS = 5_000;
/** 低于此值不算跑步（站立摆臂、走走停停的噪声）。 */
const MIN_RUNNING_SPM = 60;
/** 实测与目标相差不超过此值即算「跟上了节拍」。 */
export const FOLLOW_TOLERANCE_SPM = 4;
/** 播放不足此时长的记录直接丢弃（误触、试听音色）。 */
export const MIN_SESSION_SEC = 60;
/** 有实测读数的时长不足此值时，不给出平均实测步频 / 跟随率。 */
const MIN_MEASURED_SEC = 30;
/** 曲线采样粒度（播放时长，秒）。 */
export const SERIES_STEP_SEC = 10;
/** 计时器卡顿 / 进程被挂起后恢复时，单次最多计入的时长，避免一次性灌入大段空白。 */
const MAX_TICK_MS = 3_000;

interface StepSample {
  steps: number;
  t: number;
}

export class CadenceEstimator {
  private samples: StepSample[] = [];

  reset(): void {
    this.samples = [];
  }

  push(steps: number, t: number): void {
    const last = this.samples[this.samples.length - 1];
    // 计步器重新 start 后累计值归零：丢弃旧窗口重新开始。
    if (last && (steps < last.steps || t < last.t)) this.samples = [];
    this.samples.push({ steps, t });
    // 保留一个早于窗口起点的锚点，使窗口跨度尽量贴近 CADENCE_WINDOW_MS。
    while (this.samples.length > 2 && this.samples[1].t <= t - CADENCE_WINDOW_MS) {
      this.samples.shift();
    }
  }

  /** 当前实测步频（SPM，取整）；数据不足、已停步或低于跑步下限时为 null。 */
  spm(now: number): number | null {
    const n = this.samples.length;
    if (n < 2) return null;
    const first = this.samples[0];
    const last = this.samples[n - 1];
    if (now - last.t > STALE_MS) return null;
    const span = last.t - first.t;
    if (span < MIN_SPAN_MS) return null;
    const v = ((last.steps - first.steps) / span) * 60_000;
    return v >= MIN_RUNNING_SPM ? Math.round(v) : null;
  }
}

export interface SessionPoint {
  /** 播放时长偏移（秒）。 */
  t: number;
  target: number;
  spm: number | null;
}

export interface SessionRecord {
  id: string;
  startedAt: number;
  /** 实际播放时长（暂停不计），秒。 */
  durationSec: number;
  /** 训练计划名；自由节拍为 null。 */
  planName: string | null;
  avgTarget: number;
  avgSpm: number | null;
  /** 0..1：有实测读数的时间里，与目标相差 ≤ FOLLOW_TOLERANCE_SPM 的占比。 */
  followRate: number | null;
  steps: number | null;
  series: SessionPoint[];
}

export class SessionRecorder {
  private lastMs: number | null = null;
  private activeMs = 0;
  private targetSum = 0; // Σ target · ms
  private spmSum = 0; // Σ spm · ms（仅有读数时）
  private spmMs = 0;
  private followMs = 0;
  private stepsOffset = 0;
  private lastSteps = 0;
  private sawSteps = false;
  private series: SessionPoint[] = [];
  private bucket = { ms: 0, target: 0, spm: 0, spmMs: 0 };

  readonly startedAt: number;
  readonly planName: string | null;

  // 不用参数属性：node --experimental-strip-types 只擦除类型，不支持该语法。
  constructor(startedAt: number, planName: string | null) {
    this.startedAt = startedAt;
    this.planName = planName;
  }

  /** 计步器上报的累计步数；计步器重启（累计值变小）时自动续接。 */
  addSteps(steps: number): void {
    if (steps < this.lastSteps) this.stepsOffset += this.lastSteps;
    this.lastSteps = steps;
    this.sawSteps = true;
  }

  /**
   * 周期性调用（约每秒一次）。只有 playing 的相邻两次调用之间的时长会被计入，
   * 暂停期间传 playing=false 即可断开计时。
   */
  sample(now: number, playing: boolean, target: number, spm: number | null): void {
    if (playing && this.lastMs != null) {
      const dt = Math.min(Math.max(0, now - this.lastMs), MAX_TICK_MS);
      this.accumulate(dt, target, spm);
    }
    this.lastMs = playing ? now : null;
  }

  get activeSec(): number {
    return this.activeMs / 1000;
  }

  /** 当前跟随率（实时展示用）；数据不足时为 null。 */
  get followRate(): number | null {
    return this.spmMs >= MIN_MEASURED_SEC * 1000 ? this.followMs / this.spmMs : null;
  }

  private accumulate(dt: number, target: number, spm: number | null): void {
    if (dt <= 0) return;
    this.activeMs += dt;
    this.targetSum += target * dt;
    this.bucket.ms += dt;
    this.bucket.target += target * dt;
    if (spm != null) {
      this.spmSum += spm * dt;
      this.spmMs += dt;
      this.bucket.spm += spm * dt;
      this.bucket.spmMs += dt;
      if (Math.abs(spm - target) <= FOLLOW_TOLERANCE_SPM) this.followMs += dt;
    }
    if (this.bucket.ms >= SERIES_STEP_SEC * 1000) this.flushBucket();
  }

  private flushBucket(): void {
    const b = this.bucket;
    if (b.ms <= 0) return;
    this.series.push({
      t: Math.round(this.activeMs / 1000),
      target: Math.round(b.target / b.ms),
      spm: b.spmMs >= b.ms / 2 ? Math.round(b.spm / b.spmMs) : null,
    });
    this.bucket = { ms: 0, target: 0, spm: 0, spmMs: 0 };
  }

  /** 结束并产出记录；播放不足 MIN_SESSION_SEC 时返回 null（不保存）。 */
  finish(id: string): SessionRecord | null {
    if (this.activeMs < MIN_SESSION_SEC * 1000) return null;
    if (this.bucket.ms >= 1000) this.flushBucket();
    const measured = this.spmMs >= MIN_MEASURED_SEC * 1000;
    return {
      id,
      startedAt: this.startedAt,
      durationSec: Math.round(this.activeMs / 1000),
      planName: this.planName,
      avgTarget: Math.round(this.targetSum / this.activeMs),
      avgSpm: measured ? Math.round(this.spmSum / this.spmMs) : null,
      followRate: measured ? this.followMs / this.spmMs : null,
      steps: this.sawSteps ? this.stepsOffset + this.lastSteps : null,
      series: this.series,
    };
  }
}

export interface PeriodSummary {
  count: number;
  totalSec: number;
  /** 按时长加权的平均跟随率；没有任何实测记录时为 null。 */
  followRate: number | null;
}

/** 汇总 sinceMs 之后开始的记录（历史页「最近 7 天」）。 */
export function summarizeSince(records: SessionRecord[], sinceMs: number): PeriodSummary {
  let count = 0;
  let totalSec = 0;
  let followWeighted = 0;
  let followSec = 0;
  for (const r of records) {
    if (r.startedAt < sinceMs) continue;
    count += 1;
    totalSec += r.durationSec;
    if (r.followRate != null) {
      followWeighted += r.followRate * r.durationSec;
      followSec += r.durationSec;
    }
  }
  return { count, totalSec, followRate: followSec > 0 ? followWeighted / followSec : null };
}

/** 存档校验：丢弃结构不对的记录，而不是让历史页崩溃。 */
export function isValidRecord(r: unknown): r is SessionRecord {
  const x = r as SessionRecord;
  return (
    !!x &&
    typeof x.id === 'string' &&
    Number.isFinite(x.startedAt) &&
    Number.isFinite(x.durationSec) &&
    Number.isFinite(x.avgTarget) &&
    (x.planName === null || typeof x.planName === 'string') &&
    (x.avgSpm === null || Number.isFinite(x.avgSpm)) &&
    (x.followRate === null || Number.isFinite(x.followRate)) &&
    (x.steps === null || Number.isFinite(x.steps)) &&
    Array.isArray(x.series)
  );
}
