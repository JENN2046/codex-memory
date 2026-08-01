'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  digestObject,
  validateToolArguments
} = require('../../packages/chatgpt-r4-contracts');
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

const EXPECTED_PUBLIC_SCHEMA_DIGESTS = Object.freeze({
  resolve_memory_context: 'sha256:5e978d8e56d53de05c048bd1273a028ffccc75779916ad9858e86743b4bb8fe5',
  memory_overview: 'sha256:e4d89bb2c92a82465ecf77bc041a6a07d14eff7fcc1be34441cf39da78adf893',
  search_memory: 'sha256:fe367042ee3029f616e4f5f96df560f1d51be4fbc568aab69fb787711a479c05',
  audit_memory: 'sha256:a30070847cee6b1b17fb10fbd74f117d013f65516a933de8d1e034cf69e61414',
  prepare_memory_context: 'sha256:8e480e2edbca8513015a35e0152455ccdb0ce277eba7e318e7a7b9a9588e5bdf',
  render_memory_scope: 'sha256:07308f75e3ed7ecc950bf97c0496a598a0582194527d43a1df093223bc626a1a'
});

test('R5-I selects only exact user-provided alias and visibility without probing identities', () => {
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /explicitly labelled project_alias and requested_visibility/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /unlabelled App or repository names as absent/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /a labelled alias may match those names/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /ask only for missing values; call no tool/u);

  const description = toolDescriptors.resolve_memory_context.description;
  assert.match(description, /explicitly supplies both exact project_alias and requested_visibility/u);
  assert.match(description, /Copy both values exactly and call once/u);
  assert.match(description, /If either value is absent, ask for it and call no tool/u);

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
  assert.deepEqual(Object.keys(toolDescriptors), Object.keys(EXPECTED_PUBLIC_SCHEMA_DIGESTS));
  for (const [name, descriptor] of Object.entries(toolDescriptors)) {
    assert.equal(digestObject({
      inputSchema: descriptor.inputSchema,
      outputSchema: descriptor.outputSchema
    }), EXPECTED_PUBLIC_SCHEMA_DIGESTS[name], name);
  }
});

test('R5-I requires exact visibility in the public schema and request validator', () => {
  assert.throws(() => validateToolArguments('resolve_memory_context', {
    project_alias: 'project-alpha'
  }), { code: 'tool_arguments_shape_invalid' });
  assert.doesNotThrow(() => validateToolArguments('resolve_memory_context', {
    project_alias: 'project-alpha',
    requested_visibility: 'project'
  }));
  assert.deepEqual(
    toolDescriptors.resolve_memory_context.inputSchema.required,
    ['project_alias', 'requested_visibility']
  );
});

test('R5-I projects verified governed outcomes separately from transport failures', () => {
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
  assert.match(resolved, /Receipt-bound.+status: resolved/u);
  assert.match(resolved, /exactly one read tool/u);
  assert.match(resolved, /do not resolve again/u);

  for (const status of ['denied', 'unavailable']) {
    const resolveFailure = modelVisibleResultText('resolve_memory_context', {
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
    assert.match(result, new RegExp(`receipt=bound; status=${status}`, 'u'));
    assert.match(result, /workflow is consumed/u);
    assert.match(result, /Omit every category not returned here/u);
    assert.match(result, /Never infer or report the status or availability of an uncalled tool/u);
  }

  for (const status of ['denied', 'unavailable']) {
    const result = modelVisibleResultText('search_memory', {
      status,
      structured_content: { status, result_count: 0, results: [] }
    });
    assert.match(result, new RegExp(`receipt=bound; status=${status}`, 'u'));
    assert.match(result, /not a transport timeout/u);
    assert.match(result, /workflow is consumed/u);
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
    assert.match(text, /consumed the workflow/u, code);
    assert.match(text, /Do not call any tool to retry, verify, supplement, expand, or fill a table/u, code);
    assert.match(text, /Do not describe it as an empty, denied, or unavailable memory result/u, code);
    assert.match(text, /Do not invent retries/u, code);
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
