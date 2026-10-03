import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CadenceEstimator,
  SessionRecorder,
  summarizeSince,
  isValidRecord,
  STALE_MS,
  MIN_SESSION_SEC,
  SERIES_STEP_SEC,
} from './sessionStats.ts';

// 以固定步频生成每秒一次的累计步数上报。
function feed(est, spm, fromMs, toMs, stepsAtFrom = 0) {
  let steps = stepsAtFrom;
  for (let t = fromMs; t <= toMs; t += 1000) {
    steps = stepsAtFrom + Math.round(((t - fromMs) / 60_000) * spm);
    est.push(steps, t);
  }
  return steps;
}

describe('CadenceEstimator', () => {
  it('reports null until the window spans a few seconds', () => {
    const est = new CadenceEstimator();
    est.push(0, 0);
    est.push(3, 1000);
    assert.equal(est.spm(1000), null);
  });

  it('measures a steady cadence', () => {
    const est = new CadenceEstimator();
    feed(est, 180, 0, 20_000);
    assert.equal(est.spm(20_000), 180);
  });

  it('follows a cadence change within the window', () => {
    const est = new CadenceEstimator();
    const steps = feed(est, 160, 0, 30_000);
    feed(est, 190, 30_000, 60_000, steps);
    // 夹具按整秒取整步数（类似 iOS 批量上报），允许 ±2 的量化误差。
    assert.ok(Math.abs(est.spm(60_000) - 190) <= 2);
  });

  it('goes null once steps stop arriving', () => {
    const est = new CadenceEstimator();
    feed(est, 180, 0, 10_000);
    assert.equal(est.spm(10_000 + STALE_MS + 1), null);
  });

  it('ignores walking-pace noise below the running floor', () => {
    const est = new CadenceEstimator();
    feed(est, 30, 0, 20_000);
    assert.equal(est.spm(20_000), null);
  });

  it('restarts cleanly when the sensor count resets', () => {
    const est = new CadenceEstimator();
    feed(est, 180, 0, 20_000);
    est.push(0, 21_000);
    assert.equal(est.spm(21_000), null);
  });
});

function run(rec, { fromMs, toMs, target, spm, playing = true }) {
  for (let t = fromMs; t <= toMs; t += 1000) rec.sample(t, playing, target, spm);
}

describe('SessionRecorder', () => {
  it('drops sessions shorter than the minimum', () => {
    const rec = new SessionRecorder(0, null);
    run(rec, { fromMs: 0, toMs: (MIN_SESSION_SEC - 5) * 1000, target: 180, spm: 180 });
    assert.equal(rec.finish('x'), null);
  });

  it('computes averages and a perfect follow rate', () => {
    const rec = new SessionRecorder(1000, 'Plan');
    run(rec, { fromMs: 0, toMs: 120_000, target: 180, spm: 182 });
    const r = rec.finish('a');
    assert.equal(r.durationSec, 120);
    assert.equal(r.avgTarget, 180);
    assert.equal(r.avgSpm, 182);
    assert.equal(r.followRate, 1);
    assert.equal(r.planName, 'Plan');
    assert.equal(r.steps, null);
    assert.ok(isValidRecord(r));
  });

  it('counts only the in-tolerance share as followed', () => {
    const rec = new SessionRecorder(0, null);
    run(rec, { fromMs: 0, toMs: 60_000, target: 180, spm: 180 });
    run(rec, { fromMs: 61_000, toMs: 120_000, target: 180, spm: 170 });
    const r = rec.finish('b');
    assert.ok(Math.abs(r.followRate - 0.5) < 0.02, String(r.followRate));
  });

  it('does not count paused time', () => {
    const rec = new SessionRecorder(0, null);
    run(rec, { fromMs: 0, toMs: 60_000, target: 180, spm: null });
    rec.sample(61_000, false, 180, null);
    run(rec, { fromMs: 600_000, toMs: 630_000, target: 180, spm: null });
    const r = rec.finish('c');
    assert.equal(r.durationSec, 90);
    assert.equal(r.avgSpm, null);
    assert.equal(r.followRate, null);
  });

  it('caps a single long gap from a stalled timer', () => {
    const rec = new SessionRecorder(0, null);
    rec.sample(0, true, 180, null);
    rec.sample(500_000, true, 180, null);
    assert.ok(rec.activeSec <= 3);
  });

  it('weights the average target by time and samples a series', () => {
    const rec = new SessionRecorder(0, null);
    run(rec, { fromMs: 0, toMs: 60_000, target: 170, spm: null });
    run(rec, { fromMs: 61_000, toMs: 180_000, target: 185, spm: null });
    const r = rec.finish('d');
    assert.equal(r.avgTarget, 180);
    assert.ok(Math.abs(r.series.length - r.durationSec / SERIES_STEP_SEC) <= 1);
    assert.equal(r.series[0].target, 170);
    assert.equal(r.series.at(-1).target, 185);
  });

  it('stitches step counts across sensor restarts', () => {
    const rec = new SessionRecorder(0, null);
    rec.addSteps(100);
    rec.addSteps(250);
    rec.addSteps(40); // sensor restarted after a pause
    run(rec, { fromMs: 0, toMs: 70_000, target: 180, spm: null });
    assert.equal(rec.finish('e').steps, 290);
  });
});

describe('summarizeSince', () => {
  it('sums recent sessions and time-weights the follow rate', () => {
    const base = { planName: null, avgTarget: 180, avgSpm: 180, steps: null, series: [] };
    const records = [
      { ...base, id: '1', startedAt: 100, durationSec: 600, followRate: 1 },
      { ...base, id: '2', startedAt: 200, durationSec: 1800, followRate: 0.6 },
      { ...base, id: '3', startedAt: 300, durationSec: 300, followRate: null, avgSpm: null },
      { ...base, id: '0', startedAt: 10, durationSec: 999, followRate: 0 },
    ];
    const s = summarizeSince(records, 50);
    assert.equal(s.count, 3);
    assert.equal(s.totalSec, 2700);
    assert.ok(Math.abs(s.followRate - 0.7) < 1e-9);
  });

  it('rejects malformed records', () => {
    assert.equal(isValidRecord({ id: 'x' }), false);
    assert.equal(isValidRecord(null), false);
  });
});
