import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PLAN_TEMPLATES } from './planTemplates.ts';
import { translations } from '../i18n/resources.ts';
import { clampBpm } from '../audio/CadenceScheduler.ts';

describe('PLAN_TEMPLATES', () => {
  it('has unique ids', () => {
    const ids = PLAN_TEMPLATES.map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('keeps every phase inside the cadence bounds with a sane duration', () => {
    for (const tpl of PLAN_TEMPLATES) {
      assert.ok(tpl.phases.length > 0, tpl.id);
      for (const ph of tpl.phases) {
        assert.equal(clampBpm(ph.bpm), ph.bpm, `${tpl.id}: ${ph.bpm}`);
        assert.ok(Number.isInteger(ph.durationSec) && ph.durationSec >= 10, `${tpl.id}: ${ph.durationSec}`);
      }
    }
  });

  it('resolves every name in both languages', () => {
    for (const lang of Object.keys(translations)) {
      for (const tpl of PLAN_TEMPLATES) {
        for (const key of [tpl.name, tpl.desc, ...tpl.phases.map((p) => p.name)]) {
          assert.equal(typeof translations[lang][key], 'string', `${lang}: ${key}`);
        }
      }
    }
  });

  it('builds intervals ending on a fast rep before the cool-down', () => {
    const phases = PLAN_TEMPLATES.find((t) => t.id === 'intervals').phases;
    assert.equal(phases.filter((p) => p.name === 'template.phase.fast').length, 6);
    assert.equal(phases.filter((p) => p.name === 'template.phase.recover').length, 5);
    assert.equal(phases.at(-2).name, 'template.phase.fast');
  });
});
