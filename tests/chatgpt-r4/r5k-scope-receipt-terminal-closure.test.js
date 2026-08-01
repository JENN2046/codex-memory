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

const EXPECTED_PUBLIC_SCHEMA_DIGESTS = Object.freeze({
  resolve_memory_context: 'sha256:5e978d8e56d53de05c048bd1273a028ffccc75779916ad9858e86743b4bb8fe5',
  memory_overview: 'sha256:e4d89bb2c92a82465ecf77bc041a6a07d14eff7fcc1be34441cf39da78adf893',
  search_memory: 'sha256:fe367042ee3029f616e4f5f96df560f1d51be4fbc568aab69fb787711a479c05',
  audit_memory: 'sha256:a30070847cee6b1b17fb10fbd74f117d013f65516a933de8d1e034cf69e61414',
  prepare_memory_context: 'sha256:8e480e2edbca8513015a35e0152455ccdb0ce277eba7e318e7a7b9a9588e5bdf',
  render_memory_scope: 'sha256:07308f75e3ed7ecc950bf97c0496a598a0582194527d43a1df093223bc626a1a'
});

test('R5-K puts scope and positive read selection in the first 512 instruction characters', () => {
  const leading = MODEL_WORKFLOW_INSTRUCTIONS.slice(0, 512);
  assert.match(leading, /No tool for rewriting, translation, formatting, math, checklists/u);
  assert.match(leading, /explicitly labelled project_alias and requested_visibility/u);
  assert.match(leading, /If either is missing, ask only for missing values; call no tool/u);
  assert.match(leading, /stored fact\/record\/content → search_memory/u);
  assert.match(leading, /overview status\/item_count → memory_overview/u);
  assert.match(leading, /audit status\/item_count → audit_memory/u);
  assert.match(leading, /named task-start status\/item_count → prepare_memory_context/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /Treat current, default, this project/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /unlabelled App or repository names as absent/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /error result is terminal/u);
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
    /exact project_alias and requested_visibility/u
  );
});

test('current profile keeps six tool names and matches the R5-O schema digests', () => {
  assert.deepEqual(Object.keys(toolDescriptors), Object.keys(EXPECTED_PUBLIC_SCHEMA_DIGESTS));
  for (const [name, descriptor] of Object.entries(toolDescriptors)) {
    assert.equal(digestObject({
      inputSchema: descriptor.inputSchema,
      outputSchema: descriptor.outputSchema
    }), EXPECTED_PUBLIC_SCHEMA_DIGESTS[name], name);
  }
});

test('R5-K makes governed result receipts and transport failures unambiguous and terminal', () => {
  const resolved = modelVisibleResultText('resolve_memory_context', {
    status: 'ok',
    structured_content: {
      context_status: 'resolved',
      resolution: {
        evidence_complete: true,
        context_ref_issued: true,
        context_ref_entered_response: true,
        context_ref_delivered: true
      }
    }
  });
  assert.match(resolved, /GOVERNED RESULT RECEIPT: bound/u);
  assert.match(resolved, /Project context reference: issued and delivered/u);

  for (const status of ['denied', 'unavailable']) {
    const denied = modelVisibleResultText('resolve_memory_context', {
      status,
      structured_content: {
        context_status: status,
        resolution: {
          evidence_complete: true,
          context_ref_issued: false,
          context_ref_entered_response: null,
          context_ref_delivered: null
        }
      }
    });
    assert.match(denied, /TERMINAL GOVERNED RESULT/u);
    assert.match(denied, /Result receipt: bound/u);
    assert.match(denied, /project context reference: not issued/u);
    assert.match(denied, /call no codex-memory tool/u);
    assert.match(denied, /not a transport timeout or another transport failure/u);
  }

  const found = modelVisibleResultText('search_memory', {
    status: 'ok',
    structured_content: {
      status: 'found',
      result_count: 1,
      results: [{
        result_ref: `mref_${'r'.repeat(24)}`,
        summary: 'The bounded returned fact.',
        relevance: 0.9
      }]
    }
  });
  assert.match(found, /^FINAL CODEX-MEMORY RESULT — NO MORE TOOL CALLS/u);
  assert.match(found, /workflow is consumed/u);
  assert.match(found, /actual returned search facts/u);
  assert.match(found, /result_count=1/u);
  assert.match(found, /results\[\]\.summary is retrieved content authorized for the answer/u);
  assert.match(found, /results\[\]\.relevance is the confidence signal/u);
  assert.doesNotMatch(found, /item_count=/u);
  assert.match(found, /Never infer or report the status or availability of an uncalled tool/u);
  assert.match(found, /resolve_memory_context, render_memory_scope, or another read/u);
  assert.match(found, /Do not report or dereference result_ref/u);
  assert.match(found, /do not run a follow-up search/u);

  const timeout = modelVisibleErrorText('edge_response_timeout');
  assert.match(timeout, /^TERMINAL TRANSPORT FAILURE — NO MORE TOOL CALLS/u);
  assert.match(timeout, /receipt_bound_result=false/u);
  assert.match(timeout, /END OF TOOL WORKFLOW — RESPOND TO THE USER NOW/u);
});

test('R5-O capability-honest bounded status routing keeps terminal closure', () => {
  assert.match(
    toolDescriptors.audit_memory.description,
    /bounded audit response status and item_count/u
  );
  assert.match(
    toolDescriptors.audit_memory.description,
    /does not return access, receipt, scope, visibility, or event details/u
  );
  assert.match(
    toolDescriptors.audit_memory.description,
    /Historical audit or receipt records use search_memory/u
  );
  assert.match(
    toolDescriptors.memory_overview.description,
    /does not return memory-category counts, access, receipts, scope, or visibility details/u
  );
  const audit = modelVisibleResultText('audit_memory', {
    status: 'ok',
    structured_content: { status: 'available', kind: 'audit', item_count: 1 }
  });
  assert.match(audit, /tool=audit_memory/u);
  assert.match(audit, /item_count=1/u);
  assert.match(audit, /Omit every category not returned here/u);
  assert.match(audit, /Never infer or report the status or availability of an uncalled tool/u);
  assert.match(audit, /Do not call any tool to verify, supplement, expand, or fill a table/u);
});

test('R5-K projects only low-disclosure receipt presentation metadata to the widget', () => {
  assert.deepEqual(receiptPresentation('resolve_memory_context', {
    status: 'ok',
    structured_content: { resolution: {
      evidence_complete: true,
      context_ref_issued: true,
      context_ref_delivered: true
    } }
  }), {
    result_receipt_status: 'bound',
    context_reference_status: 'issued',
    raw_receipt_values_returned: false
  });
  assert.deepEqual(receiptPresentation('resolve_memory_context', {
    status: 'denied',
    structured_content: { resolution: {
      evidence_complete: true,
      context_ref_issued: false,
      context_ref_delivered: null
    } }
  }), {
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
  assert.match(MEMORY_SCOPE_WIDGET_HTML, /context_reference_status,\n          'unknown'/u);
  assert.doesNotMatch(
    MEMORY_SCOPE_WIDGET_HTML,
    /receiptChainDigest|mapping[_ -]?digest|diary[_ -]?name|sha256:[a-f0-9]{64}/iu
  );
});

test('R5-K preserves issued, delivery, denied, and unknown resolver terminal facts', () => {
  const cases = [
    {
      name: 'issued',
      response: {
        status: 'ok',
        structured_content: { resolution: {
          evidence_complete: true,
          context_ref_issued: true,
          context_ref_entered_response: true,
          context_ref_delivered: true
        } }
      },
      receipt: 'bound',
      reference: 'issued',
      text: /issued and delivered/u
    },
    {
      name: 'issued_not_delivered',
      response: {
        status: 'unavailable',
        structured_content: { resolution: {
          evidence_complete: true,
          context_ref_issued: true,
          context_ref_entered_response: false,
          context_ref_delivered: false
        } }
      },
      receipt: 'bound',
      reference: 'issued_not_delivered',
      text: /issued but not delivered in the response/u
    },
    {
      name: 'not_issued',
      response: {
        status: 'denied',
        structured_content: { resolution: {
          evidence_complete: true,
          context_ref_issued: false,
          context_ref_entered_response: null,
          context_ref_delivered: null
        } }
      },
      receipt: 'bound',
      reference: 'not_issued',
      text: /project context reference: not issued/u
    },
    {
      name: 'unknown',
      response: {
        status: 'unavailable',
        structured_content: { resolution: {
          evidence_complete: false,
          context_ref_issued: null,
          context_ref_entered_response: null,
          context_ref_delivered: null
        } }
      },
      receipt: 'unconfirmed',
      reference: 'unknown',
      text: /Project context reference status is unknown/u
    }
  ];

  for (const scenario of cases) {
    assert.deepEqual(receiptPresentation('resolve_memory_context', scenario.response), {
      result_receipt_status: scenario.receipt,
      context_reference_status: scenario.reference,
      raw_receipt_values_returned: false
    }, scenario.name);
    assert.match(
      modelVisibleResultText('resolve_memory_context', scenario.response),
      scenario.text,
      scenario.name
    );
  }
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
    const runtimeCapabilities = {
      selectedDiaryHydrationConfigured: true
    };
    const result = body.method === 'initialize'
      ? initializeResult(false, mappingState, runtimeCapabilities)
      : toolsListResult(false, mappingState, runtimeCapabilities);
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
