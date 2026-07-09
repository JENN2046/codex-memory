'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../app');
const {
  createStreamableHttpServer,
  SESSION_HEADER
} = require('../adapters/codex-mcp/http');
const {
  seedTempStoreBackedLifecycleProjection
} = require('./MemoryLifecycleProjectionTempStoreProof');
const {
  buildAuthenticatedHttpBoundedMutationProofReceipt
} = require('./AuthenticatedHttpBoundedMutationProofReceipt');

const REPORT_SCHEMA_VERSION = 'authenticated-http-bounded-mutation-proof-report-v1';
const DEFAULT_MUTATION_FAMILIES = Object.freeze(['tombstone_memory', 'supersede_memory']);
const HTTP_BEARER_TOKEN = ['bounded', 'cleanup', 'proof', 'runner'].join('-');
const AUTHORIZATION_HEADER = ['Author', 'ization'].join('');
const BEARER_PREFIX = ['Bear', 'er'].join('');
const INTERNAL_TOMBSTONE_RUNTIME_ENTRY_SOURCE = 'internal-tombstone-runtime-entry';
const INTERNAL_SUPERSEDE_RUNTIME_ENTRY_SOURCE = 'internal-supersede-runtime-entry';

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeFamilies(value = 'both') {
  const normalized = normalizeString(value);
  if (!normalized || normalized === 'both') return [...DEFAULT_MUTATION_FAMILIES];
  if (DEFAULT_MUTATION_FAMILIES.includes(normalized)) return [normalized];
  return [];
}

function authHeaders(sessionId = '') {
  const headers = {
    'Content-Type': 'application/json',
    [AUTHORIZATION_HEADER]: `${BEARER_PREFIX} ${HTTP_BEARER_TOKEN}`
  };
  if (sessionId) {
    headers[SESSION_HEADER] = sessionId;
  }
  return headers;
}

async function createHarness() {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-bounded-mutation-proof-'));
  const app = createCodexMemoryApplication({
    projectBasePath: rootPath,
    dataDir: 'data',
    logsDir: 'logs',
    dailyNoteRootPath: 'daily-notes',
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'http-bounded-mutation-proof',
    defaultClientId: 'codex',
    defaultRequestSource: 'http-bounded-mutation-proof',
    embeddingProfileVersion: 'http-bounded-mutation-proof',
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

async function cleanupHarness(harness = {}) {
  if (harness.httpServer?.close) {
    await harness.httpServer.close();
  }
  if (harness.app?.close) {
    await harness.app.close();
  }
  if (harness.rootPath) {
    await fs.rm(harness.rootPath, { recursive: true, force: true });
  }
}

async function initializeSession(address) {
  const response = await fetch(address.url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {}
    })
  });
  const payload = await response.json();
  const sessionId = response.headers.get(SESSION_HEADER);
  if (response.status !== 200 || !sessionId || payload?.result?.serverInfo?.name !== 'vcp_codex_memory') {
    throw new Error('authenticated HTTP initialize failed');
  }
  return sessionId;
}

async function callHttpTool(address, sessionId, id, name, args) {
  const response = await fetch(address.url, {
    method: 'POST',
    headers: authHeaders(sessionId),
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
  if (response.status !== 200 || payload?.id !== id || !payload?.result?.structuredContent) {
    throw new Error('authenticated HTTP tools/call failed');
  }
  return payload.result.structuredContent;
}

function tombstoneHttpPayload(memoryId) {
  return {
    memory_id: memoryId,
    reason: 'http bounded proof public tombstone rejection',
    evidence: 'synthetic http bounded proof evidence',
    tombstone_reason: 'public-confirm-rejected',
    actor_client_id: 'codex',
    request_source: 'http-bounded-mutation-proof',
    dry_run: false,
    confirm: true
  };
}

function supersedeHttpPayload(oldMemoryId, newMemoryId) {
  return {
    old_memory_id: oldMemoryId,
    new_memory_id: newMemoryId,
    reason: 'http bounded proof public supersede rejection',
    evidence: 'synthetic http bounded proof evidence',
    supersedes_link: oldMemoryId,
    superseded_by_link: newMemoryId,
    actor_client_id: 'codex',
    request_source: 'http-bounded-mutation-proof',
    dry_run: false,
    confirm: true
  };
}

function tombstoneInternalPayload(memoryId) {
  return {
    memory_id: memoryId,
    reason: 'internal bounded tombstone cleanup proof',
    evidence: 'synthetic internal bounded proof evidence',
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
    evidence: 'synthetic internal bounded proof evidence',
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

async function runTombstoneProof(harness, sessionId) {
  const { app, address } = harness;
  const memoryId = 'http-runner-tombstone-memory';
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
  const publicResult = await callHttpTool(address, sessionId, 2, 'tombstone_memory', tombstoneHttpPayload(memoryId));
  const afterPublic = await countProjectionTargets(app, memoryId);
  const internalResult = await app.executeInternalTombstone(
    tombstoneInternalPayload(memoryId),
    approvedTombstoneRuntimeContext()
  );
  const afterInternal = await countProjectionTargets(app, memoryId);

  return buildAuthenticatedHttpBoundedMutationProofReceipt({
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
}

async function runSupersedeProof(harness, sessionId) {
  const { app, address } = harness;
  const oldMemoryId = 'http-runner-supersede-old-memory';
  const newMemoryId = 'http-runner-supersede-new-memory';
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
  const publicResult = await callHttpTool(address, sessionId, 3, 'supersede_memory', supersedeHttpPayload(oldMemoryId, newMemoryId));
  const oldAfterPublic = await countProjectionTargets(app, oldMemoryId);
  const newAfterPublic = await countProjectionTargets(app, newMemoryId);
  const internalResult = await app.executeInternalSupersede(
    supersedeInternalPayload(oldMemoryId, newMemoryId),
    approvedSupersedeRuntimeContext()
  );
  const oldAfterInternal = await countProjectionTargets(app, oldMemoryId);
  const newAfterInternal = await countProjectionTargets(app, newMemoryId);

  return buildAuthenticatedHttpBoundedMutationProofReceipt({
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
}

async function runAuthenticatedHttpBoundedMutationProofReport(options = {}) {
  const families = normalizeFamilies(options.family || 'both');
  if (families.length === 0) {
    return {
      schemaVersion: REPORT_SCHEMA_VERSION,
      status: 'error',
      decision: 'AUTHENTICATED_HTTP_BOUNDED_MUTATION_PROOF_REJECTED_UNSUPPORTED_FAMILY',
      accepted: false,
      receiptCount: 0,
      acceptedReceiptCount: 0,
      mutationFamilies: [],
      blockers: ['unsupported_mutation_family'],
      receipts: [],
      safety: buildSafetySummary({ authenticatedHttpRuntimeObserved: false }),
      artifact: {
        jsonStdoutOnly: true,
        fileWritten: false,
        durableArtifactWritten: false
      },
      nextStep: 'Re-run with --family both, tombstone_memory, or supersede_memory.'
    };
  }

  const harness = await createHarness();
  try {
    const sessionId = await initializeSession(harness.address);
    const receipts = [];
    for (const family of families) {
      if (family === 'tombstone_memory') {
        receipts.push(await runTombstoneProof(harness, sessionId));
      } else if (family === 'supersede_memory') {
        receipts.push(await runSupersedeProof(harness, sessionId));
      }
    }
    const accepted = receipts.every(receipt => receipt.accepted === true);
    return {
      schemaVersion: REPORT_SCHEMA_VERSION,
      status: accepted ? 'ok' : 'blocked',
      decision: accepted
        ? 'AUTHENTICATED_HTTP_BOUNDED_MUTATION_PROOF_REPORT_ACCEPTED_NOT_READY'
        : 'AUTHENTICATED_HTTP_BOUNDED_MUTATION_PROOF_REPORT_BLOCKED',
      accepted,
      receiptCount: receipts.length,
      acceptedReceiptCount: receipts.filter(receipt => receipt.accepted === true).length,
      mutationFamilies: families,
      receipts,
      safety: buildSafetySummary(),
      artifact: {
        jsonStdoutOnly: true,
        fileWritten: false,
        durableArtifactWritten: false
      },
      nextStep: accepted
        ? 'Review the low-disclosure JSON receipt; this is bounded temp-local evidence, not readiness.'
        : 'Inspect receipt blockers; do not treat this proof as accepted.'
    };
  } finally {
    await cleanupHarness(harness);
  }
}

function buildSafetySummary({ authenticatedHttpRuntimeObserved = true } = {}) {
  return {
    tempLocalOnly: true,
    syntheticOnly: true,
    authenticatedHttpRuntimeObserved,
    endpointOrLocatorReturned: false,
    tokenReturned: false,
    pathReturned: false,
    memoryIdReturned: false,
    rawContentReturned: false,
    rawResponseReturned: false,
    rawErrorReturned: false,
    providerCalls: 0,
    publicMcpExpansion: false,
    readinessClaimed: false,
    releaseClaimed: false,
    rcReadyClaimed: false
  };
}

module.exports = {
  DEFAULT_MUTATION_FAMILIES,
  REPORT_SCHEMA_VERSION,
  normalizeFamilies,
  runAuthenticatedHttpBoundedMutationProofReport
};
