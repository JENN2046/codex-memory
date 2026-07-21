'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  COUNTER_MODES,
  DATA_TOOL_NAMES,
  ZERO_MEMORY_COUNTERS,
  createPrincipalAssertion,
  createRequestEnvelope,
  digestObject,
  sha256,
  validateCounters,
  validateToolStructuredContent
} = require('../../packages/chatgpt-r4-contracts');
const {
  createR4GovernanceRuntime,
  createSessionReadActivationController,
  validateProjectRegistry
} = require('../../src/adapters/chatgpt-r4');
const {
  computeGovernanceRuntimeBindingDigest,
  loadGovernanceRuntimeFromEnvironment
} = require('../../src/runtime/chatgpt-r4/governance-runtime-authority');
const {
  createSessionActivationControlServer,
  validateControlRequest
} = require('../../src/runtime/chatgpt-r4/session-activation-control-server');
const {
  DOGFOOD_OBSERVATION_KIND,
  MAX_DOGFOOD_PROVIDER_CALLS,
  MAX_DOGFOOD_SESSIONS,
  createPrivateDogfoodObserver
} = require('../../src/runtime/chatgpt-r4/private-dogfood-observer');
const {
  callControlSocket,
  parseArguments
} = require('../../src/cli/chatgpt-r4-session-activation');
const {
  parseArguments: parseDogfoodArguments,
  validateResponse: validateDogfoodResponse
} = require('../../src/cli/chatgpt-r5-private-dogfood');
const { loadDiaryScopeMapping } = require('../../src/core/DiaryScopeMappingLoader');
const { resolveRead } = require('../../src/core/DiaryScopeMapping');

const NOW = new Date('2026-07-21T08:00:00.000Z');
const ISSUER = 'https://tenant.r4g.example.dev/';
const AUDIENCE = 'https://edge.r4g.example.dev/mcp';

function identity(keyId) {
  const pair = crypto.generateKeyPairSync('ed25519');
  return { keyId, ...pair };
}

function mapping() {
  return {
    schemaVersion: 1,
    mappingReference: 'jenn-vcp-diary-scope-v1',
    defaultPolicy: 'deny',
    entries: [
      {
        partitionReference: 'synthetic-project-ref',
        diaryName: 'Synthetic-Project-Diary',
        classification: 'project_shared',
        clientId: null,
        projectId: 'project-alpha',
        workspaceId: 'workspace-alpha',
        readProfiles: ['exact_visibility', 'task_start_context'],
        writeEligible: true
      },
      {
        partitionReference: 'synthetic-workspace-ref',
        diaryName: 'Synthetic-Workspace-Diary',
        classification: 'workspace_shared',
        clientId: null,
        projectId: null,
        workspaceId: 'workspace-alpha',
        readProfiles: ['exact_visibility', 'task_start_context'],
        writeEligible: true
      }
    ]
  };
}

function registry(mappingState) {
  return {
    schemaVersion: 1,
    registryReference: 'r4g-project-registry-v1',
    mappingReference: mappingState.mappingReference,
    mappingDigest: mappingState.mappingDigest,
    defaultPolicy: 'deny',
    projects: [{
      safeProjectAlias: 'project-alpha',
      projectId: 'project-alpha',
      workspaceId: 'workspace-alpha',
      allowedVisibilities: ['project', 'workspace', 'shared', 'task_start_context']
    }]
  };
}

function delegatedResult() {
  return {
    status: 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATED',
    accepted: true,
    results: [{
      memoryContextProjection: {
        projectionVersion: 1,
        lowDisclosure: true,
        statement: 'Bounded project signal.',
        classification: 'current_state',
        freshness: 'recent',
        reasonCodes: ['semantic_match'],
        conflict: false
      },
      score: 0.9
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
          durableWritePerformed: false,
          durableWriteScope: null,
          primaryMemoryStoreWritePerformed: false,
          derivedIndexWritePerformed: false,
          authorizationResolvedBeforeProvider: true,
          diaryAllowlistEnforcedBeforeIndexLoad: true,
          diaryAllowlistEnforcedBeforeVectorSearch: true,
          resultScopePostcheckPassed: true,
          unscopedNativeSearchUsed: false,
          mappingReferenceBound: true,
          mappingDigestBound: true,
          allowedDiaryCount: 1,
          rawDiaryNamesReturned: false,
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

function requestFixture(edge, principal, toolName, args, sequence, now = NOW) {
  return createRequestEnvelope({
    principalAssertion: principal,
    toolName,
    toolArguments: args,
    now,
    requestId: `req_r4g_session_request_${String(sequence).padStart(10, '0')}`,
    nonce: `r4g_request_nonce_${String(sequence).padStart(10, '0')}`,
    signing: { privateKey: edge.privateKey, keyId: edge.keyId }
  });
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

function createRuntimeFixture({
  callGovernedTool,
  clock = () => new Date(NOW),
  dogfoodObserver = null,
  monotonicClock
} = {}) {
  const edge = identity('r4g-edge-key');
  const context = identity('r4g-context-key');
  const principalFingerprint = sha256('r4g-single-operator');
  const mappingState = loadDiaryScopeMapping({ mapping: mapping() });
  const registryState = validateProjectRegistry(registry(mappingState), mappingState, {
    resolveDiaryRead: resolveRead
  });
  const controller = createSessionReadActivationController({
    expectedPrincipalFingerprint: principalFingerprint,
    selectedProjectAlias: 'project-alpha',
    clock
  });
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
    callGovernedTool: callGovernedTool || (async () => delegatedResult()),
    activationController: controller,
    dogfoodObserver,
    counterMode: COUNTER_MODES.sessionScopedLiveReadV1,
    clock,
    ...(monotonicClock ? { monotonicClock } : {})
  });
  const principal = createPrincipalAssertion({
    issuer: ISSUER,
    audience: AUDIENCE,
    subjectFingerprint: principalFingerprint,
    now: NOW,
    nonce: 'r4g_principal_nonce_0000001',
    signing: { privateKey: edge.privateKey, keyId: edge.keyId }
  });
  return { controller, edge, principal, principalFingerprint, runtime };
}

test('R4-G activation controller is default-closed, one-shot, killable, and ephemeral', () => {
  let now = new Date(NOW);
  let expiryCallback = null;
  const principalFingerprint = sha256('r4g-controller-owner');
  const controller = createSessionReadActivationController({
    expectedPrincipalFingerprint: principalFingerprint,
    selectedProjectAlias: 'project-alpha',
    clock: () => new Date(now),
    schedule(callback) { expiryCallback = callback; return 1; },
    cancelSchedule() { expiryCallback = null; }
  });
  assert.equal(controller.snapshot().activation_status, 'inactive');
  assert.equal(controller.snapshot().default_closed, true);
  assert.equal(controller.authorizeContextIssue({
    principalFingerprint,
    safeProjectAlias: 'project-alpha',
    requestedVisibility: 'project',
    now
  }).accepted, false);

  controller.activate({
    requestId: 'op_abcdefghijklmnopqrstuvwxyz012345',
    requestedVisibility: 'project',
    ttlSeconds: 30,
    now
  });
  assert.throws(() => controller.activate({
    requestId: 'op_abcdefghijklmnopqrstuvwxyz012346',
    requestedVisibility: 'project',
    ttlSeconds: 30,
    now
  }), { code: 'r4_session_activation_already_active' });
  assert.equal(controller.authorizeContextIssue({
    principalFingerprint: sha256('different-principal'),
    safeProjectAlias: 'project-alpha',
    requestedVisibility: 'project',
    now
  }).accepted, false);
  assert.equal(controller.authorizeContextIssue({
    principalFingerprint,
    safeProjectAlias: 'project-alpha',
    requestedVisibility: 'workspace',
    now
  }).accepted, false);
  assert.equal(controller.authorizeContextIssue({
    principalFingerprint,
    safeProjectAlias: 'project-alpha',
    requestedVisibility: 'project',
    now
  }).accepted, true);
  controller.bindContext({ projectContextRef: 'pctx_abcdefghijklmnopqrstuvwxyz123456', now });
  const read = controller.authorizeRead({
    principalFingerprint,
    projectContextRef: 'pctx_abcdefghijklmnopqrstuvwxyz123456',
    toolName: 'search_memory',
    now
  });
  assert.equal(read.accepted, true);
  assert.equal(controller.completeRead({ useToken: read.use_token, now }).accepted, true);
  assert.equal(controller.snapshot().activation_status, 'consumed');
  assert.equal(controller.snapshot().remaining_read_calls, 0);
  assert.equal(controller.snapshot().durable_activation_state_written, false);

  controller.activate({
    requestId: 'op_abcdefghijklmnopqrstuvwxyz012347',
    requestedVisibility: 'project',
    ttlSeconds: 30,
    now
  });
  controller.kill({ reason: 'emergency_stop', now });
  assert.equal(controller.snapshot().activation_status, 'killed');

  controller.activate({
    requestId: 'op_abcdefghijklmnopqrstuvwxyz012348',
    requestedVisibility: 'project',
    ttlSeconds: 30,
    now
  });
  assert.equal(controller.authorizeContextIssue({
    principalFingerprint,
    safeProjectAlias: 'project-alpha',
    requestedVisibility: 'project',
    now
  }).accepted, true);
  controller.bindContext({ projectContextRef: 'pctx_abcdefghijklmnopqrstuvwxyz123457', now });
  const expiringRead = controller.authorizeRead({
    principalFingerprint,
    projectContextRef: 'pctx_abcdefghijklmnopqrstuvwxyz123457',
    toolName: 'memory_overview',
    now
  });
  now = new Date(NOW.getTime() + 31_000);
  expiryCallback();
  assert.equal(controller.completeRead({ useToken: expiringRead.use_token, now }).accepted, false);
  assert.equal(controller.snapshot().activation_status, 'expired');
  assert.equal(controller.snapshot().expiry_count, 1);
  assert.equal(controller.snapshot().suppressed_read_count, 1);

  controller.activate({
    requestId: 'op_abcdefghijklmnopqrstuvwxyz012349',
    requestedVisibility: 'project',
    ttlSeconds: 30,
    now
  });
  assert.equal(controller.authorizeContextIssue({
    principalFingerprint,
    safeProjectAlias: 'project-alpha',
    requestedVisibility: 'project',
    now
  }).accepted, true);
  controller.bindContext({ projectContextRef: 'pctx_abcdefghijklmnopqrstuvwxyz123458', now });
  const replacementRaceRead = controller.authorizeRead({
    principalFingerprint,
    projectContextRef: 'pctx_abcdefghijklmnopqrstuvwxyz123458',
    toolName: 'search_memory',
    now
  });
  controller.kill({ reason: 'emergency_stop', now });
  controller.activate({
    requestId: 'op_abcdefghijklmnopqrstuvwxyz012350',
    requestedVisibility: 'project',
    ttlSeconds: 30,
    now
  });
  assert.equal(controller.snapshot().read_in_flight, true);
  const replacedCompletion = controller.completeRead({
    useToken: replacementRaceRead.use_token,
    now
  });
  assert.equal(replacedCompletion.accepted, false);
  assert.equal(replacedCompletion.status, 'killed');
  assert.equal(controller.snapshot().activation_status, 'active');
  assert.equal(controller.snapshot().read_in_flight, false);
});

test('R4-G counter mode preserves bounded live-read maxima without changing zero-memory', () => {
  const bounded = {
    provider_calls: 1,
    native_invocations: 1,
    local_fallbacks: 0,
    primary_memory_writes: 0,
    derived_index_writes: 1,
    other_durable_mutations: 1,
    unrestricted_native_searches: 0
  };
  assert.doesNotThrow(() => validateCounters(bounded, {
    counterMode: COUNTER_MODES.sessionScopedLiveReadV1
  }));
  assert.throws(() => validateCounters(bounded, {
    counterMode: COUNTER_MODES.zeroMemory
  }), { code: 'zero_memory_counter_nonzero' });
  assert.throws(() => validateCounters({ ...bounded, provider_calls: 2 }, {
    counterMode: COUNTER_MODES.sessionScopedLiveReadV1
  }), { code: 'governed_live_read_counter_out_of_bounds' });
});

test('R4-G runtime denies before provider, permits one bounded read, then consumes the lease', async () => {
  let providerCalls = 0;
  const fixture = createRuntimeFixture({
    async callGovernedTool() { providerCalls += 1; return delegatedResult(); }
  });
  const inactiveRequest = requestFixture(fixture.edge, fixture.principal, 'resolve_memory_context', {
    project_alias: 'project-alpha',
    requested_visibility: 'project'
  }, 1);
  const inactive = await fixture.runtime.handle({
    request: inactiveRequest,
    relayReceipt: relayReceipt(inactiveRequest)
  });
  assert.equal(inactive.status, 'unavailable');
  assert.deepEqual(inactive.counters, ZERO_MEMORY_COUNTERS);
  assert.equal(providerCalls, 0);
  for (const [sequence, projectAlias, visibility] of [
    [4, 'unregistered-project', 'project'],
    [5, 'project-alpha', 'workspace']
  ]) {
    const probe = requestFixture(fixture.edge, fixture.principal, 'resolve_memory_context', {
      project_alias: projectAlias,
      requested_visibility: visibility
    }, sequence);
    const probeResult = await fixture.runtime.handle({
      request: probe,
      relayReceipt: relayReceipt(probe)
    });
    assert.equal(probeResult.status, 'unavailable');
    assert.deepEqual(probeResult.structured_content, { context_status: 'unavailable' });
  }
  for (let sequence = 6; sequence < 26; sequence += 1) {
    const retry = requestFixture(fixture.edge, fixture.principal, 'resolve_memory_context', {
      project_alias: 'project-alpha',
      requested_visibility: 'project'
    }, sequence);
    const retryResult = await fixture.runtime.handle({
      request: retry,
      relayReceipt: relayReceipt(retry)
    });
    assert.equal(retryResult.status, 'unavailable');
  }
  assert.equal(fixture.runtime.snapshot().inactive_request_attempts, 23);
  assert.equal(fixture.runtime.snapshot().authorized_request_attempts, 0);
  assert.equal(providerCalls, 0);

  fixture.controller.activate({
    requestId: 'op_r4g_runtime_activation_000001',
    requestedVisibility: 'project',
    ttlSeconds: 300,
    now: NOW
  });
  const resolveRequest = requestFixture(fixture.edge, fixture.principal, 'resolve_memory_context', {
    project_alias: 'project-alpha',
    requested_visibility: 'project'
  }, 2);
  const resolved = await fixture.runtime.handle({
    request: resolveRequest,
    relayReceipt: relayReceipt(resolveRequest)
  });
  assert.equal(resolved.status, 'ok');

  const searchRequest = requestFixture(fixture.edge, fixture.principal, 'search_memory', {
    project_context_ref: resolved.structured_content.project_context_ref,
    query: 'bounded project signal',
    limit: 1
  }, 3);
  const found = await fixture.runtime.handle({
    request: searchRequest,
    relayReceipt: relayReceipt(searchRequest)
  });
  assert.equal(found.status, 'ok');
  assert.equal(found.structured_content.status, 'found');
  assert.equal(found.counters.provider_calls, 1);
  assert.equal(providerCalls, 1);
  assert.equal(fixture.controller.snapshot().activation_status, 'consumed');
  assert.equal(fixture.runtime.snapshot().authorized_request_attempts, 2);
  assert.equal(fixture.runtime.snapshot().session_activation.completed_read_count, 1);
  assert.equal(fixture.runtime.snapshot().receipt_chains.length, 1);
  assert.match(fixture.runtime.snapshot().receipt_chains[0].activation, /^sha256:[a-f0-9]{64}$/u);

  let closedProviderCalls = 0;
  const closedFixture = createRuntimeFixture({
    async callGovernedTool() { closedProviderCalls += 1; return delegatedResult(); }
  });
  closedFixture.controller.activate({
    requestId: 'op_r4g_closed_read_activation_0001',
    requestedVisibility: 'project',
    ttlSeconds: 300,
    now: NOW
  });
  const closedResolveRequest = requestFixture(
    closedFixture.edge,
    closedFixture.principal,
    'resolve_memory_context',
    { project_alias: 'project-alpha', requested_visibility: 'project' },
    30
  );
  const closedResolved = await closedFixture.runtime.handle({
    request: closedResolveRequest,
    relayReceipt: relayReceipt(closedResolveRequest)
  });
  const validContextRef = closedResolved.structured_content.project_context_ref;
  const finalCharacter = validContextRef.slice(-1);
  const unknownContextRef = `${validContextRef.slice(0, -1)}${finalCharacter === 'A' ? 'B' : 'A'}`;
  closedFixture.controller.kill({ reason: 'emergency_stop', now: NOW });
  closedFixture.controller.activate({
    requestId: 'op_r4g_closed_read_replacement_0001',
    requestedVisibility: 'project',
    ttlSeconds: 300,
    now: NOW
  });
  const replacementResolveRequest = requestFixture(
    closedFixture.edge,
    closedFixture.principal,
    'resolve_memory_context',
    { project_alias: 'project-alpha', requested_visibility: 'project' },
    31
  );
  const replacementResolved = await closedFixture.runtime.handle({
    request: replacementResolveRequest,
    relayReceipt: relayReceipt(replacementResolveRequest)
  });
  assert.notEqual(replacementResolved.structured_content.project_context_ref, validContextRef);
  const closedResults = [];
  for (const [sequence, projectContextRef] of [[32, validContextRef], [33, unknownContextRef]]) {
    const closedRead = requestFixture(closedFixture.edge, closedFixture.principal, 'search_memory', {
      project_context_ref: projectContextRef,
      query: 'closed session probe',
      limit: 1
    }, sequence);
    closedResults.push(await closedFixture.runtime.handle({
      request: closedRead,
      relayReceipt: relayReceipt(closedRead)
    }));
  }
  for (const closedResult of closedResults) {
    assert.equal(closedResult.status, 'unavailable');
    assert.deepEqual(closedResult.structured_content, {
      status: 'unavailable', result_count: 0, results: []
    });
    assert.deepEqual(closedResult.counters, ZERO_MEMORY_COUNTERS);
  }
  assert.equal(closedProviderCalls, 0);
  assert.equal(closedFixture.controller.snapshot().activation_status, 'active');
  assert.equal(closedFixture.controller.snapshot().remaining_read_calls, 1);

  let fractionalNow = new Date(NOW);
  const fractionalFixture = createRuntimeFixture({
    clock: () => new Date(fractionalNow)
  });
  const fractionalActivation = fractionalFixture.controller.activate({
    requestId: 'op_r4g_fractional_expiry_activation_01',
    requestedVisibility: 'project',
    ttlSeconds: 30,
    now: fractionalNow
  });
  fractionalNow = new Date(NOW.getTime() + 501);
  const fractionalResolveRequest = requestFixture(
    fractionalFixture.edge,
    fractionalFixture.principal,
    'resolve_memory_context',
    { project_alias: 'project-alpha', requested_visibility: 'project' },
    40,
    fractionalNow
  );
  const fractionalResolved = await fractionalFixture.runtime.handle({
    request: fractionalResolveRequest,
    relayReceipt: relayReceipt(fractionalResolveRequest)
  });
  assert.equal(fractionalResolved.status, 'ok');
  assert.equal(fractionalResolved.structured_content.expires_at, fractionalActivation.expires_at);
});

test('R4-G suppresses an in-flight kill and finalizes a failed native invocation', async () => {
  let releaseProvider;
  let providerStarted;
  const started = new Promise(resolve => { providerStarted = resolve; });
  const fixture = createRuntimeFixture({
    async callGovernedTool() {
      providerStarted();
      await new Promise(resolve => { releaseProvider = resolve; });
      return delegatedResult();
    }
  });
  fixture.controller.activate({
    requestId: 'op_r4g_inflight_activation_0001',
    requestedVisibility: 'project',
    ttlSeconds: 300,
    now: NOW
  });
  const resolveRequest = requestFixture(fixture.edge, fixture.principal, 'resolve_memory_context', {
    project_alias: 'project-alpha',
    requested_visibility: 'project'
  }, 4);
  const resolved = await fixture.runtime.handle({
    request: resolveRequest,
    relayReceipt: relayReceipt(resolveRequest)
  });
  const searchRequest = requestFixture(fixture.edge, fixture.principal, 'search_memory', {
    project_context_ref: resolved.structured_content.project_context_ref,
    query: 'bounded project signal',
    limit: 1
  }, 5);
  const pending = fixture.runtime.handle({
    request: searchRequest,
    relayReceipt: relayReceipt(searchRequest)
  });
  await started;
  fixture.controller.kill({ reason: 'emergency_stop', now: NOW });
  assert.equal(fixture.controller.snapshot().read_in_flight, true);
  fixture.controller.activate({
    requestId: 'op_r4g_inflight_replacement_0001',
    requestedVisibility: 'project',
    ttlSeconds: 300,
    now: NOW
  });
  assert.equal(fixture.controller.snapshot().read_in_flight, true);
  releaseProvider();
  const suppressed = await pending;
  assert.equal(suppressed.status, 'unavailable');
  assert.deepEqual(suppressed.structured_content, {
    status: 'unavailable',
    result_count: 0,
    results: []
  });
  assert.equal(suppressed.counters.provider_calls, 1);
  assert.equal(suppressed.counters.native_invocations, 1);
  assert.doesNotThrow(() => validateToolStructuredContent(
    'search_memory',
    suppressed.structured_content,
    { status: 'unavailable' }
  ));
  assert.equal(fixture.controller.snapshot().suppressed_read_count, 1);
  assert.equal(fixture.controller.snapshot().read_in_flight, false);
  assert.equal(fixture.controller.snapshot().activation_status, 'active');

  const failing = createRuntimeFixture({
    async callGovernedTool() {
      throw Object.assign(new Error('synthetic native failure'), {
        code: 'synthetic_native_failure'
      });
    }
  });
  failing.controller.activate({
    requestId: 'op_r4g_failing_activation_000001',
    requestedVisibility: 'project',
    ttlSeconds: 300,
    now: NOW
  });
  const failingResolveRequest = requestFixture(
    failing.edge,
    failing.principal,
    'resolve_memory_context',
    { project_alias: 'project-alpha', requested_visibility: 'project' },
    30
  );
  const failingResolved = await failing.runtime.handle({
    request: failingResolveRequest,
    relayReceipt: relayReceipt(failingResolveRequest)
  });
  const failingSearchRequest = requestFixture(failing.edge, failing.principal, 'search_memory', {
    project_context_ref: failingResolved.structured_content.project_context_ref,
    query: 'bounded project signal',
    limit: 1
  }, 31);
  await assert.rejects(() => failing.runtime.handle({
    request: failingSearchRequest,
    relayReceipt: relayReceipt(failingSearchRequest)
  }), { code: 'synthetic_native_failure' });
  assert.equal(failing.controller.snapshot().activation_status, 'consumed');
  assert.equal(failing.controller.snapshot().read_in_flight, false);
  assert.doesNotThrow(() => failing.controller.activate({
    requestId: 'op_r4g_replacement_activation_0001',
    requestedVisibility: 'project',
    ttlSeconds: 30,
    now: NOW
  }));
});

test('R4-G owner-only control UDS supports bounded activate/status/kill and replay safety', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-r4g-control-'));
  fs.chmodSync(root, 0o700);
  const socketPath = path.join(root, 'control.sock');
  const controller = createSessionReadActivationController({
    expectedPrincipalFingerprint: sha256('r4g-control-owner'),
    selectedProjectAlias: 'project-alpha'
  });
  const server = createSessionActivationControlServer({ socketPath, activationController: controller });
  await server.start();
  t.after(async () => {
    await server.stop();
    fs.rmSync(root, { recursive: true, force: true });
  });
  assert.equal(fs.statSync(socketPath).mode & 0o777, 0o600);
  const statusRequest = {
    schema_version: 1,
    operation: 'status',
    request_id: 'op_r4g_control_status_000001'
  };
  const status = await callControlSocket(socketPath, statusRequest);
  assert.equal(status.activation_status, 'inactive');
  const activateRequest = {
    schema_version: 1,
    operation: 'activate',
    request_id: 'op_r4g_control_activate_0001',
    requested_visibility: 'project',
    ttl_seconds: 30
  };
  const activated = await callControlSocket(socketPath, activateRequest);
  const replayed = await callControlSocket(socketPath, activateRequest);
  assert.deepEqual(replayed, activated);
  assert.throws(() => server.handleControlRequest({
    ...activateRequest,
    ttl_seconds: 31
  }), { code: 'r4_session_control_replay_mismatch' });
  const killed = await callControlSocket(socketPath, {
    schema_version: 1,
    operation: 'kill',
    request_id: 'op_r4g_control_kill_00000001',
    reason: 'operator_requested'
  });
  assert.equal(killed.activation_status, 'killed');
  assert.equal(server.snapshot().request_bodies_logged, 0);
  assert.equal(server.snapshot().response_bodies_logged, 0);
  assert.equal(server.snapshot().durable_control_state_written, false);
  assert.throws(() => validateControlRequest({ ...statusRequest, unexpected: true }), {
    code: 'r4_session_control_request_shape_invalid'
  });
  for (let index = 0; index < 62; index += 1) {
    server.handleControlRequest({
      schema_version: 1,
      operation: 'kill',
      request_id: `op_r4g_mutation_budget_${String(index).padStart(30, '0')}`,
      reason: 'operator_requested'
    });
  }
  assert.throws(() => server.handleControlRequest({
    schema_version: 1,
    operation: 'kill',
    request_id: 'op_r4g_mutation_budget_exhausted_0000001',
    reason: 'operator_requested'
  }), { code: 'r4_session_control_mutation_budget_exhausted' });
  assert.equal(parseArguments(['activate', '--ttl-seconds', '30', '--visibility', 'project']).request.ttl_seconds, 30);
  assert.throws(() => parseArguments(['activate', '--ttl-seconds', '301']), {
    code: 'r4_session_cli_activation_invalid'
  });

  const reservedController = createSessionReadActivationController({
    expectedPrincipalFingerprint: sha256('r4g-reserved-kill-owner'),
    selectedProjectAlias: 'project-alpha'
  });
  const reservedServer = createSessionActivationControlServer({
    socketPath: path.join(root, 'reserved-control.sock'),
    activationController: reservedController
  });
  for (let index = 0; index < 62; index += 1) {
    reservedServer.handleControlRequest({
      schema_version: 1,
      operation: 'kill',
      request_id: `op_r4g_reserved_kill_${String(index).padStart(32, '0')}`,
      reason: 'operator_requested'
    });
  }
  reservedServer.handleControlRequest({
    schema_version: 1,
    operation: 'activate',
    request_id: 'op_r4g_reserved_final_activation_000001',
    requested_visibility: 'project',
    ttl_seconds: 30
  });
  const finalKill = reservedServer.handleControlRequest({
    schema_version: 1,
    operation: 'kill',
    request_id: 'op_r4g_reserved_emergency_kill_0000001',
    reason: 'emergency_stop'
  });
  assert.equal(finalKill.activation_status, 'killed');
  assert.equal(reservedServer.snapshot().replay_receipt_count, 64);
  assert.throws(() => reservedServer.handleControlRequest({
    schema_version: 1,
    operation: 'activate',
    request_id: 'op_r4g_reserved_over_budget_activate_001',
    requested_visibility: 'project',
    ttl_seconds: 30
  }), { code: 'r4_session_control_mutation_budget_exhausted' });

  const inflightPrincipal = sha256('r4g-inflight-kill-projection-owner');
  const inflightController = createSessionReadActivationController({
    expectedPrincipalFingerprint: inflightPrincipal,
    selectedProjectAlias: 'project-alpha'
  });
  const inflightServer = createSessionActivationControlServer({
    socketPath: path.join(root, 'inflight-control.sock'),
    activationController: inflightController
  });
  inflightServer.handleControlRequest({
    schema_version: 1,
    operation: 'activate',
    request_id: 'op_r4g_inflight_projection_activate_01',
    requested_visibility: 'project',
    ttl_seconds: 30
  });
  inflightController.authorizeContextIssue({
    principalFingerprint: inflightPrincipal,
    safeProjectAlias: 'project-alpha',
    requestedVisibility: 'project'
  });
  inflightController.bindContext({ projectContextRef: 'pctx_inflight_projection' });
  const inflightRead = inflightController.authorizeRead({
    principalFingerprint: inflightPrincipal,
    projectContextRef: 'pctx_inflight_projection',
    toolName: 'search_memory'
  });
  const projectedKill = inflightServer.handleControlRequest({
    schema_version: 1,
    operation: 'kill',
    request_id: 'op_r4g_inflight_projection_kill_0001',
    reason: 'emergency_stop'
  });
  assert.equal(projectedKill.activation_status, 'killed');
  assert.equal(projectedKill.context_bound, true);
  assert.equal(projectedKill.read_in_flight, true);
  assert.equal(projectedKill.remaining_read_calls, 0);
  inflightController.completeRead({ useToken: inflightRead.use_token });
});

test('R4-G runtime authority binds operator/control references and starts default-closed', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-r4g-authority-'));
  fs.chmodSync(root, 0o700);
  const stateRoot = path.join(root, 'state');
  const socketRoot = path.join(root, 'run');
  fs.mkdirSync(stateRoot, { mode: 0o700 });
  fs.mkdirSync(socketRoot, { mode: 0o700 });
  const edge = identity('r4g-authority-edge');
  const context = identity('r4g-authority-context');
  const operatorFingerprint = sha256('r4g-authority-owner');
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
    nativeToken: path.join(root, 'native-auth'),
    operatorFingerprint: path.join(root, 'operator-fingerprint')
  };
  for (const [file, value] of [
    [files.mapping, JSON.stringify(mapping())],
    [files.registry, JSON.stringify(registryValue)],
    [files.edgePublic, edge.publicKey.export({ type: 'spki', format: 'pem' })],
    [files.contextPrivate, context.privateKey.export({ type: 'pkcs8', format: 'pem' })],
    [files.nativeToken, `${'n'.repeat(48)}\n`],
    [files.operatorFingerprint, `${operatorFingerprint}\n`]
  ]) fs.writeFileSync(file, value, { mode: 0o600 });
  const environment = {
    CODEX_MEMORY_R4_GOVERNANCE_PRIVATE_ROOT: root,
    CODEX_MEMORY_R4_COUNTER_MODE: COUNTER_MODES.sessionScopedLiveReadV1,
    CODEX_MEMORY_R4_GOVERNANCE_LIVE_READ_ENABLED: 'true',
    CODEX_MEMORY_R5_PRIVATE_DOGFOOD_ENABLED: 'true',
    CODEX_MEMORY_R4_DIARY_SCOPE_MAPPING_REFERENCE: `file:${files.mapping}`,
    CODEX_MEMORY_R4_PROJECT_REGISTRY_REFERENCE: `file:${files.registry}`,
    CODEX_MEMORY_R4_CONTEXT_SIGNING_PRIVATE_KEY_REFERENCE: `file:${files.contextPrivate}`,
    CODEX_MEMORY_R4_EDGE_SIGNING_PUBLIC_KEY: `file:${files.edgePublic}`,
    CODEX_MEMORY_R4_NATIVE_HTTP_TOKEN_REFERENCE: `file:${files.nativeToken}`,
    CODEX_MEMORY_R4_OPERATOR_SUBJECT_FINGERPRINT_REFERENCE: `file:${files.operatorFingerprint}`,
    CODEX_MEMORY_R4_EXPECTED_MAPPING_REFERENCE: mappingState.mappingReference,
    CODEX_MEMORY_R4_EXPECTED_MAPPING_DIGEST: mappingState.mappingDigest,
    CODEX_MEMORY_R4_EXPECTED_REGISTRY_REFERENCE: registryState.registryReference,
    CODEX_MEMORY_R4_EXPECTED_REGISTRY_DIGEST: registryState.registryDigest,
    CODEX_MEMORY_R4_LIVE_READ_PROJECT_ALIAS: 'project-alpha',
    CODEX_MEMORY_R4_GOVERNANCE_BINDING_REFERENCE: 'r4g-private-binding-v1',
    CODEX_MEMORY_R4_GOVERNANCE_ROLLBACK_REFERENCE: 'r4e-zero-memory-binding-v1',
    CODEX_MEMORY_R4_PUBLIC_ORIGIN: 'https://memory.r4g.example.dev',
    CODEX_MEMORY_R4_AUTH0_ISSUER: ISSUER,
    CODEX_MEMORY_R4_EDGE_SIGNING_KEY_ID: edge.keyId,
    CODEX_MEMORY_R4_CONTEXT_SIGNING_KEY_ID: context.keyId,
    CODEX_MEMORY_R4_GOVERNANCE_STATE_ROOT: stateRoot,
    CODEX_MEMORY_R4_RELAY_UDS_PATH: path.join(socketRoot, 'governance.sock'),
    CODEX_MEMORY_R4_SESSION_CONTROL_UDS_PATH: path.join(socketRoot, 'control.sock'),
    CODEX_MEMORY_R4_NATIVE_TARGET_REFERENCE: 'r4g-native-target-v1',
    CODEX_MEMORY_R4_NATIVE_HTTP_ENDPOINT: 'http://127.0.0.1:7615/mcp/vcp-native'
  };
  environment.CODEX_MEMORY_R4_GOVERNANCE_BINDING_DIGEST =
    computeGovernanceRuntimeBindingDigest(environment);
  let initialized = 0;
  let closed = 0;
  const appFactory = () => ({
    async initialize() { initialized += 1; },
    async callTool() { return delegatedResult(); },
    async close() { closed += 1; }
  });
  const runtime = await loadGovernanceRuntimeFromEnvironment(environment, {
    privateRoot: root,
    appFactory
  });
  await runtime.start();
  t.after(async () => {
    await runtime.stop();
    fs.rmSync(root, { recursive: true, force: true });
  });
  assert.equal(runtime.snapshot().mode, COUNTER_MODES.sessionScopedLiveReadV1);
  assert.equal(runtime.snapshot().session_activation_default_closed, true);
  assert.equal(runtime.snapshot().private_dogfood_enabled, true);
  assert.equal(runtime.snapshot().session_control.private_dogfood_observation.sessions_started, 0);
  assert.equal(runtime.snapshot().session_control.activation.activation_status, 'inactive');
  assert.equal(runtime.snapshot().session_activation_durable_state_written, false);
  assert.equal(initialized, 1);
  const status = await callControlSocket(environment.CODEX_MEMORY_R4_SESSION_CONTROL_UDS_PATH, {
    schema_version: 1,
    operation: 'status',
    request_id: 'op_r4g_authority_status_0001'
  });
  assert.equal(status.activation_status, 'inactive');
  const dogfoodStatus = await callControlSocket(
    environment.CODEX_MEMORY_R4_SESSION_CONTROL_UDS_PATH,
    {
      schema_version: 2,
      operation: 'status',
      request_id: 'op_r5a_authority_status_000001'
    },
    { validate: validateDogfoodResponse }
  );
  assert.equal(dogfoodStatus.observation.sessions_started, 0);

  const invalidEnvironment = {
    ...environment,
    CODEX_MEMORY_R4_SESSION_CONTROL_UDS_PATH: environment.CODEX_MEMORY_R4_RELAY_UDS_PATH
  };
  invalidEnvironment.CODEX_MEMORY_R4_GOVERNANCE_BINDING_DIGEST =
    computeGovernanceRuntimeBindingDigest(invalidEnvironment);
  await assert.rejects(loadGovernanceRuntimeFromEnvironment(invalidEnvironment, {
    privateRoot: root,
    appFactory
  }), { code: 'r4_governance_control_socket_path_invalid' });
  assert.equal(DATA_TOOL_NAMES.includes('activate_live_read'), false);
  assert.equal(DATA_TOOL_NAMES.includes('kill_live_read'), false);
  assert.equal(closed, 0);
});

test('R5-A observer records only bounded low-disclosure session outcomes', async () => {
  const observer = createPrivateDogfoodObserver();
  let monotonic = 0;
  const fixture = createRuntimeFixture({
    dogfoodObserver: observer,
    monotonicClock() {
      monotonic += 11;
      return monotonic;
    }
  });
  fixture.controller.activate({
    requestId: 'op_r5a_observation_activation_000001',
    requestedVisibility: 'project',
    ttlSeconds: 300,
    now: NOW
  });
  observer.beginSession({
    observationKind: DOGFOOD_OBSERVATION_KIND,
    activationSnapshot: fixture.controller.snapshot(NOW)
  });
  const resolveRequest = requestFixture(
    fixture.edge,
    fixture.principal,
    'resolve_memory_context',
    { project_alias: 'project-alpha', requested_visibility: 'project' },
    90
  );
  const resolved = await fixture.runtime.handle({
    request: resolveRequest,
    relayReceipt: relayReceipt(resolveRequest)
  });
  const searchRequest = requestFixture(fixture.edge, fixture.principal, 'search_memory', {
    project_context_ref: resolved.structured_content.project_context_ref,
    query: 'bounded project signal',
    limit: 1
  }, 91);
  const found = await fixture.runtime.handle({
    request: searchRequest,
    relayReceipt: relayReceipt(searchRequest)
  });
  assert.equal(found.structured_content.status, 'found');
  const observation = observer.exportObservation();
  assert.equal(observation.sessions_started, 1);
  assert.equal(observation.sessions_with_resolve, 1);
  assert.equal(observation.sessions_with_read, 1);
  assert.equal(observation.resolve_then_read_sessions, 1);
  assert.equal(observation.emergency_stop_latched, false);
  assert.equal(observation.provider_calls, 1);
  assert.equal(observation.local_fallbacks, 0);
  assert.equal(observation.primary_memory_writes, 0);
  assert.equal(observation.derived_index_writes, 0);
  assert.equal(observation.other_durable_mutations, 1);
  assert.equal(observation.last_session.status, 'consumed');
  assert.deepEqual(observation.last_session.tool_sequence, [
    'resolve_memory_context',
    'search_memory'
  ]);
  assert.equal(observation.last_session.result_count, 1);
  assert.equal(observation.last_session.max_relevance, 0.9);
  assert.equal(observation.last_session.total_latency_ms, 22);
  assert.equal(JSON.stringify(observation).includes('Bounded project signal.'), false);
  assert.equal(fixture.runtime.snapshot().max_authorized_tool_calls, 40);

  const providerCapped = createPrivateDogfoodObserver({ maxProviderCalls: 1 });
  providerCapped.beginSession({
    observationKind: DOGFOOD_OBSERVATION_KIND,
    activationSnapshot: { activation_status: 'active' }
  });
  providerCapped.observeToolResult({
    toolName: 'search_memory',
    latencyMs: 1,
    status: 'found',
    resultCount: 1,
    relevance: 0.5,
    counters: { ...ZERO_MEMORY_COUNTERS, provider_calls: 1, native_invocations: 1 },
    activationSnapshot: { activation_status: 'consumed' }
  });
  assert.throws(() => providerCapped.prepareActivation({ activation_status: 'consumed' }), {
    code: 'r5a_dogfood_provider_budget_exhausted'
  });
});

test('R5-A control protocol is operator-only, versioned, and capped at twenty sessions', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-r5a-control-'));
  fs.chmodSync(root, 0o700);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const observer = createPrivateDogfoodObserver();
  const controller = createSessionReadActivationController({
    expectedPrincipalFingerprint: sha256('r5a-control-owner'),
    selectedProjectAlias: 'project-alpha'
  });
  const server = createSessionActivationControlServer({
    socketPath: path.join(root, 'never-started.sock'),
    activationController: controller,
    dogfoodObserver: observer
  });
  const activate = {
    schema_version: 2,
    operation: 'activate',
    request_id: 'op_r5a_control_activate_0000001',
    requested_visibility: 'project',
    ttl_seconds: 30,
    observation_kind: DOGFOOD_OBSERVATION_KIND
  };
  const activated = server.handleControlRequest(activate);
  assert.equal(activated.schema_version, 2);
  assert.equal(activated.observation.sessions_started, 1);
  assert.equal(activated.observation.session_limit, MAX_DOGFOOD_SESSIONS);
  assert.equal(activated.observation.provider_call_limit, MAX_DOGFOOD_PROVIDER_CALLS);
  assert.doesNotThrow(() => validateDogfoodResponse(activated, 'activate'));
  assert.throws(() => server.handleControlRequest({
    schema_version: 1,
    operation: 'activate',
    request_id: 'op_r5a_unobserved_activate_000001',
    requested_visibility: 'project',
    ttl_seconds: 30
  }), { code: 'r5a_dogfood_observation_required' });
  assert.equal(server.handleControlRequest({
    schema_version: 2,
    operation: 'kill',
    request_id: 'op_r5a_control_kill_0000000001',
    reason: 'operator_requested'
  }).activation_status, 'killed');
  const oneSessionObserver = createPrivateDogfoodObserver({ maxSessions: 1 });
  oneSessionObserver.beginSession({
    observationKind: DOGFOOD_OBSERVATION_KIND,
    activationSnapshot: { activation_status: 'active' }
  });
  oneSessionObserver.syncActivation({ activation_status: 'killed' });
  assert.throws(() => oneSessionObserver.prepareActivation({ activation_status: 'killed' }), {
    code: 'r5a_dogfood_session_budget_exhausted'
  });
  assert.throws(() => validateControlRequest({
    ...activate,
    request_id: 'op_r5a_invalid_observation_00001',
    observation_kind: 'prompted'
  }), { code: 'r5a_dogfood_control_observation_invalid' });
  const parsed = parseDogfoodArguments([
    'activate', '--visibility', 'workspace', '--ttl-seconds', '30', '--json'
  ]);
  assert.equal(parsed.request.schema_version, 2);
  assert.equal(parsed.request.observation_kind, DOGFOOD_OBSERVATION_KIND);
});

test('R5-A rejects forbidden derived-index mutation before returning a live-read result', async () => {
  const observer = createPrivateDogfoodObserver();
  const resultWithDerivedWrite = delegatedResult();
  resultWithDerivedWrite.receipt.nativeInvocationReceipt.nativeRuntimeReceipt = {
    ...resultWithDerivedWrite.receipt.nativeInvocationReceipt.nativeRuntimeReceipt,
    derivedIndexWritePerformed: true,
    durableWritePerformed: true,
    durableWriteScope: 'isolated_derived_index'
  };
  const fixture = createRuntimeFixture({
    dogfoodObserver: observer,
    async callGovernedTool() { return resultWithDerivedWrite; }
  });
  fixture.controller.activate({
    requestId: 'op_r5a_derived_guard_activation_001',
    requestedVisibility: 'project',
    ttlSeconds: 300,
    now: NOW
  });
  observer.beginSession({
    observationKind: DOGFOOD_OBSERVATION_KIND,
    activationSnapshot: fixture.controller.snapshot(NOW)
  });
  const resolveRequest = requestFixture(
    fixture.edge,
    fixture.principal,
    'resolve_memory_context',
    { project_alias: 'project-alpha', requested_visibility: 'project' },
    92
  );
  const resolved = await fixture.runtime.handle({
    request: resolveRequest,
    relayReceipt: relayReceipt(resolveRequest)
  });
  const searchRequest = requestFixture(fixture.edge, fixture.principal, 'search_memory', {
    project_context_ref: resolved.structured_content.project_context_ref,
    query: 'bounded project signal',
    limit: 1
  }, 93);
  await assert.rejects(fixture.runtime.handle({
    request: searchRequest,
    relayReceipt: relayReceipt(searchRequest)
  }), { code: 'r5a_dogfood_forbidden_counter_observed' });
  assert.equal(observer.snapshot().derived_index_writes, 0);
  assert.equal(observer.snapshot().primary_memory_writes, 0);
  assert.equal(observer.snapshot().last_session.status, 'emergency_stopped');
  assert.equal(observer.snapshot().emergency_stop_latched, true);
  assert.equal(
    observer.snapshot().last_session.error_code,
    'r5a_dogfood_forbidden_counter_observed'
  );
  assert.doesNotThrow(() => validateDogfoodResponse({
    schema_version: 2,
    operation: 'status',
    accepted: true,
    activation_status: fixture.controller.snapshot().activation_status,
    remaining_ttl_seconds: 0,
    context_bound: true,
    read_in_flight: false,
    remaining_read_calls: 0,
    default_closed: true,
    durable_state_written: false,
    receipt_digest: fixture.controller.snapshot().receipt_digest,
    observation: observer.snapshot()
  }, 'status'));
  assert.throws(() => observer.prepareActivation(fixture.controller.snapshot()), {
    code: 'r5a_dogfood_emergency_stop_latched'
  });
  assert.throws(() => observer.beginSession({
    observationKind: DOGFOOD_OBSERVATION_KIND,
    activationSnapshot: { activation_status: 'active' }
  }), { code: 'r5a_dogfood_emergency_stop_latched' });
});
