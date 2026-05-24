const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeInternalRuntimeEntryString,
  getInternalRuntimeEntryArgumentValue,
  buildInternalRuntimeEntryPayload
} = require('../src/core/InternalRuntimeEntryGate');

test('internal runtime entry helpers normalize strings and resolve argument aliases', () => {
  assert.equal(normalizeInternalRuntimeEntryString('  hello  '), 'hello');
  assert.equal(normalizeInternalRuntimeEntryString(null), '');
  assert.equal(
    getInternalRuntimeEntryArgumentValue(
      { memoryId: '  mem-1  ', memory_id: '' },
      ['memory_id', 'memoryId']
    ),
    'mem-1'
  );
});

test('internal runtime entry gate fails closed when disabled', () => {
  const result = buildInternalRuntimeEntryPayload(
    {
      memory_id: 'mem-1',
      reason: 'bounded reason'
    },
    {
      executionContext: {
        requestSource: 'internal-test',
        internalTestRuntimeEntry: true
      }
    },
    {
      enabled: false,
      requestSource: 'internal-test',
      contextFlag: 'internalTestRuntimeEntry',
      entryLabel: 'test',
      requiredStringFields: [
        { name: 'memory_id', keys: ['memory_id', 'memoryId'] },
        { name: 'reason', keys: ['reason'] }
      ],
      fallbackActorClientId: 'codex'
    }
  );

  assert.equal(result.ok, false);
  assert.match(result.reason, /disabled/i);
  assert.equal(result.payload.memory_id, 'mem-1');
  assert.equal(result.payload.actor_client_id, 'codex');
  assert.equal(result.payload.dry_run, true);
});

test('internal runtime entry gate requires approved execution context', () => {
  const result = buildInternalRuntimeEntryPayload(
    {
      memory_id: 'mem-1',
      reason: 'bounded reason',
      dry_run: false,
      confirm: true
    },
    {
      executionContext: {
        requestSource: 'wrong-source',
        internalTestRuntimeEntry: true,
        clientId: 'claude'
      }
    },
    {
      enabled: true,
      requestSource: 'internal-test',
      contextFlag: 'internalTestRuntimeEntry',
      entryLabel: 'test',
      requiredStringFields: [
        { name: 'memory_id', keys: ['memory_id', 'memoryId'] },
        { name: 'reason', keys: ['reason'] }
      ]
    }
  );

  assert.equal(result.ok, false);
  assert.match(result.reason, /approved internal execution context/i);
  assert.equal(result.payload.request_source, 'wrong-source');
  assert.equal(result.payload.actor_client_id, 'claude');
  assert.equal(result.payload.dry_run, false);
  assert.equal(result.payload.confirm, true);
});

test('internal runtime entry gate accepts approved execution context and trims payload fields', () => {
  const result = buildInternalRuntimeEntryPayload(
    {
      memoryId: '  mem-2  ',
      reason: '  bounded reason  ',
      actorClientId: '  manual  '
    },
    {
      executionContext: {
        requestSource: 'internal-test',
        internalTestRuntimeEntry: true,
        clientId: 'codex'
      }
    },
    {
      enabled: true,
      requestSource: 'internal-test',
      contextFlag: 'internalTestRuntimeEntry',
      entryLabel: 'test',
      requiredStringFields: [
        { name: 'memory_id', keys: ['memory_id', 'memoryId'] },
        { name: 'reason', keys: ['reason'] }
      ],
      fallbackActorClientId: 'codex'
    }
  );

  assert.equal(result.ok, true);
  assert.equal(result.payload.memory_id, 'mem-2');
  assert.equal(result.payload.reason, 'bounded reason');
  assert.equal(result.payload.actor_client_id, 'manual');
  assert.equal(result.payload.request_source, 'internal-test');
  assert.equal(result.payload.dry_run, true);
  assert.ok(!Object.prototype.hasOwnProperty.call(result.payload, 'confirm'));
});
