import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { prepareOtaUpdate, reloadOtaUpdate } from './otaUpdate.ts';

function createLogger() {
  const entries = [];
  return {
    entries,
    warn(message, error) {
      entries.push({ level: 'warn', message, error });
    },
    error(message, error) {
      entries.push({ level: 'error', message, error });
    },
  };
}

describe('prepareOtaUpdate', () => {
  it('skips update checks when OTA is disabled', async () => {
    const calls = [];
    const result = await prepareOtaUpdate(
      {
        isEnabled: false,
        async checkForUpdateAsync() {
          calls.push('check');
          return { isAvailable: true };
        },
        async fetchUpdateAsync() {
          calls.push('fetch');
        },
        async reloadAsync() {
          calls.push('reload');
        },
      },
      createLogger(),
    );

    assert.equal(result.status, 'disabled');
    assert.deepEqual(calls, []);
  });

  it('does not fetch when no update is available', async () => {
    const calls = [];
    const result = await prepareOtaUpdate(
      {
        isEnabled: true,
        async checkForUpdateAsync() {
          calls.push('check');
          return { isAvailable: false };
        },
        async fetchUpdateAsync() {
          calls.push('fetch');
        },
        async reloadAsync() {
          calls.push('reload');
        },
      },
      createLogger(),
    );

    assert.equal(result.status, 'not-available');
    assert.deepEqual(calls, ['check']);
  });

  it('downloads an available update without reloading immediately', async () => {
    const calls = [];
    const result = await prepareOtaUpdate(
      {
        isEnabled: true,
        async checkForUpdateAsync() {
          calls.push('check');
          return { isAvailable: true };
        },
        async fetchUpdateAsync() {
          calls.push('fetch');
        },
        async reloadAsync() {
          calls.push('reload');
        },
      },
      createLogger(),
    );

    assert.equal(result.status, 'ready');
    assert.deepEqual(calls, ['check', 'fetch']);
  });

  it('logs a readable error when update preparation fails', async () => {
    const logger = createLogger();
    const failure = new Error('network unavailable');
    const result = await prepareOtaUpdate(
      {
        isEnabled: true,
        async checkForUpdateAsync() {
          throw failure;
        },
        async fetchUpdateAsync() {
          throw new Error('should not fetch');
        },
        async reloadAsync() {
          throw new Error('should not reload');
        },
      },
      logger,
    );

    assert.equal(result.status, 'error');
    assert.equal(logger.entries.length, 1);
    assert.equal(logger.entries[0].level, 'error');
    assert.match(logger.entries[0].message, /OTA/);
    assert.equal(logger.entries[0].error, failure);
  });
});

describe('reloadOtaUpdate', () => {
  it('reloads a downloaded OTA update on explicit user action', async () => {
    const calls = [];
    const result = await reloadOtaUpdate(
      {
        isEnabled: true,
        async checkForUpdateAsync() {
          calls.push('check');
          return { isAvailable: false };
        },
        async fetchUpdateAsync() {
          calls.push('fetch');
        },
        async reloadAsync() {
          calls.push('reload');
        },
      },
      createLogger(),
    );

    assert.equal(result.status, 'reloaded');
    assert.deepEqual(calls, ['reload']);
  });
});
