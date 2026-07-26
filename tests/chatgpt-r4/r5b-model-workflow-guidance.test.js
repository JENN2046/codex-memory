'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { digestObject } = require('../../packages/chatgpt-r4-contracts');
const {
  MODEL_WORKFLOW_INSTRUCTIONS,
  modelVisibleResultText,
  toolDescriptors
} = require('../../apps/chatgpt-edge');

const PUBLIC_SCHEMA_DIGESTS_FROM_MAIN = Object.freeze({
  resolve_memory_context: 'sha256:323d0cdcd4ca76d41b0af27ce514c0446e30bd5ba87da8d172f024c69626bbb6',
  memory_overview: 'sha256:a9314eb1604641ae76d95132bf73ed28c3136afe5c9a8352fb2474b695f372d1',
  search_memory: 'sha256:c301306bf253377183d8dc4d660dd09d527db4c361d8aba96137c72234f8f324',
  audit_memory: 'sha256:498956aa48b7e2c8ef30c2e1dd622fbc7df0c359786bcfc74b958d37ea2eab9f',
  prepare_memory_context: 'sha256:7c190bbeda945a6cfad8726d0705f4f723b1103867e3c9605b2180a502d2b99c',
  render_memory_scope: 'sha256:07308f75e3ed7ecc950bf97c0496a598a0582194527d43a1df093223bc626a1a'
});

test('R5-B instructions require exact first context selection and one terminal read', () => {
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /resolve_memory_context exactly once/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /both exact project_alias and requested_visibility/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /Copy an explicitly labelled project_alias and requested_visibility exactly/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /ask once for the missing value/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /Choose one read by primary intent/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /call the chosen read exactly once, then answer/u);

  const resolveDescription = toolDescriptors.resolve_memory_context.description;
  assert.match(resolveDescription, /exact project_alias and requested_visibility/u);
  assert.match(resolveDescription, /Copy them exactly and call once/u);
  assert.match(resolveDescription, /If either value is missing, ask once without calling a tool/u);

  for (const toolName of [
    'memory_overview',
    'search_memory',
    'audit_memory',
    'prepare_memory_context'
  ]) {
    assert.match(toolDescriptors[toolName].description, /^Use this after resolve/u, toolName);
    assert.match(toolDescriptors[toolName].description, /Call once/u, toolName);
    assert.match(toolDescriptors[toolName].description, /first result/u, toolName);
  }
  assert.match(toolDescriptors.search_memory.description, /without dereferencing result_ref/u);

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

test('R5-B changes metadata and model-visible text without changing six public schemas', () => {
  assert.deepEqual(Object.keys(toolDescriptors), Object.keys(PUBLIC_SCHEMA_DIGESTS_FROM_MAIN));
  for (const [name, descriptor] of Object.entries(toolDescriptors)) {
    assert.equal(digestObject({
      inputSchema: descriptor.inputSchema,
      outputSchema: descriptor.outputSchema
    }), PUBLIC_SCHEMA_DIGESTS_FROM_MAIN[name], name);
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
        ? { status: 'found', result_count: 1, results: [] }
        : { status, result_count: 0, results: [] }
    });
    assert.match(text, /^FINAL CODEX-MEMORY RESULT — NO MORE TOOL CALLS/u, status);
    assert.match(text, /workflow is consumed/u, status);
    assert.match(text, /Omit every category not returned here/u, status);
    assert.match(text, /Never infer or report the status or availability of an uncalled tool/u, status);
    assert.match(text, /END OF TOOL WORKFLOW — RESPOND TO THE USER NOW/u, status);
  }
});
