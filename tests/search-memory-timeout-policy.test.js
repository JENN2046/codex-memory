'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  runSearchMemoryWithTimeout,
  SearchMemoryTimeoutError
} = require('../src/core/SearchMemoryTimeoutPolicy');

function busyWait(ms) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < ms) {
    // Intentional synchronous event-loop block for timeout boundary evidence.
  }
}

test('runSearchMemoryWithTimeout rejects timeout even when abort listener resolves synchronously', async () => {
  let abortSeen = false;

  await assert.rejects(
    () => runSearchMemoryWithTimeout(({ signal }) => new Promise(resolve => {
      signal.addEventListener('abort', () => {
        abortSeen = true;
        resolve({ late: 'success' });
      }, { once: true });
    }), { timeoutMs: 5 }),
    error => {
      assert.equal(error instanceof SearchMemoryTimeoutError, true);
      assert.equal(error.code, 'SEARCH_MEMORY_TIMEOUT');
      assert.equal(error.jsonRpcCode, -32002);
      assert.equal(error.jsonRpcData.timeoutMs, 5);
      return true;
    }
  );

  assert.equal(abortSeen, true);
});

test('runSearchMemoryWithTimeout documents synchronous operation limitation', async () => {
  const startedAt = Date.now();

  const result = await runSearchMemoryWithTimeout(() => {
    busyWait(20);
    return 'sync-completed';
  }, { timeoutMs: 1 });

  const elapsedMs = Date.now() - startedAt;

  assert.equal(result, 'sync-completed');
  assert.ok(elapsedMs >= 20);
});
