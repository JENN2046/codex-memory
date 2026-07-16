'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createVcpToolBoxNativeMemoryAdapter
} = require('../src/core/GovernedMcpVcpNativeVcpToolBoxMcpShim');

function authorization(overrides = {}) {
  return {
    accepted: true,
    mappingReference: 'jenn-vcp-diary-scope-v1',
    mappingDigest: `sha256:${'a'.repeat(64)}`,
    allowedDiaryNames: ['SYNTHETIC_CODEX_PRIVATE'],
    allowedDiaryCount: 1,
    scopeIdAccepted: true,
    scopeIdAudited: true,
    scopeIdFingerprintBound: true,
    ...overrides
  };
}

test('governed native read uses only the selected-diary array search signature', async () => {
  const calls = { initialize: 0, embedding: 0, search: [] };
  const knowledgeBaseManager = {
    async initialize() { calls.initialize += 1; },
    async search(...args) {
      calls.search.push(args);
      assert.equal(Array.isArray(args[0]), true, 'global/non-array search is forbidden');
      return [{ fullPath: 'SYNTHETIC_CODEX_PRIVATE/2026-07-17.md', score: 0.8 }];
    }
  };
  const adapter = createVcpToolBoxNativeMemoryAdapter({
    knowledgeBaseManager,
    embeddingUtils: {
      async getEmbeddingsBatch() {
        calls.embedding += 1;
        return [[0.1, 0.2]];
      }
    }
  });

  const result = await adapter.search(
    { query: 'synthetic bounded query', limit: 1 },
    { authorization: authorization() }
  );

  assert.equal(calls.initialize, 0);
  assert.equal(calls.embedding, 1);
  assert.equal(calls.search.length, 1);
  assert.deepEqual(calls.search[0][0], ['SYNTHETIC_CODEX_PRIVATE']);
  assert.deepEqual(calls.search[0].slice(2), [1, 0, []]);
  assert.equal(result._nativeRuntimeReceipt.authorizationResolvedBeforeProvider, true);
  assert.equal(result._nativeRuntimeReceipt.diaryAllowlistEnforcedBeforeIndexLoad, true);
  assert.equal(result._nativeRuntimeReceipt.diaryAllowlistEnforcedBeforeVectorSearch, true);
  assert.equal(result._nativeRuntimeReceipt.resultScopePostcheckPassed, true);
  assert.equal(result._nativeRuntimeReceipt.unscopedNativeSearchUsed, false);
  assert.equal(result._nativeRuntimeReceipt.allowedDiaryCount, 1);
  assert.equal(result._nativeRuntimeReceipt.rawDiaryNamesReturned, false);
});

test('missing authorization and source mismatch fail before unsafe continuation', async () => {
  const calls = { embedding: 0, search: 0 };
  const adapter = createVcpToolBoxNativeMemoryAdapter({
    knowledgeBaseManager: {
      async search() {
        calls.search += 1;
        return [{ fullPath: 'UNAUTHORIZED_DIARY/entry.md' }];
      }
    },
    embeddingUtils: {
      async getEmbeddingsBatch() {
        calls.embedding += 1;
        return [[0.1]];
      }
    }
  });

  await assert.rejects(() => adapter.search({ query: 'q' }), /native_diary_authorization_required/);
  await assert.rejects(() => adapter.search({ query: '' }), /native_diary_authorization_required/);
  assert.deepEqual(calls, { embedding: 0, search: 0 });

  await assert.rejects(
    () => adapter.search({ query: 'q' }, { authorization: authorization() }),
    /native_result_diary_mismatch/
  );
  assert.deepEqual(calls, { embedding: 1, search: 1 });
});
