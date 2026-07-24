'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  COUNTER_MODES,
  digestObject
} = require('../../packages/chatgpt-r4-contracts');
const {
  modelVisibleErrorText,
  modelVisibleResultText,
  toolDescriptors
} = require('../../apps/chatgpt-edge');
const {
  MEMORY_SCOPE_WIDGET_HTML,
  openAiGlobalsFromEvent
} = require('../../apps/chatgpt-memory-scope-widget');
const {
  createGovernedLiveReadInvoker,
  receiptBackedNativePreflightFailure,
  validateGovernanceInvocation
} = require('../../src/adapters/chatgpt-r4');
const {
  initializeResult,
  toolsListResult
} = require('../../src/core/GovernedMcpVcpNativeVcpToolBoxMcpShim');
const {
  diaryScopeMappingBindingFingerprint
} = require('../../src/core/DiaryScopeMappingBindingFingerprint');
const {
  preparePrivateRuntimeEnvironment,
  probeIsolatedShimCapabilities
} = require('../../src/runtime/chatgpt-r4/private-runtime-preparation');
const {
  DOGFOOD_OBSERVATION_KIND,
  createPrivateDogfoodObserver
} = require('../../src/runtime/chatgpt-r4/private-dogfood-observer');

const PUBLIC_SCHEMA_DIGESTS_FROM_R5M_MAIN = Object.freeze({
  resolve_memory_context: 'sha256:323d0cdcd4ca76d41b0af27ce514c0446e30bd5ba87da8d172f024c69626bbb6',
  memory_overview: 'sha256:a9314eb1604641ae76d95132bf73ed28c3136afe5c9a8352fb2474b695f372d1',
  search_memory: 'sha256:c301306bf253377183d8dc4d660dd09d527db4c361d8aba96137c72234f8f324',
  audit_memory: 'sha256:498956aa48b7e2c8ef30c2e1dd622fbc7df0c359786bcfc74b958d37ea2eab9f',
  prepare_memory_context: 'sha256:7c190bbeda945a6cfad8726d0705f4f723b1103867e3c9605b2180a502d2b99c',
  render_memory_scope: 'sha256:07308f75e3ed7ecc950bf97c0496a598a0582194527d43a1df093223bc626a1a'
});

test('R5-N keeps all six public tool names and exact schemas frozen', () => {
  assert.deepEqual(Object.keys(toolDescriptors), Object.keys(PUBLIC_SCHEMA_DIGESTS_FROM_R5M_MAIN));
  for (const [name, descriptor] of Object.entries(toolDescriptors)) {
    assert.equal(digestObject({
      inputSchema: descriptor.inputSchema,
      outputSchema: descriptor.outputSchema
    }), PUBLIC_SCHEMA_DIGESTS_FROM_R5M_MAIN[name], name);
  }
});

test('R5-N probes initialize and tools/list before binding an exact mapping-capable shim', async () => {
  const environment = privateEnvironmentFixture();
  const calls = [];
  const prepared = await preparePrivateRuntimeEnvironment({
    baseEnvironment: environment,
    isolatedShimTarget: isolatedTarget(),
    capabilityBearerToken: 'synthetic-r5n-capability-token',
    fetchImpl: capabilityFetch({ environment, calls })
  });

  assert.deepEqual(calls, [
    'initialize:unauthenticated',
    'initialize',
    'tools/list'
  ]);
  assert.equal(prepared.receipt.schema_version, 2);
  assert.equal(prepared.receipt.stage, 'R5-N');
  assert.equal(prepared.receipt.capability_preflight_completed, true);
  assert.equal(prepared.receipt.transport_authorization_supplied, true);
  assert.equal(prepared.receipt.transport_authorization_enforced, true);
  assert.equal(prepared.receipt.diary_scope_mapping_loaded, true);
  assert.equal(prepared.receipt.mapping_binding_fingerprint_matched, true);
  assert.equal(prepared.receipt.selected_diary_search_supported, true);
  assert.equal(prepared.receipt.provider_calls_during_preflight, 0);
  assert.equal(prepared.receipt.native_invocations_during_preflight, 0);
  assert.equal(prepared.receipt.primary_memory_writes_during_preflight, 0);
  assert.equal(prepared.receipt.unscoped_native_searches_during_preflight, 0);
  const serialized = JSON.stringify(prepared.receipt);
  assert.doesNotMatch(serialized, /r5n-mapping|sha256:[a-f0-9]{64}|7635|vcp-native/u);
  assert.equal(
    prepared.private_environment.CODEX_MEMORY_R4_NATIVE_HTTP_ENDPOINT,
    'http://127.0.0.1:7635/mcp/vcp-native'
  );
});

test('R5-N rejects missing, mismatched, writable, and malformed shim capabilities', async () => {
  const environment = privateEnvironmentFixture();
  const endpoint = 'http://127.0.0.1:7635/mcp/vcp-native';
  for (const [options, code] of [
    [{
      mappingState: { configured: false, accepted: false }
    }, 'r5n_shim_initialize_capability_rejected'],
    [{
      mappingState: acceptedMappingState(environment, {
        mappingDigest: `sha256:${'9'.repeat(64)}`
      })
    }, 'r5n_shim_initialize_capability_rejected'],
    [{
      enableWrite: true
    }, 'r5n_shim_initialize_capability_rejected'],
    [{
      mutate(method, result) {
        if (method === 'tools/list') result.tools.pop();
      }
    }, 'r5n_selected_diary_read_capability_rejected'],
    [{
      mutate(method, result) {
        if (method === 'tools/list') {
          result.tools.push({ ...result.tools[0], name: 'knowledge_base.unscoped_search' });
        }
      }
    }, 'r5n_selected_diary_read_capability_rejected'],
    [{
      mutate(method, result) {
        if (method === 'tools/list') {
          result.tools[0].inputSchema._meta.governanceMetadataPath = 'params._meta.untrusted';
        }
      }
    }, 'r5n_selected_diary_read_capability_rejected'],
    [{
      mutate(method, result) {
        if (method === 'tools/list') {
          result.nextCursor = 'synthetic-hidden-capability-page';
        }
      }
    }, 'r5n_shim_tools_list_capability_rejected']
  ]) {
    await assert.rejects(() => probeIsolatedShimCapabilities({
      endpoint,
      expectedMappingReference: environment.CODEX_MEMORY_R4_EXPECTED_MAPPING_REFERENCE,
      expectedMappingDigest: environment.CODEX_MEMORY_R4_EXPECTED_MAPPING_DIGEST,
      bearerToken: 'synthetic-r5n-capability-token',
      fetchImpl: capabilityFetch({ environment, ...options })
    }), { code });
  }
  const unsecuredCalls = [];
  await assert.rejects(() => probeIsolatedShimCapabilities({
    endpoint,
    expectedMappingReference: environment.CODEX_MEMORY_R4_EXPECTED_MAPPING_REFERENCE,
    expectedMappingDigest: environment.CODEX_MEMORY_R4_EXPECTED_MAPPING_DIGEST,
    bearerToken: 'synthetic-r5n-capability-token',
    fetchImpl: capabilityFetch({
      environment,
      calls: unsecuredCalls,
      authorizationRequired: false
    })
  }), { code: 'r5n_capability_transport_authorization_not_enforced' });
  assert.deepEqual(unsecuredCalls, ['initialize:unauthenticated']);
});

test('R5-N binds the shim fingerprint to both mapping reference and digest', () => {
  const first = diaryScopeMappingBindingFingerprint(
    'r5n-mapping-v1',
    `sha256:${'1'.repeat(64)}`
  );
  assert.match(first, /^sha256:[a-f0-9]{64}$/u);
  assert.notEqual(first, diaryScopeMappingBindingFingerprint(
    'r5n-mapping-v2',
    `sha256:${'1'.repeat(64)}`
  ));
  assert.notEqual(first, diaryScopeMappingBindingFingerprint(
    'r5n-mapping-v1',
    `sha256:${'2'.repeat(64)}`
  ));
  assert.equal(diaryScopeMappingBindingFingerprint('', `sha256:${'1'.repeat(64)}`), null);
  assert.equal(diaryScopeMappingBindingFingerprint('r5n-mapping-v1', 'invalid'), null);
});

test('R5-N projects a proven pre-provider scope-binding rejection as receipt-backed unavailable', async () => {
  const mappingState = liveReadMappingState();
  const rejected = nativeScopeBindingRejectedResult();
  const classification = receiptBackedNativePreflightFailure(rejected);
  assert.equal(classification.status, 'unavailable');
  assert.deepEqual(classification.counters, {
    provider_calls: 0,
    native_invocations: 1,
    local_fallbacks: 0,
    primary_memory_writes: 0,
    derived_index_writes: 0,
    other_durable_mutations: 1,
    unrestricted_native_searches: 0
  });
  assert.equal(
    classification.receipt_digests.native_runtime,
    digestObject(rejected.receipt.nativeInvocationReceipt.nativeRuntimeReceipt)
  );
  assert.equal(classification.derived_runtime_mutation.kind, 'pre_provider_native_rejection');
  for (const [toolName, argumentsValue, expectedStructuredContent] of [
    [
      'search_memory',
      { query: 'bounded fact', limit: 1 },
      { status: 'unavailable', result_count: 0, results: [] }
    ],
    [
      'memory_overview',
      {},
      { status: 'unavailable', kind: 'overview', item_count: 0 }
    ],
    [
      'audit_memory',
      {},
      { status: 'unavailable', kind: 'audit', item_count: 0 }
    ],
    [
      'prepare_memory_context',
      { task_summary: 'Prepare a bounded task context.' },
      { status: 'unavailable', kind: 'context', item_count: 0 }
    ]
  ]) {
    const observations = [];
    const invoke = createGovernedLiveReadInvoker({
      mappingState,
      resolveDiaryRead() {
        return { accepted: true, allowedDiaryCount: 1 };
      },
      async callGovernedTool() {
        return rejected;
      },
      observeNativeEvidence(evidence) {
        observations.push(evidence);
      }
    });
    const invocation = await invoke({
      toolName,
      arguments: argumentsValue,
      trustedScope: {
        clientId: 'ChatGPT',
        projectId: 'project-alpha',
        workspaceId: 'workspace-alpha',
        visibilityAllowlist: ['project'],
        mappingReference: mappingState.mappingReference,
        mappingDigest: mappingState.mappingDigest
      },
      projectContextRef: `pctx_r5n_deterministic_${toolName}`
    });
    assert.deepEqual(invocation, {
      status: 'unavailable',
      structured_content: expectedStructuredContent,
      counters: {
        provider_calls: 0,
        native_invocations: 1,
        local_fallbacks: 0,
        primary_memory_writes: 0,
        derived_index_writes: 0,
        other_durable_mutations: 1,
        unrestricted_native_searches: 0
      },
      result_scope_postcheck_passed: true
    });
    assert.equal(observations.length, 1);
    assert.equal(observations[0].tool_name, toolName);
    assert.equal(
      observations[0].native_invocation_receipt_digest,
      classification.receipt_digests.native_invocation
    );
    assert.equal(
      observations[0].derived_runtime_mutation.kind,
      'pre_provider_native_rejection'
    );
    assert.doesNotThrow(() => validateGovernanceInvocation(invocation, {
      counterMode: COUNTER_MODES.sessionScopedLiveReadV1
    }));
    const text = modelVisibleResultText(toolName, invocation);
    assert.match(text, new RegExp(`Receipt-bound governed ${toolName} status: unavailable`, 'u'));
    assert.match(text, /not a transport timeout or another transport failure/u);
    assert.doesNotMatch(text, /TERMINAL TRANSPORT FAILURE/u);
  }
  const observer = createPrivateDogfoodObserver();
  observer.beginSession({
    observationKind: DOGFOOD_OBSERVATION_KIND,
    activationSnapshot: { activation_status: 'active' }
  });
  const sessionOrdinal = observer.beginToolAttempt({ toolName: 'search_memory' });
  assert.equal(observer.observeToolResult({
    toolName: 'search_memory',
    latencyMs: 1,
    status: 'unavailable',
    resultCount: 0,
    counters: classification.counters,
    derivedRuntimeMutationEvidence: classification.derived_runtime_mutation,
    activationSnapshot: { activation_status: 'consumed' },
    sessionOrdinal
  }), true);
  assert.equal(observer.snapshot().native_invocations, 1);
  assert.equal(observer.snapshot().other_durable_mutations, 1);
  assert.equal(observer.snapshot().derived_runtime_mutation_evidence_count, 0);
  assert.equal(observer.snapshot().emergency_stop_latched, false);
});

test('R5-N capability preflight keeps transport, HTTP, and JSON-RPC failures distinct', async () => {
  const environment = privateEnvironmentFixture();
  const base = {
    endpoint: 'http://127.0.0.1:7635/mcp/vcp-native',
    expectedMappingReference: environment.CODEX_MEMORY_R4_EXPECTED_MAPPING_REFERENCE,
    expectedMappingDigest: environment.CODEX_MEMORY_R4_EXPECTED_MAPPING_DIGEST,
    bearerToken: 'synthetic-r5n-capability-token'
  };
  for (const bearerToken of [undefined, '', ' leading', 'trailing ', 'line\nbreak']) {
    await assert.rejects(() => probeIsolatedShimCapabilities({
      ...base,
      bearerToken,
      fetchImpl: capabilityFetch({ environment })
    }), { code: 'r5n_capability_authorization_invalid' });
  }
  const authorizedCalls = [];
  const capability = await probeIsolatedShimCapabilities({
    ...base,
    fetchImpl: capabilityFetch({
      environment,
      calls: authorizedCalls,
      expectedBearerToken: base.bearerToken
    })
  });
  assert.deepEqual(authorizedCalls, [
    'initialize:unauthenticated',
    'initialize',
    'tools/list'
  ]);
  assert.equal(capability.transport_authorization_supplied, true);
  assert.doesNotMatch(JSON.stringify(capability), new RegExp(base.bearerToken, 'u'));
  const preAuthorizationHeaders = [];
  await assert.rejects(() => probeIsolatedShimCapabilities({
    ...base,
    fetchImpl: async (_endpoint, request) => {
      preAuthorizationHeaders.push(request.headers);
      throw new Error('synthetic transport failure');
    }
  }), { code: 'r5n_capability_authorization_probe_transport_unavailable' });
  assert.equal(preAuthorizationHeaders.length, 1);
  assert.equal(preAuthorizationHeaders[0].authorization, undefined);
  await assert.rejects(() => probeIsolatedShimCapabilities({
    ...base,
    timeoutMs: 100,
    fetchImpl: async (_endpoint, request) => new Promise((_resolve, rejectPromise) => {
      request.signal.addEventListener('abort', () => {
        rejectPromise(Object.assign(new Error('synthetic timeout'), { name: 'AbortError' }));
      }, { once: true });
    })
  }), { code: 'r5n_capability_authorization_probe_timeout' });
  await assert.rejects(() => probeIsolatedShimCapabilities({
    ...base,
    timeoutMs: 100,
    fetchImpl: authorizationGateThen(async () => ({
      ok: true,
      async json() {
        return new Promise(() => {});
      }
    }))
  }), { code: 'r5n_capability_probe_timeout' });
  await assert.rejects(() => probeIsolatedShimCapabilities({
    ...base,
    fetchImpl: authorizationGateThen(async () => ({
      ok: false,
      async json() {
        return {};
      }
    }))
  }), { code: 'r5n_capability_probe_http_rejected' });
  await assert.rejects(() => probeIsolatedShimCapabilities({
    ...base,
    fetchImpl: authorizationGateThen(async (_endpoint, request) => ({
      ok: true,
      async json() {
        return {
          jsonrpc: '2.0',
          id: JSON.parse(request.body).id,
          error: { code: -32000, message: 'Capability unavailable' }
        };
      }
    }))
  }), { code: 'r5n_capability_probe_jsonrpc_rejected' });
});

test('R5-N refuses to downgrade unsafe or unproven native rejection evidence', async () => {
  const mappingState = liveReadMappingState();
  for (const unsafe of [
    mutateClone(nativeScopeBindingRejectedResult(), value => {
      value.receipt.nativeInvocationReceipt.nativeRuntimeReceipt.providerApiCalled = true;
    }),
    mutateClone(nativeScopeBindingRejectedResult(), value => {
      value.receipt.nativeInvocationReceipt.failureCategory = 'native_runtime_failed';
    }),
    mutateClone(nativeScopeBindingRejectedResult(), value => {
      value.receipt.localAuditReceipt.appended = false;
    }),
    ...[
      'invocationBindingMatched',
      'governanceMetadataSent',
      'jsonRpcResponseIdMatched'
    ].flatMap(field => [
      mutateClone(nativeScopeBindingRejectedResult(), value => {
        value.receipt.nativeInvocationReceipt[field] = false;
      }),
      mutateClone(nativeScopeBindingRejectedResult(), value => {
        delete value.receipt.nativeInvocationReceipt[field];
      })
    ])
  ]) {
    assert.equal(receiptBackedNativePreflightFailure(unsafe), null);
    const invoke = createGovernedLiveReadInvoker({
      mappingState,
      resolveDiaryRead() {
        return { accepted: true, allowedDiaryCount: 1 };
      },
      async callGovernedTool() {
        return unsafe;
      }
    });
    await assert.rejects(() => invoke({
      toolName: 'search_memory',
      arguments: { query: 'bounded fact', limit: 1 },
      trustedScope: {
        clientId: 'ChatGPT',
        projectId: 'project-alpha',
        workspaceId: 'workspace-alpha',
        visibilityAllowlist: ['project'],
        mappingReference: mappingState.mappingReference,
        mappingDigest: mappingState.mappingDigest
      },
      projectContextRef: 'pctx_r5n_unsafe_failure_projection'
    }), { code: 'r4_live_read_native_delegation_rejected' });
  }
});

test('R5-N keeps genuine transport failure terminal and updates Widget from host globals', () => {
  assert.match(modelVisibleErrorText('edge_response_timeout'), /^TERMINAL TRANSPORT FAILURE/u);
  const globals = { toolOutput: { context_status: 'resolved' } };
  assert.equal(openAiGlobalsFromEvent({ detail: { globals } }), globals);
  assert.equal(openAiGlobalsFromEvent({ detail: {} }), null);
  assert.match(MEMORY_SCOPE_WIDGET_HTML, /openai:set_globals/u);
  assert.match(MEMORY_SCOPE_WIDGET_HTML, /event\?\.detail\?\.globals/u);
  assert.match(MEMORY_SCOPE_WIDGET_HTML, /renderGlobals\(globals\)/u);
  assert.match(MEMORY_SCOPE_WIDGET_HTML, /hasOwn\('toolOutput'\)/u);
  assert.doesNotMatch(MEMORY_SCOPE_WIDGET_HTML, /updated\.toolOutput \?\?/u);
  assert.match(MEMORY_SCOPE_WIDGET_HTML, /ui\/notifications\/tool-result/u);
});

function capabilityFetch({
  environment,
  mappingState = acceptedMappingState(environment),
  enableWrite = false,
  calls = [],
  expectedBearerToken = 'synthetic-r5n-capability-token',
  authorizationRequired = true,
  mutate = () => {}
}) {
  return async (_endpoint, request) => {
    const body = JSON.parse(request.body);
    if (request.headers.authorization === undefined) {
      calls.push(`${body.method}:unauthenticated`);
      if (authorizationRequired) {
        return authorizationRejectedResponse();
      }
    } else {
      assert.equal(request.headers.authorization, `Bearer ${expectedBearerToken}`);
      calls.push(body.method);
    }
    const raw = body.method === 'initialize'
      ? initializeResult(enableWrite, mappingState)
      : toolsListResult(enableWrite, mappingState);
    const result = structuredClone(raw);
    mutate(body.method, result);
    return {
      ok: true,
      status: 200,
      async json() {
        return { jsonrpc: '2.0', id: body.id, result };
      }
    };
  };
}

function authorizationGateThen(authenticatedFetch) {
  return async (endpoint, request) => {
    if (request.headers.authorization === undefined) {
      return authorizationRejectedResponse();
    }
    return authenticatedFetch(endpoint, request);
  };
}

function authorizationRejectedResponse() {
  return {
    ok: false,
    status: 401,
    async json() {
      return {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32001,
          message: 'Unauthorized',
          data: {
            reasonCode: 'transport_authorization_rejected',
            lowDisclosure: true
          }
        }
      };
    }
  };
}

function acceptedMappingState(environment, overrides = {}) {
  return {
    accepted: true,
    configured: true,
    mappingReference: environment.CODEX_MEMORY_R4_EXPECTED_MAPPING_REFERENCE,
    mappingDigest: environment.CODEX_MEMORY_R4_EXPECTED_MAPPING_DIGEST,
    ...overrides
  };
}

function isolatedTarget() {
  return {
    schema_version: 1,
    target_reference: 'r5n-isolated-shim-target-v1',
    bind_host: '127.0.0.1',
    bind_port: 7635,
    mcp_path: '/mcp/vcp-native',
    listener_observed: true,
    loopback_only: true,
    native_write_enabled: false
  };
}

function privateEnvironmentFixture() {
  return {
    CODEX_MEMORY_R4_COUNTER_MODE: COUNTER_MODES.sessionScopedLiveReadV1,
    CODEX_MEMORY_R4_GOVERNANCE_BINDING_REFERENCE: 'r5n-private-binding-v1',
    CODEX_MEMORY_R4_GOVERNANCE_ROLLBACK_REFERENCE: 'r5n-zero-memory-rollback-v1',
    CODEX_MEMORY_R4_GOVERNANCE_LIVE_READ_ENABLED: 'true',
    CODEX_MEMORY_R4_DIARY_SCOPE_MAPPING_REFERENCE: 'file:/private/mapping.json',
    CODEX_MEMORY_R4_PROJECT_REGISTRY_REFERENCE: 'file:/private/registry.json',
    CODEX_MEMORY_R4_CONTEXT_SIGNING_PRIVATE_KEY_REFERENCE: 'file:/private/context-key',
    CODEX_MEMORY_R4_EDGE_SIGNING_PUBLIC_KEY: 'file:/private/edge-key',
    CODEX_MEMORY_R4_NATIVE_HTTP_TOKEN_REFERENCE: 'file:/private/native-auth',
    CODEX_MEMORY_R4_EXPECTED_MAPPING_REFERENCE: 'r5n-mapping-v1',
    CODEX_MEMORY_R4_EXPECTED_MAPPING_DIGEST:
      `sha256:${'1'.repeat(64)}`,
    CODEX_MEMORY_R4_EXPECTED_REGISTRY_REFERENCE: 'r5n-registry-v1',
    CODEX_MEMORY_R4_EXPECTED_REGISTRY_DIGEST:
      `sha256:${'2'.repeat(64)}`,
    CODEX_MEMORY_R4_LIVE_READ_PROJECT_ALIAS: 'project-alpha',
    CODEX_MEMORY_R4_PUBLIC_ORIGIN: 'https://memory.example.dev',
    CODEX_MEMORY_R4_AUTH0_ISSUER: 'https://tenant.example.dev/',
    CODEX_MEMORY_R4_EDGE_SIGNING_KEY_ID: 'r5n-edge-v1',
    CODEX_MEMORY_R4_CONTEXT_SIGNING_KEY_ID: 'r5n-context-v1',
    CODEX_MEMORY_R4_GOVERNANCE_STATE_ROOT: '/private/state',
    CODEX_MEMORY_R4_RELAY_UDS_PATH: '/private/run/governance.sock',
    CODEX_MEMORY_R4_OPERATOR_SUBJECT_FINGERPRINT_REFERENCE:
      'file:/private/operator-fingerprint',
    CODEX_MEMORY_R4_SESSION_CONTROL_UDS_PATH: '/private/run/control.sock',
    CODEX_MEMORY_R4_NATIVE_TARGET_REFERENCE: 'r5m-stale-target-v1',
    CODEX_MEMORY_R4_NATIVE_HTTP_ENDPOINT: 'http://127.0.0.1:7615/mcp/vcp-native',
    CODEX_MEMORY_R4_GOVERNANCE_BINDING_DIGEST:
      `sha256:${'3'.repeat(64)}`
  };
}

function liveReadMappingState() {
  return {
    accepted: true,
    mappingReference: 'r5n-mapping-v1',
    mappingDigest: `sha256:${'1'.repeat(64)}`,
    mapping: {
      entries: [{
        diaryName: 'Synthetic-Project-Diary',
        partitionReference: 'synthetic-project-ref'
      }]
    }
  };
}

function nativeScopeBindingRejectedResult() {
  return {
    status: 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATION_REJECTED',
    accepted: false,
    decision: 'rejected',
    reasonCode: 'native_read_delegation_client_error',
    access: {
      lowDisclosure: true,
      rawOutputReturned: false,
      rawMemoryReturned: false,
      tokenMaterialReturned: false,
      memoryReadPerformed: false,
      localMemoryFallbackEligible: false,
      localMemoryFallbackUsed: false,
      delegationStatusClass: 'client_error',
      delegationReasonCode: 'native_read_delegation_client_error'
    },
    receipt: {
      statusClass: 'client_error',
      memoryWritten: false,
      rawResponseBodyPersisted: false,
      rawResponseBodyPrinted: false,
      tokenMaterialDisclosed: false,
      localAuditReceipt: {
        appended: true,
        lowDisclosure: true
      },
      nativeInvocationReceipt: {
        invocationBindingMatched: true,
        governanceMetadataSent: true,
        jsonRpcResponseIdMatched: true,
        statusClass: 'client_error',
        failureCategory: 'scope_binding_rejected',
        jsonRpcErrorPresent: true,
        jsonRpcErrorReasonCode: 'diary_scope_mapping_missing',
        endpointDisclosed: false,
        tokenMaterialDisclosed: false,
        rawRequestBodyDisclosed: false,
        rawResponseBodyDisclosed: false,
        nativeRuntimeReceipt: {
          present: false,
          nativeRuntimeCalled: false,
          providerApiCalled: false,
          memoryReadPerformed: false,
          memoryWritePerformed: false,
          durableWritePerformed: false,
          primaryMemoryStoreWritePerformed: false,
          derivedIndexWritePerformed: false,
          sourcePartitionMutationPerformed: false,
          legacyPartitionAccessed: false,
          ambiguousPartitionAccessed: false,
          unregisteredPartitionAccessed: false,
          unscopedNativeSearchUsed: false,
          rawRuntimeOutputDisclosed: false,
          rawMemoryContentDisclosed: false,
          runtimeLocatorDisclosed: false,
          tokenMaterialDisclosed: false
        }
      }
    }
  };
}

function mutateClone(value, mutation) {
  const clone = structuredClone(value);
  mutation(clone);
  return clone;
}
