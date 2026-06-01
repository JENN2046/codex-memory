const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  computeCanonicalWriteHash
} = require('../src/core/MemoryWriteLifecycleDedupSuppressionPreflight');
const { ExecutionContextResolver } = require('../src/core/ExecutionContextResolver');
const { MemoryWriteService } = require('../src/core/MemoryWriteService');
const {
  PROOF_MEMORY_RETENTION_POLICY,
  PROOF_MEMORY_TAG,
  PROOF_MEMORY_VISIBILITY
} = require('../src/core/ProofMemoryPolicy');

const runtimeScope = Object.freeze({
  projectId: 'codex-memory',
  workspaceId: 'cm-0838-runtime-preflight-workspace',
  clientId: 'codex',
  taskId: 'CM-0838',
  conversationId: 'write-preflight-runtime-integration',
  visibility: 'project',
  retentionPolicy: 'keep'
});

function createHarness(overrides = {}) {
  const events = {
    candidateProviderCalls: [],
    diaryWrites: [],
    shadowUpserts: [],
    vectorUpserts: [],
    chunkIndexes: [],
    auditWrites: []
  };
  const executionContext = {
    agentAlias: 'Codex',
    agentId: 'cm-0838-fixture-agent',
    requestSource: 'cm-0838-runtime-test',
    ...runtimeScope,
    ...overrides.executionContext
  };
  const candidateProvider = overrides.candidateProvider || (async () => []);

  const service = new MemoryWriteService({
    config: {
      defaultRequestSource: 'cm-0838-runtime-test',
      enableShadowWrites: true,
      enableVectorIndex: true,
      ...overrides.config
    },
    executionContextResolver: {
      resolve: () => executionContext,
      isWritableByCodex: () => true
    },
    writePreflightEnabled: overrides.writePreflightEnabled === true,
    writePreflightCandidateProvider: async request => {
      events.candidateProviderCalls.push(request);
      return candidateProvider(request);
    },
    diaryStore: {
      async writeRecord(record) {
        events.diaryWrites.push(record);
        return {
          filePath: '<cm-0838-fixture-diary-path>',
          relativePath: '<cm-0838-fixture-relative-path>',
          fileContent: '<cm-0838-fixture-raw-content-redacted>'
        };
      }
    },
    shadowStore: {
      async upsertRecord(record) {
        events.shadowUpserts.push(record);
      },
      async clearReconcileTasks() {},
      async enqueueReconcileTask() {
        throw new Error('unexpected reconcile task in CM-0838 fixture');
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

  return { service, events, executionContext };
}

function validProcessPayload(overrides = {}) {
  return {
    target: 'process',
    title: 'Checkpoint: CM-0838 runtime write preflight',
    content: [
      'Checkpoint: bounded runtime write preflight integration fixture.',
      'Purpose: reject duplicate or out-of-scope synthetic writes before durable projection.',
      'Boundary: local fixture only; no real memory scan, no provider, no readiness claim.'
    ].join('\n'),
    evidence: 'CM-0838 bounded candidate-provider stub evidence.',
    tags: ['cm-0838', 'write-preflight'],
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

function validProcessPayloadWithoutScope(overrides = {}) {
  return {
    target: 'process',
    title: 'Checkpoint: context derived write scope',
    content: [
      'Checkpoint: runtime write scope is derived from execution context.',
      'Purpose: keep Codex and Claude memory attribution stable when public payload omits scope.',
      'Boundary: local fixture only; no real memory scan, no provider, no readiness claim.'
    ].join('\n'),
    evidence: 'CM-1267 context-derived write scope fixture evidence.',
    tags: ['cm-1267', 'write-scope'],
    sensitivity: 'none',
    validated: true,
    reusable: false,
    ...overrides
  };
}

test('CM-0838 keeps write preflight default-disabled and preserves current write path', async () => {
  const { service, events } = createHarness({
    writePreflightEnabled: false,
    candidateProvider: async () => {
      throw new Error('candidate provider must not run when preflight is disabled');
    }
  });

  const result = await service.record(validProcessPayload());

  assert.equal(result.decision, 'accepted');
  assert.equal(events.candidateProviderCalls.length, 0);
  assert.equal(events.diaryWrites.length, 1);
  assert.equal(events.shadowUpserts.length, 1);
  assert.equal(events.vectorUpserts.length, 1);
  assert.equal(events.chunkIndexes.length, 1);
  assert.equal(events.auditWrites.length, 1);
  assert.equal(events.auditWrites[0].decision, 'accepted');
});

test('CM-0838 rejects active same-scope duplicate before durable write projection', async () => {
  const payload = validProcessPayload();
  const { service, events } = createHarness({
    writePreflightEnabled: true,
    candidateProvider: async request => [
      {
        memoryId: 'cm-0838-active-duplicate',
        lifecycleStatus: 'active',
        canonicalHash: request.canonicalHash,
        ...payload
      }
    ]
  });

  const result = await service.record(payload);

  assert.equal(result.decision, 'rejected');
  assert.match(result.reason, /write preflight rejected: duplicate_suppressed/i);
  assert.equal(result.writePreflight.decision, 'duplicate_suppressed');
  assert.equal(result.writePreflight.matchedCandidateCount, 1);
  assert.equal(events.candidateProviderCalls.length, 1);
  assert.equal(events.diaryWrites.length, 0);
  assert.equal(events.shadowUpserts.length, 0);
  assert.equal(events.vectorUpserts.length, 0);
  assert.equal(events.chunkIndexes.length, 0);
  assert.equal(events.auditWrites.length, 1);
  assert.equal(events.auditWrites[0].decision, 'rejected');
});

test('CM-0838 derives allowed scope from runtime context and rejects payload scope drift', async () => {
  const { service, events } = createHarness({
    writePreflightEnabled: true
  });

  const result = await service.record(validProcessPayload({
    project_id: 'other-project',
    task_id: 'CM-OTHER'
  }));

  assert.equal(result.decision, 'rejected');
  assert.match(result.reason, /write preflight rejected: scope_mismatch_rejected/i);
  assert.equal(result.writePreflight.scopeMismatchCount, 2);
  assert.equal(events.candidateProviderCalls.length, 1);
  assert.equal(events.candidateProviderCalls[0].allowedScope.projectId, runtimeScope.projectId);
  assert.equal(events.diaryWrites.length, 0);
  assert.equal(events.shadowUpserts.length, 0);
  assert.equal(events.vectorUpserts.length, 0);
  assert.equal(events.chunkIndexes.length, 0);
  assert.equal(events.auditWrites.length, 1);
});

test('write runtime persists execution-context scope before conflicting payload scope', async () => {
  const { service, events } = createHarness({
    writePreflightEnabled: false
  });

  const result = await service.record(validProcessPayload({
    project_id: 'payload-project',
    workspace_id: 'payload-workspace',
    client_id: 'claude',
    task_id: 'CM-PAYLOAD',
    conversation_id: 'payload-conversation',
    visibility: 'private',
    retention_policy: 'payload-retention'
  }));

  assert.equal(result.decision, 'accepted');
  assert.equal(events.shadowUpserts.length, 1);
  assert.equal(events.shadowUpserts[0].projectId, runtimeScope.projectId);
  assert.equal(events.shadowUpserts[0].workspaceId, runtimeScope.workspaceId);
  assert.equal(events.shadowUpserts[0].clientId, runtimeScope.clientId);
  assert.equal(events.shadowUpserts[0].taskId, runtimeScope.taskId);
  assert.equal(events.shadowUpserts[0].conversationId, runtimeScope.conversationId);
  assert.equal(events.shadowUpserts[0].visibility, runtimeScope.visibility);
  assert.equal(events.shadowUpserts[0].retentionPolicy, runtimeScope.retentionPolicy);
  assert.equal(events.diaryWrites[0].clientId, runtimeScope.clientId);
  assert.equal(events.auditWrites[0].decision, 'accepted');
});

test('CM-0838 fails closed when bounded candidate provider throws', async () => {
  const { service, events } = createHarness({
    writePreflightEnabled: true,
    candidateProvider: async () => {
      throw new Error('synthetic candidate provider unavailable');
    }
  });

  const result = await service.record(validProcessPayload());

  assert.equal(result.decision, 'rejected');
  assert.match(result.reason, /write_preflight_candidate_provider_failed/i);
  assert.equal(events.diaryWrites.length, 0);
  assert.equal(events.shadowUpserts.length, 0);
  assert.equal(events.vectorUpserts.length, 0);
  assert.equal(events.chunkIndexes.length, 0);
  assert.equal(events.auditWrites.length, 1);
});

test('CM-0838 requires internal exact approval for lifecycle actions before write projection', async () => {
  const { service, events } = createHarness({
    writePreflightEnabled: true
  });

  const result = await service.record(validProcessPayload({
    lifecycleAction: 'tombstone',
    reason: 'synthetic stale memory cleanup',
    tombstoneMemoryId: 'cm-0838-old-memory'
  }));

  assert.equal(result.decision, 'rejected');
  assert.match(result.reason, /write preflight rejected: exact_approval_required/i);
  assert.equal(events.diaryWrites.length, 0);
  assert.equal(events.shadowUpserts.length, 0);
  assert.equal(events.vectorUpserts.length, 0);
  assert.equal(events.chunkIndexes.length, 0);
  assert.equal(events.auditWrites.length, 1);
});

test('CM-0838 passes canonical hash and bounded scope to candidate provider', async () => {
  let capturedRequest = null;
  const payload = validProcessPayload();
  const { service } = createHarness({
    writePreflightEnabled: true,
    candidateProvider: async request => {
      capturedRequest = request;
      return [];
    }
  });

  const result = await service.record(payload);

  assert.equal(result.decision, 'accepted');
  assert.equal(capturedRequest.canonicalHash, computeCanonicalWriteHash(payload));
  assert.deepEqual(capturedRequest.allowedScope, runtimeScope);
  assert.equal(capturedRequest.proposedWrite.content, payload.content);
  assert.equal(capturedRequest.executionContext.projectId, runtimeScope.projectId);
});

test('write runtime derives record scope from execution context when payload omits scope', async () => {
  const events = {
    diaryWrites: [],
    shadowUpserts: [],
    vectorUpserts: [],
    chunkIndexes: [],
    auditWrites: []
  };
  const service = new MemoryWriteService({
    config: {
      defaultAgentId: 'default-agent',
      defaultRequestSource: 'default-source',
      allowedAgentAlias: 'Codex',
      enableShadowWrites: true,
      enableVectorIndex: true
    },
    executionContextResolver: new ExecutionContextResolver({
      defaultAgentId: 'default-agent',
      defaultRequestSource: 'default-source',
      allowedAgentAlias: 'Codex'
    }),
    diaryStore: {
      async writeRecord(record) {
        events.diaryWrites.push(record);
        return {
          filePath: '<cm-1267-fixture-diary-path>',
          relativePath: '<cm-1267-fixture-relative-path>',
          fileContent: '<cm-1267-fixture-raw-content-redacted>'
        };
      }
    },
    shadowStore: {
      async upsertRecord(record) {
        events.shadowUpserts.push(record);
      },
      async clearReconcileTasks() {},
      async enqueueReconcileTask() {
        throw new Error('unexpected reconcile task in CM-1267 fixture');
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

  const result = await service.record(validProcessPayloadWithoutScope(), {
    executionContext: {
      agentAlias: 'Codex',
      agentId: 'codex-desktop',
      requestSource: 'cm-1267-runtime-test',
      projectId: 'context-project',
      workspaceId: 'context-workspace',
      clientId: 'claude',
      taskId: 'CM-1267',
      conversationId: 'context-conversation',
      visibility: 'private',
      retentionPolicy: 'keep'
    }
  });

  assert.equal(result.decision, 'accepted');
  assert.equal(events.shadowUpserts.length, 1);
  assert.equal(events.shadowUpserts[0].projectId, 'context-project');
  assert.equal(events.shadowUpserts[0].workspaceId, 'context-workspace');
  assert.equal(events.shadowUpserts[0].clientId, 'claude');
  assert.equal(events.shadowUpserts[0].taskId, 'CM-1267');
  assert.equal(events.shadowUpserts[0].conversationId, 'context-conversation');
  assert.equal(events.shadowUpserts[0].visibility, 'private');
  assert.equal(events.shadowUpserts[0].retentionPolicy, 'keep');
  assert.equal(events.diaryWrites[0].clientId, 'claude');
  assert.equal(events.auditWrites[0].decision, 'accepted');
});

test('write runtime falls through blank execution-context camel scope to snake-case scope', async () => {
  const { service, events } = createHarness({
    executionContext: {
      projectId: '   ',
      project_id: 'snake-project',
      workspaceId: '   ',
      workspace_id: 'snake-workspace',
      clientId: '   ',
      client_id: 'claude',
      taskId: '   ',
      task_id: 'CM-SNAKE-SCOPE',
      conversationId: '   ',
      conversation_id: 'snake-conversation',
      visibility: '   ',
      visibility_policy: 'private',
      retentionPolicy: '   ',
      retention_policy: 'snake-retention'
    }
  });

  const result = await service.record(validProcessPayload());

  assert.equal(result.decision, 'accepted');
  assert.equal(events.shadowUpserts.length, 1);
  assert.equal(events.shadowUpserts[0].projectId, 'snake-project');
  assert.equal(events.shadowUpserts[0].workspaceId, 'snake-workspace');
  assert.equal(events.shadowUpserts[0].clientId, 'claude');
  assert.equal(events.shadowUpserts[0].taskId, 'CM-SNAKE-SCOPE');
  assert.equal(events.shadowUpserts[0].conversationId, 'snake-conversation');
  assert.equal(events.shadowUpserts[0].visibility, 'private');
  assert.equal(events.shadowUpserts[0].retentionPolicy, 'snake-retention');
  assert.equal(events.diaryWrites[0].clientId, 'claude');
});

test('write audit normalizes blank result aliases before append', async () => {
  const { service, events } = createHarness();

  await service.writeAudit({
    agentAlias: '   ',
    agent_alias: 'Codex',
    agentId: '',
    agent_id: 'cm-1309-agent',
    decision: 'accepted',
    target: 'process',
    title: 'Checkpoint: write audit alias fallback',
    memoryId: '   ',
    memory_id: 'mem-write-audit-snake',
    reason: 'CM-1309 write audit alias fallback regression',
    filePath: '',
    file_path: '<cm-1309-relative-path>',
    requestSource: '   ',
    request_source: 'cm-1309-write-audit-alias-fallback',
    shadowWrite: { status: 'ok', failures: [] },
    idempotency: {
      authoritativeStore: '',
      authoritative_store: 'sqlite',
      key: '   ',
      idempotency_key: 'memory-write-v1:cm1309',
      canonicalHash: '',
      canonical_hash: 'cm1309-canonical-hash',
      status: 'committed',
      replayed: false,
      recovered: false,
      recoveryRequired: false
    }
  });

  assert.equal(events.auditWrites.length, 1);
  const audit = events.auditWrites[0];
  assert.equal(audit.agentAlias, 'Codex');
  assert.equal(audit.agentId, 'cm-1309-agent');
  assert.equal(audit.memoryId, 'mem-write-audit-snake');
  assert.equal(audit.filePath, '<cm-1309-relative-path>');
  assert.equal(audit.requestSource, 'cm-1309-write-audit-alias-fallback');
  assert.equal(audit.writeManifest.authoritativeStore, 'sqlite');
  assert.equal(audit.writeManifest.idempotencyKey, 'memory-write-v1:cm1309');
  assert.equal(audit.writeManifest.canonicalHash, 'cm1309-canonical-hash');
});

test('CM-1344 write audit projects result aliases through shared normalizer', async () => {
  const { service, events } = createHarness();

  await service.writeAudit({
    agentAlias: '   ',
    agent_alias: 'Codex Alias',
    agentId: '   ',
    agent_id: 'cm-1344-agent',
    decision: 'accepted',
    target: 'knowledge',
    title: 'Checkpoint: CM-1344 write audit shared alias normalizer',
    memoryId: '',
    memory_id: 'mem-cm1344-write-audit',
    reason: 'CM-1344 shared alias normalizer regression',
    filePath: '   ',
    file_path: '<cm-1344-relative-path>',
    requestSource: '',
    request_source: 'cm-1344-write-audit-shared-alias-normalizer',
    idempotency: {
      authoritativeStore: '   ',
      authoritative_store: 'sqlite',
      key: '',
      idempotencyKey: '   ',
      idempotency_key: 'memory-write-v1:cm1344',
      canonicalHash: '   ',
      canonical_hash: 'cm1344-canonical-hash',
      status: 'committed'
    }
  });

  assert.equal(events.auditWrites.length, 1);
  const audit = events.auditWrites[0];
  assert.equal(audit.agentAlias, 'Codex Alias');
  assert.equal(audit.agentId, 'cm-1344-agent');
  assert.equal(audit.memoryId, 'mem-cm1344-write-audit');
  assert.equal(audit.filePath, '<cm-1344-relative-path>');
  assert.equal(audit.requestSource, 'cm-1344-write-audit-shared-alias-normalizer');
  assert.equal(audit.writeManifest.authoritativeStore, 'sqlite');
  assert.equal(audit.writeManifest.idempotencyKey, 'memory-write-v1:cm1344');
  assert.equal(audit.writeManifest.canonicalHash, 'cm1344-canonical-hash');
  assert.equal(audit.writeManifest.status, 'committed');
});

test('write runtime preserves explicit payload proof marker under context-derived ordinary scope', async () => {
  const events = {
    diaryWrites: [],
    shadowUpserts: [],
    vectorUpserts: [],
    chunkIndexes: [],
    auditWrites: []
  };
  const service = new MemoryWriteService({
    config: {
      defaultAgentId: 'default-agent',
      defaultRequestSource: 'default-source',
      allowedAgentAlias: 'Codex',
      enableShadowWrites: true,
      enableVectorIndex: true
    },
    executionContextResolver: new ExecutionContextResolver({
      defaultAgentId: 'default-agent',
      defaultRequestSource: 'default-source',
      allowedAgentAlias: 'Codex'
    }),
    diaryStore: {
      async writeRecord(record) {
        events.diaryWrites.push(record);
        return {
          filePath: '<cm-1268-fixture-diary-path>',
          relativePath: '<cm-1268-fixture-relative-path>',
          fileContent: '<cm-1268-fixture-raw-content-redacted>'
        };
      }
    },
    shadowStore: {
      async upsertRecord(record) {
        events.shadowUpserts.push(record);
      },
      async clearReconcileTasks() {},
      async enqueueReconcileTask() {
        throw new Error('unexpected reconcile task in CM-1268 fixture');
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

  const result = await service.record(validProcessPayloadWithoutScope({
    title: 'Checkpoint: explicit proof marker under context scope',
    evidence: 'CM-1268 explicit proof marker fixture evidence.',
    tags: ['cm-1268', 'write-scope'],
    visibility: PROOF_MEMORY_VISIBILITY
  }), {
    executionContext: {
      agentAlias: 'Codex',
      agentId: 'codex-desktop',
      requestSource: 'cm-1268-runtime-test',
      projectId: 'context-project',
      workspaceId: 'context-workspace',
      clientId: 'codex',
      taskId: 'CM-1268',
      conversationId: 'context-conversation',
      visibility: 'project',
      retentionPolicy: 'keep'
    }
  });

  assert.equal(result.decision, 'accepted');
  assert.equal(result.proofMemory.applied, true);
  assert.equal(events.shadowUpserts.length, 1);
  assert.equal(events.shadowUpserts[0].projectId, 'context-project');
  assert.equal(events.shadowUpserts[0].visibility, PROOF_MEMORY_VISIBILITY);
  assert.equal(events.shadowUpserts[0].retentionPolicy, PROOF_MEMORY_RETENTION_POLICY);
  assert.equal(events.shadowUpserts[0].tags.includes(PROOF_MEMORY_TAG), true);
  assert.equal(events.diaryWrites[0].visibility, PROOF_MEMORY_VISIBILITY);
  assert.equal(events.auditWrites[0].decision, 'accepted');
});
