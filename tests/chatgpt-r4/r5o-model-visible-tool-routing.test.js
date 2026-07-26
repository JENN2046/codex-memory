'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { digestObject } = require('../../packages/chatgpt-r4-contracts');
const {
  MODEL_WORKFLOW_INSTRUCTIONS,
  toolDescriptors
} = require('../../apps/chatgpt-edge');

const FROZEN_PUBLIC_SCHEMA_DIGESTS = Object.freeze({
  resolve_memory_context: 'sha256:fe92ada83513b769a01d241fe1df483fcf3b9b0330b253cfa4c8a343b3093faf',
  memory_overview: 'sha256:a9314eb1604641ae76d95132bf73ed28c3136afe5c9a8352fb2474b695f372d1',
  search_memory: 'sha256:c301306bf253377183d8dc4d660dd09d527db4c361d8aba96137c72234f8f324',
  audit_memory: 'sha256:498956aa48b7e2c8ef30c2e1dd622fbc7df0c359786bcfc74b958d37ea2eab9f',
  prepare_memory_context: 'sha256:7c190bbeda945a6cfad8726d0705f4f723b1103867e3c9605b2180a502d2b99c',
  render_memory_scope: 'sha256:07308f75e3ed7ecc950bf97c0496a598a0582194527d43a1df093223bc626a1a'
});

test('R5-O puts no-tool and exact-scope gates before read selection', () => {
  const leading = MODEL_WORKFLOW_INSTRUCTIONS.slice(0, 512);
  assert.match(leading, /^No tool for rewriting, translation, formatting, math, checklists/u);
  assert.match(leading, /summaries of user text/u);
  assert.match(leading, /explicitly labelled project_alias and requested_visibility/u);
  assert.match(leading, /If either is missing, ask only for missing values; call no tool/u);
  assert.match(leading, /past fact\/decision\/event\/record → search_memory/u);
  assert.match(leading, /current access\/receipt\/scope\/visibility or mixed count\/status → audit_memory/u);
  assert.match(leading, /count\/status\/availability only → memory_overview/u);
  assert.match(leading, /named task-start → prepare_memory_context/u);
});

test('R5-O distinguishes user-supplied summaries from stored-memory summaries', () => {
  assert.match(
    MODEL_WORKFLOW_INSTRUCTIONS,
    /No tool for .+ summaries of user text/u
  );

  const description = toolDescriptors.resolve_memory_context.description;
  assert.match(description, /^Use this when/u);
  assert.match(description, /stored-memory retrieval/u);
  assert.match(description, /If either value is absent, ask for it and call no tool/u);
  assert.match(
    toolDescriptors.prepare_memory_context.description,
    /A stored-memory summary follows the search, audit, or overview route instead/u
  );
});

test('R5-O requires successful resolve before exactly one intent-matched read', () => {
  assert.match(
    MODEL_WORKFLOW_INSTRUCTIONS,
    /Select one read/u
  );
  assert.match(
    MODEL_WORKFLOW_INSTRUCTIONS,
    /call resolve_memory_context once/u
  );
  assert.match(
    MODEL_WORKFLOW_INSTRUCTIONS,
    /wait for project_context_ref, call the chosen read once, then answer/u
  );

  for (const name of [
    'memory_overview',
    'search_memory',
    'audit_memory',
    'prepare_memory_context'
  ]) {
    const descriptor = toolDescriptors[name];
    assert.match(
      descriptor.description,
      /^Use this when resolve_memory_context just returned project_context_ref/u,
      name
    );
    assert.match(descriptor.description, /Call once/u, name);
    assert.match(descriptor.description, /first result/u, name);
  }
});

test('R5-O routes by requested output instead of subject keywords', () => {
  assert.match(
    toolDescriptors.memory_overview.description,
    /requested output is only counts, status, or availability/u
  );
  assert.match(
    toolDescriptors.memory_overview.description,
    /Current access, receipts, scope, or visibility, including a mixed request, belongs to audit_memory/u
  );
  assert.match(
    toolDescriptors.search_memory.description,
    /one stored past fact, decision, event, or record/u
  );
  assert.match(
    toolDescriptors.search_memory.description,
    /subject contains audit, receipt, or canary/u
  );
  assert.match(
    toolDescriptors.audit_memory.description,
    /requested output asks for current access, receipts, scope, or visibility/u
  );
  assert.match(
    toolDescriptors.audit_memory.description,
    /handles mixed counts, status, or availability/u
  );
  assert.match(
    toolDescriptors.audit_memory.description,
    /Resolve arguments alone do not select it/u
  );
  assert.match(
    toolDescriptors.audit_memory.description,
    /historical audit or receipt records use search_memory/u
  );
  assert.match(
    toolDescriptors.prepare_memory_context.description,
    /explicitly requests a bounded task-start context package for a named task/u
  );
  assert.match(
    toolDescriptors.prepare_memory_context.description,
    /stored-memory summary follows the search, audit, or overview route/u
  );
});

test('R5-O keeps routing guidance concise and preserves the frozen public schemas', () => {
  assert.ok(MODEL_WORKFLOW_INSTRUCTIONS.length < 1250);
  assert.ok(toolDescriptors.resolve_memory_context.description.length < 350);
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
    ['project_alias', 'requested_visibility']
  );
});
