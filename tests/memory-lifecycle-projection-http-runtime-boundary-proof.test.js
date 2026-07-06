'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createCodexMemoryApplication } = require('../src/app');
const {
  createStreamableHttpServer,
  SESSION_HEADER
} = require('../src/adapters/codex-mcp/http');
const {
  seedTempStoreBackedLifecycleProjection
} = require('../src/core/MemoryLifecycleProjectionTempStoreProof');

const HTTP_BEARER_TOKEN = 'bounded-cleanup-proof-token';
const INTERNAL_TOMBSTONE_RUNTIME_ENTRY_SOURCE = 'internal-tombstone-runtime-entry';
const INTERNAL_SUPERSEDE_RUNTIME_ENTRY_SOURCE = 'internal-supersede-runtime-entry';

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function createHttpRuntimeHarness() {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-runtime-cleanup-proof-'));
  const app = createCodexMemoryApplication({
    projectBasePath: rootPath,
    dataDir: 'data',
    logsDir: 'logs',
    dailyNoteRootPath: 'daily-notes',
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'http-runtime-cleanup-proof',
    defaultClientId: 'codex',
    defaultRequestSource: 'http-runtime-cleanup-proof',
    embeddingProfileVersion: 'http-runtime-cleanup-proof',
    allowExternalProvider: false,
    enableCandidateCache: true,
    enableEmbeddingCache: true,
    enableLifecycleReadPolicy: true,
    enableVectorIndex: true,
    internalTombstoneRuntimeEntryEnabled: true,
    internalSupersedeRuntimeEntryEnabled: true,
    projectionCleanupAppendAudit: true,
    httpPort: 0
  });
  await app.initialize();
  const httpServer = createStreamableHttpServer({
    app,
    host: '127.0.0.1',
    port: 0,
    mcpPath: '/mcp/codex-memory',
    bearerToken: HTTP_BEARER_TOKEN
  });
  const address = await httpServer.listen();
  return { app, address, httpServer, rootPath };
}

async function cleanupHttpRuntimeHarness({ app, httpServer, rootPath }) {
  if (httpServer?.close) {
    await httpServer.close();
  }
  if (app?.close) {
    await app.close();
  }
  if (rootPath) {
    await fs.rm(rootPath, { recursive: true, force: true });
  }
}

async function initializeHttpSession(address) {
  const response = await fetch(address.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${HTTP_BEARER_TOKEN}`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {}
    })
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.result.serverInfo.name, 'vcp_codex_memory');
  const sessionId = response.headers.get(SESSION_HEADER);
  assert.ok(sessionId);
  return sessionId;
}

async function callHttpTool(address, sessionId, id, name, args) {
  const response = await fetch(address.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${HTTP_BEARER_TOKEN}`,
      [SESSION_HEADER]: sessionId
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: {
        name,
        arguments: args
      }
    })
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.jsonrpc, '2.0');
  assert.equal(payload.id, id);
  return payload.result.structuredContent;
}

function tombstoneHttpPayload(memoryId) {
  return {
    memory_id: memoryId,
    reason: 'http boundary confirmed tombstone rejection proof',
    evidence: 'synthetic http runtime cleanup boundary evidence',
    tombstone_reason: 'http-public-confirm-rejected',
    actor_client_id: 'codex',
    request_source: 'http-runtime-cleanup-proof',
    dry_run: false,
    confirm: true
  };
}

function supersedeHttpPayload(oldMemoryId, newMemoryId) {
  return {
    old_memory_id: oldMemoryId,
    new_memory_id: newMemoryId,
    reason: 'http boundary confirmed supersede rejection proof',
    evidence: 'synthetic http runtime supersede cleanup boundary evidence',
    supersedes_link: oldMemoryId,
    superseded_by_link: newMemoryId,
    actor_client_id: 'codex',
    request_source: 'http-runtime-cleanup-proof',
    dry_run: false,
    confirm: true
  };
}

function tombstoneInternalPayload(memoryId) {
  return {
    memory_id: memoryId,
    reason: 'internal bounded tombstone cleanup proof',
    evidence: 'synthetic internal runtime cleanup boundary evidence',
    tombstone_reason: 'internal-bounded-proof-complete',
    dry_run: false,
    confirm: true
  };
}

function supersedeInternalPayload(oldMemoryId, newMemoryId) {
  return {
    old_memory_id: oldMemoryId,
    new_memory_id: newMemoryId,
    reason: 'internal bounded supersede cleanup proof',
    evidence: 'synthetic internal runtime supersede cleanup boundary evidence',
    supersedes_link: oldMemoryId,
    superseded_by_link: newMemoryId,
    dry_run: false,
    confirm: true
  };
}

function approvedTombstoneRuntimeContext() {
  return {
    executionContext: {
      requestSource: INTERNAL_TOMBSTONE_RUNTIME_ENTRY_SOURCE,
      internalTombstoneRuntimeEntry: true,
      clientId: 'codex'
    }
  };
}

function approvedSupersedeRuntimeContext() {
  return {
    executionContext: {
      requestSource: INTERNAL_SUPERSEDE_RUNTIME_ENTRY_SOURCE,
      internalSupersedeRuntimeEntry: true,
      clientId: 'codex'
    }
  };
}

async function countProjectionTargets(app, memoryId) {
  return app.services.memoryLifecycleProjectionCleanupService.countProjectionTargets({
    memoryId,
    target: 'process',
    includeAuditCounts: true
  });
}

function assertPublicConfirmedMutationRejected(result, toolName, serialized) {
  assert.equal(result.decision, 'rejected');
  assert.equal(result.tool, toolName);
  assert.equal(result.dryRun, true);
  assert.equal(result.mutated, false);
  assert.equal(result.reasonCode, 'public_dry_run_low_disclosure');
  assert.equal(result.confirmGate.confirmRequested, true);
  assert.equal(result.confirmGate.confirmAccepted, false);
  assert.equal(result.confirmGate.confirmedMutationAllowed, false);
  assert.equal(result.policy.durableMutationPerformed, false);
  assert.equal(result.policy.rawStoreScanned, false);
  assert.equal(result.policy.providerCalled, false);
  assert.equal(result.policy.readinessClaimed, false);
  assert.equal(result.approvalRequired, true);
  assert.doesNotMatch(serialized, /Synthetic temp-local chunk/i);
  assert.doesNotMatch(serialized, /internal bounded/i);
  assert.doesNotMatch(serialized, /codex-memory-http-runtime-cleanup-proof/i);
}

test('HTTP public tombstone confirm is rejected while internal bounded runtime cleanup suppresses projections', async () => {
  const harness = await createHttpRuntimeHarness();
  const { app, address, rootPath } = harness;
  const memoryId = 'http-runtime-tombstone-boundary-memory';

  try {
    const sessionId = await initializeHttpSession(address);
    await seedTempStoreBackedLifecycleProjection({
      diaryStore: app.stores.diaryStore,
      shadowStore: app.stores.shadowStore,
      vectorStore: app.stores.vectorStore,
      candidateCacheStore: app.stores.candidateCacheStore,
      auditLogStore: app.stores.auditLogStore,
      memoryId,
      target: 'process',
      status: 'active',
      timestamp: '2026-07-07T00:00:00.000Z'
    });

    const beforePublic = await countProjectionTargets(app, memoryId);
    const publicResult = await callHttpTool(
      address,
      sessionId,
      2,
      'tombstone_memory',
      tombstoneHttpPayload(memoryId)
    );
    const afterPublic = await countProjectionTargets(app, memoryId);
    assertPublicConfirmedMutationRejected(publicResult, 'tombstone_memory', JSON.stringify(publicResult));
    assert.deepEqual(afterPublic, beforePublic);
    assert.equal((await app.stores.shadowStore.getRecord(memoryId)).status, 'active');

    const internalResult = await app.executeInternalTombstone(
      tombstoneInternalPayload(memoryId),
      approvedTombstoneRuntimeContext()
    );
    const afterInternal = await countProjectionTargets(app, memoryId);
    const manifest = await app.stores.shadowStore.getMemoryWriteManifestByMemoryId(memoryId);

    assert.equal(internalResult.decision, 'tombstoned');
    assert.equal(internalResult.mutated, true);
    assert.equal(internalResult.projectionCleanupStatus, 'accepted');
    assert.deepEqual(internalResult.projectionCleanupReport.residualProjectionFamilies, []);
    assert.equal(afterInternal.sqlite_memory_chunks, 0);
    assert.equal(afterInternal.vector_index, 0);
    assert.equal(afterInternal.embedding_cache, 0);
    assert.equal(afterInternal.candidate_cache, 0);
    assert.equal(afterInternal.reconcile_queue, 0);
    assert.equal(afterInternal.degraded_payload, 0);
    assert.equal(manifest.record, null);
    assert.equal((await app.stores.shadowStore.getRecord(memoryId)).status, 'tombstoned');
  } finally {
    await cleanupHttpRuntimeHarness(harness);
  }

  assert.equal(await pathExists(rootPath), false);
});

test('HTTP public supersede confirm is rejected while internal bounded runtime cleanup preserves replacement projections', async () => {
  const harness = await createHttpRuntimeHarness();
  const { app, address, rootPath } = harness;
  const oldMemoryId = 'http-runtime-supersede-old-memory';
  const newMemoryId = 'http-runtime-supersede-new-memory';

  try {
    const sessionId = await initializeHttpSession(address);
    await seedTempStoreBackedLifecycleProjection({
      diaryStore: app.stores.diaryStore,
      shadowStore: app.stores.shadowStore,
      vectorStore: app.stores.vectorStore,
      candidateCacheStore: app.stores.candidateCacheStore,
      auditLogStore: app.stores.auditLogStore,
      memoryId: oldMemoryId,
      target: 'process',
      status: 'active',
      timestamp: '2026-07-07T00:00:00.000Z'
    });
    await seedTempStoreBackedLifecycleProjection({
      diaryStore: app.stores.diaryStore,
      shadowStore: app.stores.shadowStore,
      vectorStore: app.stores.vectorStore,
      candidateCacheStore: app.stores.candidateCacheStore,
      auditLogStore: app.stores.auditLogStore,
      memoryId: newMemoryId,
      target: 'process',
      status: 'proposal',
      timestamp: '2026-07-07T00:00:01.000Z'
    });

    const oldBeforePublic = await countProjectionTargets(app, oldMemoryId);
    const newBeforePublic = await countProjectionTargets(app, newMemoryId);
    const publicResult = await callHttpTool(
      address,
      sessionId,
      3,
      'supersede_memory',
      supersedeHttpPayload(oldMemoryId, newMemoryId)
    );
    assertPublicConfirmedMutationRejected(publicResult, 'supersede_memory', JSON.stringify(publicResult));
    assert.deepEqual(await countProjectionTargets(app, oldMemoryId), oldBeforePublic);
    assert.deepEqual(await countProjectionTargets(app, newMemoryId), newBeforePublic);
    assert.equal((await app.stores.shadowStore.getRecord(oldMemoryId)).status, 'active');
    assert.equal((await app.stores.shadowStore.getRecord(newMemoryId)).status, 'proposal');

    const internalResult = await app.executeInternalSupersede(
      supersedeInternalPayload(oldMemoryId, newMemoryId),
      approvedSupersedeRuntimeContext()
    );
    const oldAfterInternal = await countProjectionTargets(app, oldMemoryId);
    const newAfterInternal = await countProjectionTargets(app, newMemoryId);
    const oldManifest = await app.stores.shadowStore.getMemoryWriteManifestByMemoryId(oldMemoryId);
    const newManifest = await app.stores.shadowStore.getMemoryWriteManifestByMemoryId(newMemoryId);

    assert.equal(internalResult.decision, 'superseded');
    assert.equal(internalResult.mutated, true);
    assert.equal(internalResult.projectionCleanupStatus, 'accepted');
    assert.deepEqual(internalResult.projectionCleanupReport.residualProjectionFamilies, []);
    assert.equal((await app.stores.shadowStore.getRecord(oldMemoryId)).status, 'superseded');
    assert.equal((await app.stores.shadowStore.getRecord(newMemoryId)).status, 'active');
    assert.equal(oldAfterInternal.sqlite_memory_chunks, 0);
    assert.equal(oldAfterInternal.vector_index, 0);
    assert.equal(oldAfterInternal.embedding_cache, 0);
    assert.equal(oldAfterInternal.candidate_cache, 0);
    assert.equal(oldAfterInternal.degraded_payload, 0);
    assert.equal(newAfterInternal.sqlite_memory_chunks, 3);
    assert.equal(newAfterInternal.vector_index, 1);
    assert.equal(newAfterInternal.embedding_cache, 3);
    assert.equal(newAfterInternal.candidate_cache, 1);
    assert.equal(newAfterInternal.degraded_payload, 1);
    assert.equal(oldManifest.record, null);
    assert.notEqual(newManifest.record, null);
  } finally {
    await cleanupHttpRuntimeHarness(harness);
  }

  assert.equal(await pathExists(rootPath), false);
});
