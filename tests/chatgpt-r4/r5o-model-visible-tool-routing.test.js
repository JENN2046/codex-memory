'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { digestObject } = require('../../packages/chatgpt-r4-contracts');
const {
  MODEL_WORKFLOW_INSTRUCTIONS,
  toolDescriptors
} = require('../../apps/chatgpt-edge');

const FROZEN_PUBLIC_SCHEMA_DIGESTS = Object.freeze({
  resolve_memory_context: 'sha256:323d0cdcd4ca76d41b0af27ce514c0446e30bd5ba87da8d172f024c69626bbb6',
  memory_overview: 'sha256:a9314eb1604641ae76d95132bf73ed28c3136afe5c9a8352fb2474b695f372d1',
  search_memory: 'sha256:c301306bf253377183d8dc4d660dd09d527db4c361d8aba96137c72234f8f324',
  audit_memory: 'sha256:498956aa48b7e2c8ef30c2e1dd622fbc7df0c359786bcfc74b958d37ea2eab9f',
  prepare_memory_context: 'sha256:7c190bbeda945a6cfad8726d0705f4f723b1103867e3c9605b2180a502d2b99c',
  render_memory_scope: 'sha256:07308f75e3ed7ecc950bf97c0496a598a0582194527d43a1df093223bc626a1a'
});

test('R5-O puts the positive intent routes in the leading model instructions', () => {
  const leading = MODEL_WORKFLOW_INSTRUCTIONS.slice(0, 512);
  assert.match(leading, /retrieve stored project memory/u);
  assert.match(leading, /both exact project_alias and requested_visibility/u);
  assert.match(leading, /Choose one read by primary intent/u);
  assert.match(leading, /audit_memory for access, receipt, scope, or visibility/u);
  assert.match(leading, /including mixed overview requests/u);
  assert.match(leading, /search_memory for one fact, decision, event, or historical record/u);
  assert.match(leading, /prepare_memory_context for a named task-start package/u);
  assert.match(leading, /memory_overview for counts, status, or availability/u);
});

test('R5-O distinguishes user-supplied summaries from stored-memory summaries', () => {
  assert.match(
    MODEL_WORKFLOW_INSTRUCTIONS,
    /Transform or summarize only user-supplied text without tools/u
  );
  assert.match(
    MODEL_WORKFLOW_INSTRUCTIONS,
    /Summarizing stored project memory follows the retrieval routes above/u
  );

  const description = toolDescriptors.resolve_memory_context.description;
  assert.match(description, /^Use this first/u);
  assert.match(description, /summarizing only user-supplied text/u);
  assert.match(description, /A request to summarize stored project memory does use this workflow/u);
  assert.match(description, /If either value is missing, ask once without calling a tool/u);
});

test('R5-O requires successful resolve before exactly one intent-matched read', () => {
  assert.match(
    MODEL_WORKFLOW_INSTRUCTIONS,
    /Choose one read by primary intent/u
  );
  assert.match(
    MODEL_WORKFLOW_INSTRUCTIONS,
    /Call resolve_memory_context exactly once/u
  );
  assert.match(
    MODEL_WORKFLOW_INSTRUCTIONS,
    /wait for a resolved project_context_ref, call the chosen read exactly once, then answer/u
  );

  for (const name of [
    'memory_overview',
    'search_memory',
    'audit_memory',
    'prepare_memory_context'
  ]) {
    const descriptor = toolDescriptors[name];
    assert.match(descriptor.description, /^Use this after resolve/u, name);
    assert.match(descriptor.description, /Call once/u, name);
    assert.match(descriptor.description, /returned project_context_ref/u, name);
  }
});

test('R5-O gives audit priority over overview and keeps the other read intents distinct', () => {
  assert.match(
    toolDescriptors.memory_overview.description,
    /counts, status, or availability/u
  );
  assert.match(
    toolDescriptors.memory_overview.description,
    /request also includes access, receipts, scope, or visibility, choose audit_memory instead/u
  );
  assert.match(
    toolDescriptors.search_memory.description,
    /one specific stored fact, decision, event, or historical record/u
  );
  assert.match(
    toolDescriptors.audit_memory.description,
    /access authorization, receipts, audit, scope, or visibility/u
  );
  assert.match(
    toolDescriptors.audit_memory.description,
    /Choose it over memory_overview when a request mixes those categories/u
  );
  assert.match(
    toolDescriptors.prepare_memory_context.description,
    /explicitly asks to prepare or assemble a bounded task-start context package for a named task/u
  );
  assert.match(
    toolDescriptors.prepare_memory_context.description,
    /request to summarize stored project memory, select search_memory, audit_memory, or memory_overview/u
  );
});

test('R5-O keeps routing guidance concise and preserves the frozen public schemas', () => {
  assert.ok(MODEL_WORKFLOW_INSTRUCTIONS.length < 1400);
  assert.ok(toolDescriptors.resolve_memory_context.description.length < 600);
  for (const name of [
    'memory_overview',
    'search_memory',
    'audit_memory',
    'prepare_memory_context'
  ]) {
    assert.ok(toolDescriptors[name].description.length < 400, name);
  }

  assert.deepEqual(Object.keys(toolDescriptors), Object.keys(FROZEN_PUBLIC_SCHEMA_DIGESTS));
  for (const [name, descriptor] of Object.entries(toolDescriptors)) {
    assert.equal(digestObject({
      inputSchema: descriptor.inputSchema,
      outputSchema: descriptor.outputSchema
    }), FROZEN_PUBLIC_SCHEMA_DIGESTS[name], name);
  }
  assert.deepEqual(
    toolDescriptors.resolve_memory_context.inputSchema.required,
    ['project_alias']
  );
});
