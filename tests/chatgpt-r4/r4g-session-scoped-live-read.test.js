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
  callControlSocket,
  parseArguments
} = require('../../src/cli/chatgpt-r4-session-activation');
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

function createRuntimeFixture({ callGovernedTool, clock = () => new Date(NOW) } = {}) {
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
    counterMode: COUNTER_MODES.sessionScopedLiveReadV1,
    clock
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
  assert.equal(fixture.runtime.snapshot().session_activation.completed_read_count, 1);
  assert.equal(fixture.runtime.snapshot().receipt_chains.length, 1);
  assert.match(fixture.runtime.snapshot().receipt_chains[0].activation, /^sha256:[a-f0-9]{64}$/u);
});

test('R4-G suppresses an in-flight read result when the operator kill switch fires', async () => {
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
  assert.equal(runtime.snapshot().session_control.activation.activation_status, 'inactive');
  assert.equal(runtime.snapshot().session_activation_durable_state_written, false);
  assert.equal(initialized, 1);
  const status = await callControlSocket(environment.CODEX_MEMORY_R4_SESSION_CONTROL_UDS_PATH, {
    schema_version: 1,
    operation: 'status',
    request_id: 'op_r4g_authority_status_0001'
  });
  assert.equal(status.activation_status, 'inactive');

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
