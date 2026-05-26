const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { MemoryWriteService } = require('../src/core/MemoryWriteService');
const { DiaryStore } = require('../src/storage/DiaryStore');
const { SqliteShadowStore } = require('../src/storage/SqliteShadowStore');
const { VectorIndexStore } = require('../src/storage/VectorIndexStore');
const { AuditLogStore } = require('../src/storage/AuditLogStore');
const { ChunkIndexingService } = require('../src/recall/ChunkIndexingService');

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function createTempLocalHarness() {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-write-evidence-'));
  const config = {
    defaultRequestSource: 'temp-local-write-evidence',
    dailyNoteRootPath: path.join(rootPath, 'daily-notes'),
    dailyNoteExtension: 'md',
    dbPath: path.join(rootPath, 'shadow', 'memory.sqlite'),
    auditLogPath: path.join(rootPath, 'audit', 'write-audit.jsonl'),
    recallLogPath: path.join(rootPath, 'audit', 'recall-audit.jsonl'),
    vectorIndexPath: path.join(rootPath, 'vector', 'index.json'),
    embeddingFingerprint: 'temp-local-write-evidence-v1',
    embedDimensions: 32,
    enableShadowWrites: true,
    enableVectorIndex: true,
    enableEmbeddingCache: true,
    chunkMaxChars: 512,
    chunkOverlapChars: 64
  };

  const diaryStore = new DiaryStore(config);
  const shadowStore = new SqliteShadowStore(config);
  const vectorStore = new VectorIndexStore(config);
  const auditEvents = [];
  const auditLogStore = new AuditLogStore(config);
  const auditLogWrapper = {
    async appendWriteAudit(entry) {
      auditEvents.push(entry);
      await auditLogStore.appendWriteAudit(entry);
    }
  };
  const chunkIndexingService = new ChunkIndexingService({ config, shadowStore, vectorStore });
  const service = new MemoryWriteService({
    config,
    diaryStore,
    shadowStore,
    vectorStore,
    auditLogStore: auditLogWrapper,
    chunkIndexingService,
    executionContextResolver: {
      resolve: () => ({
        agentAlias: 'Codex',
        agentId: 'temp-local-fixture-agent',
        requestSource: 'temp-local-write-evidence-test'
      }),
      isWritableByCodex: () => true
    }
  });

  async function cleanup() {
    await shadowStore.close();
    await fs.rm(rootPath, { recursive: true, force: true });
  }

  return {
    auditEvents,
    cleanup,
    config,
    rootPath,
    service,
    shadowStore,
    vectorStore
  };
}

function processPayload(overrides = {}) {
  return {
    target: 'process',
    title: 'Checkpoint: temp local write reliability evidence',
    content: [
      'Type: temp-local-write-evidence',
      'Checkpoint: synthetic write path coverage in isolated temp workspace.',
      'Boundary: synthetic local files only, no real memory, no provider, no readiness claim.',
      'Scope: project cm0834, task temp-local-write-matrix.'
    ].join('\n'),
    evidence: 'cm0834 temp-local synthetic write path evidence',
    validated: true,
    reusable: false,
    tags: ['codex-memory', 'cm0834', 'temp-local-write'],
    sensitivity: 'none',
    project_id: 'codex-memory',
    workspace_id: 'temp-local-write-evidence-workspace',
    client_id: 'codex',
    task_id: 'CM-0834',
    conversation_id: 'synthetic-temp-local',
    visibility: 'project',
    retention_policy: 'keep',
    ...overrides
  };
}

test('temp-local write evidence persists synthetic payload into isolated stores and cleans up', async () => {
  const harness = await createTempLocalHarness();

  try {
    const result = await harness.service.record(processPayload());

    assert.equal(result.decision, 'accepted');
    assert.equal(result.success, true);
    assert.match(result.memoryId, /^codex-process-/);
    assert.equal(result.shadowWrite.status, 'ok');
    assert.equal(result.target, 'process');
    assert.equal(result.requestSource, 'temp-local-write-evidence-test');
    assert.ok(result.filePath.startsWith(harness.rootPath));
    assert.equal(await pathExists(result.filePath), true);

    const shadowHealth = await harness.shadowStore.getHealth();
    assert.equal(shadowHealth.recordCount, 1);
    assert.equal(shadowHealth.chunkCount >= 1, true);
    assert.equal(shadowHealth.reconcileCount, 0);

    const vectorHealth = await harness.vectorStore.getHealth();
    assert.equal(vectorHealth.vectorCount, 1);
    assert.equal(vectorHealth.embeddingCacheCount >= 1, true);

    assert.equal(harness.auditEvents.length, 1);
    assert.equal(harness.auditEvents[0].decision, 'accepted');
    assert.equal(harness.auditEvents[0].memoryId, result.memoryId);
    assert.equal(harness.auditEvents[0].shadowWrite.status, 'ok');
    assert.equal(await pathExists(harness.config.auditLogPath), true);

    const [record] = await harness.shadowStore.listRecords('process');
    assert.equal(record.projectId, 'codex-memory');
    assert.equal(record.workspaceId, 'temp-local-write-evidence-workspace');
    assert.equal(record.clientId, 'codex');
    assert.equal(record.taskId, 'CM-0834');
    assert.equal(record.conversationId, 'synthetic-temp-local');
    assert.equal(record.visibility, 'project');
    assert.equal(record.retentionPolicy, 'keep');
  } finally {
    await harness.cleanup();
  }

  assert.equal(await pathExists(harness.rootPath), false);
});

test('temp-local write evidence deduplicates duplicate synthetic payloads through write manifest', async () => {
  const harness = await createTempLocalHarness();

  try {
    const first = await harness.service.record(processPayload({
      task_id: 'CM-0835',
      evidence: 'cm0835 duplicate synthetic write path evidence'
    }));
    const second = await harness.service.record(processPayload({
      task_id: 'CM-0835',
      evidence: 'cm0835 duplicate synthetic write path evidence'
    }));

    assert.equal(first.decision, 'accepted');
    assert.equal(second.decision, 'accepted');
    assert.equal(second.reason, 'idempotent replay: existing memory write returned.');
    assert.equal(first.memoryId, second.memoryId);
    assert.equal(first.idempotency.replayed, false);
    assert.equal(second.idempotency.replayed, true);
    assert.equal(second.idempotency.authoritativeStore, 'sqlite');

    const shadowHealth = await harness.shadowStore.getHealth();
    assert.equal(shadowHealth.recordCount, 1);
    assert.equal(shadowHealth.reconcileCount, 0);
    assert.equal(shadowHealth.authoritativeStore, 'sqlite');
    assert.equal(shadowHealth.writeManifest.total, 1);
    assert.equal(shadowHealth.writeManifest.committed, 1);

    const records = await harness.shadowStore.listRecords('process');
    assert.equal(records.length, 1);
    assert.deepEqual(new Set(records.map(record => record.taskId)), new Set(['CM-0835']));
    assert.equal(harness.auditEvents.length, 2);
    assert.deepEqual(harness.auditEvents.map(event => event.decision), ['accepted', 'accepted']);
  } finally {
    await harness.cleanup();
  }

  assert.equal(await pathExists(harness.rootPath), false);
});

test('temp-local write evidence rejects secret-like synthetic pollution before projection', async () => {
  const harness = await createTempLocalHarness();

  try {
    const result = await harness.service.record(processPayload({
      content: [
        'Type: temp-local-write-evidence',
        'Checkpoint: synthetic secret-like pollution rejection.',
        'api_key = ABCDEFGH12345678'
      ].join('\n')
    }));

    assert.equal(result.decision, 'rejected');
    assert.match(result.reason, /high-risk secret-like content/i);
    assert.equal(result.memoryId, null);

    const shadowHealth = await harness.shadowStore.getHealth();
    assert.equal(shadowHealth.recordCount, 0);
    assert.equal(shadowHealth.chunkCount, 0);
    assert.equal(shadowHealth.reconcileCount, 0);

    const vectorHealth = await harness.vectorStore.getHealth();
    assert.equal(vectorHealth.vectorCount, 0);

    assert.equal(harness.auditEvents.length, 1);
    assert.equal(harness.auditEvents[0].decision, 'rejected');
    assert.equal(harness.auditEvents[0].memoryId, null);
  } finally {
    await harness.cleanup();
  }

  assert.equal(await pathExists(harness.rootPath), false);
});

test('temp-local write evidence rejects synthetic bad memory before isolated durable paths', async () => {
  const harness = await createTempLocalHarness();

  try {
    const result = await harness.service.record(processPayload({
      target: 'knowledge',
      title: 'Unvalidated knowledge memory',
      content: 'This synthetic knowledge record lacks reusable validation.',
      reusable: false,
      validated: false
    }));

    assert.equal(result.decision, 'rejected');
    assert.match(result.reason, /knowledge memory requires validated=true and reusable=true/i);
    assert.equal(result.memoryId, null);

    const shadowHealth = await harness.shadowStore.getHealth();
    assert.equal(shadowHealth.recordCount, 0);
    assert.equal(shadowHealth.chunkCount, 0);
    assert.equal(shadowHealth.reconcileCount, 0);

    const vectorHealth = await harness.vectorStore.getHealth();
    assert.equal(vectorHealth.vectorCount, 0);

    assert.equal(harness.auditEvents.length, 1);
    assert.equal(harness.auditEvents[0].decision, 'rejected');
    assert.equal(harness.auditEvents[0].memoryId, null);
  } finally {
    await harness.cleanup();
  }

  assert.equal(await pathExists(harness.rootPath), false);
});
