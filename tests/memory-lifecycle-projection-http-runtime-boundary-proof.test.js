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
const {
  RECEIPT_SCHEMA_VERSION,
  buildAuthenticatedHttpBoundedMutationProofReceipt
} = require('../src/core/AuthenticatedHttpBoundedMutationProofReceipt');

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

function assertAcceptedReceipt(receipt, {
  mutationFamily,
  publicToolName,
  targetCategory,
  forbiddenValues = []
}) {
  assert.equal(receipt.schemaVersion, RECEIPT_SCHEMA_VERSION);
  assert.equal(receipt.receiptType, 'authenticated_http_bounded_mutation_proof');
  assert.equal(receipt.accepted, true);
  assert.equal(receipt.decision, 'AUTHENTICATED_HTTP_BOUNDED_MUTATION_PROOF_ACCEPTED_NOT_READY');
  assert.equal(receipt.mutationFamily, mutationFamily);
  assert.equal(receipt.publicToolName, publicToolName);
  assert.equal(receipt.targetCategory, targetCategory);
  assert.deepEqual(receipt.blockers, []);
  assert.equal(receipt.disclosure.lowDisclosure, true);
  assert.equal(receipt.disclosure.rawContentIncluded, false);
  assert.equal(receipt.disclosure.rawResponseIncluded, false);
  assert.equal(receipt.disclosure.rawErrorIncluded, false);
  assert.equal(receipt.disclosure.endpointOrLocatorIncluded, false);
  assert.equal(receipt.disclosure.pathIncluded, false);
  assert.equal(receipt.disclosure.memoryIdIncluded, false);
  assert.equal(receipt.disclosure.secretIncluded, false);
  assert.equal(receipt.disclosure.tokenIncluded, false);
  assert.equal(receipt.publicHttpBoundary.authenticatedHttpRuntimeObserved, true);
  assert.equal(receipt.publicHttpBoundary.publicConfirmedMutationAttempted, true);
  assert.equal(receipt.publicHttpBoundary.publicPathRejected, true);
  assert.equal(receipt.publicHttpBoundary.publicMutationPerformed, false);
  assert.equal(receipt.publicHttpBoundary.approvalRequired, true);
  assert.equal(receipt.publicHttpBoundary.countsChanged, false);
  if (mutationFamily === 'supersede_memory') {
    assert.equal(receipt.publicHttpBoundary.replacementCountsChanged, false);
  }
  assert.equal(receipt.internalRuntimeBoundary.internalBoundedPathObserved, true);
  assert.equal(receipt.internalRuntimeBoundary.internalMutationPerformed, true);
  assert.equal(receipt.internalRuntimeBoundary.projectionCleanupAccepted, true);
  assert.equal(receipt.internalRuntimeBoundary.residualProjectionFamiliesBucket, 'zero');
  assert.equal(receipt.internalRuntimeBoundary.targetProjectionResidualsCleared, true);
  assert.equal(receipt.safety.tempLocalOnly, true);
  assert.equal(receipt.safety.syntheticOnly, true);
  assert.equal(receipt.safety.providerCalls, 0);
  assert.equal(receipt.safety.publicMcpExpansion, false);
  assert.equal(receipt.safety.durablePrivateMemoryWrite, false);
  assert.equal(receipt.safety.rawStoreScan, false);
  assert.equal(receipt.safety.readinessClaimed, false);
  assert.equal(receipt.safety.releaseClaimed, false);
  assert.equal(receipt.safety.rcReadyClaimed, false);

  const serialized = JSON.stringify(receipt);
  assert.doesNotMatch(serialized, /https?:\/\//i);
  assert.doesNotMatch(serialized, /Authorization/i);
  assert.doesNotMatch(serialized, /Bearer\s+/i);
  assert.doesNotMatch(serialized, /Synthetic temp-local chunk/i);
  for (const value of forbiddenValues) {
    assert.equal(serialized.includes(value), false, value);
  }
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
    const receipt = buildAuthenticatedHttpBoundedMutationProofReceipt({
      mutationFamily: 'tombstone_memory',
      publicToolName: 'tombstone_memory',
      authenticatedHttpRuntimeObserved: true,
      tempLocalOnly: true,
      syntheticOnly: true,
      publicConfirmedMutationAttempted: true,
      publicResult,
      beforePublicCounts: beforePublic,
      afterPublicCounts: afterPublic,
      internalResult,
      afterInternalCounts: afterInternal
    });

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
    assertAcceptedReceipt(receipt, {
      mutationFamily: 'tombstone_memory',
      publicToolName: 'tombstone_memory',
      targetCategory: 'single_target',
      forbiddenValues: [memoryId]
    });
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
    const oldAfterPublic = await countProjectionTargets(app, oldMemoryId);
    const newAfterPublic = await countProjectionTargets(app, newMemoryId);
    assertPublicConfirmedMutationRejected(publicResult, 'supersede_memory', JSON.stringify(publicResult));
    assert.deepEqual(oldAfterPublic, oldBeforePublic);
    assert.deepEqual(newAfterPublic, newBeforePublic);
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
    const receipt = buildAuthenticatedHttpBoundedMutationProofReceipt({
      mutationFamily: 'supersede_memory',
      publicToolName: 'supersede_memory',
      authenticatedHttpRuntimeObserved: true,
      tempLocalOnly: true,
      syntheticOnly: true,
      publicConfirmedMutationAttempted: true,
      publicResult,
      beforePublicCounts: oldBeforePublic,
      afterPublicCounts: oldAfterPublic,
      replacementBeforePublicCounts: newBeforePublic,
      replacementAfterPublicCounts: newAfterPublic,
      internalResult,
      afterInternalCounts: oldAfterInternal,
      replacementAfterInternalCounts: newAfterInternal
    });

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
    assert.equal(receipt.internalRuntimeBoundary.replacementProjectionRetained, true);
    assertAcceptedReceipt(receipt, {
      mutationFamily: 'supersede_memory',
      publicToolName: 'supersede_memory',
      targetCategory: 'pair_target',
      forbiddenValues: [oldMemoryId, newMemoryId]
    });
  } finally {
    await cleanupHttpRuntimeHarness(harness);
  }

  assert.equal(await pathExists(rootPath), false);
});
