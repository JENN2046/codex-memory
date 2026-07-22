'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { digestObject } = require('../../packages/chatgpt-r4-contracts');
const {
  MODEL_WORKFLOW_INSTRUCTIONS,
  modelVisibleErrorText,
  modelVisibleResultText,
  toolDescriptors,
  transportFailureCategory
} = require('../../apps/chatgpt-edge');
const {
  RECEIPT_FAILURE_CATEGORIES,
  classifyReceiptFailure
} = require('../../src/adapters/chatgpt-r4');

const PUBLIC_SCHEMA_DIGESTS_FROM_R5H_MAIN = Object.freeze({
  resolve_memory_context: 'sha256:323d0cdcd4ca76d41b0af27ce514c0446e30bd5ba87da8d172f024c69626bbb6',
  memory_overview: 'sha256:a9314eb1604641ae76d95132bf73ed28c3136afe5c9a8352fb2474b695f372d1',
  search_memory: 'sha256:c301306bf253377183d8dc4d660dd09d527db4c361d8aba96137c72234f8f324',
  audit_memory: 'sha256:498956aa48b7e2c8ef30c2e1dd622fbc7df0c359786bcfc74b958d37ea2eab9f',
  prepare_memory_context: 'sha256:7c190bbeda945a6cfad8726d0705f4f723b1103867e3c9605b2180a502d2b99c',
  render_memory_scope: 'sha256:07308f75e3ed7ecc950bf97c0496a598a0582194527d43a1df093223bc626a1a'
});

test('R5-I selects only exact user-provided alias and visibility without probing identities', () => {
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /project_alias and requested_visibility exactly/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /App display name.+is not a project_alias/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /If either value is missing, ask one concise clarification/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /never invent retry counts/u);

  const description = toolDescriptors.resolve_memory_context.description;
  assert.match(description, /App name, connector name, URL, client identifier/u);
  assert.match(description, /never guess or probe alternative aliases or visibilities/u);
  assert.match(description, /denied, unavailable, or error result is terminal/u);

  const publicGuidance = JSON.stringify({
    instructions: MODEL_WORKFLOW_INSTRUCTIONS,
    descriptions: Object.fromEntries(Object.entries(toolDescriptors).map(([name, value]) => [
      name,
      value.description
    ]))
  });
  assert.doesNotMatch(
    publicGuidance,
    /Jenn|Claude|agents-os|project-alpha|mapping[_ -]?digest|diary[_ -]?name|sha256:[a-f0-9]{64}/iu
  );
});

test('R5-I preserves all six public tool names and exact input/output schema digests', () => {
  assert.deepEqual(Object.keys(toolDescriptors), Object.keys(PUBLIC_SCHEMA_DIGESTS_FROM_R5H_MAIN));
  for (const [name, descriptor] of Object.entries(toolDescriptors)) {
    assert.equal(digestObject({
      inputSchema: descriptor.inputSchema,
      outputSchema: descriptor.outputSchema
    }), PUBLIC_SCHEMA_DIGESTS_FROM_R5H_MAIN[name], name);
  }
});

test('R5-I projects verified governed outcomes separately from transport failures', () => {
  const resolved = modelVisibleResultText('resolve_memory_context', {
    status: 'ok',
    structured_content: { context_status: 'resolved' }
  });
  assert.match(resolved, /Receipt-bound.+status: resolved/u);
  assert.match(resolved, /exactly one read tool/u);
  assert.match(resolved, /do not resolve again/u);

  for (const status of ['denied', 'unavailable']) {
    const resolveFailure = modelVisibleResultText('resolve_memory_context', {
      status,
      structured_content: { context_status: status }
    });
    assert.match(resolveFailure, new RegExp(`Receipt-bound.+status: ${status}`, 'u'));
    assert.match(resolveFailure, /not a transport timeout/u);
    assert.match(resolveFailure, /do not retry the same value or probe alternative aliases/u);
  }

  for (const status of ['found', 'empty']) {
    const result = modelVisibleResultText('search_memory', {
      status: 'ok',
      structured_content: {
        status,
        result_count: status === 'found' ? 1 : 0,
        results: []
      }
    });
    assert.match(result, new RegExp(`Receipt-bound.+status: ${status}`, 'u'));
    assert.match(result, /terminal result for the current one-read workflow/u);
    assert.match(result, /Report exactly this one result and do not invent retries/u);
  }

  for (const status of ['denied', 'unavailable']) {
    const result = modelVisibleResultText('search_memory', {
      status,
      structured_content: { status, result_count: 0, results: [] }
    });
    assert.match(result, new RegExp(`Receipt-bound.+status: ${status}`, 'u'));
    assert.match(result, /not a transport timeout/u);
    assert.match(result, /do not call another memory read or resolve again/u);
  }
});

test('R5-I transport projection is terminal and never masquerades as a memory result', () => {
  assert.equal(transportFailureCategory('edge_response_timeout'), 'transport_timeout');
  assert.equal(transportFailureCategory('edge_request_expired'), 'transport_expired');
  assert.equal(transportFailureCategory('edge_claim_expired'), 'transport_expired');
  assert.equal(transportFailureCategory('edge_request_cancelled'), 'transport_cancelled');
  assert.equal(transportFailureCategory('edge_governed_read_unavailable'), 'transport_unavailable');

  for (const code of [
    'edge_response_timeout',
    'edge_request_expired',
    'edge_request_cancelled',
    'edge_governed_read_unavailable'
  ]) {
    const text = modelVisibleErrorText(code);
    assert.match(text, /No receipt-bound memory result was returned/u, code);
    assert.match(text, /terminal for the current one-read workflow/u, code);
    assert.match(text, /do not call another memory read or resolve again/u, code);
    assert.match(text, /Do not describe it as an empty, denied, or unavailable memory result/u, code);
    assert.match(text, /do not invent retries/u, code);
  }

  const unsafeCode = modelVisibleErrorText('token=do-not-project');
  assert.doesNotMatch(unsafeCode, /token=do-not-project/u);
  assert.match(unsafeCode, /edge_governed_read_unavailable/u);
});

test('R5-I binds low-disclosure failure categories into internal receipts', () => {
  assert.equal(Object.isFrozen(RECEIPT_FAILURE_CATEGORIES), true);
  assert.equal(new Set(RECEIPT_FAILURE_CATEGORIES).size, RECEIPT_FAILURE_CATEGORIES.length);
  const cases = [
    [{ toolName: 'resolve_memory_context', status: 'denied' }, 'context_denied'],
    [{ toolName: 'resolve_memory_context', status: 'unavailable' }, 'context_unavailable'],
    [{ toolName: 'search_memory', status: 'denied' }, 'read_denied'],
    [{ toolName: 'search_memory', status: 'unavailable' }, 'read_unavailable'],
    [{ toolName: 'search_memory', status: 'unavailable', activationRejected: true, activationStatus: 'inactive' }, 'session_inactive'],
    [{ toolName: 'search_memory', status: 'unavailable', activationRejected: true, activationStatus: 'expired' }, 'session_expired'],
    [{ toolName: 'search_memory', status: 'unavailable', activationRejected: true, activationStatus: 'killed' }, 'session_killed'],
    [{ toolName: 'search_memory', status: 'unavailable', activationRejected: true, activationStatus: 'consumed' }, 'one_read_already_consumed'],
    [{ toolName: 'search_memory', status: 'unavailable', activationRejected: true, activationStatus: 'active' }, 'session_authorization_rejected'],
    [{
      toolName: 'search_memory',
      status: 'unavailable',
      activationStatus: 'killed',
      responseSuppressed: true
    }, 'response_suppressed_after_activation_recheck']
  ];
  for (const [input, expected] of cases) {
    assert.equal(classifyReceiptFailure(input), expected);
    assert.ok(RECEIPT_FAILURE_CATEGORIES.includes(expected));
  }
  assert.equal(classifyReceiptFailure({ toolName: 'search_memory', status: 'ok' }), null);
  assert.equal(classifyReceiptFailure({
    toolName: 'search_memory',
    status: 'unavailable',
    activationStatus: 'consumed'
  }), 'read_unavailable');
  assert.throws(() => classifyReceiptFailure({
    toolName: 'search_memory',
    status: 'unavailable',
    activationStatus: 'invented'
  }), { code: 'governance_failure_projection_invalid' });
  assert.throws(() => classifyReceiptFailure({
    toolName: 'search_memory',
    status: 'unavailable',
    activationRejected: true
  }), { code: 'governance_failure_projection_invalid' });

  const serialized = JSON.stringify(cases);
  assert.doesNotMatch(
    serialized,
    /project-alpha|agents-os|diary|mapping|sha256:[a-f0-9]{64}|pctx_/iu
  );
});
