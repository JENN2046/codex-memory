const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  firstAliasBoolean,
  firstDefinedAliasValue,
  firstNonEmptyAliasString,
  firstNonEmptyNormalizedString,
  normalizeAuditSnapshotRef,
  normalizeLifecycleStatus,
  normalizeMemoryId,
  normalizeRecordId,
  normalizeScopeTuple,
  normalizeSideEffectCounters,
  normalizeVisibilityPolicy,
  sideEffectAliasFlagged,
  sideEffectCounterFlagged,
  sideEffectValueFlagged
} = require('../src/core/FieldAliasNormalizer');

test('firstNonEmptyNormalizedString skips blank aliases without treating numbers as strings', () => {
  assert.equal(firstNonEmptyNormalizedString(null, undefined, '   ', ' value ', 123), 'value');
  assert.equal(firstNonEmptyNormalizedString(123, false, {}), '');
});

test('firstDefinedAliasValue preserves false and zero values', () => {
  const source = {
    camelCase: null,
    snake_case: false,
    count_value: 0
  };

  assert.equal(firstDefinedAliasValue(source, ['camelCase', 'snake_case']), false);
  assert.equal(firstDefinedAliasValue(source, ['missing', 'count_value']), 0);
});

test('firstNonEmptyAliasString skips blank canonical aliases and falls through', () => {
  assert.equal(
    firstNonEmptyAliasString({ memoryId: '   ', memory_id: ' mem-1 ' }, ['memoryId', 'memory_id']),
    'mem-1'
  );
});

test('firstAliasBoolean skips malformed aliases and preserves explicit false', () => {
  assert.equal(
    firstAliasBoolean({ camelCase: '   ', snake_case: true }, ['camelCase', 'snake_case']),
    true
  );
  assert.equal(
    firstAliasBoolean({ camelCase: null, snake_case: false }, ['camelCase', 'snake_case']),
    false
  );
  assert.equal(firstAliasBoolean({ camelCase: 1, snake_case: 'true' }, ['camelCase', 'snake_case']), false);
  assert.equal(firstAliasBoolean(null, ['missing']), false);
});

test('normalizes common memory and record id aliases', () => {
  assert.equal(normalizeMemoryId({ memoryId: '   ', memory_id: ' mem-snake ' }), 'mem-snake');
  assert.equal(normalizeRecordId({ recordId: '   ', record_id: ' rec-snake ' }), 'rec-snake');
  assert.equal(normalizeRecordId({ id: ' generic-id ' }), 'generic-id');
});

test('normalizes lifecycle status and visibility policy aliases', () => {
  assert.equal(normalizeLifecycleStatus({ status: '   ', lifecycle_status: ' ACTIVE ' }), 'active');
  assert.equal(normalizeLifecycleStatus(' TOMBSTONED '), 'tombstoned');
  assert.equal(normalizeVisibilityPolicy({ visibility: '   ', visibility_policy: ' PRIVATE ' }), 'private');
});

test('normalizes scope tuple aliases into canonical camelCase keys', () => {
  assert.deepEqual(normalizeScopeTuple({
    projectId: '   ',
    project_id: 'project-1',
    workspace_id: 'workspace-1',
    client_id: 'client-1',
    task_id: 'task-1',
    conversation_id: 'conversation-1',
    visibility_policy: ' INTERNAL ',
    retention_policy: 'project'
  }), {
    projectId: 'project-1',
    workspaceId: 'workspace-1',
    clientId: 'client-1',
    taskId: 'task-1',
    conversationId: 'conversation-1',
    visibility: 'internal',
    retentionPolicy: 'project'
  });
});

test('normalizes side effect counter aliases while preserving zero', () => {
  assert.deepEqual(normalizeSideEffectCounters({
    providerCalls: null,
    provider_calls: 0,
    durable_memory_writes: 0
  }, {
    counterKeys: ['providerCalls', 'durableMemoryWrites']
  }), {
    providerCalls: 0,
    durableMemoryWrites: 0
  });
});

test('flags string encoded side effect values conservatively', () => {
  assert.equal(sideEffectValueFlagged(true), true);
  assert.equal(sideEffectValueFlagged(1), true);
  assert.equal(sideEffectValueFlagged('1'), true);
  assert.equal(sideEffectValueFlagged(' true '), true);
  assert.equal(sideEffectValueFlagged('unexpected'), true);
  assert.equal(sideEffectValueFlagged(false), false);
  assert.equal(sideEffectValueFlagged(0), false);
  assert.equal(sideEffectValueFlagged('0'), false);
  assert.equal(sideEffectValueFlagged(' false '), false);
  assert.equal(sideEffectValueFlagged('   '), false);
});

test('flags side effect aliases even when an earlier alias is false', () => {
  const counters = {
    providerCalls: false,
    provider_calls: '1',
    readinessClaims: 0,
    readiness_claims: '1'
  };

  assert.equal(sideEffectAliasFlagged(counters, ['providerCalls', 'provider_calls']), true);
  assert.equal(sideEffectCounterFlagged(counters, {
    counterKeys: ['providerCalls', 'readinessClaims']
  }), true);
});

test('normalizes audit snapshot refs from record aliases', () => {
  assert.deepEqual(normalizeAuditSnapshotRef({
    memoryId: '   ',
    memory_id: 'mem-1',
    status: '   ',
    lifecycleStatus: ' STALE ',
    updatedAt: '   ',
    updated_at: '2026-06-01T00:00:00.000Z'
  }), {
    memory_id: 'mem-1',
    status: 'stale',
    updated_at: '2026-06-01T00:00:00.000Z'
  });
});
