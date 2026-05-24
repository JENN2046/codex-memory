const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { MemoryWriteService } = require('../src/core/MemoryWriteService');
const { SqliteShadowStore } = require('../src/storage/SqliteShadowStore');

const runtimeScope = Object.freeze({
  projectId: 'codex-memory',
  workspaceId: 'cm-0891-write-preflight-workspace',
  clientId: 'codex',
  taskId: 'CM-0891',
  conversationId: 'write-preflight-candidate-source',
  visibility: 'project',
  retentionPolicy: 'keep'
});

function baseRecord(overrides = {}) {
  return {
    memoryId: 'cm-0891-base-record',
    target: 'process',
    title: 'Checkpoint: CM-0891 write preflight candidate source',
    content: [
      'Checkpoint: exact-scope candidate source helper fixture.',
      'Purpose: bound duplicate suppression to exact target and exact runtime scope.',
      'Boundary: local temp store only; no real memory, no provider, no readiness claim.'
    ].join('\n'),
    evidence: 'CM-0891 bounded exact-scope candidate source evidence.',
    tags: ['cm-0891', 'write-preflight'],
    validated: true,
    reusable: false,
    sensitivity: 'none',
    createdAt: '2026-05-24T00:00:00.000Z',
    updatedAt: '2026-05-24T00:00:00.000Z',
    projectId: runtimeScope.projectId,
    workspaceId: runtimeScope.workspaceId,
    clientId: runtimeScope.clientId,
    taskId: runtimeScope.taskId,
    conversationId: runtimeScope.conversationId,
    visibility: runtimeScope.visibility,
    retentionPolicy: runtimeScope.retentionPolicy,
    ...overrides
  };
}

function validProcessPayload(overrides = {}) {
  return {
    target: 'process',
    title: 'Checkpoint: CM-0891 write preflight candidate source',
    content: [
      'Checkpoint: exact-scope candidate source helper fixture.',
      'Purpose: bound duplicate suppression to exact target and exact runtime scope.',
      'Boundary: local temp store only; no real memory, no provider, no readiness claim.'
    ].join('\n'),
    evidence: 'CM-0891 bounded exact-scope candidate source evidence.',
    tags: ['cm-0891', 'write-preflight'],
    sensitivity: 'none',
    validated: true,
    reusable: false,
    project_id: runtimeScope.projectId,
    workspace_id: runtimeScope.workspaceId,
    client_id: runtimeScope.clientId,
    task_id: runtimeScope.taskId,
    conversation_id: runtimeScope.conversationId,
    visibility: runtimeScope.visibility,
    retention_policy: runtimeScope.retentionPolicy,
    ...overrides
  };
}

async function createHarness() {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-write-preflight-helper-'));
  const config = {
    defaultRequestSource: 'cm-0891-runtime-test',
    dbPath: path.join(rootPath, 'shadow', 'memory.sqlite'),
    embeddingFingerprint: 'cm-0891-write-preflight-helper-v1',
    enableShadowWrites: true,
    enableVectorIndex: true
  };
  const shadowStore = new SqliteShadowStore(config);
  const events = {
    diaryWrites: [],
    shadowUpserts: [],
    vectorUpserts: [],
    chunkIndexes: [],
    auditWrites: []
  };

  const originalUpsertRecord = shadowStore.upsertRecord.bind(shadowStore);
  shadowStore.upsertRecord = async record => {
    events.shadowUpserts.push(record);
    return originalUpsertRecord(record);
  };

  const service = new MemoryWriteService({
    config,
    shadowStore,
    executionContextResolver: {
      resolve: () => ({
        agentAlias: 'Codex',
        agentId: 'cm-0891-fixture-agent',
        requestSource: 'cm-0891-runtime-test',
        ...runtimeScope
      }),
      isWritableByCodex: () => true
    },
    writePreflightEnabled: true,
    writePreflightCandidateProvider: async request => shadowStore.getWritePreflightCandidates({
      target: request.proposedWrite.target,
      allowedScope: request.allowedScope
    }),
    diaryStore: {
      async writeRecord(record) {
        events.diaryWrites.push(record);
        return {
          filePath: '<cm-0891-fixture-diary-path>',
          relativePath: '<cm-0891-fixture-relative-path>',
          fileContent: '<cm-0891-fixture-raw-content-redacted>'
        };
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

  async function cleanup() {
    await shadowStore.close();
    await fs.rm(rootPath, { recursive: true, force: true });
  }

  return {
    cleanup,
    events,
    rootPath,
    service,
    shadowStore
  };
}

test('CM-0891 helper returns only exact-scope same-target candidates', async () => {
  const harness = await createHarness();

  try {
    await harness.shadowStore.upsertRecord(baseRecord({
      memoryId: 'same-scope-process'
    }));
    await harness.shadowStore.upsertRecord(baseRecord({
      memoryId: 'same-scope-knowledge',
      target: 'knowledge'
    }));
    await harness.shadowStore.upsertRecord(baseRecord({
      memoryId: 'different-task',
      taskId: 'CM-OTHER'
    }));
    await harness.shadowStore.upsertRecord(baseRecord({
      memoryId: 'different-visibility',
      visibility: 'private'
    }));
    harness.events.shadowUpserts.length = 0;

    const candidates = await harness.shadowStore.getWritePreflightCandidates({
      target: 'process',
      allowedScope: runtimeScope
    });

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].memoryId, 'same-scope-process');
    assert.equal(candidates[0].target, 'process');
    assert.deepEqual(candidates[0].tags, ['cm-0891', 'write-preflight']);
    assert.equal(candidates[0].taskId, runtimeScope.taskId);
    assert.equal(candidates[0].visibility, runtimeScope.visibility);
  } finally {
    await harness.cleanup();
  }
});

test('CM-0891 exact-scope helper can back runtime write preflight duplicate suppression', async () => {
  const harness = await createHarness();

  try {
    await harness.shadowStore.upsertRecord(baseRecord({
      memoryId: 'same-scope-duplicate'
    }));
    harness.events.shadowUpserts.length = 0;

    const result = await harness.service.record(validProcessPayload());

    assert.equal(result.decision, 'rejected');
    assert.match(result.reason, /write preflight rejected: duplicate_suppressed/i);
    assert.equal(result.writePreflight.decision, 'duplicate_suppressed');
    assert.equal(result.writePreflight.matchedCandidateCount, 1);
    assert.equal(harness.events.diaryWrites.length, 0);
    assert.equal(harness.events.shadowUpserts.length, 0);
    assert.equal(harness.events.vectorUpserts.length, 0);
    assert.equal(harness.events.chunkIndexes.length, 0);
    assert.equal(harness.events.auditWrites.length, 1);
    assert.equal(harness.events.auditWrites[0].decision, 'rejected');
  } finally {
    await harness.cleanup();
  }
});

test('CM-0891 exact-scope helper ignores out-of-scope duplicates and preserves accepted write path', async () => {
  const harness = await createHarness();

  try {
    await harness.shadowStore.upsertRecord(baseRecord({
      memoryId: 'different-task-duplicate',
      taskId: 'CM-OTHER'
    }));
    harness.events.shadowUpserts.length = 0;

    const result = await harness.service.record(validProcessPayload());

    assert.equal(result.decision, 'accepted');
    assert.equal(harness.events.diaryWrites.length, 1);
    assert.equal(harness.events.shadowUpserts.length, 1);
    assert.equal(harness.events.vectorUpserts.length, 1);
    assert.equal(harness.events.chunkIndexes.length, 1);
    assert.equal(harness.events.auditWrites.length, 1);

    const records = await harness.shadowStore.listRecords('process');
    assert.equal(records.length, 2);
    assert.deepEqual(
      new Set(records.map(record => record.taskId)),
      new Set(['CM-0891', 'CM-OTHER'])
    );
  } finally {
    await harness.cleanup();
  }
});
