'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { digestObject } = require('../../packages/chatgpt-r4-contracts');
const {
  MODEL_WORKFLOW_INSTRUCTIONS,
  modelVisibleResultText,
  toolDescriptors
} = require('../../apps/chatgpt-edge');

const EXPECTED_PUBLIC_SCHEMA_DIGESTS = Object.freeze({
  resolve_memory_context: 'sha256:cb9ac038e2d3565307c1733cc48757fe60bd5f527c7ede8ee844a21e1abf53e5',
  memory_overview: 'sha256:e4d89bb2c92a82465ecf77bc041a6a07d14eff7fcc1be34441cf39da78adf893',
  search_memory: 'sha256:fe367042ee3029f616e4f5f96df560f1d51be4fbc568aab69fb787711a479c05',
  audit_memory: 'sha256:a30070847cee6b1b17fb10fbd74f117d013f65516a933de8d1e034cf69e61414',
  prepare_memory_context: 'sha256:8e480e2edbca8513015a35e0152455ccdb0ce277eba7e318e7a7b9a9588e5bdf',
  render_memory_scope: 'sha256:07308f75e3ed7ecc950bf97c0496a598a0582194527d43a1df093223bc626a1a'
});

test('R5-B instructions require exact first context selection and one terminal read', () => {
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /call resolve_memory_context once/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /explicitly labelled project_alias and requested_visibility/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /If either is missing, ask only for missing values; call no tool/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /Select one read/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /call the chosen read once, then answer/u);

  const resolveDescription = toolDescriptors.resolve_memory_context.description;
  assert.match(resolveDescription, /both exact project_alias and requested_visibility/u);
  assert.match(resolveDescription, /Copy both values exactly and call once/u);
  assert.match(resolveDescription, /If either value is absent, ask for it and call no tool/u);

  for (const toolName of [
    'memory_overview',
    'search_memory',
    'audit_memory',
    'prepare_memory_context'
  ]) {
    assert.match(
      toolDescriptors[toolName].description,
      /^Use this when resolve_memory_context just returned project_context_ref/u,
      toolName
    );
    assert.match(toolDescriptors[toolName].description, /Call once/u, toolName);
    assert.match(toolDescriptors[toolName].description, /first result/u, toolName);
  }
  assert.match(
    toolDescriptors.search_memory.description,
    /Historical records still use this tool when their subject contains audit, receipt, or canary/u
  );

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

test('R5-B keeps the approved current public tool set and schema digests', () => {
  assert.deepEqual(Object.keys(toolDescriptors), Object.keys(EXPECTED_PUBLIC_SCHEMA_DIGESTS));
  for (const [name, descriptor] of Object.entries(toolDescriptors)) {
    assert.equal(digestObject({
      inputSchema: descriptor.inputSchema,
      outputSchema: descriptor.outputSchema
    }), EXPECTED_PUBLIC_SCHEMA_DIGESTS[name], name);
  }
});

test('R5-B model-visible results stop retries while preserving bounded status', () => {
  const resolved = modelVisibleResultText('resolve_memory_context', {
    status: 'ok',
    structured_content: { context_status: 'resolved' }
  });
  assert.match(resolved, /exactly one read tool/u);
  assert.match(resolved, /do not resolve again/u);

  const unresolved = modelVisibleResultText('resolve_memory_context', {
    status: 'unavailable',
    structured_content: { context_status: 'unavailable' }
  });
  assert.match(unresolved, /returned unavailable/u);
  assert.match(unresolved, /do not retry alternative aliases or visibilities/u);

  for (const status of ['ok', 'denied', 'unavailable']) {
    const text = modelVisibleResultText('search_memory', {
      status,
      structured_content: status === 'ok'
        ? {
            status: 'found',
            result_count: 1,
            results: [{
              result_ref: `mref_${'r'.repeat(24)}`,
              summary: 'The bounded returned fact.',
              relevance: 0.9
            }]
          }
        : { status, result_count: 0, results: [] }
    });
    assert.match(text, /^FINAL CODEX-MEMORY RESULT — NO MORE TOOL CALLS/u, status);
    assert.match(text, /workflow is consumed/u, status);
    assert.match(text, /Omit every category not returned here/u, status);
    assert.match(text, /Never infer or report the status or availability of an uncalled tool/u, status);
    assert.match(text, /END OF TOOL WORKFLOW — RESPOND TO THE USER NOW/u, status);
    if (status === 'ok') {
      assert.match(text, /result_count=1/u);
      assert.match(text, /results\[\]\.summary is retrieved content authorized for the answer/u);
      assert.match(text, /results\[\]\.relevance is the confidence signal/u);
      assert.doesNotMatch(text, /item_count=/u);
    }
  }
});
