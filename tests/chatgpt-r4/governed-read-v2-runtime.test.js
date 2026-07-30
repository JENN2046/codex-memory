'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');

const {
  COUNTER_MODES,
  appendGovernedReadAttemptStage,
  createAttemptHeader,
  createPrincipalAssertion,
  createRequestEnvelope,
  createStageReceipt,
  digestObject
} = require('../../packages/chatgpt-r4-contracts');
const {
  createGovernedReadV2Runtime
} = require(
  '../../src/adapters/chatgpt-r4/governed-read-v2-runtime'
);
const {
  createSessionReadActivationController
} = require(
  '../../src/adapters/chatgpt-r4/session-read-activation'
);
const {
  validateProjectRegistry
} = require(
  '../../src/adapters/chatgpt-r4/project-registry'
);
const {
  loadDiaryScopeMapping
} = require('../../src/core/DiaryScopeMappingLoader');
const {
  resolveRead
} = require('../../src/core/DiaryScopeMapping');
const {
  createPrivateDogfoodObserver
} = require(
  '../../src/runtime/chatgpt-r4/private-dogfood-observer'
);

const NOW = new Date('2026-07-31T08:00:00.000Z');
const ISSUER = 'https://issuer.v2-runtime.example/';
const AUDIENCE = 'https://memory.v2-runtime.example/mcp';

function identity(keyId) {
  const pair = crypto.generateKeyPairSync('ed25519');
  return {
    keyId,
    privateKey: pair.privateKey,
    publicKey: pair.publicKey
  };
}

function signing(value) {
  return {
    keyId: value.keyId,
    privateKey: value.privateKey
  };
}

function mapping() {
  return {
    schemaVersion: 1,
    mappingReference: 'jenn-vcp-diary-scope-v1',
    defaultPolicy: 'deny',
    entries: [{
      partitionReference: 'v2-project-partition',
      diaryName: 'Synthetic-V2-Project',
      classification: 'project_shared',
      clientId: null,
      projectId: 'project-v2',
      workspaceId: 'workspace-v2',
      readProfiles: [
        'exact_visibility',
        'task_start_context'
      ],
      writeEligible: true
    }]
  };
}

function registry(mappingState) {
  return {
    schemaVersion: 1,
    registryReference: 'v2-project-registry',
    mappingReference: mappingState.mappingReference,
    mappingDigest: mappingState.mappingDigest,
    defaultPolicy: 'deny',
    projects: [{
      safeProjectAlias: 'project-v2',
      projectId: 'project-v2',
      workspaceId: 'workspace-v2',
      allowedVisibilities: ['project']
    }]
  };
}

function relayReceipt(request) {
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

function relayClaimedAttempt(request, contextRef, suffix) {
  const header = createAttemptHeader({
    attemptRef: `grat_${suffix.repeat(32)}`,
    toolName: request.tool_request.name,
    requestDigest: digestObject(request),
    contextBindingDigest: digestObject(contextRef),
    now: NOW
  });
  let workingSet = {
    header,
    receipts: [
      createStageReceipt({ header, stage: 'CREATED' })
    ]
  };
  workingSet = appendGovernedReadAttemptStage(
    workingSet,
    { stage: 'EDGE_VALIDATED' }
  );
  return appendGovernedReadAttemptStage(
    workingSet,
    { stage: 'RELAY_CLAIMED' }
  );
}

function successfulBridgeResult(input) {
  let current = input.workingSet;
  for (const stage of [
    'BRIDGE_DELEGATED',
    'NATIVE_DISPATCHED',
    'SOURCE_PREFLIGHT',
    'PROVIDER_EMBEDDING',
    'HYDRATION',
    'INDEX_RECOVERY',
    'VECTOR_SEARCH',
    'SCOPE_POSTCHECK'
  ]) {
    const counterFacts = {
      BRIDGE_DELEGATED: {
        fallback: { attempts: 0 }
      },
      NATIVE_DISPATCHED: {
        native_invocation: { started: 1 },
        primary_memory: {
          write_attempts: 0,
          writes_committed: 0
        }
      },
      PROVIDER_EMBEDDING: {
        provider: {
          started: 1,
          succeeded: 1,
          failed: 0
        }
      },
      HYDRATION: {
        derived_transaction: {
          started: 1,
          committed: 1,
          rolled_back: 0
        }
      },
      VECTOR_SEARCH: {
        native_invocation: {
          succeeded: 1,
          failed: 0
        }
      }
    }[stage] || {};
    current = appendGovernedReadAttemptStage(
      current,
      { stage, counterFacts }
    );
  }
  return Object.freeze({
    accepted: true,
    working_set: current,
    evidence_complete: true,
    result: {
      results: [{
        memoryContextProjection: {
          projectionVersion: 1,
          lowDisclosure: true,
          statement: 'Bounded v2 governed-read signal.',
          classification: 'current_state',
          freshness: 'recent',
          reasonCodes: ['semantic_match'],
          conflict: false
        },
        score: 0.91
      }]
    },
    terminal_failure: null,
    cleanup_complete: true
  });
}

test('production v2 governance route uses attempts exclusively and consumes one context once', async () => {
  const edge = identity('v2-runtime-edge');
  const context = identity('v2-runtime-context');
  const principal = createPrincipalAssertion({
    issuer: ISSUER,
    audience: AUDIENCE,
    subjectFingerprint:
      digestObject('v2-runtime-principal'),
    now: NOW,
    nonce: 'v2_runtime_principal_nonce_01',
    signing: signing(edge)
  });
  const mappingState =
    loadDiaryScopeMapping({ mapping: mapping() });
  const registryState = validateProjectRegistry(
    registry(mappingState),
    mappingState,
    { resolveDiaryRead: resolveRead }
  );
  let bridgeCalls = 0;
  const runtime = createGovernedReadV2Runtime({
    expectedIssuer: ISSUER,
    expectedAudience: AUDIENCE,
    resolveRequestPublicKey: keyId =>
      keyId === edge.keyId ? edge.publicKey : null,
    resolvePrincipalPublicKey: candidate =>
      candidate?.issuer === ISSUER &&
      candidate?.key_id === edge.keyId
        ? edge.publicKey
        : null,
    registryState,
    mappingState,
    selectedProjectAlias: 'project-v2',
    resolveDiaryRead: resolveRead,
    contextSigning: signing(context),
    counterMode: COUNTER_MODES.governedLiveReadV1,
    clock: () => NOW,
    async invokeBridge(input) {
      bridgeCalls += 1;
      assert.deepEqual(
        input.authorization.allowedDiaryNames,
        ['Synthetic-V2-Project']
      );
      return successfulBridgeResult(input);
    }
  });
  const resolveRequest = createRequestEnvelope({
    principalAssertion: principal,
    toolName: 'resolve_memory_context',
    toolArguments: {
      project_alias: 'project-v2',
      requested_visibility: 'project'
    },
    now: NOW,
    requestId: 'req_v2_runtime_resolve_00000001',
    nonce: 'v2_runtime_resolve_nonce_0001',
    signing: signing(edge)
  });
  const resolved = await runtime.handle({
    request: resolveRequest,
    relayReceipt: relayReceipt(resolveRequest)
  });
  assert.equal(resolved.status, 'ok');
  const contextRef =
    resolved.structured_content.project_context_ref;

  const readRequest = createRequestEnvelope({
    principalAssertion: principal,
    toolName: 'search_memory',
    toolArguments: {
      project_context_ref: contextRef,
      query: 'bounded v2 production route',
      limit: 1
    },
    now: NOW,
    requestId: 'req_v2_runtime_read_0000000001',
    nonce: 'v2_runtime_read_nonce_000001',
    signing: signing(edge)
  });
  await assert.rejects(
    runtime.handle({
      request: readRequest,
      relayReceipt: relayReceipt(readRequest)
    }),
    { code: 'governed_read_v2_attempt_required' }
  );
  assert.equal(bridgeCalls, 0);

  const first = await runtime.handle({
    request: readRequest,
    relayReceipt: relayReceipt(readRequest),
    governedReadAttempt:
      relayClaimedAttempt(readRequest, contextRef, 'a')
  });
  assert.equal(first.status, 'ok');
  assert.equal(first.structured_content.status, 'found');
  assert.equal(first.structured_content.result_count, 1);
  assert.deepEqual(first.counters, {
    provider_calls: 1,
    native_invocations: 1,
    local_fallbacks: 0,
    primary_memory_writes: 0,
    derived_index_writes: 1,
    other_durable_mutations: 0,
    unrestricted_native_searches: 0
  });
  assert.equal(
    first.governed_read_attempt.working_set.receipts.at(-1).stage,
    'SCOPE_POSTCHECK'
  );
  assert.equal(bridgeCalls, 1);

  const secondRequest = createRequestEnvelope({
    principalAssertion: principal,
    toolName: 'search_memory',
    toolArguments: {
      project_context_ref: contextRef,
      query: 'second read must be denied',
      limit: 1
    },
    now: NOW,
    requestId: 'req_v2_runtime_read_0000000002',
    nonce: 'v2_runtime_read_nonce_000002',
    signing: signing(edge)
  });
  const second = await runtime.handle({
    request: secondRequest,
    relayReceipt: relayReceipt(secondRequest),
    governedReadAttempt:
      relayClaimedAttempt(secondRequest, contextRef, 'b')
  });
  assert.equal(second.status, 'denied');
  assert.equal(second.structured_content.status, 'denied');
  assert.deepEqual(second.counters, {
    provider_calls: 0,
    native_invocations: 0,
    local_fallbacks: null,
    primary_memory_writes: null,
    derived_index_writes: null,
    other_durable_mutations: 0,
    unrestricted_native_searches: 0
  });
  assert.equal(
    second.governed_read_attempt.working_set.receipts.at(-1)
      .reason_code,
    'governance_denied'
  );
  assert.equal(
    second.governed_read_attempt.evidence_complete,
    false
  );
  assert.equal(bridgeCalls, 1);
  assert.equal(
    runtime.snapshot().legacy_v1_read_path_active,
    false
  );
});

test('session-scoped v2 read completes one activation and records canonical counters', async () => {
  const edge = identity('v2-session-edge');
  const context = identity('v2-session-context');
  const principalFingerprint =
    digestObject('v2-session-principal');
  const principal = createPrincipalAssertion({
    issuer: ISSUER,
    audience: AUDIENCE,
    subjectFingerprint: principalFingerprint,
    now: NOW,
    nonce: 'v2_session_principal_nonce_01',
    signing: signing(edge)
  });
  const mappingState =
    loadDiaryScopeMapping({ mapping: mapping() });
  const registryState = validateProjectRegistry(
    registry(mappingState),
    mappingState,
    { resolveDiaryRead: resolveRead }
  );
  const controller =
    createSessionReadActivationController({
      expectedPrincipalFingerprint: principalFingerprint,
      selectedProjectAlias: 'project-v2',
      clock: () => NOW
    });
  const observer = createPrivateDogfoodObserver({
    clock: () => NOW
  });
  controller.activate({
    requestId: 'op_v2_session_activation_000001',
    requestedVisibility: 'project',
    ttlSeconds: 300,
    now: NOW
  });
  observer.prepareActivation(controller.snapshot());
  observer.beginSession({
    observationKind: 'meaningful_task_unprompted',
    taskClass: 'memory_relevant',
    expectedReadTool: 'search_memory',
    activationSnapshot: controller.snapshot()
  });
  let monotonic = 0;
  const runtime = createGovernedReadV2Runtime({
    expectedIssuer: ISSUER,
    expectedAudience: AUDIENCE,
    resolveRequestPublicKey: keyId =>
      keyId === edge.keyId ? edge.publicKey : null,
    resolvePrincipalPublicKey: candidate =>
      candidate?.issuer === ISSUER &&
      candidate?.key_id === edge.keyId
        ? edge.publicKey
        : null,
    registryState,
    mappingState,
    selectedProjectAlias: 'project-v2',
    resolveDiaryRead: resolveRead,
    contextSigning: signing(context),
    activationController: controller,
    dogfoodObserver: observer,
    counterMode: COUNTER_MODES.sessionScopedLiveReadV1,
    clock: () => NOW,
    monotonicClock() {
      monotonic += 7;
      return monotonic;
    },
    async invokeBridge(input) {
      return successfulBridgeResult(input);
    }
  });
  const resolveRequest = createRequestEnvelope({
    principalAssertion: principal,
    toolName: 'resolve_memory_context',
    toolArguments: {
      project_alias: 'project-v2',
      requested_visibility: 'project'
    },
    now: NOW,
    requestId: 'req_v2_session_resolve_0000001',
    nonce: 'v2_session_resolve_nonce_0001',
    signing: signing(edge)
  });
  const resolved = await runtime.handle({
    request: resolveRequest,
    relayReceipt: relayReceipt(resolveRequest)
  });
  const contextRef =
    resolved.structured_content.project_context_ref;
  const readRequest = createRequestEnvelope({
    principalAssertion: principal,
    toolName: 'search_memory',
    toolArguments: {
      project_context_ref: contextRef,
      query: 'session-scoped v2 read',
      limit: 1
    },
    now: NOW,
    requestId: 'req_v2_session_read_000000001',
    nonce: 'v2_session_read_nonce_000001',
    signing: signing(edge)
  });
  const result = await runtime.handle({
    request: readRequest,
    relayReceipt: relayReceipt(readRequest),
    governedReadAttempt:
      relayClaimedAttempt(readRequest, contextRef, 's')
  });
  assert.equal(result.status, 'ok');
  assert.equal(
    controller.snapshot().activation_status,
    'consumed'
  );
  const observation = observer.snapshot(controller.snapshot());
  assert.equal(observation.sessions_started, 1);
  assert.equal(observation.provider_calls, 1);
  assert.equal(observation.native_invocations, 1);
  assert.equal(observation.primary_memory_writes, 0);
  assert.equal(observation.local_fallbacks, 0);
  assert.equal(
    observation.unrestricted_native_searches,
    0
  );
});

test('cancellation after session authorization finalizes activation without dispatch', async () => {
  const edge = identity('v2-cancel-edge');
  const context = identity('v2-cancel-context');
  const principalFingerprint =
    digestObject('v2-cancel-principal');
  const principal = createPrincipalAssertion({
    issuer: ISSUER,
    audience: AUDIENCE,
    subjectFingerprint: principalFingerprint,
    now: NOW,
    nonce: 'v2_cancel_principal_nonce_0001',
    signing: signing(edge)
  });
  const mappingState =
    loadDiaryScopeMapping({ mapping: mapping() });
  const registryState = validateProjectRegistry(
    registry(mappingState),
    mappingState,
    { resolveDiaryRead: resolveRead }
  );
  const controller =
    createSessionReadActivationController({
      expectedPrincipalFingerprint: principalFingerprint,
      selectedProjectAlias: 'project-v2',
      clock: () => NOW
    });
  controller.activate({
    requestId: 'op_v2_cancel_activation_000001',
    requestedVisibility: 'project',
    ttlSeconds: 300,
    now: NOW
  });
  const cancellation = new AbortController();
  const activationController = Object.freeze({
    checkContextIssueAuthorization: input =>
      controller.checkContextIssueAuthorization(input),
    authorizeContextIssue: input =>
      controller.authorizeContextIssue(input),
    bindContext: input => controller.bindContext(input),
    checkReadAuthorization: input =>
      controller.checkReadAuthorization(input),
    authorizeRead(input) {
      const result = controller.authorizeRead(input);
      cancellation.abort();
      return result;
    },
    completeRead: input => controller.completeRead(input),
    kill: input => controller.kill(input),
    snapshot: input => controller.snapshot(input)
  });
  let bridgeCalls = 0;
  const runtime = createGovernedReadV2Runtime({
    expectedIssuer: ISSUER,
    expectedAudience: AUDIENCE,
    resolveRequestPublicKey: keyId =>
      keyId === edge.keyId ? edge.publicKey : null,
    resolvePrincipalPublicKey: candidate =>
      candidate?.issuer === ISSUER &&
      candidate?.key_id === edge.keyId
        ? edge.publicKey
        : null,
    registryState,
    mappingState,
    selectedProjectAlias: 'project-v2',
    resolveDiaryRead: resolveRead,
    contextSigning: signing(context),
    activationController,
    counterMode: COUNTER_MODES.sessionScopedLiveReadV1,
    clock: () => NOW,
    async invokeBridge(input) {
      bridgeCalls += 1;
      return successfulBridgeResult(input);
    }
  });
  const resolveRequest = createRequestEnvelope({
    principalAssertion: principal,
    toolName: 'resolve_memory_context',
    toolArguments: {
      project_alias: 'project-v2',
      requested_visibility: 'project'
    },
    now: NOW,
    requestId: 'req_v2_cancel_resolve_00000001',
    nonce: 'v2_cancel_resolve_nonce_000001',
    signing: signing(edge)
  });
  const resolved = await runtime.handle({
    request: resolveRequest,
    relayReceipt: relayReceipt(resolveRequest)
  });
  const contextRef =
    resolved.structured_content.project_context_ref;
  const readRequest = createRequestEnvelope({
    principalAssertion: principal,
    toolName: 'search_memory',
    toolArguments: {
      project_context_ref: contextRef,
      query: 'cancel after session authorization',
      limit: 1
    },
    now: NOW,
    requestId: 'req_v2_cancel_read_00000000001',
    nonce: 'v2_cancel_read_nonce_0000001',
    signing: signing(edge)
  });

  await assert.rejects(runtime.handle({
    request: readRequest,
    relayReceipt: relayReceipt(readRequest),
    governedReadAttempt:
      relayClaimedAttempt(readRequest, contextRef, 'c')
  }, {
    signal: cancellation.signal
  }), {
    code: 'governed_read_attempt_cancelled'
  });
  await new Promise(resolve => setImmediate(resolve));

  const snapshot = controller.snapshot();
  assert.equal(bridgeCalls, 0);
  assert.equal(snapshot.activation_status, 'consumed');
  assert.equal(snapshot.read_in_flight, false);
  assert.equal(snapshot.retained_in_flight_read_count, 0);
  assert.equal(snapshot.completed_read_count, 1);
});
