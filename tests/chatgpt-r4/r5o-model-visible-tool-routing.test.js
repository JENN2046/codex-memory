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

test('R5-O puts the no-tool routing gate before workflow mechanics', () => {
  const leading = MODEL_WORKFLOW_INSTRUCTIONS.slice(0, 512);
  assert.match(leading, /never use for irrelevant tasks: rewriting, translation, arithmetic, formatting/u);
  assert.match(leading, /summarizing text/u);
  assert.match(leading, /If either is missing, ask one clarification and call no tool/u);
  assert.match(leading, /wait for its result/u);
  assert.match(leading, /Never report an uncalled tool unavailable/u);

  assert.match(
    MODEL_WORKFLOW_INSTRUCTIONS,
    /Words such as project, memory, test, fix, or current do not by themselves authorize a memory tool/u
  );
  assert.match(
    MODEL_WORKFLOW_INSTRUCTIONS,
    /scope-missing, not permission to resolve/u
  );
});

test('R5-O forbids resolve for transformation tasks and missing exact scope', () => {
  const description = toolDescriptors.resolve_memory_context.description;
  assert.match(description, /^ROUTING GATE:/u);
  assert.match(description, /Never call for rewriting, translation, arithmetic, formatting, checklist creation/u);
  assert.match(description, /summarizing user-provided text/u);
  assert.match(description, /vague request such as current project memory/u);
  assert.match(description, /ask one concise clarification and call no tool/u);
  assert.match(description, /Never infer task_start_context as a default or call this tool to discover missing scope/u);
});

test('R5-O requires successful resolve before exactly one intent-matched read', () => {
  assert.match(
    MODEL_WORKFLOW_INSTRUCTIONS,
    /Choose the intended read tool from the primary user intent before any call/u
  );
  assert.match(
    MODEL_WORKFLOW_INSTRUCTIONS,
    /invoke only resolve_memory_context first/u
  );
  assert.match(
    MODEL_WORKFLOW_INSTRUCTIONS,
    /Never call memory_overview, search_memory, audit_memory, or prepare_memory_context before a returned project_context_ref/u
  );

  for (const name of [
    'memory_overview',
    'search_memory',
    'audit_memory',
    'prepare_memory_context'
  ]) {
    const descriptor = toolDescriptors[name];
    assert.match(descriptor.title, /after resolve/iu, name);
    assert.match(descriptor.description, /^AFTER RESOLVE ONLY:/u, name);
    assert.match(descriptor.description, /immediately preceding successful resolve_memory_context/u, name);
    assert.match(descriptor.description, /Never call it before resolve, while exact scope is missing, or before another read/u, name);
  }
});

test('R5-O makes the four read intents mutually exclusive', () => {
  assert.match(
    toolDescriptors.memory_overview.description,
    /primary user intent is a bounded low-disclosure memory or bridge count, availability, or status overview/u
  );
  assert.match(
    toolDescriptors.memory_overview.description,
    /not a preflight, scope resolver, access audit, semantic search, or task-context preparation tool/u
  );
  assert.match(
    toolDescriptors.search_memory.description,
    /one specific stored fact, decision, event, or historical testing record/u
  );
  assert.match(
    toolDescriptors.audit_memory.description,
    /access authorization, visibility boundary, receipt, or audit categories/u
  );
  assert.match(
    toolDescriptors.prepare_memory_context.description,
    /explicitly asks to prepare or assemble one bounded project-aware task-start context package/u
  );
  assert.match(
    toolDescriptors.prepare_memory_context.description,
    /generic request to load context, recall results, inspect status, or summarize project memory does not select this tool/u
  );
});

test('R5-O changes only model-visible metadata and preserves the frozen public schemas', () => {
  assert.deepEqual(Object.keys(toolDescriptors), Object.keys(FROZEN_PUBLIC_SCHEMA_DIGESTS));
  for (const [name, descriptor] of Object.entries(toolDescriptors)) {
    assert.equal(digestObject({
      inputSchema: descriptor.inputSchema,
      outputSchema: descriptor.outputSchema
    }), FROZEN_PUBLIC_SCHEMA_DIGESTS[name], name);
  }
});
