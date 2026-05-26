const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const { buildDefaultIdempotencyKey } = require('../src/core/MemoryWriteService');
const { computeCanonicalWriteHash } = require('../src/core/MemoryWriteLifecycleDedupSuppressionPreflight');

const requestContext = {
  executionContext: {
    agentAlias: 'Codex',
    agentId: 'codex-memory-durable-kernel-test',
    requestSource: 'durable-write-kernel-idempotency-runtime-test'
  }
};

async function withTempApp(handler) {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-durable-kernel-'));
  const app = createCodexMemoryApplication({
    projectBasePath: rootPath,
    dailyNoteRootPath: path.join(rootPath, 'dailynote'),
    logsDir: path.join(rootPath, 'logs'),
    dataDir: path.join(rootPath, 'data'),
    enableCandidateCache: false,
    enableEmbeddingCache: true,
    enableVectorIndex: true,
    enableShadowWrites: true,
    enableWriteManifest: true,
    embedDimensions: 32,
    defaultRequestSource: 'durable-write-kernel-idempotency-runtime-test'
  });

  await app.initialize();
  try {
    await handler({ app, rootPath });
  } finally {
    await app.close();
    await fs.rm(rootPath, { recursive: true, force: true });
  }
}

function processPayload() {
  return {
    target: 'process',
    title: 'Checkpoint: durable write kernel idempotency runtime',
    content: [
      'Type: checkpoint',
      'Checkpoint: durable write kernel idempotency runtime integration marker.',
      'Purpose: verify record to search to overview consistency in temp-local stores.',
      'Boundary: synthetic temp-local runtime only, no real memory, no provider, no readiness claim.'
    ].join('\n'),
    evidence: 'durable write kernel idempotency runtime integration evidence',
    validated: true,
    reusable: false,
    tags: ['durable-write-kernel', 'idempotency', 'runtime-integration'],
    sensitivity: 'none',
    project_id: 'codex-memory',
    workspace_id: 'durable-write-kernel-temp-workspace',
    client_id: 'codex',
    task_id: 'CM-DURABLE-KERNEL-BASELINE',
    conversation_id: 'durable-write-kernel-idempotency-runtime',
    visibility: 'project',
    retention_policy: 'keep'
  };
}

test('durable write kernel uses SQLite manifest idempotency across record -> search -> overview', async () => {
  await withTempApp(async ({ app }) => {
    const payload = processPayload();
    const first = await app.callTool('record_memory', payload, requestContext);
    const second = await app.callTool('record_memory', payload, requestContext);

    assert.equal(first.decision, 'accepted');
    assert.equal(second.decision, 'accepted');
    assert.equal(first.memoryId, second.memoryId);
    assert.equal(first.idempotency.authoritativeStore, 'sqlite');
    assert.equal(first.idempotency.replayed, false);
    assert.equal(second.idempotency.replayed, true);

    const records = await app.stores.shadowStore.listRecords('process');
    assert.equal(records.length, 1);
    assert.equal(records[0].memoryId, first.memoryId);
    assert.equal(records[0].projectId, 'codex-memory');

    const search = await app.callTool('search_memory', {
      query: 'durable write kernel idempotency runtime integration marker',
      target: 'process',
      limit: 5,
      include_content: false,
      scope: {
        project_id: 'codex-memory',
        workspace_id: 'durable-write-kernel-temp-workspace',
        client_id: 'codex',
        visibility: 'project'
      }
    }, requestContext);
    assert.equal(search.results.some(result => result.memoryId === first.memoryId), true);

    const overview = await app.callTool('memory_overview', {
      limit: 10,
      auditWindow: 20
    }, requestContext);
    assert.equal(overview.shadowSync.available, true);
    assert.equal(overview.shadowSync.authoritativeStore, 'sqlite');
    assert.equal(overview.shadowSync.writeManifest.total, 1);
    assert.equal(overview.shadowSync.writeManifest.committed, 1);
    assert.equal(overview.shadowSync.recordCount, 1);
  });
});

test('durable write kernel fails closed when matching write manifest is pending recovery', async () => {
  await withTempApp(async ({ app }) => {
    const payload = processPayload();
    const canonicalHash = computeCanonicalWriteHash(payload);
    const idempotencyKey = buildDefaultIdempotencyKey(canonicalHash);

    await app.stores.shadowStore.beginMemoryWriteManifest({
      idempotencyKey,
      memoryId: 'codex-process-pendingmanifest000000000000000001',
      canonicalHash,
      target: 'process'
    });

    const result = await app.callTool('record_memory', payload, requestContext);
    assert.equal(result.decision, 'rejected');
    assert.match(result.reason, /write manifest pending recovery/i);
    assert.equal(result.idempotency.recoveryRequired, true);
    assert.equal(result.idempotency.authoritativeStore, 'sqlite');

    const health = await app.stores.shadowStore.getHealth();
    assert.equal(health.recordCount, 0);
    assert.equal(health.writeManifest.total, 1);
    assert.equal(health.writeManifest.pending, 1);
  });
});
