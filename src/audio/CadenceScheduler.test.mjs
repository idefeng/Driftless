import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import { CadenceScheduler } from './CadenceScheduler.ts';

/** Run the scheduler on mocked timers and collect beat timestamps. */
function collectBeats(setup, runMs) {
  const s = new CadenceScheduler();
  const beats = [];
  s.onBeat((_idx, at) => beats.push(at));
  setup(s);
  // Advance in small steps: one big jump would make Date.now() leap past the
  // scheduler's catch-up cap and (correctly) drop the "missed" beats.
  for (let t = 0; t < runMs; t += 10) mock.timers.tick(10);
  s.stop();
  return beats;
}

const intervals = (beats) => beats.slice(1).map((t, i) => t - beats[i]);

describe('CadenceScheduler', () => {
  beforeEach(() => mock.timers.enable({ apis: ['setInterval', 'setTimeout', 'Date'], now: 0 }));
  afterEach(() => mock.timers.reset());

  it('keeps a steady interval with no drift', () => {
    const beats = collectBeats((s) => s.start(180), 61_000);
    // 180 BPM for 60s → beat 0 at t=0 plus 180 more (last ones land in the look-ahead window)
    assert.ok(beats.length >= 180);
    for (const iv of intervals(beats)) assert.ok(Math.abs(iv - 60000 / 180) < 1e-6);
    // zero cumulative drift: beat n sits exactly at n * interval
    assert.ok(Math.abs(beats[180] - 60_000) < 1e-6);
  });

  it('ramps linearly from the current to the target BPM', () => {
    const beats = collectBeats((s) => {
      s.start(170);
      s.rampTo(190, 10_000);
    }, 14_000);
    const ivs = intervals(beats);
    // monotonically shortening intervals during the ramp
    const during = ivs.filter((_, i) => beats[i] < 10_000);
    for (let i = 1; i < during.length; i++) assert.ok(during[i] <= during[i - 1] + 1e-9);
    // after the ramp: locked to the target rate
    const after = ivs.filter((_, i) => beats[i] > 10_500);
    assert.ok(after.length > 0);
    for (const iv of after) assert.ok(Math.abs(iv - 60000 / 190) < 1e-6);
  });

  it('setBpm cancels an in-flight ramp', () => {
    const beats = collectBeats((s) => {
      s.start(170);
      s.rampTo(200, 20_000);
      setTimeout(() => s.setBpm(160), 2_000);
    }, 6_000);
    const after = intervals(beats).filter((_, i) => beats[i] > 2_500);
    for (const iv of after) assert.ok(Math.abs(iv - 60000 / 160) < 1e-6);
  });

  it('ignores a ramp to the same BPM or while stopped', () => {
    const s = new CadenceScheduler();
    s.rampTo(200, 5_000); // stopped → plain re-rate
    assert.equal(s.currentBpm, 200);
    const beats = collectBeats((sch) => {
      sch.start(180);
      sch.rampTo(180, 5_000);
    }, 3_000);
    for (const iv of intervals(beats)) assert.ok(Math.abs(iv - 60000 / 180) < 1e-6);
  });
});
