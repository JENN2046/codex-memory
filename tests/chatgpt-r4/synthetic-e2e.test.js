'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { ZERO_MEMORY_COUNTERS } = require('../../packages/chatgpt-r4-contracts');
const { buildCandidateEdgeRequest } = require('../../apps/chatgpt-edge');
const { runZeroMemorySyntheticE2E, signing } = require('./synthetic-harness');
const { validateRelayReceipt } = require('../../src/adapters/chatgpt-r4/governance-adapter');

test('R4-B zero-memory synthetic Edge -> Relay -> UDS -> governance flow passes', async () => {
  const result = await runZeroMemorySyntheticE2E();
  assert.deepEqual(result.artifact, {
    accepted: true,
    stage: 'R4-B',
    archetype: 'interactive_decoupled',
    candidate_profile_id: 'chatgpt-r4-readonly-candidate-v1',
    candidate_profile_default: false,
    candidate_profile_activated: false,
    widget_mime_type: 'text/html;profile=mcp-app',
    safe_project_alias: 'project-alpha',
    context_status: 'resolved',
    overview_status: 'empty',
    overview_item_count: 0,
    request_count: 2,
    context_resolution_count: 1,
    governed_invocation_count: 1,
    counters: ZERO_MEMORY_COUNTERS,
    receipt_chain_bound: true,
    request_response_binding_passed: true,
    project_context_principal_binding_passed: true,
    project_context_mapping_binding_passed: true,
    raw_disclosure: false,
    durable_remote_state_written: false,
    external_runtime_used: false,
    provider_call_performed: false,
    real_memory_read_performed: false,
    public_tool_surface_expanded: false,
    resolve_receipt_chain_digest: result.artifact.resolve_receipt_chain_digest,
    overview_receipt_chain_digest: result.artifact.overview_receipt_chain_digest
  });
  assert.match(result.artifact.resolve_receipt_chain_digest, /^sha256:[a-f0-9]{64}$/u);
  assert.match(result.artifact.overview_receipt_chain_digest, /^sha256:[a-f0-9]{64}$/u);
});

test('duplicate request and reused project context fail before a second governed invocation', async () => {
  const result = await runZeroMemorySyntheticE2E();
  await assert.rejects(() => result.internal.relay.handle(result.requests.overviewRequest), { code: 'replay_detected' });

  const retry = buildCandidateEdgeRequest({
    principalAssertion: result.internal.principalAssertion,
    toolName: 'memory_overview',
    toolArguments: {
      project_context_ref: result.requests.overviewRequest.tool_request.arguments.project_context_ref
    },
    now: result.internal.clock(),
    requestId: 'req_context_reuse_negative_01',
    nonce: 'request_nonce_context_reuse_01',
    signing: signing(result.internal.identities.edgeIdentity)
  });
  await assert.rejects(() => result.internal.relay.handle(retry), { code: 'replay_detected' });
  assert.equal(result.artifact.governed_invocation_count, 1);
});

test('forged public authority fields fail before Relay forwarding', async () => {
  const result = await runZeroMemorySyntheticE2E();
  const forged = structuredClone(result.requests.resolveRequest);
  forged.request_id = 'req_forged_authority_0000001';
  forged.nonce = 'request_nonce_forged_000001';
  forged.tool_request.arguments.project_id = 'forged-project';
  await assert.rejects(() => result.internal.relay.handle(forged), { code: 'tool_authority_argument_forbidden' });
  assert.equal(result.artifact.request_count, 2);
});

test('Relay receipt is exact, request-bound, and proves replay checking without claiming a rejection', () => {
  const receipt = {
    schema_version: 1,
    kind: 'chatgpt_r4_relay_receipt',
    request_digest: `sha256:${'a'.repeat(64)}`,
    signature_valid: true,
    replay_guard_passed: true,
    forwarded_over: 'injected_uds_boundary',
    scope_authorized_by_relay: false,
    durable_state_written: false
  };
  assert.doesNotThrow(() => validateRelayReceipt(receipt, receipt.request_digest));
  assert.throws(() => validateRelayReceipt({ ...receipt, project_id: 'forged' }, receipt.request_digest), {
    code: 'relay_receipt_shape_invalid'
  });
  const legacy = { ...receipt, replay_rejected: true };
  delete legacy.replay_guard_passed;
  assert.throws(() => validateRelayReceipt(legacy, receipt.request_digest), {
    code: 'relay_receipt_shape_invalid'
  });
});
