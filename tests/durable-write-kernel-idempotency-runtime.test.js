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

async function collectFiles(rootPath) {
  const output = [];
  async function walk(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        output.push(fullPath);
      }
    }
  }
  await walk(rootPath);
  return output;
}

function processPayload(overrides = {}) {
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
    retention_policy: 'keep',
    ...overrides
  };
}

function recordFromPayload(payload, memoryId, now = new Date().toISOString()) {
  return {
    memoryId,
    target: payload.target,
    title: payload.title,
    content: payload.content,
    evidence: payload.evidence,
    tags: payload.tags,
    sensitivity: payload.sensitivity || 'none',
    validated: payload.validated === true,
    reusable: payload.reusable === true,
    createdAt: now,
    updatedAt: now,
    projectId: payload.project_id,
    workspaceId: payload.workspace_id,
    clientId: payload.client_id,
    taskId: payload.task_id,
    conversationId: payload.conversation_id,
    visibility: payload.visibility,
    retentionPolicy: payload.retention_policy
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
    assert.equal(first.idempotency.lifecycle.committed, true);
    assert.equal(first.idempotency.lifecycle.projected, true);
    assert.equal(first.idempotency.lifecycle.audited, true);

    const manifestAudit = await app.stores.auditLogStore.readSelectedWriteManifestAuditCorrelation({
      memoryId: first.memoryId,
      idempotencyKey: first.idempotency.key,
      canonicalHash: first.idempotency.canonicalHash,
      requestSource: requestContext.executionContext.requestSource
    });
    const serializedManifestAudit = JSON.stringify(manifestAudit);

    assert.equal(manifestAudit.found, true);
    assert.equal(manifestAudit.selectedFieldsOnly, true);
    assert.equal(manifestAudit.rawAuditReturned, false);
    assert.equal(manifestAudit.matchedEventCount, 2);
    assert.equal(manifestAudit.committed.memoryId, first.memoryId);
    assert.equal(manifestAudit.committed.authoritativeStore, 'sqlite');
    assert.equal(manifestAudit.committed.lifecycle.committed, true);
    assert.equal(manifestAudit.committed.lifecycle.projected, true);
    assert.equal(manifestAudit.committed.lifecycle.audited, true);
    assert.equal(manifestAudit.replayed.memoryId, first.memoryId);
    assert.equal(manifestAudit.latest.replayed, true);
    assert.equal(serializedManifestAudit.includes(payload.title), false);
    assert.equal(serializedManifestAudit.includes(payload.content), false);
    assert.equal(serializedManifestAudit.includes(payload.evidence), false);

    const records = await app.stores.shadowStore.listRecords('process');
    assert.equal(records.length, 1);
    assert.equal(records[0].memoryId, first.memoryId);
    assert.equal(records[0].projectId, 'codex-memory');
    const manifest = await app.stores.shadowStore.getMemoryWriteManifestByIdempotencyKey(first.idempotency.key);
    assert.equal(manifest.status, 'committed');
    assert.notEqual(manifest.committedAt, null);
    assert.notEqual(manifest.projectedAt, null);
    assert.notEqual(manifest.auditedAt, null);

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
    assert.equal(overview.shadowSync.writeManifest.lifecycle.sqliteCommitted, 1);
    assert.equal(overview.shadowSync.writeManifest.lifecycle.projected, 1);
    assert.equal(overview.shadowSync.writeManifest.lifecycle.audited, 1);
    assert.equal(overview.shadowSync.recordCount, 1);
  });
});

test('durable write kernel leaves no temp or lock artifacts after atomic projection writes', async () => {
  await withTempApp(async ({ app, rootPath }) => {
    const result = await app.callTool('record_memory', processPayload(), requestContext);
    assert.equal(result.decision, 'accepted');

    await app.stores.candidateCacheStore.set('durable-kernel-atomic-cache-entry', {
      memoryIds: [result.memoryId]
    }, {
      target: 'process',
      memoryIds: [result.memoryId]
    });

    const files = await collectFiles(rootPath);
    const transientArtifacts = files
      .map(filePath => path.basename(filePath))
      .filter(name => name.endsWith('.lock') || name.endsWith('.tmp'));
    assert.deepEqual(transientArtifacts, []);
  });
});

test('durable write kernel commits SQLite authority before diary projection failure', async () => {
  await withTempApp(async ({ app }) => {
    const payload = processPayload({
      title: 'Checkpoint: CM-1174 SQLite authority before diary projection failure',
      content: [
        'Type: checkpoint',
        'CM1174 sqlite authoritative write before diary projection failure marker.',
        'Purpose: prove SQLite keeps the authoritative record when diary projection fails.',
        'Boundary: synthetic temp-local runtime only, no real memory, no provider, no readiness claim.'
      ].join('\n'),
      evidence: 'cm1174 synthetic sqlite authoritative diary projection failure evidence',
      tags: ['cm1174', 'sqlite-authoritative', 'diary-projection-failure'],
      task_id: 'CM-1174',
      conversation_id: 'cm1174-sqlite-authority-before-diary-projection'
    });
    const originalWriteRecord = app.stores.diaryStore.writeRecord.bind(app.stores.diaryStore);
    app.stores.diaryStore.writeRecord = async () => {
      throw new Error('cm1174 synthetic diary projection failure');
    };

    try {
      const result = await app.callTool('record_memory', payload, requestContext);
      assert.equal(result.decision, 'accepted');
      assert.equal(result.success, true);
      assert.equal(result.filePath, null);
      assert.equal(result.shadowWrite.status, 'degraded');
      assert.equal(result.shadowWrite.failures.some(item => item.startsWith('diary:')), true);
      assert.equal(result.idempotency.authoritativeStore, 'sqlite');
      assert.equal(result.idempotency.status, 'degraded');

      const manifest = await app.stores.shadowStore.getMemoryWriteManifestByIdempotencyKey(result.idempotency.key);
      assert.equal(manifest.status, 'degraded');
      assert.notEqual(manifest.committedAt, null);
      assert.notEqual(manifest.projectedAt, null);
      assert.notEqual(manifest.auditedAt, null);
      assert.equal(manifest.record.title, payload.title);
      assert.equal(manifest.record.content, payload.content);
      assert.equal(manifest.record.evidence, payload.evidence);
      assert.equal(manifest.record.filePath, undefined);
      assert.equal(manifest.result.idempotency.status, 'degraded');
      assert.equal(manifest.result.idempotency.lifecycle.committed, true);
      assert.equal(manifest.result.idempotency.lifecycle.projected, true);
      assert.equal(manifest.result.idempotency.lifecycle.audited, true);

      const storedRecord = await app.stores.shadowStore.getRecord(result.memoryId);
      assert.equal(storedRecord.memoryId, result.memoryId);
      assert.equal(storedRecord.title, payload.title);
      assert.equal(storedRecord.projectId, 'codex-memory');
      assert.equal(storedRecord.filePath, null);

      const health = await app.stores.shadowStore.getHealth();
      assert.equal(health.authoritativeStore, 'sqlite');
      assert.equal(health.recordCount, 1);
      assert.equal(health.writeManifest.degraded, 1);
      assert.equal(health.writeManifest.lifecycle.sqliteCommitted, 1);
      assert.equal(health.writeManifest.lifecycle.projected, 1);
      assert.equal(health.writeManifest.lifecycle.audited, 1);
      assert.equal(health.chunkCount >= 1, true);

      const syncingSearch = await app.callTool('search_memory', {
        query: 'CM1174 sqlite authoritative write before diary projection failure marker',
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
      assert.equal(syncingSearch.results.some(item => item.memoryId === result.memoryId), true);

      const afterSyncingSearchHealth = await app.stores.shadowStore.getHealth();
      assert.equal(afterSyncingSearchHealth.recordCount, 1);
      assert.equal(afterSyncingSearchHealth.writeManifest.degraded, 1);

      const readOnlySearch = await app.callTool('search_memory', {
        query: 'CM1174 sqlite authoritative write before diary projection failure marker',
        target: 'process',
        limit: 5,
        include_content: false,
        scope: {
          project_id: 'codex-memory',
          workspace_id: 'durable-write-kernel-temp-workspace',
          client_id: 'codex',
          visibility: 'project'
        }
      }, {
        ...requestContext,
        noTokenReadOnly: true
      });
      assert.equal(readOnlySearch.results.some(item => item.memoryId === result.memoryId), true);
    } finally {
      app.stores.diaryStore.writeRecord = originalWriteRecord;
    }
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

    const manifestAudit = await app.stores.auditLogStore.readSelectedWriteManifestAuditCorrelation({
      memoryId: 'codex-process-pendingmanifest000000000000000001',
      idempotencyKey,
      canonicalHash,
      requestSource: requestContext.executionContext.requestSource
    });
    assert.equal(manifestAudit.found, true);
    assert.equal(manifestAudit.recoveryRequired.memoryId, 'codex-process-pendingmanifest000000000000000001');
    assert.equal(manifestAudit.recoveryRequired.recoveryRequired, true);
    assert.equal(manifestAudit.recoveryRequired.status, 'pending');

    const health = await app.stores.shadowStore.getHealth();
    assert.equal(health.recordCount, 0);
    assert.equal(health.writeManifest.total, 1);
    assert.equal(health.writeManifest.pending, 1);
  });
});

test('durable write kernel can replay a pending manifest from diary into projections', async () => {
  await withTempApp(async ({ app }) => {
    const payload = processPayload();
    const canonicalHash = computeCanonicalWriteHash(payload);
    const idempotencyKey = buildDefaultIdempotencyKey(canonicalHash);
    const memoryId = 'codex-process-recoverymanifest0000000000000001';
    const now = new Date().toISOString();

    await app.stores.shadowStore.beginMemoryWriteManifest({
      idempotencyKey,
      memoryId,
      canonicalHash,
      target: 'process',
      createdAt: now
    });
    await app.stores.diaryStore.writeRecord({
      memoryId,
      target: 'process',
      title: payload.title,
      content: payload.content,
      evidence: payload.evidence,
      tags: payload.tags,
      sensitivity: 'none',
      validated: true,
      reusable: false,
      createdAt: now,
      updatedAt: now,
      projectId: payload.project_id,
      workspaceId: payload.workspace_id,
      clientId: payload.client_id,
      taskId: payload.task_id,
      conversationId: payload.conversation_id,
      visibility: payload.visibility,
      retentionPolicy: payload.retention_policy
    });

    const recovery = await app.services.writeService.recoverPendingWriteManifests({ limit: 10 });
    assert.equal(recovery.attempted, 1);
    assert.equal(recovery.recovered, 1);
    assert.equal(recovery.degraded, 0);

    const recoveredRecord = await app.stores.shadowStore.getRecord(memoryId);
    assert.equal(recoveredRecord.memoryId, memoryId);
    assert.equal(recoveredRecord.projectId, 'codex-memory');

    const manifest = await app.stores.shadowStore.getMemoryWriteManifestByIdempotencyKey(idempotencyKey);
    assert.equal(manifest.status, 'committed');
    assert.equal(manifest.result.idempotency.recovered, true);

    const recoveredManifestAudit = await app.stores.auditLogStore.readSelectedWriteManifestAuditCorrelation({
      memoryId,
      idempotencyKey,
      canonicalHash
    });
    assert.equal(recoveredManifestAudit.found, true);
    assert.equal(recoveredManifestAudit.recovered.memoryId, memoryId);
    assert.equal(recoveredManifestAudit.recovered.status, 'committed');

    const duplicate = await app.callTool('record_memory', payload, requestContext);
    assert.equal(duplicate.decision, 'accepted');
    assert.equal(duplicate.memoryId, memoryId);
    assert.equal(duplicate.idempotency.replayed, true);

    const replayedManifestAudit = await app.stores.auditLogStore.readSelectedWriteManifestAuditCorrelation({
      memoryId,
      idempotencyKey,
      canonicalHash
    });
    assert.equal(replayedManifestAudit.replayed.memoryId, memoryId);
    assert.equal(replayedManifestAudit.latest.replayed, true);

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
    assert.equal(search.results.some(result => result.memoryId === memoryId), true);
  });
});

test('durable write kernel recovers pending manifest from SQLite authority without diary', async () => {
  await withTempApp(async ({ app }) => {
    const payload = processPayload({
      title: 'Checkpoint: CM-1174 pending manifest SQLite authority recovery',
      content: [
        'Type: checkpoint',
        'CM1174 pending manifest sqlite authority recovery marker.',
        'Purpose: prove pending manifest recovery can use SQLite record_json without diary.',
        'Boundary: synthetic temp-local runtime only, no real memory, no provider, no readiness claim.'
      ].join('\n'),
      evidence: 'cm1174 synthetic sqlite authoritative pending recovery evidence',
      tags: ['cm1174', 'sqlite-authoritative', 'pending-recovery'],
      task_id: 'CM-1174',
      conversation_id: 'cm1174-pending-manifest-sqlite-authority-recovery'
    });
    const canonicalHash = computeCanonicalWriteHash(payload);
    const idempotencyKey = buildDefaultIdempotencyKey(canonicalHash);
    const memoryId = 'codex-process-cm1174sqliteauthority00000001';
    const now = new Date().toISOString();
    const record = recordFromPayload(payload, memoryId, now);

    await app.stores.shadowStore.beginMemoryWriteManifest({
      idempotencyKey,
      memoryId,
      canonicalHash,
      target: 'process',
      createdAt: now
    });
    const attach = await app.stores.shadowStore.attachRecordToMemoryWriteManifest({
      idempotencyKey,
      record,
      updatedAt: now
    });
    assert.equal(attach.updated, true);

    const beforeRecovery = await app.stores.shadowStore.getHealth();
    assert.equal(beforeRecovery.recordCount, 1);
    assert.equal(beforeRecovery.chunkCount, 0);
    assert.equal(beforeRecovery.writeManifest.pending, 1);
    assert.equal(beforeRecovery.writeManifest.lifecycle.sqliteCommitted, 1);
    assert.equal(beforeRecovery.writeManifest.lifecycle.pendingRecovery, 1);
    assert.equal(beforeRecovery.writeManifest.lifecycle.projected, 0);
    assert.equal(beforeRecovery.writeManifest.lifecycle.audited, 0);
    assert.equal((await app.stores.vectorStore.getHealth()).vectorCount, 0);

    const cancel = await app.services.writeService.cancelUnrecoverablePendingWriteManifests({ limit: 10 });
    assert.equal(cancel.attempted, 1);
    assert.equal(cancel.cancelled, 0);
    assert.equal(cancel.retained, 1);
    assert.equal(cancel.items[0].reason, 'manifest_record_available');

    const recovery = await app.services.writeService.recoverPendingWriteManifests({ limit: 10 });
    assert.equal(recovery.attempted, 1);
    assert.equal(recovery.recovered, 1);
    assert.equal(recovery.missingDiary, 0);
    assert.equal(recovery.degraded, 0);
    assert.equal(recovery.items[0].status, 'committed');

    const manifest = await app.stores.shadowStore.getMemoryWriteManifestByIdempotencyKey(idempotencyKey);
    assert.equal(manifest.status, 'committed');
    assert.notEqual(manifest.committedAt, null);
    assert.notEqual(manifest.projectedAt, null);
    assert.notEqual(manifest.auditedAt, null);
    assert.equal(manifest.record.title, payload.title);
    assert.equal(manifest.result.idempotency.recovered, true);
    assert.equal(manifest.result.idempotency.lifecycle.committed, true);
    assert.equal(manifest.result.idempotency.lifecycle.projected, true);
    assert.equal(manifest.result.idempotency.lifecycle.audited, true);

    const afterRecovery = await app.stores.shadowStore.getHealth();
    assert.equal(afterRecovery.recordCount, 1);
    assert.equal(afterRecovery.chunkCount >= 1, true);
    assert.equal(afterRecovery.writeManifest.committed, 1);
    assert.equal(afterRecovery.writeManifest.lifecycle.sqliteCommitted, 1);
    assert.equal(afterRecovery.writeManifest.lifecycle.pendingRecovery, 0);
    assert.equal(afterRecovery.writeManifest.lifecycle.projected, 1);
    assert.equal(afterRecovery.writeManifest.lifecycle.audited, 1);
    assert.equal((await app.stores.vectorStore.getHealth()).vectorCount, 1);

    const duplicate = await app.callTool('record_memory', payload, requestContext);
    assert.equal(duplicate.decision, 'accepted');
    assert.equal(duplicate.memoryId, memoryId);
    assert.equal(duplicate.idempotency.replayed, true);
    assert.equal(duplicate.idempotency.recovered, true);

    const search = await app.callTool('search_memory', {
      query: 'CM1174 pending manifest sqlite authority recovery marker',
      target: 'process',
      limit: 5,
      include_content: false,
      scope: {
        project_id: 'codex-memory',
        workspace_id: 'durable-write-kernel-temp-workspace',
        client_id: 'codex',
        visibility: 'project'
      }
    }, {
      ...requestContext,
      noTokenReadOnly: true
    });
    assert.equal(search.results.some(item => item.memoryId === memoryId), true);
  });
});
