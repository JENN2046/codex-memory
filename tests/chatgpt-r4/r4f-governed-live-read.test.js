'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  COUNTER_MODES,
  InMemoryReplayGuard,
  ZERO_MEMORY_COUNTERS,
  createPrincipalAssertion,
  createRequestEnvelope,
  sha256,
  validateCounters,
  validateResponseEnvelope,
  validateToolStructuredContent
} = require('../../packages/chatgpt-r4-contracts');
const { createRelayProcessor } = require('../../apps/local-recall-relay');
const {
  createGovernedLiveReadInvoker,
  createR4GovernanceRuntime,
  validateProjectRegistry
} = require('../../src/adapters/chatgpt-r4');
const {
  computeGovernanceRuntimeBindingDigest,
  loadGovernanceRuntimeFromEnvironment
} = require('../../src/runtime/chatgpt-r4/governance-runtime-authority');
const {
  createGovernanceUdsServer
} = require('../../src/runtime/chatgpt-r4/governance-uds-server');
const { loadDiaryScopeMapping } = require('../../src/core/DiaryScopeMappingLoader');
const { resolveRead } = require('../../src/core/DiaryScopeMapping');

const NOW = new Date('2026-07-20T10:00:00.000Z');
const ISSUER = 'https://tenant.r4f.example.dev/';
const AUDIENCE = 'https://edge.r4f.example.dev/mcp';

function identity(keyId) {
  const pair = crypto.generateKeyPairSync('ed25519');
  return { keyId, ...pair };
}

function entry(overrides) {
  return {
    partitionReference: 'partition-ref',
    diaryName: 'Synthetic-Diary',
    classification: 'project_shared',
    clientId: null,
    projectId: 'project-alpha',
    workspaceId: 'workspace-alpha',
    readProfiles: ['exact_visibility', 'task_start_context'],
    writeEligible: true,
    ...overrides
  };
}

function mapping() {
  return {
    schemaVersion: 1,
    mappingReference: 'jenn-vcp-diary-scope-v1',
    defaultPolicy: 'deny',
    entries: [
      entry({
        partitionReference: 'codex-private-ref',
        diaryName: 'Synthetic-Codex-Private',
        classification: 'client_private',
        clientId: 'Codex',
        projectId: null,
        workspaceId: null,
        writeEligible: false
      }),
      entry({
        partitionReference: 'claude-private-ref',
        diaryName: 'Synthetic-Claude-Private',
        classification: 'client_private',
        clientId: 'Claude',
        projectId: null,
        workspaceId: null,
        writeEligible: false
      }),
      entry({
        partitionReference: 'alpha-project-ref',
        diaryName: 'Synthetic-Alpha-Project'
      }),
      entry({
        partitionReference: 'alpha-workspace-ref',
        diaryName: 'Synthetic-Alpha-Workspace',
        classification: 'workspace_shared',
        projectId: null,
        workspaceId: 'workspace-alpha'
      })
    ]
  };
}

function registry(mappingState, overrides = {}) {
  return {
    schemaVersion: 1,
    registryReference: 'r4f-project-registry-v1',
    mappingReference: mappingState.mappingReference,
    mappingDigest: mappingState.mappingDigest,
    defaultPolicy: 'deny',
    projects: [{
      safeProjectAlias: 'project-alpha',
      projectId: 'project-alpha',
      workspaceId: 'workspace-alpha',
      allowedVisibilities: ['project', 'workspace', 'shared', 'task_start_context']
    }],
    ...overrides
  };
}

function delegatedResult({
  statement = 'Memory signal 1: bounded recall current-state signal.',
  score = 0.91,
  derivedIndexWritePerformed = false
} = {}) {
  return {
    status: 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATED',
    accepted: true,
    results: [{
      memoryContextProjection: {
        projectionVersion: 1,
        lowDisclosure: true,
        statement,
        classification: 'current_state',
        freshness: 'recent',
        reasonCodes: ['semantic_match'],
        conflict: false
      },
      score
    }],
    access: { localMemoryFallbackUsed: false },
    receipt: {
      localAuditReceipt: { appended: true },
      nativeInvocationReceipt: {
        invocationBindingMatched: true,
        governanceMetadataSent: true,
        governanceMetadataRawValueDisclosed: false,
        endpointDisclosed: false,
        tokenMaterialDisclosed: false,
        rawRequestBodyDisclosed: false,
        rawResponseBodyDisclosed: false,
        nativeRuntimeReceipt: {
          present: true,
          nativeRuntimeCalled: true,
          providerApiCalled: true,
          memoryReadPerformed: true,
          memoryWritePerformed: false,
          durableWritePerformed: derivedIndexWritePerformed,
          durableWriteScope: derivedIndexWritePerformed ? 'isolated_derived_index' : null,
          isolatedRuntimeStoreUsed: true,
          primaryMemoryStoreWritePerformed: false,
          derivedIndexWritePerformed,
          derivedRuntimeMutationPolicy: 'isolated_derived_runtime_mutation_v1',
          derivedRuntimeMutationAccountingMode: 'lifecycle_event_v1',
          derivedRuntimeMutationAuthorized: true,
          derivedRuntimeMutationAccountingFinal: false,
          derivedRuntimeMutationBackgroundTasksDrained: false,
          derivedRuntimeMutationCumulativeCount: derivedIndexWritePerformed ? 1 : 0,
          derivedRuntimeMutationReceiptDelta: derivedIndexWritePerformed ? 1 : 0,
          derivedRuntimeMutationActiveCount: 0,
          derivedRuntimeMutationCompletedCount: derivedIndexWritePerformed ? 1 : 0,
          derivedRuntimeMutationFailedCount: 0,
          derivedRuntimeMutationTriggerCategories:
            derivedIndexWritePerformed ? ['startup'] : [],
          derivedRuntimeMutationZeroClaimed: false,
          derivedRuntimeMutationPolicyViolation: false,
          sourcePartitionMutationPerformed: false,
          legacyPartitionAccessed: false,
          ambiguousPartitionAccessed: false,
          unregisteredPartitionAccessed: false,
          derivedRuntimeMutationRawDetailsDisclosed: false,
          authorizationResolvedBeforeProvider: true,
          diaryAllowlistEnforcedBeforeIndexLoad: true,
          diaryAllowlistEnforcedBeforeVectorSearch: true,
          resultScopePostcheckPassed: true,
          unscopedNativeSearchUsed: false,
          mappingReferenceBound: true,
          mappingDigestBound: true,
          allowedDiaryCount: 1,
          rawDiaryNamesReturned: false,
          vectorRetrievalDiagnosticsMode: 'fail_closed_v1',
          hydratedChunkCount: 1,
          loadedIndexVectorCount: 1,
          queryVectorShapeValid: true,
          queryVectorExpectedDimensionKnown: true,
          queryVectorDimensionMatched: true,
          queryVectorFinite: true,
          queryVectorNonzero: true,
          indexSearchCalled: true,
          indexSearchSucceeded: true,
          rawCandidateCount: 1,
          ghostCandidateCount: 0,
          vectorRetrievalOutcome: 'found',
          vectorRetrievalRawDetailsDisclosed: false,
          rawRuntimeOutputDisclosed: false,
          rawMemoryContentDisclosed: false,
          runtimeLocatorDisclosed: false,
          tokenMaterialDisclosed: false,
          readinessClaimed: false
        }
      }
    }
  };
}

function relayReceipt(request) {
  const { digestObject } = require('../../packages/chatgpt-r4-contracts');
  return {
    schema_version: 1,
    kind: 'chatgpt_r4_relay_receipt',
    request_digest: digestObject(request),
    signature_valid: true,
    replay_guard_passed: true,
    forwarded_over: 'injected_uds_boundary',
    scope_authorized_by_relay: false,
    durable_state_written: false
  };
}

function requestFixture(edge, principal, toolName, args, sequence) {
  return createRequestEnvelope({
    principalAssertion: principal,
    toolName,
    toolArguments: args,
    now: NOW,
    requestId: `req_r4f_governed_x${String(sequence).padStart(10, '0')}`,
    nonce: `r4f_request_nonce_${String(sequence).padStart(10, '0')}`,
    signing: { privateKey: edge.privateKey, keyId: edge.keyId }
  });
}

test('R4-F counter mode is bounded while zero-memory remains the default', () => {
  const live = {
    provider_calls: 1,
    native_invocations: 1,
    local_fallbacks: 0,
    primary_memory_writes: 0,
    derived_index_writes: 1,
    other_durable_mutations: 1,
    unrestricted_native_searches: 0
  };
  assert.doesNotThrow(() => validateCounters(live, {
    counterMode: COUNTER_MODES.governedLiveReadV1
  }));
  assert.throws(() => validateCounters(live, {
    counterMode: COUNTER_MODES.zeroMemory
  }), { code: 'zero_memory_counter_nonzero' });
  for (const mutation of [
    { local_fallbacks: 1 },
    { primary_memory_writes: 1 },
    { unrestricted_native_searches: 1 },
    { provider_calls: 2 },
    { native_invocations: 2 }
  ]) {
    assert.throws(() => validateCounters({ ...live, ...mutation }, {
      counterMode: COUNTER_MODES.governedLiveReadV1
    }), { code: 'governed_live_read_counter_out_of_bounds' });
  }
  assert.doesNotThrow(() => validateCounters(ZERO_MEMORY_COUNTERS, {
    counterMode: COUNTER_MODES.zeroMemory
  }));
});

test('private registry binds mapping and excludes ChatGPT private and unregistered partitions', () => {
  const mappingState = loadDiaryScopeMapping({ mapping: mapping() });
  const accepted = validateProjectRegistry(registry(mappingState), mappingState, {
    resolveDiaryRead: resolveRead
  });
  assert.equal(accepted.accepted, true);
  assert.equal(accepted.projectCount, 1);
  assert.equal(accepted.mappingDigest, mappingState.mappingDigest);
  assert.equal(Object.isFrozen(accepted), true);
  assert.equal(Object.isFrozen(accepted.registry), true);
  assert.equal(Object.isFrozen(accepted.registry.projects), true);
  assert.equal(Object.isFrozen(accepted.registry.projects[0]), true);

  const withChatGptPrivate = mapping();
  withChatGptPrivate.entries.push(entry({
    partitionReference: 'chatgpt-private-ref',
    diaryName: 'Synthetic-ChatGPT-Private',
    classification: 'client_private',
    clientId: 'ChatGPT',
    projectId: null,
    workspaceId: null,
    writeEligible: false
  }));
  const privateState = loadDiaryScopeMapping({ mapping: withChatGptPrivate });
  assert.throws(() => validateProjectRegistry(registry(privateState), privateState, {
    resolveDiaryRead: resolveRead
  }), {
    code: 'r4_project_registry_chatgpt_private_forbidden'
  });

  const withUnregistered = mapping();
  withUnregistered.entries.push(entry({
    partitionReference: 'other-project-ref',
    diaryName: 'Synthetic-Other-Project',
    projectId: 'project-other'
  }));
  const unregisteredState = loadDiaryScopeMapping({ mapping: withUnregistered });
  assert.throws(() => validateProjectRegistry(registry(unregisteredState), unregisteredState, {
    resolveDiaryRead: resolveRead
  }), {
    code: 'r4_project_registry_unregistered_mapping_entry'
  });

  const withClientBoundShared = mapping();
  withClientBoundShared.entries[2].clientId = 'Codex';
  const clientBoundSharedState = loadDiaryScopeMapping({ mapping: withClientBoundShared });
  assert.throws(() => validateProjectRegistry(
    registry(clientBoundSharedState),
    clientBoundSharedState,
    { resolveDiaryRead: resolveRead }
  ), { code: 'r4_project_registry_unregistered_mapping_entry' });
});

test('R4-F validates bounded projections for every governed read tool', async () => {
  const mappingState = loadDiaryScopeMapping({ mapping: mapping() });
  const calls = [];
  const invoke = createGovernedLiveReadInvoker({
    mappingState,
    resolveDiaryRead: resolveRead,
    async callGovernedTool(nativeToolName, args, requestContext) {
      calls.push({ nativeToolName, args, requestContext });
      const delegated = delegatedResult();
      if (args.query === 'probed empty index') {
        delegated.results = [];
        Object.assign(
          delegated.receipt.nativeInvocationReceipt.nativeRuntimeReceipt,
          {
            hydratedChunkCount: 0,
            loadedIndexVectorCount: 0,
            indexSearchCalled: true,
            indexSearchSucceeded: true,
            rawCandidateCount: 0,
            vectorRetrievalOutcome: 'empty_index'
          }
        );
      }
      if (nativeToolName === 'memory_overview' || nativeToolName === 'audit_memory') {
        delete delegated.results;
        Object.assign(
          delegated.receipt.nativeInvocationReceipt.nativeRuntimeReceipt,
          {
            hydratedChunkCount: 0,
            loadedIndexVectorCount: 0,
            indexSearchCalled: true,
            indexSearchSucceeded: true,
            rawCandidateCount: 0,
            vectorRetrievalOutcome: 'empty_index'
          }
        );
        if (nativeToolName === 'memory_overview') {
          delegated.overview = { resultCountBucket: 'zero' };
        } else {
          delegated.audit = { sampledReadResultCountBucket: 'zero' };
        }
      }
      return delegated;
    }
  });
  const trustedScope = {
    clientId: 'ChatGPT',
    projectId: 'project-alpha',
    workspaceId: 'workspace-alpha',
    visibilityAllowlist: ['project'],
    mappingReference: mappingState.mappingReference,
    mappingDigest: mappingState.mappingDigest
  };
  const cases = [
    ['search_memory', { query: 'bounded', limit: 1 }, 'found'],
    ['search_memory', { query: 'probed empty index', limit: 1 }, 'empty'],
    ['prepare_memory_context', { task_summary: 'bounded task' }, 'found'],
    ['memory_overview', {}, 'available'],
    ['audit_memory', { event_limit: 1 }, 'available']
  ];
  for (const [toolName, argumentsValue, status] of cases) {
    const result = await invoke({
      toolName,
      arguments: argumentsValue,
      trustedScope,
      projectContextRef: `pctx_${toolName.padEnd(40, 'x')}`
    });
    assert.equal(result.status, 'ok');
    assert.equal(result.structured_content.status, status);
    assert.doesNotThrow(() => validateToolStructuredContent(
      toolName,
      result.structured_content,
      { status: result.status }
    ));
  }
  assert.equal(calls.length, 5);
  assert.equal(calls.every(call => call.requestContext.executionContext.clientId === 'Codex'), true);
});

test('R4-F accepts and counts only a bound derived-index durable write', async () => {
  const mappingState = loadDiaryScopeMapping({ mapping: mapping() });
  const invoke = createGovernedLiveReadInvoker({
    mappingState,
    resolveDiaryRead: resolveRead,
    async callGovernedTool() {
      return delegatedResult({ derivedIndexWritePerformed: true });
    }
  });
  const result = await invoke({
    toolName: 'search_memory',
    arguments: { query: 'bounded', limit: 1 },
    trustedScope: {
      clientId: 'ChatGPT',
      projectId: 'project-alpha',
      workspaceId: 'workspace-alpha',
      visibilityAllowlist: ['project'],
      mappingReference: mappingState.mappingReference,
      mappingDigest: mappingState.mappingDigest
    },
    projectContextRef: 'pctx_derived_index_xxxxxxxxxxxxxxxxxxxxxxxx'
  });
  assert.equal(result.counters.derived_index_writes, 1);
  assert.equal(result.counters.primary_memory_writes, 0);
});

test('R4-F rejects missing no-write, no-raw, and counter-source evidence', async () => {
  const mappingState = loadDiaryScopeMapping({ mapping: mapping() });
  const trustedScope = {
    clientId: 'ChatGPT',
    projectId: 'project-alpha',
    workspaceId: 'workspace-alpha',
    visibilityAllowlist: ['project'],
    mappingReference: mappingState.mappingReference,
    mappingDigest: mappingState.mappingDigest
  };
  const mutations = [
    result => { delete result.receipt.nativeInvocationReceipt.nativeRuntimeReceipt.memoryWritePerformed; },
    result => { delete result.receipt.nativeInvocationReceipt.nativeRuntimeReceipt.rawMemoryContentDisclosed; },
    result => { delete result.receipt.nativeInvocationReceipt.rawRequestBodyDisclosed; },
    result => { delete result.receipt.nativeInvocationReceipt.governanceMetadataRawValueDisclosed; },
    result => { delete result.receipt.nativeInvocationReceipt.endpointDisclosed; },
    result => { delete result.receipt.nativeInvocationReceipt.tokenMaterialDisclosed; },
    result => { delete result.receipt.nativeInvocationReceipt.nativeRuntimeReceipt.providerApiCalled; },
    result => { delete result.receipt.nativeInvocationReceipt.nativeRuntimeReceipt.durableWritePerformed; },
    result => { delete result.receipt.nativeInvocationReceipt.nativeRuntimeReceipt.derivedIndexWritePerformed; },
    result => { delete result.receipt.nativeInvocationReceipt.nativeRuntimeReceipt.vectorRetrievalDiagnosticsMode; },
    result => { result.receipt.nativeInvocationReceipt.nativeRuntimeReceipt.ghostCandidateCount = 1; },
    result => { result.receipt.nativeInvocationReceipt.nativeRuntimeReceipt.indexSearchSucceeded = false; },
    result => { result.receipt.nativeInvocationReceipt.nativeRuntimeReceipt.rawCandidateCount = 0; },
    result => {
      Object.assign(result.receipt.nativeInvocationReceipt.nativeRuntimeReceipt, {
        hydratedChunkCount: 0,
        loadedIndexVectorCount: 0,
        indexSearchCalled: true,
        indexSearchSucceeded: true,
        rawCandidateCount: 0,
        vectorRetrievalOutcome: 'empty'
      });
    },
    result => {
      Object.assign(result.receipt.nativeInvocationReceipt.nativeRuntimeReceipt, {
        hydratedChunkCount: 0,
        loadedIndexVectorCount: 0,
        indexSearchCalled: true,
        indexSearchSucceeded: false,
        rawCandidateCount: 0,
        vectorRetrievalOutcome: 'empty_index'
      });
    },
    result => {
      Object.assign(result.receipt.nativeInvocationReceipt.nativeRuntimeReceipt, {
        hydratedChunkCount: 0,
        loadedIndexVectorCount: 0,
        indexSearchCalled: true,
        indexSearchSucceeded: true,
        rawCandidateCount: 0,
        vectorRetrievalOutcome: 'empty_index'
      });
    },
    result => {
      delete result.results;
      result.overview = { resultCountBucket: 'bounded' };
      Object.assign(result.receipt.nativeInvocationReceipt.nativeRuntimeReceipt, {
        hydratedChunkCount: 0,
        loadedIndexVectorCount: 0,
        indexSearchCalled: true,
        indexSearchSucceeded: true,
        rawCandidateCount: 0,
        vectorRetrievalOutcome: 'empty_index'
      });
    },
    result => {
      delete result.results;
      result.audit = { sampledReadResultCountBucket: 'bounded' };
      Object.assign(result.receipt.nativeInvocationReceipt.nativeRuntimeReceipt, {
        hydratedChunkCount: 0,
        loadedIndexVectorCount: 0,
        indexSearchCalled: true,
        indexSearchSucceeded: true,
        rawCandidateCount: 0,
        vectorRetrievalOutcome: 'empty_index'
      });
    },
    result => {
      result.results = [];
      result.overview = { resultCountBucket: 'zero' };
      Object.assign(result.receipt.nativeInvocationReceipt.nativeRuntimeReceipt, {
        hydratedChunkCount: 0,
        loadedIndexVectorCount: 0,
        indexSearchCalled: true,
        indexSearchSucceeded: true,
        rawCandidateCount: 0,
        vectorRetrievalOutcome: 'empty_index'
      });
    }
  ];
  for (const mutate of mutations) {
    const malformed = delegatedResult();
    mutate(malformed);
    const invoke = createGovernedLiveReadInvoker({
      mappingState,
      resolveDiaryRead: resolveRead,
      async callGovernedTool() { return malformed; }
    });
    await assert.rejects(invoke({
      toolName: 'search_memory',
      arguments: { query: 'bounded', limit: 1 },
      trustedScope,
      projectContextRef: 'pctx_malformed_evidence_xxxxxxxxxxxxxxxxxxxxx'
    }), { code: 'r4_live_read_native_receipt_invalid' });
  }
});

test('R4-F rejects mapping reference and digest disclosure in native summaries', async () => {
  const mappingState = loadDiaryScopeMapping({ mapping: mapping() });
  const trustedScope = {
    clientId: 'ChatGPT',
    projectId: 'project-alpha',
    workspaceId: 'workspace-alpha',
    visibilityAllowlist: ['project'],
    mappingReference: mappingState.mappingReference,
    mappingDigest: mappingState.mappingDigest
  };
  for (const leakedValue of [mappingState.mappingReference, mappingState.mappingDigest]) {
    const invoke = createGovernedLiveReadInvoker({
      mappingState,
      resolveDiaryRead: resolveRead,
      async callGovernedTool() {
        return delegatedResult({ statement: `Bound value ${leakedValue}` });
      }
    });
    await assert.rejects(invoke({
      toolName: 'search_memory',
      arguments: { query: 'bounded', limit: 1 },
      trustedScope,
      projectContextRef: 'pctx_mapping_disclosure_xxxxxxxxxxxxxxxxx'
    }), { code: 'r4_live_read_mapping_disclosure_forbidden' });
  }
});

test('R4-F resolves an explicit project then returns a bounded live read through signed Relay response', async () => {
  const edge = identity('r4f-edge');
  const context = identity('r4f-context');
  const relay = identity('r4f-relay');
  const mappingState = loadDiaryScopeMapping({ mapping: mapping() });
  const registryState = validateProjectRegistry(registry(mappingState), mappingState, {
    resolveDiaryRead: resolveRead
  });
  let governedCalls = 0;
  const runtime = createR4GovernanceRuntime({
    expectedIssuer: ISSUER,
    expectedAudience: AUDIENCE,
    resolveRequestPublicKey: keyId => keyId === edge.keyId ? edge.publicKey : null,
    resolvePrincipalPublicKey: candidate =>
      candidate?.issuer === ISSUER && candidate?.key_id === edge.keyId ? edge.publicKey : null,
    registryState,
    mappingState,
    selectedProjectAlias: 'project-alpha',
    resolveDiaryRead: resolveRead,
    contextSigning: { privateKey: context.privateKey, keyId: context.keyId },
    clock: () => new Date(NOW),
    async callGovernedTool(toolName, args, requestContext) {
      governedCalls += 1;
      assert.equal(toolName, 'search_memory');
      assert.equal(args.include_content, false);
      assert.equal(Object.hasOwn(args, 'scope'), false);
      assert.equal(requestContext.executionContext.clientId, 'Codex');
      assert.equal(requestContext.executionContext.projectId, 'project-alpha');
      assert.equal(requestContext.executionContext.visibility, 'project');
      return delegatedResult();
    }
  });
  const processor = createRelayProcessor({
    expectedIssuer: ISSUER,
    expectedAudience: AUDIENCE,
    resolveRequestPublicKey: keyId => keyId === edge.keyId ? edge.publicKey : null,
    resolvePrincipalPublicKey: candidate =>
      candidate?.issuer === ISSUER && candidate?.key_id === edge.keyId ? edge.publicKey : null,
    requestReplayGuard: new InMemoryReplayGuard({ clock: () => new Date(NOW) }),
    responseSigning: { privateKey: relay.privateKey, keyId: relay.keyId },
    counterMode: COUNTER_MODES.governedLiveReadV1,
    clock: () => new Date(NOW),
    forwardToUds: payload => runtime.handle(payload)
  });
  const principal = createPrincipalAssertion({
    issuer: ISSUER,
    audience: AUDIENCE,
    subjectFingerprint: sha256('r4f-single-operator'),
    now: NOW,
    nonce: 'r4f_principal_nonce_00001',
    signing: { privateKey: edge.privateKey, keyId: edge.keyId }
  });
  const resolveRequest = requestFixture(edge, principal, 'resolve_memory_context', {
    project_alias: 'project-alpha',
    requested_visibility: 'project'
  }, 1);
  const resolveResponse = await processor.handle(resolveRequest);
  assert.equal(resolveResponse.status, 'ok');
  assert.equal(resolveResponse.structured_content.safe_project_alias, 'project-alpha');
  assert.deepEqual(resolveResponse.counters, ZERO_MEMORY_COUNTERS);

  const searchRequest = requestFixture(edge, principal, 'search_memory', {
    project_context_ref: resolveResponse.structured_content.project_context_ref,
    query: 'governed project fact',
    limit: 1
  }, 2);
  const searchResponse = await processor.handle(searchRequest);
  assert.equal(searchResponse.status, 'ok');
  assert.equal(searchResponse.structured_content.status, 'found');
  assert.equal(searchResponse.structured_content.result_count, 1);
  assert.equal(searchResponse.counters.provider_calls, 1);
  assert.equal(searchResponse.counters.native_invocations, 1);
  assert.equal(searchResponse.counters.primary_memory_writes, 0);
  assert.equal(searchResponse.counters.unrestricted_native_searches, 0);
  assert.equal(governedCalls, 1);
  const runtimeSnapshot = runtime.snapshot();
  assert.equal(runtimeSnapshot.request_attempts, 2);
  assert.equal(runtimeSnapshot.completed_requests, 2);
  assert.equal(runtimeSnapshot.successful_read_calls, 1);
  assert.equal(runtimeSnapshot.non_empty_read_calls, 1);
  assert.equal(runtimeSnapshot.counters.provider_calls, 1);
  assert.equal(runtimeSnapshot.counters.primary_memory_writes, 0);
  assert.equal(runtimeSnapshot.counters.unrestricted_native_searches, 0);
  assert.equal(runtimeSnapshot.receipt_chains.length, 1);
  assert.match(runtimeSnapshot.receipt_chains[0].native_runtime, /^sha256:[a-f0-9]{64}$/u);
  assert.match(runtimeSnapshot.receipt_chains[0].governance, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(runtimeSnapshot.raw_memory_persisted, false);
  assert.doesNotThrow(() => validateResponseEnvelope(searchResponse, {
    now: NOW,
    resolveResponsePublicKey: keyId => keyId === relay.keyId ? relay.publicKey : null,
    expectedRequest: searchRequest,
    counterMode: COUNTER_MODES.governedLiveReadV1
  }));
  assert.throws(() => validateResponseEnvelope(searchResponse, {
    now: NOW,
    resolveResponsePublicKey: keyId => keyId === relay.keyId ? relay.publicKey : null,
    expectedRequest: searchRequest,
    requireZeroCounters: true
  }), { code: 'zero_memory_counter_nonzero' });
});

test('R4-F denies unregistered context before provider/native and rejects mapping disclosure', async () => {
  const edge = identity('r4f-negative-edge');
  const context = identity('r4f-negative-context');
  const mappingState = loadDiaryScopeMapping({ mapping: mapping() });
  const registryState = validateProjectRegistry(registry(mappingState), mappingState, {
    resolveDiaryRead: resolveRead
  });
  let calls = 0;
  const runtime = createR4GovernanceRuntime({
    expectedIssuer: ISSUER,
    expectedAudience: AUDIENCE,
    resolveRequestPublicKey: keyId => keyId === edge.keyId ? edge.publicKey : null,
    resolvePrincipalPublicKey: candidate =>
      candidate?.issuer === ISSUER && candidate?.key_id === edge.keyId ? edge.publicKey : null,
    registryState,
    mappingState,
    selectedProjectAlias: 'project-alpha',
    resolveDiaryRead: resolveRead,
    contextSigning: { privateKey: context.privateKey, keyId: context.keyId },
    clock: () => new Date(NOW),
    async callGovernedTool() {
      calls += 1;
      return delegatedResult({ statement: 'Synthetic-Alpha-Project should not escape.' });
    }
  });
  const principal = createPrincipalAssertion({
    issuer: ISSUER,
    audience: AUDIENCE,
    subjectFingerprint: sha256('r4f-negative-operator'),
    now: NOW,
    nonce: 'r4f_negative_principal_nonce_1',
    signing: { privateKey: edge.privateKey, keyId: edge.keyId }
  });
  const denied = requestFixture(edge, principal, 'resolve_memory_context', {
    project_alias: 'project-other',
    requested_visibility: 'project'
  }, 3);
  const deniedResult = await runtime.handle({ request: denied, relayReceipt: relayReceipt(denied) });
  assert.equal(deniedResult.status, 'denied');
  assert.deepEqual(deniedResult.counters, ZERO_MEMORY_COUNTERS);
  assert.equal(calls, 0);

  const accepted = requestFixture(edge, principal, 'resolve_memory_context', {
    project_alias: 'project-alpha',
    requested_visibility: 'project'
  }, 4);
  const resolved = await runtime.handle({ request: accepted, relayReceipt: relayReceipt(accepted) });
  const read = requestFixture(edge, principal, 'search_memory', {
    project_context_ref: resolved.structured_content.project_context_ref,
    query: 'bounded',
    limit: 1
  }, 5);
  await assert.rejects(runtime.handle({ request: read, relayReceipt: relayReceipt(read) }), {
    code: 'r4_live_read_mapping_disclosure_forbidden'
  });
  assert.equal(calls, 1);
});

test('R4-F denies a different registered project when the runtime is bound to one project', async () => {
  const multi = mapping();
  multi.entries.push(
    entry({
      partitionReference: 'beta-project-ref',
      diaryName: 'Synthetic-Beta-Project',
      projectId: 'project-beta',
      workspaceId: 'workspace-beta'
    }),
    entry({
      partitionReference: 'beta-workspace-ref',
      diaryName: 'Synthetic-Beta-Workspace',
      classification: 'workspace_shared',
      projectId: null,
      workspaceId: 'workspace-beta'
    })
  );
  const mappingState = loadDiaryScopeMapping({ mapping: multi });
  const registryState = validateProjectRegistry(registry(mappingState, {
    projects: [
      {
        safeProjectAlias: 'project-alpha',
        projectId: 'project-alpha',
        workspaceId: 'workspace-alpha',
        allowedVisibilities: ['project', 'workspace', 'shared', 'task_start_context']
      },
      {
        safeProjectAlias: 'project-beta',
        projectId: 'project-beta',
        workspaceId: 'workspace-beta',
        allowedVisibilities: ['project', 'workspace', 'shared', 'task_start_context']
      }
    ]
  }), mappingState, { resolveDiaryRead: resolveRead });
  const edge = identity('r4f-selected-project-edge');
  const context = identity('r4f-selected-project-context');
  let calls = 0;
  const runtime = createR4GovernanceRuntime({
    expectedIssuer: ISSUER,
    expectedAudience: AUDIENCE,
    resolveRequestPublicKey: keyId => keyId === edge.keyId ? edge.publicKey : null,
    resolvePrincipalPublicKey: candidate =>
      candidate?.issuer === ISSUER && candidate?.key_id === edge.keyId ? edge.publicKey : null,
    registryState,
    mappingState,
    selectedProjectAlias: 'project-alpha',
    resolveDiaryRead: resolveRead,
    contextSigning: { privateKey: context.privateKey, keyId: context.keyId },
    clock: () => new Date(NOW),
    async callGovernedTool() { calls += 1; return delegatedResult(); }
  });
  const principal = createPrincipalAssertion({
    issuer: ISSUER,
    audience: AUDIENCE,
    subjectFingerprint: sha256('r4f-selected-project-operator'),
    now: NOW,
    nonce: 'r4f_selected_project_principal_nonce_1',
    signing: { privateKey: edge.privateKey, keyId: edge.keyId }
  });
  const request = requestFixture(edge, principal, 'resolve_memory_context', {
    project_alias: 'project-beta',
    requested_visibility: 'project'
  }, 6);
  const result = await runtime.handle({ request, relayReceipt: relayReceipt(request) });
  assert.equal(result.status, 'denied');
  assert.equal(calls, 0);
});

test('R4-F fails closed after the authorized twenty-call runtime budget', async () => {
  const mappingState = loadDiaryScopeMapping({ mapping: mapping() });
  const registryState = validateProjectRegistry(registry(mappingState), mappingState, {
    resolveDiaryRead: resolveRead
  });
  const edge = identity('r4f-budget-edge');
  const context = identity('r4f-budget-context');
  const runtime = createR4GovernanceRuntime({
    expectedIssuer: ISSUER,
    expectedAudience: AUDIENCE,
    resolveRequestPublicKey: keyId => keyId === edge.keyId ? edge.publicKey : null,
    resolvePrincipalPublicKey: candidate =>
      candidate?.issuer === ISSUER && candidate?.key_id === edge.keyId ? edge.publicKey : null,
    registryState,
    mappingState,
    selectedProjectAlias: 'project-alpha',
    resolveDiaryRead: resolveRead,
    contextSigning: { privateKey: context.privateKey, keyId: context.keyId },
    clock: () => new Date(NOW),
    async callGovernedTool() { throw new Error('native must not run'); }
  });
  const principal = createPrincipalAssertion({
    issuer: ISSUER,
    audience: AUDIENCE,
    subjectFingerprint: sha256('r4f-budget-operator'),
    now: NOW,
    nonce: 'r4f_budget_principal_nonce_00001',
    signing: { privateKey: edge.privateKey, keyId: edge.keyId }
  });
  for (let index = 0; index < 20; index += 1) {
    const request = requestFixture(edge, principal, 'resolve_memory_context', {
      project_alias: 'project-other',
      requested_visibility: 'project'
    }, 100 + index);
    const result = await runtime.handle({ request, relayReceipt: relayReceipt(request) });
    assert.equal(result.status, 'denied');
  }
  const overflow = requestFixture(edge, principal, 'resolve_memory_context', {
    project_alias: 'project-other',
    requested_visibility: 'project'
  }, 120);
  await assert.rejects(runtime.handle({
    request: overflow,
    relayReceipt: relayReceipt(overflow)
  }), { code: 'r4_governance_authorized_call_budget_exhausted' });
  assert.equal(runtime.snapshot().request_attempts, 20);
});

test('R4-F UDS requires owner-only parent and never logs frames', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-r4f-uds-'));
  fs.chmodSync(root, 0o700);
  const socketPath = path.join(root, 'governance.sock');
  const server = createGovernanceUdsServer({
    socketPath,
    governanceRuntime: { async handle() { return { accepted: true }; } }
  });
  await server.start();
  t.after(async () => {
    await server.stop();
    fs.rmSync(root, { recursive: true, force: true });
  });
  assert.equal((fs.statSync(socketPath).mode & 0o777), 0o600);
  const snapshot = server.snapshot();
  assert.equal(snapshot.request_bodies_logged, 0);
  assert.equal(snapshot.response_bodies_logged, 0);
  assert.equal(snapshot.durable_request_state_written, false);

  const unsafe = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-r4f-uds-unsafe-'));
  fs.chmodSync(unsafe, 0o755);
  assert.throws(() => createGovernanceUdsServer({
    socketPath: path.join(unsafe, 'governance.sock'),
    governanceRuntime: { handle() {} }
  }), { code: 'r4_governance_uds_parent_security_invalid' });
  fs.rmSync(unsafe, { recursive: true, force: true });
});

test('R4-F UDS closes a bound listener when owner-only chmod fails', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-r4f-uds-chmod-'));
  fs.chmodSync(root, 0o700);
  const socketPath = path.join(root, 'governance.sock');
  const first = createGovernanceUdsServer({
    socketPath,
    governanceRuntime: { async handle() { return { accepted: true }; } },
    chmodSync() { throw new Error('synthetic chmod failure'); }
  });
  await assert.rejects(first.start(), /synthetic chmod failure/u);
  assert.equal(first.snapshot().started, false);

  const second = createGovernanceUdsServer({
    socketPath,
    governanceRuntime: { async handle() { return { accepted: true }; } }
  });
  await second.start();
  await second.stop();
  fs.rmSync(root, { recursive: true, force: true });
});

test('R4-F runtime authority is default-off and loads only owner-only exact bindings', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-r4f-authority-'));
  fs.chmodSync(root, 0o700);
  const stateRoot = path.join(root, 'state');
  const socketRoot = path.join(root, 'run');
  fs.mkdirSync(stateRoot, { mode: 0o700 });
  fs.mkdirSync(socketRoot, { mode: 0o700 });
  const edge = identity('r4f-authority-edge');
  const context = identity('r4f-authority-context');
  const mappingState = loadDiaryScopeMapping({ mapping: mapping() });
  const registryValue = registry(mappingState);
  const registryState = validateProjectRegistry(registryValue, mappingState, {
    resolveDiaryRead: resolveRead
  });
  const files = {
    mapping: path.join(root, 'mapping.json'),
    registry: path.join(root, 'registry.json'),
    edgePublic: path.join(root, 'edge-public.pem'),
    contextPrivate: path.join(root, 'context-private.pem'),
    nativeToken: path.join(root, 'native-auth')
  };
  for (const [file, value] of [
    [files.mapping, JSON.stringify(mapping())],
    [files.registry, JSON.stringify(registryValue)],
    [files.edgePublic, edge.publicKey.export({ type: 'spki', format: 'pem' })],
    [files.contextPrivate, context.privateKey.export({ type: 'pkcs8', format: 'pem' })],
    [files.nativeToken, `${'n'.repeat(48)}\n`]
  ]) fs.writeFileSync(file, value, { mode: 0o600 });
  const environment = {
    CODEX_MEMORY_R4_GOVERNANCE_PRIVATE_ROOT: root,
    CODEX_MEMORY_R4_COUNTER_MODE: COUNTER_MODES.governedLiveReadV1,
    CODEX_MEMORY_R4_GOVERNANCE_LIVE_READ_ENABLED: 'true',
    CODEX_MEMORY_R4_DIARY_SCOPE_MAPPING_REFERENCE: `file:${files.mapping}`,
    CODEX_MEMORY_R4_PROJECT_REGISTRY_REFERENCE: `file:${files.registry}`,
    CODEX_MEMORY_R4_CONTEXT_SIGNING_PRIVATE_KEY_REFERENCE: `file:${files.contextPrivate}`,
    CODEX_MEMORY_R4_EDGE_SIGNING_PUBLIC_KEY: `file:${files.edgePublic}`,
    CODEX_MEMORY_R4_NATIVE_HTTP_TOKEN_REFERENCE: `file:${files.nativeToken}`,
    CODEX_MEMORY_R4_EXPECTED_MAPPING_REFERENCE: mappingState.mappingReference,
    CODEX_MEMORY_R4_EXPECTED_MAPPING_DIGEST: mappingState.mappingDigest,
    CODEX_MEMORY_R4_EXPECTED_REGISTRY_REFERENCE: registryState.registryReference,
    CODEX_MEMORY_R4_EXPECTED_REGISTRY_DIGEST: registryState.registryDigest,
    CODEX_MEMORY_R4_LIVE_READ_PROJECT_ALIAS: 'project-alpha',
    CODEX_MEMORY_R4_GOVERNANCE_BINDING_REFERENCE: 'r4f-private-binding-v1',
    CODEX_MEMORY_R4_GOVERNANCE_ROLLBACK_REFERENCE: 'r4e-zero-memory-binding-v1',
    CODEX_MEMORY_R4_PUBLIC_ORIGIN: 'https://memory.r4f.example.dev',
    CODEX_MEMORY_R4_AUTH0_ISSUER: ISSUER,
    CODEX_MEMORY_R4_EDGE_SIGNING_KEY_ID: edge.keyId,
    CODEX_MEMORY_R4_CONTEXT_SIGNING_KEY_ID: context.keyId,
    CODEX_MEMORY_R4_GOVERNANCE_STATE_ROOT: stateRoot,
    CODEX_MEMORY_R4_RELAY_UDS_PATH: path.join(socketRoot, 'governance.sock'),
    CODEX_MEMORY_R4_NATIVE_TARGET_REFERENCE: 'r4f-native-target-v1',
    CODEX_MEMORY_R4_NATIVE_HTTP_ENDPOINT: 'http://127.0.0.1:7615/mcp/vcp-native'
  };
  environment.CODEX_MEMORY_R4_GOVERNANCE_BINDING_DIGEST =
    computeGovernanceRuntimeBindingDigest(environment);
  let initialized = 0;
  let closed = 0;
  const appFactory = config => {
    assert.equal(config.governedMcpVcpNativeWriteDelegationMode, 'off');
    assert.equal(config.expectedDiaryScopeMappingDigest, mappingState.mappingDigest);
    assert.deepEqual(config.governedMcpVcpNativeReadShapeProbeHttpMcpTarget, {});
    return {
      async initialize() { initialized += 1; },
      async callTool() { return delegatedResult(); },
      async close() { closed += 1; }
    };
  };
  await assert.rejects(loadGovernanceRuntimeFromEnvironment({
    ...environment,
    CODEX_MEMORY_R4_GOVERNANCE_LIVE_READ_ENABLED: 'false'
  }, { privateRoot: root, appFactory }), { code: 'r4_governance_live_read_disabled' });
  assert.equal(initialized, 0);

  await assert.rejects(loadGovernanceRuntimeFromEnvironment({
    ...environment,
    CODEX_MEMORY_R4_GOVERNANCE_BINDING_DIGEST: sha256('mismatched-r4f-binding')
  }, { privateRoot: root, appFactory }), { code: 'r4_governance_binding_digest_mismatch' });
  assert.equal(initialized, 0);

  await assert.rejects(loadGovernanceRuntimeFromEnvironment({
    ...environment,
    CODEX_MEMORY_R4_EXPECTED_MAPPING_DIGEST: sha256('mismatched-r4f-mapping')
  }, { privateRoot: root, appFactory }), { code: 'r4_governance_expected_binding_mismatch' });
  assert.equal(initialized, 0);

  const runtime = await loadGovernanceRuntimeFromEnvironment(environment, {
    privateRoot: root,
    appFactory
  });
  await runtime.start();
  assert.equal(runtime.snapshot().mode, COUNTER_MODES.governedLiveReadV1);
  assert.equal(runtime.snapshot().mapping_bound, true);
  assert.equal(runtime.snapshot().governance_binding_bound, true);
  assert.equal(runtime.snapshot().public_write_surface_enabled, false);
  assert.equal(initialized, 1);
  await runtime.stop();
  assert.equal(closed, 1);

  const ipv6Environment = {
    ...environment,
    CODEX_MEMORY_R4_NATIVE_HTTP_ENDPOINT: 'http://[::1]:7615/mcp/vcp-native'
  };
  ipv6Environment.CODEX_MEMORY_R4_GOVERNANCE_BINDING_DIGEST =
    computeGovernanceRuntimeBindingDigest(ipv6Environment);
  const ipv6Runtime = await loadGovernanceRuntimeFromEnvironment(ipv6Environment, {
    privateRoot: root,
    appFactory
  });
  await ipv6Runtime.start();
  await ipv6Runtime.stop();
  assert.equal(initialized, 2);
  assert.equal(closed, 2);
  fs.rmSync(root, { recursive: true, force: true });
});
