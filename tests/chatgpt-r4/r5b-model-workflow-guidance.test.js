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
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /Copy project_alias and requested_visibility exactly/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /never invent, normalize, suffix, enumerate, or probe alternatives/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /If either value is missing, ask one concise clarification/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /choose exactly one read tool/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /After any read result.+do not call another read tool or resolve again/u);

  const resolveDescription = toolDescriptors.resolve_memory_context.description;
  assert.match(resolveDescription, /both an exact registered project alias and an exact visibility/u);
  assert.match(resolveDescription, /Copy both values verbatim/u);
  assert.match(resolveDescription, /never guess or probe alternative aliases or visibilities/u);

  for (const toolName of [
    'memory_overview',
    'search_memory',
    'audit_memory',
    'prepare_memory_context'
  ]) {
    assert.match(toolDescriptors[toolName].description, /sole read tool/u, toolName);
    assert.match(toolDescriptors[toolName].description, /do not call another memory read or resolve again/u, toolName);
  }

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
    assert.match(text, /terminal result for the current one-read workflow/u, status);
    assert.match(text, /do not call another memory read or resolve again/u, status);
  }
});
