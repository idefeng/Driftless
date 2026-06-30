import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { detectAppLanguage } from './language.ts';

function locale(languageCode, regionCode = null) {
  return { languageCode, regionCode };
}

describe('detectAppLanguage', () => {
  it('uses Chinese for China, Hong Kong, Macau, and Taiwan regions', () => {
    for (const region of ['CN', 'HK', 'MO', 'TW']) {
      assert.equal(detectAppLanguage([locale('en', region)]).language, 'zh');
    }
  });

  it('uses English for non-China regions even when the language is Chinese', () => {
    for (const region of ['US', 'JP', 'SG']) {
      assert.equal(detectAppLanguage([locale('zh', region)]).language, 'en');
    }
  });

  it('falls back to English when region is missing', () => {
    assert.equal(detectAppLanguage([locale('zh')]).language, 'en');
    assert.equal(detectAppLanguage([locale('en')]).language, 'en');
  });

  it('normalizes lowercase and empty locale payloads', () => {
    assert.equal(detectAppLanguage([locale('en', 'cn')]).language, 'zh');
    assert.equal(detectAppLanguage([]).language, 'en');
  });
});
