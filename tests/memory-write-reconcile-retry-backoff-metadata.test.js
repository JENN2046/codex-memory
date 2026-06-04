'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  SCHEMA_VERSION,
  buildReconcileRetryBackoffMetadata,
  calculateBackoffDelayMs,
  normalizeRetryBackoffPolicy,
  sanitizeErrorCode
} = require('../src/core/MemoryWriteReconcileRetryBackoffMetadata');
const { createCodexMemoryApplication } = require('../src/app');
const { TOOL_DEFINITIONS } = require('../src/core/constants');

function publicToolNames() {
  return TOOL_DEFINITIONS.map(tool => tool.name).sort();
}

test('CM-1067 reconcile retry backoff metadata uses capped exponential delay', () => {
  assert.deepEqual(normalizeRetryBackoffPolicy({
    baseDelayMs: 100,
    maxDelayMs: 500,
    deadLetterAfterAttempts: 4
  }), {
    baseDelayMs: 100,
    maxDelayMs: 500,
    deadLetterAfterAttempts: 4
  });
  assert.equal(calculateBackoffDelayMs(1, { baseDelayMs: 100, maxDelayMs: 500 }), 100);
  assert.equal(calculateBackoffDelayMs(2, { baseDelayMs: 100, maxDelayMs: 500 }), 200);
  assert.equal(calculateBackoffDelayMs(3, { baseDelayMs: 100, maxDelayMs: 500 }), 400);
  assert.equal(calculateBackoffDelayMs(4, { baseDelayMs: 100, maxDelayMs: 500 }), 500);
});

test('CM-1067 reconcile retry backoff metadata records sanitized deferred retry state', () => {
  const metadata = buildReconcileRetryBackoffMetadata({
    failedAt: '2026-05-25T10:00:00.000Z',
    error: new Error('Provider token failed for memoryId codex-process-secret-123'),
    policy: {
      baseDelayMs: 1000,
      maxDelayMs: 10_000,
      deadLetterAfterAttempts: 3
    }
  });

  assert.equal(metadata.schemaVersion, SCHEMA_VERSION);
  assert.equal(metadata.state, 'deferred');
  assert.equal(metadata.attemptCount, 1);
  assert.equal(metadata.firstAttemptAt, '2026-05-25T10:00:00.000Z');
  assert.equal(metadata.lastAttemptAt, '2026-05-25T10:00:00.000Z');
  assert.equal(metadata.nextAttemptAfter, '2026-05-25T10:00:01.000Z');
  assert.equal(metadata.backoffDelayMs, 1000);
  assert.equal(metadata.rawErrorStored, false);
  assert.equal(metadata.automaticStartupWorkerEnabled, false);
  assert.equal(metadata.requiresExplicitReplay, true);
  assert.equal(metadata.lastErrorCode.includes('codex_process_secret'), false);
  assert.equal(JSON.stringify(metadata).includes('Provider token failed'), false);
});

test('CM-1067 reconcile retry backoff metadata reaches dead letter without next attempt', () => {
  const first = buildReconcileRetryBackoffMetadata({
    failedAt: '2026-05-25T10:00:00.000Z',
    error: 'first failure',
    policy: { baseDelayMs: 1000, maxDelayMs: 10_000, deadLetterAfterAttempts: 2 }
  });
  const second = buildReconcileRetryBackoffMetadata({
    previousMetadata: first,
    failedAt: '2026-05-25T10:00:05.000Z',
    error: { code: 'VECTOR_REPLAY_FAILED' },
    policy: { baseDelayMs: 1000, maxDelayMs: 10_000, deadLetterAfterAttempts: 2 }
  });

  assert.equal(first.state, 'deferred');
  assert.equal(second.state, 'dead_letter');
  assert.equal(second.attemptCount, 2);
  assert.equal(second.firstAttemptAt, '2026-05-25T10:00:00.000Z');
  assert.equal(second.lastAttemptAt, '2026-05-25T10:00:05.000Z');
  assert.equal(second.nextAttemptAfter, null);
  assert.equal(second.lastErrorCode, 'vector_replay_failed');
});

test('CM-1067 retry backoff helper does not start app worker or expand public tools', async () => {
  const app = createCodexMemoryApplication({
    projectBasePath: process.cwd(),
    enableShadowWrites: false,
    enableVectorIndex: false
  });

  try {
    assert.ok(app.services.memoryWriteReconcileWorker);
    assert.equal(app.services.memoryWriteReconcileWorker.isRunning(), false);
    assert.deepEqual(publicToolNames(), ['audit_memory', 'memory_overview', 'record_memory', 'search_memory']);
  } finally {
    await app.close();
  }
});

test('CM-1067 error code sanitizer emits bounded lowercase tokens', () => {
  assert.equal(sanitizeErrorCode('  Replay failed: memoryId abc/123!  '), 'reconcile_replay_failed');
  assert.equal(sanitizeErrorCode({ code: 'VECTOR_REPLAY_FAILED' }), 'vector_replay_failed');
  assert.equal(sanitizeErrorCode(''), 'unknown_error');
  assert.equal(sanitizeErrorCode({}), 'unknown_error');
});
