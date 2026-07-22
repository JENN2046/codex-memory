'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  InMemoryReplayGuard,
  ZERO_MEMORY_COUNTERS,
  createPrincipalAssertion,
  createRequestEnvelope,
  sha256,
  validateResponseEnvelope
} = require('../../packages/chatgpt-r4-contracts');
const { buildCandidateEdgeRequest } = require('../../apps/chatgpt-edge');
const { createRelayProcessor, validateInvocation } = require('../../apps/local-recall-relay');
const {
  FIXED_NOW,
  SYNTHETIC_ISSUER,
  SYNTHETIC_AUDIENCE,
  generateSigningIdentity,
  keyResolver,
  principalKeyResolver,
  runZeroMemorySyntheticE2E,
  signing
} = require('./synthetic-harness');
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

test('context resolution returns signed low-disclosure denials without a context ref', async () => {
  const result = await runZeroMemorySyntheticE2E();
  for (const [projectAlias, expectedStatus, suffix] of [
    ['denied-project', 'denied', 'denied'],
    ['unavailable-project', 'unavailable', 'unavailable']
  ]) {
    const request = buildCandidateEdgeRequest({
      principalAssertion: result.internal.principalAssertion,
      toolName: 'resolve_memory_context',
      toolArguments: {
        project_alias: projectAlias,
        requested_visibility: 'project'
      },
      now: result.internal.clock(),
      requestId: `req_context_${suffix}_0000000001`,
      nonce: `request_nonce_${suffix}_00000001`,
      signing: signing(result.internal.identities.edgeIdentity)
    });
    const response = await result.internal.relay.handle(request);
    assert.equal(response.status, expectedStatus);
    assert.deepEqual(response.structured_content, { context_status: expectedStatus });
    assert.equal(Object.hasOwn(response.structured_content, 'project_context_ref'), false);
    assert.deepEqual(response.counters, ZERO_MEMORY_COUNTERS);
    assert.doesNotThrow(() => validateResponseEnvelope(response, {
      now: result.internal.clock(),
      resolveResponsePublicKey: keyResolver(result.internal.identities.relayIdentity),
      expectedRequest: request,
      requireZeroCounters: true
    }));
  }
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
  assert.throws(() => validateInvocation({
    status: 'ok',
    structured_content: { foo: 'bar' },
    counters: ZERO_MEMORY_COUNTERS,
    receipt_digests: {
      governance: sha256('governance'),
      context: sha256('context')
    }
  }, 'memory_overview'), { code: 'response_structured_content_shape_invalid' });
  assert.throws(() => validateInvocation({
    status: 'ok',
    structured_content: { status: 'empty', kind: 'overview', item_count: 0 },
    counters: { ...ZERO_MEMORY_COUNTERS, provider_calls: 1 },
    receipt_digests: {
      governance: sha256('governance'),
      context: sha256('context')
    }
  }, 'memory_overview'), { code: 'zero_memory_counter_nonzero' });
});

test('Relay stamps the response after a slow injected UDS invocation completes', async () => {
  const principal = generateSigningIdentity('slow-principal');
  const edge = generateSigningIdentity('slow-edge');
  const relayIdentity = generateSigningIdentity('slow-relay');
  let nowMs = FIXED_NOW.getTime();
  const clock = () => new Date(nowMs);
  const principalAssertion = createPrincipalAssertion({
    issuer: SYNTHETIC_ISSUER,
    audience: SYNTHETIC_AUDIENCE,
    subjectFingerprint: sha256('slow-principal'),
    now: clock(),
    nonce: 'principal_nonce_slow_00001',
    signing: signing(principal)
  });
  const request = createRequestEnvelope({
    principalAssertion,
    toolName: 'memory_overview',
    toolArguments: { project_context_ref: `pctx_${'z'.repeat(32)}` },
    now: clock(),
    requestId: 'req_slow_relay_response_0001',
    nonce: 'request_nonce_slow_relay_01',
    signing: signing(edge)
  });
  const processor = createRelayProcessor({
    expectedIssuer: SYNTHETIC_ISSUER,
    expectedAudience: SYNTHETIC_AUDIENCE,
    resolveRequestPublicKey: keyResolver(edge),
    resolvePrincipalPublicKey: principalKeyResolver(SYNTHETIC_ISSUER, principal),
    requestReplayGuard: new InMemoryReplayGuard({ clock }),
    responseSigning: signing(relayIdentity),
    clock,
    async forwardToUds({ request: forwardedRequest, relayReceipt }) {
      assert.equal(Object.isFrozen(forwardedRequest), true);
      assert.equal(Object.isFrozen(forwardedRequest.tool_request), true);
      assert.throws(() => {
        forwardedRequest.request_id = 'req_mutated_request_000000001';
      }, TypeError);
      nowMs += 40_000;
      return {
        status: 'ok',
        structured_content: { status: 'empty', kind: 'overview', item_count: 0 },
        counters: ZERO_MEMORY_COUNTERS,
        receipt_digests: {
          governance: sha256(relayReceipt.request_digest),
          context: sha256('slow-context')
        }
      };
    }
  });
  const response = await processor.handle(request);
  assert.equal(response.issued_at, clock().toISOString());
  assert.doesNotThrow(() => validateResponseEnvelope(response, {
    now: clock(),
    resolveResponsePublicKey: keyResolver(relayIdentity),
    expectedRequest: request,
    requireZeroCounters: true
  }));
});
