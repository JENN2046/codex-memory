'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  COUNTER_MODES,
  digestObject
} = require('../../packages/chatgpt-r4-contracts');
const {
  MODEL_WORKFLOW_INSTRUCTIONS,
  modelVisibleErrorText,
  modelVisibleResultText,
  receiptPresentation,
  toolDescriptors
} = require('../../apps/chatgpt-edge');
const {
  MEMORY_SCOPE_WIDGET_HTML,
  receiptPresentationFromMetadata,
  widgetResource
} = require('../../apps/chatgpt-memory-scope-widget');
const {
  computeGovernanceRuntimeBindingDigest
} = require('../../src/runtime/chatgpt-r4/governance-runtime-authority');
const {
  initializeResult,
  toolsListResult
} = require('../../src/core/GovernedMcpVcpNativeVcpToolBoxMcpShim');
const {
  preparePrivateRuntimeEnvironment
} = require('../../src/runtime/chatgpt-r4/private-runtime-preparation');

const PUBLIC_SCHEMA_DIGESTS_FROM_R5I_MAIN = Object.freeze({
  resolve_memory_context: 'sha256:323d0cdcd4ca76d41b0af27ce514c0446e30bd5ba87da8d172f024c69626bbb6',
  memory_overview: 'sha256:a9314eb1604641ae76d95132bf73ed28c3136afe5c9a8352fb2474b695f372d1',
  search_memory: 'sha256:c301306bf253377183d8dc4d660dd09d527db4c361d8aba96137c72234f8f324',
  audit_memory: 'sha256:498956aa48b7e2c8ef30c2e1dd622fbc7df0c359786bcfc74b958d37ea2eab9f',
  prepare_memory_context: 'sha256:7c190bbeda945a6cfad8726d0705f4f723b1103867e3c9605b2180a502d2b99c',
  render_memory_scope: 'sha256:07308f75e3ed7ecc950bf97c0496a598a0582194527d43a1df093223bc626a1a'
});

test('R5-K puts scope clarification and negative abstention in the first 512 instruction characters', () => {
  const leading = MODEL_WORKFLOW_INSTRUCTIONS.slice(0, 512);
  assert.match(leading, /only for an explicit project-memory request/u);
  assert.match(leading, /memory-irrelevant task/u);
  assert.match(leading, /If either value is missing, ask one concise clarification and call no tool/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /Never use current, default, this-project/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /Never choose task_start_context as a default/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /stop all codex-memory tool use immediately/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /render_memory_scope is component-only/u);
});

test('R5-K hides the render-only tool from the model and attaches the scope widget to resolve', () => {
  assert.deepEqual(
    toolDescriptors.resolve_memory_context._meta.ui.visibility,
    ['model', 'app']
  );
  assert.equal(
    toolDescriptors.resolve_memory_context._meta.ui.resourceUri,
    widgetResource.uri
  );
  assert.deepEqual(toolDescriptors.render_memory_scope._meta.ui.visibility, ['app']);
  assert.match(
    toolDescriptors.render_memory_scope.description,
    /model must never call this tool/u
  );
  assert.match(
    toolDescriptors.resolve_memory_context.description,
    /Never use current, default, this-project/u
  );
  assert.match(
    toolDescriptors.resolve_memory_context.description,
    /Never infer task_start_context as a default/u
  );
});

test('R5-K preserves the six public tool names and exact input/output schemas', () => {
  assert.deepEqual(Object.keys(toolDescriptors), Object.keys(PUBLIC_SCHEMA_DIGESTS_FROM_R5I_MAIN));
  for (const [name, descriptor] of Object.entries(toolDescriptors)) {
    assert.equal(digestObject({
      inputSchema: descriptor.inputSchema,
      outputSchema: descriptor.outputSchema
    }), PUBLIC_SCHEMA_DIGESTS_FROM_R5I_MAIN[name], name);
  }
});

test('R5-K makes governed result receipts and transport failures unambiguous and terminal', () => {
  const resolved = modelVisibleResultText('resolve_memory_context', {
    status: 'ok',
    structured_content: { context_status: 'resolved' }
  });
  assert.match(resolved, /GOVERNED RESULT RECEIPT: bound/u);
  assert.match(resolved, /Project context reference: issued/u);

  for (const status of ['denied', 'unavailable']) {
    const denied = modelVisibleResultText('resolve_memory_context', {
      status,
      structured_content: { context_status: status }
    });
    assert.match(denied, /TERMINAL GOVERNED RESULT/u);
    assert.match(denied, /Result receipt: bound/u);
    assert.match(denied, /project context reference: not issued/u);
    assert.match(denied, /call no codex-memory tool/u);
    assert.match(denied, /not a transport timeout or another transport failure/u);
  }

  const found = modelVisibleResultText('search_memory', {
    status: 'ok',
    structured_content: { status: 'found', result_count: 1, results: [] }
  });
  assert.match(found, /TERMINAL RECEIPT-BOUND GOVERNED READ/u);
  assert.match(found, /call no codex-memory tool again/u);
  assert.match(found, /including render_memory_scope/u);

  const timeout = modelVisibleErrorText('edge_response_timeout');
  assert.match(timeout, /^TERMINAL TRANSPORT FAILURE/u);
  assert.match(timeout, /No receipt-bound memory result was returned/u);
  assert.match(timeout, /do not invent attempts/u);
});

test('R5-K projects only low-disclosure receipt presentation metadata to the widget', () => {
  assert.deepEqual(receiptPresentation('resolve_memory_context', { status: 'ok' }), {
    result_receipt_status: 'bound',
    context_reference_status: 'issued',
    raw_receipt_values_returned: false
  });
  assert.deepEqual(receiptPresentation('resolve_memory_context', { status: 'denied' }), {
    result_receipt_status: 'bound',
    context_reference_status: 'not_issued',
    raw_receipt_values_returned: false
  });
  assert.deepEqual(receiptPresentation('search_memory', { status: 'ok' }), {
    result_receipt_status: 'bound',
    context_reference_status: 'not_applicable',
    raw_receipt_values_returned: false
  });
  assert.match(MEMORY_SCOPE_WIDGET_HTML, /codex-memory\/receiptPresentation/u);
  assert.match(MEMORY_SCOPE_WIDGET_HTML, /toolResponseMetadata/u);
  assert.match(MEMORY_SCOPE_WIDGET_HTML, /Result receipt/u);
  assert.match(MEMORY_SCOPE_WIDGET_HTML, /Context reference/u);
  assert.doesNotMatch(
    MEMORY_SCOPE_WIDGET_HTML,
    /receiptChainDigest|mapping[_ -]?digest|diary[_ -]?name|sha256:[a-f0-9]{64}/iu
  );
});

test('R5-K unwraps direct and ChatGPT bridge envelope receipt metadata', () => {
  const presentation = {
    result_receipt_status: 'bound',
    context_reference_status: 'not_issued',
    raw_receipt_values_returned: false
  };
  for (const metadata of [
    { 'codex-memory/receiptPresentation': presentation },
    { _meta: { 'codex-memory/receiptPresentation': presentation } },
    { mcp_tool_result: { _meta: { 'codex-memory/receiptPresentation': presentation } } },
    { call_tool_result: { _meta: { 'codex-memory/receiptPresentation': presentation } } }
  ]) {
    assert.equal(receiptPresentationFromMetadata(metadata), presentation);
  }
  assert.equal(receiptPresentationFromMetadata(null), null);
  assert.equal(receiptPresentationFromMetadata({ mcp_tool_result: {} }), null);
  assert.match(MEMORY_SCOPE_WIDGET_HTML, /'mcp_tool_result'/u);
  assert.match(MEMORY_SCOPE_WIDGET_HTML, /'call_tool_result'/u);
});

test('R5-K formal private preparation replaces stale target data from the observed isolated shim', async () => {
  const baseEnvironment = privateEnvironmentFixture();
  const prepared = await preparePrivateRuntimeEnvironment({
    baseEnvironment,
    isolatedShimTarget: isolatedTarget(),
    capabilityBearerToken: 'synthetic-r5k-capability-token',
    fetchImpl: capabilityFetch(baseEnvironment)
  });
  assert.equal(
    prepared.private_environment.CODEX_MEMORY_R4_NATIVE_TARGET_REFERENCE,
    'r5k-isolated-shim-target-v1'
  );
  assert.equal(
    prepared.private_environment.CODEX_MEMORY_R4_NATIVE_HTTP_ENDPOINT,
    'http://127.0.0.1:7635/mcp/vcp-native'
  );
  assert.equal(
    prepared.private_environment.CODEX_MEMORY_R4_GOVERNANCE_BINDING_DIGEST,
    computeGovernanceRuntimeBindingDigest(prepared.private_environment)
  );
  assert.equal(prepared.receipt.previous_target_replaced, true);
  assert.equal(prepared.receipt.listener_observed_before_preparation, true);
  assert.equal(prepared.receipt.transport_authorization_enforced, true);
  assert.equal(prepared.receipt.endpoint_disclosed, false);
  assert.equal(prepared.receipt.secret_values_returned, false);
  assert.equal(Object.isFrozen(prepared.private_environment), true);
  assert.equal(Object.isFrozen(prepared.receipt), true);
  const receipt = JSON.stringify(prepared.receipt);
  assert.doesNotMatch(receipt, /7615|7635|vcp-native|r5k-isolated-shim-target/u);
});

test('R5-K private preparation rejects unobserved, writable, non-loopback, and malformed targets', async () => {
  const baseEnvironment = privateEnvironmentFixture();
  for (const [patch, code] of [
    [{ listener_observed: false }, 'r5k_isolated_shim_target_untrusted'],
    [{ native_write_enabled: true }, 'r5k_isolated_shim_target_untrusted'],
    [{ bind_host: '0.0.0.0' }, 'r5k_isolated_shim_listener_invalid'],
    [{ bind_port: 0 }, 'r5k_isolated_shim_listener_invalid'],
    [{ mcp_path: '/mcp' }, 'r5k_isolated_shim_listener_invalid'],
    [{ target_reference: 'example-target' }, 'r5k_isolated_shim_target_reference_invalid']
  ]) {
    await assert.rejects(() => preparePrivateRuntimeEnvironment({
      baseEnvironment,
      isolatedShimTarget: { ...isolatedTarget(), ...patch },
      capabilityBearerToken: 'synthetic-r5k-capability-token',
      fetchImpl: capabilityFetch(baseEnvironment)
    }), { code });
  }
  await assert.rejects(() => preparePrivateRuntimeEnvironment({
    baseEnvironment,
    isolatedShimTarget: { ...isolatedTarget(), unexpected: true },
    capabilityBearerToken: 'synthetic-r5k-capability-token',
    fetchImpl: capabilityFetch(baseEnvironment)
  }), { code: 'r5k_isolated_shim_target_shape_invalid' });
});

function capabilityFetch(environment) {
  const mappingState = {
    accepted: true,
    configured: true,
    mappingReference: environment.CODEX_MEMORY_R4_EXPECTED_MAPPING_REFERENCE,
    mappingDigest: environment.CODEX_MEMORY_R4_EXPECTED_MAPPING_DIGEST
  };
  return async (_endpoint, request) => {
    const body = JSON.parse(request.body);
    if (request.headers.authorization === undefined) {
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
    const result = body.method === 'initialize'
      ? initializeResult(false, mappingState)
      : toolsListResult(false, mappingState);
    return {
      ok: true,
      status: 200,
      async json() {
        return { jsonrpc: '2.0', id: body.id, result };
      }
    };
  };
}

function isolatedTarget() {
  return {
    schema_version: 1,
    target_reference: 'r5k-isolated-shim-target-v1',
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
    CODEX_MEMORY_R4_COUNTER_MODE: COUNTER_MODES.governedLiveReadV1,
    CODEX_MEMORY_R4_GOVERNANCE_BINDING_REFERENCE: 'r5k-private-binding-v1',
    CODEX_MEMORY_R4_GOVERNANCE_ROLLBACK_REFERENCE: 'r5k-zero-memory-rollback-v1',
    CODEX_MEMORY_R4_GOVERNANCE_LIVE_READ_ENABLED: 'true',
    CODEX_MEMORY_R4_DIARY_SCOPE_MAPPING_REFERENCE: 'file:/private/mapping.json',
    CODEX_MEMORY_R4_PROJECT_REGISTRY_REFERENCE: 'file:/private/registry.json',
    CODEX_MEMORY_R4_CONTEXT_SIGNING_PRIVATE_KEY_REFERENCE: 'file:/private/context-key',
    CODEX_MEMORY_R4_EDGE_SIGNING_PUBLIC_KEY: 'file:/private/edge-key',
    CODEX_MEMORY_R4_NATIVE_HTTP_TOKEN_REFERENCE: 'file:/private/native-auth',
    CODEX_MEMORY_R4_EXPECTED_MAPPING_REFERENCE: 'r5k-mapping-v1',
    CODEX_MEMORY_R4_EXPECTED_MAPPING_DIGEST:
      'sha256:1111111111111111111111111111111111111111111111111111111111111111',
    CODEX_MEMORY_R4_EXPECTED_REGISTRY_REFERENCE: 'r5k-registry-v1',
    CODEX_MEMORY_R4_EXPECTED_REGISTRY_DIGEST:
      'sha256:2222222222222222222222222222222222222222222222222222222222222222',
    CODEX_MEMORY_R4_LIVE_READ_PROJECT_ALIAS: 'project-alpha',
    CODEX_MEMORY_R4_PUBLIC_ORIGIN: 'https://memory.example.dev',
    CODEX_MEMORY_R4_AUTH0_ISSUER: 'https://tenant.example.dev/',
    CODEX_MEMORY_R4_EDGE_SIGNING_KEY_ID: 'r5k-edge-v1',
    CODEX_MEMORY_R4_CONTEXT_SIGNING_KEY_ID: 'r5k-context-v1',
    CODEX_MEMORY_R4_GOVERNANCE_STATE_ROOT: '/private/state',
    CODEX_MEMORY_R4_RELAY_UDS_PATH: '/private/run/governance.sock',
    CODEX_MEMORY_R4_NATIVE_TARGET_REFERENCE: 'r5j-stale-target-v1',
    CODEX_MEMORY_R4_NATIVE_HTTP_ENDPOINT: 'http://127.0.0.1:7615/mcp/vcp-native',
    CODEX_MEMORY_R4_GOVERNANCE_BINDING_DIGEST:
      'sha256:3333333333333333333333333333333333333333333333333333333333333333'
  };
}
