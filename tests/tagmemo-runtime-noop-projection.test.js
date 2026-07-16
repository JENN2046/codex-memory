'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const { MemoryWriteService } = require('../src/core/MemoryWriteService');
const {
  BOUNDED_MEMORY_TEXT_MAX_LENGTH,
  buildRuntimeNoopProjectionInput,
  createTagMemoRuntimeNoopProjection
} = require('../src/tagmemo/runtime-noop-projection');

function sorted(values) {
  return [...values].sort();
}

function collectKeys(value, keys = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return keys;
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      keys.push(key);
      collectKeys(nested, keys);
    }
  }
  return keys;
}

function assertNoForbiddenProjectionLeak(value) {
  const serialized = JSON.stringify(value);
  for (const fragment of [
    'cm1558-provider-endpoint',
    'cm1558-token-fragment',
    'cm1558-bearer-fragment',
    'cm1558-raw-memory-body',
    'cm1558-private-lifecycle',
    'A:/cm1558/must-not-leak'
  ]) {
    assert.equal(serialized.includes(fragment), false, fragment);
  }

  for (const key of [
    'rawText',
    'rawContent',
    'sourceFile',
    'filePath',
    'provider',
    'apiKey',
    'token',
    'authorization',
    'bearer',
    'privateLifecycleState'
  ]) {
    assert.equal(collectKeys(value).includes(key), false, key);
  }
}

function validRecord(overrides = {}) {
  return {
    memoryId: 'codex-process-cm1558-alpha',
    target: 'process',
    title: 'Checkpoint: CM-1558 runtime no-op projection',
    content: [
      'Checkpoint: deterministic TagMemo runtime no-op projection.',
      'Purpose: compute bounded projection without changing write semantics.',
      'Boundary: no persistence, no public response, no external service call.'
    ].join('\n'),
    evidence: 'CM-1558 bounded source test fixture evidence.',
    tags: ['TagMemo_Runtime', 'runtime-noop', 'tagmemo runtime'],
    ...overrides
  };
}

function validPayload(overrides = {}) {
  return {
    target: 'process',
    title: 'Checkpoint: CM-1558 write path fixture',
    content: [
      'Checkpoint: runtime write path should keep generated TagMemo tags as no-op only.',
      'Purpose: prove projection does not alter durable record tags or public result.',
      'Boundary: local fixture only; no external service call, live proof, or readiness claim.'
    ].join('\n'),
    evidence: 'CM-1558 runtime no-op projection write fixture evidence.',
    tags: ['cm-1558', 'operator-tag'],
    sensitivity: 'none',
    validated: true,
    reusable: false,
    project_id: 'codex-memory',
    workspace_id: 'cm-1558-workspace',
    client_id: 'codex',
    task_id: 'CM-1558',
    conversation_id: 'cm-1558-runtime-noop-projection',
    visibility: 'project',
    retention_policy: 'keep',
    ...overrides
  };
}

function createWriteHarness(overrides = {}) {
  const events = {
    diaryWrites: [],
    shadowUpserts: [],
    vectorUpserts: [],
    chunkIndexes: [],
    auditWrites: [],
    tagMemoProjections: []
  };

  const service = new MemoryWriteService({
    config: {
      defaultRequestSource: 'cm-1558-runtime-test',
      enableShadowWrites: true,
      enableVectorIndex: true,
      ...overrides.config
    },
    executionContextResolver: {
      resolve: () => ({
        agentAlias: 'Codex',
        agentId: 'cm-1558-fixture-agent',
        requestSource: 'cm-1558-runtime-test',
        projectId: 'codex-memory',
        workspaceId: 'cm-1558-workspace',
        clientId: 'codex',
        taskId: 'CM-1558',
        conversationId: 'cm-1558-runtime-noop-projection',
        visibility: 'project',
        retentionPolicy: 'keep'
      }),
      isWritableByCodex: () => true
    },
    tagMemoNoopProjection: overrides.tagMemoNoopProjection,
    tagMemoNoopProjectionObserver: projection => {
      events.tagMemoProjections.push(projection);
    },
    diaryStore: {
      async writeRecord(record) {
        events.diaryWrites.push(record);
        return {
          filePath: '<cm-1558-diary-path>',
          relativePath: '<cm-1558-relative-path>',
          fileContent: '<cm-1558-raw-file-content-redacted>'
        };
      }
    },
    shadowStore: {
      async upsertRecord(record) {
        events.shadowUpserts.push(record);
      },
      async clearReconcileTasks() {},
      async enqueueReconcileTask() {
        throw new Error('unexpected reconcile task in CM-1558 fixture');
      }
    },
    vectorStore: {
      async upsertRecord(record) {
        events.vectorUpserts.push(record);
      }
    },
    chunkIndexingService: {
      async indexRecord(record) {
        events.chunkIndexes.push(record);
      }
    },
    auditLogStore: {
      async appendWriteAudit(event) {
        events.auditWrites.push(event);
      }
    }
  });

  return { service, events };
}

test('CM1558 runtime no-op projection calls deterministic core and stays non-mutating', () => {
  const first = createTagMemoRuntimeNoopProjection(validRecord());
  const second = createTagMemoRuntimeNoopProjection(validRecord());

  assert.deepEqual(first, second);
  assert.equal(first.schemaVersion, 'tagmemo-runtime-noop-projection-v1');
  assert.equal(first.projectionMode, 'runtime_noop');
  assert.equal(first.memoryId, 'memory:codex-process-cm1558-alpha');
  assert.equal(first.rejected, false);
  assert.equal(first.persisted, false);
  assert.equal(first.publicResponse, false);
  assert.equal(first.mutated, false);
  assert.equal(first.providerCalls, 0);
  assert.equal(first.publicMcpExpansion, 0);
  assert.equal(first.tags.length >= 3, true);

  const byLabel = new Map(first.tags.map(tag => [tag.tagLabel, tag]));
  assert.equal(byLabel.get('tagmemo runtime').tagSource, 'explicit_record_tag');
  assert.equal(byLabel.get('tagmemo runtime').confidenceScore, 0.95);

  for (const tag of first.tags) {
    assert.equal(tag.schemaVersion, 'tagmemo-minimal-tag-v1');
    assert.equal(tag.memoryId, first.memoryId);
    assert.equal(tag.confidenceScore >= 0 && tag.confidenceScore <= 1, true);
    assert.doesNotMatch(tag.tagSource, /(provider|api|token|bearer|raw|scan)/i);
  }
});

test('CM1558 runtime no-op projection bounds input and strips raw private fields', () => {
  const record = validRecord({
    content: 'bounded '.repeat(1000),
    rawText: 'cm1558-raw-memory-body',
    sourceFile: 'A:/cm1558/must-not-leak',
    provider: 'cm1558-provider-endpoint',
    token: 'cm1558-token-fragment',
    authorization: 'Bearer cm1558-bearer-fragment',
    privateLifecycleState: 'cm1558-private-lifecycle'
  });
  const projectionInput = buildRuntimeNoopProjectionInput(record);
  const projection = createTagMemoRuntimeNoopProjection(record);

  assert.equal(projectionInput.ok, true);
  assert.equal(
    projectionInput.input.boundedMemoryText.length <= BOUNDED_MEMORY_TEXT_MAX_LENGTH,
    true
  );
  assert.equal(projection.persisted, false);
  assert.equal(projection.publicResponse, false);
  assertNoForbiddenProjectionLeak(projection);
});

test('CM1558 runtime no-op projection returns low-disclosure rejected output', () => {
  const empty = createTagMemoRuntimeNoopProjection(validRecord({
    memoryId: 'codex-process-cm1558-empty',
    title: '',
    content: '',
    evidence: '',
    tags: []
  }));
  assert.equal(empty.rejected, true);
  assert.equal(empty.reason, 'empty_input');
  assert.deepEqual(empty.tags, []);
  assert.equal(empty.lowDisclosure, true);
  assert.equal(empty.persisted, false);
  assert.equal(empty.publicResponse, false);

  const unsafe = createTagMemoRuntimeNoopProjection(validRecord({
    memoryId: 'codex-process-cm1558-unsafe',
    tags: ['cm1558-provider-endpoint']
  }));
  assert.equal(unsafe.rejected, true);
  assert.equal(unsafe.reason, 'forbidden_raw_private_value');
  assertNoForbiddenProjectionLeak(unsafe);
});

test('CM1558 MemoryWriteService invokes no-op projection without persistence or public response change', async () => {
  const { service, events } = createWriteHarness();
  const result = await service.record(validPayload());

  assert.equal(result.decision, 'accepted');
  assert.equal(events.tagMemoProjections.length, 1);
  assert.equal(events.tagMemoProjections[0].projectionMode, 'runtime_noop');
  assert.equal(events.tagMemoProjections[0].persisted, false);
  assert.equal(events.tagMemoProjections[0].publicResponse, false);
  assert.equal(events.tagMemoProjections[0].tags.length > 0, true);

  assert.deepEqual(events.diaryWrites[0].tags, ['cm-1558', 'operator-tag']);
  assert.deepEqual(events.shadowUpserts[0].tags, ['cm-1558', 'operator-tag']);
  assert.deepEqual(events.vectorUpserts[0].tags, ['cm-1558', 'operator-tag']);
  assert.deepEqual(events.chunkIndexes[0].tags, ['cm-1558', 'operator-tag']);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'tags'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'tagMemoProjection'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'tagExtraction'), false);
});

test('CM1558 projection failure does not affect record_memory main path', async () => {
  const { service, events } = createWriteHarness({
    tagMemoNoopProjection: () => {
      throw new Error('cm1558 synthetic projection failure');
    }
  });

  const result = await service.record(validPayload());

  assert.equal(result.decision, 'accepted');
  assert.equal(events.tagMemoProjections.length, 1);
  assert.equal(events.tagMemoProjections[0].rejected, true);
  assert.equal(events.tagMemoProjections[0].reason, 'tagmemo_noop_projection_failed');
  assert.equal(events.diaryWrites.length, 1);
  assert.equal(events.shadowUpserts.length, 1);
  assert.equal(events.vectorUpserts.length, 1);
  assert.equal(events.chunkIndexes.length, 1);
  assert.equal(events.auditWrites[0].decision, 'accepted');
});

test('CM1558 projection failure keeps memory id bounded for observers', () => {
  const { service, events } = createWriteHarness({
    tagMemoNoopProjection: () => {
      throw new Error('cm1558 synthetic projection failure');
    }
  });

  const projection = service.runTagMemoNoopProjection({
    memoryId: 'CM 1558 Raw/ID',
    tags: ['cm-1558']
  });

  assert.equal(projection.rejected, true);
  assert.equal(projection.reason, 'tagmemo_noop_projection_failed');
  assert.equal(projection.memoryId, 'memory:cm-1558-raw-id');
  assert.equal(events.tagMemoProjections[0].memoryId, 'memory:cm-1558-raw-id');
});

test('CM1558 runtime no-op projection does not expand public MCP surface', () => {
  assert.deepEqual(sorted(TOOL_DEFINITIONS.map(tool => tool.name)), sorted([
    'record_memory',
    'search_memory',
    'memory_overview',
    'audit_memory',
  'prepare_memory_context',
'propose_memory_delta',
'validate_memory',
    'tombstone_memory',
    'supersede_memory'
  ]));
  assert.equal(TOOL_DEFINITIONS.length, 9);
});
