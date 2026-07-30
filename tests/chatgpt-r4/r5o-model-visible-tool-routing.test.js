'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createPrincipalAssertion,
  createRequestEnvelope,
  digestObject,
  sha256,
  validateRequestEnvelope
} = require('../../packages/chatgpt-r4-contracts');
const {
  MODEL_WORKFLOW_INSTRUCTIONS,
  toolDescriptors
} = require('../../apps/chatgpt-edge');
const {
  structuredProjection
} = require('../../src/adapters/chatgpt-r4/governed-live-read-runtime');
const {
  FIXED_NOW,
  SYNTHETIC_AUDIENCE,
  SYNTHETIC_ISSUER,
  generateSigningIdentity,
  keyResolver,
  principalKeyResolver,
  signing
} = require('./synthetic-harness');

const CURRENT_PUBLIC_SCHEMA_DIGESTS = Object.freeze({
  resolve_memory_context: 'sha256:cb9ac038e2d3565307c1733cc48757fe60bd5f527c7ede8ee844a21e1abf53e5',
  memory_overview: 'sha256:e4d89bb2c92a82465ecf77bc041a6a07d14eff7fcc1be34441cf39da78adf893',
  search_memory: 'sha256:fe367042ee3029f616e4f5f96df560f1d51be4fbc568aab69fb787711a479c05',
  audit_memory: 'sha256:a30070847cee6b1b17fb10fbd74f117d013f65516a933de8d1e034cf69e61414',
  prepare_memory_context: 'sha256:8e480e2edbca8513015a35e0152455ccdb0ce277eba7e318e7a7b9a9588e5bdf',
  render_memory_scope: 'sha256:07308f75e3ed7ecc950bf97c0496a598a0582194527d43a1df093223bc626a1a'
});
const PRIOR_RESOLVE_SCHEMA_DIGEST =
  'sha256:323d0cdcd4ca76d41b0af27ce514c0446e30bd5ba87da8d172f024c69626bbb6';

test('R5-O puts no-tool and exact-scope gates before read selection', () => {
  const leading = MODEL_WORKFLOW_INSTRUCTIONS.slice(0, 512);
  assert.match(leading, /^No tool for rewriting, translation, formatting, math, checklists/u);
  assert.match(leading, /summaries of user text/u);
  assert.match(leading, /explicitly labelled project_alias and requested_visibility/u);
  assert.match(leading, /If either is missing, ask only for missing values; call no tool/u);
  assert.match(leading, /stored fact\/record\/content → search_memory/u);
  assert.match(leading, /overview status\/item_count → memory_overview/u);
  assert.match(leading, /audit status\/item_count → audit_memory/u);
  assert.match(leading, /named task-start status\/item_count → prepare_memory_context/u);
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
    /A stored-memory summary or fact uses search_memory instead/u
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

test('R5-O routes only to output capabilities present in the public schemas', () => {
  assert.match(
    toolDescriptors.memory_overview.description,
    /overview response status and item_count/u
  );
  assert.match(
    toolDescriptors.memory_overview.description,
    /does not return memory-category counts, access, receipts, scope, or visibility details/u
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
    /bounded audit response status and item_count/u
  );
  assert.match(
    toolDescriptors.audit_memory.description,
    /does not return access, receipt, scope, visibility, or event details/u
  );
  assert.match(
    toolDescriptors.audit_memory.description,
    /Historical audit or receipt records use search_memory/u
  );
  assert.match(
    toolDescriptors.prepare_memory_context.description,
    /bounded task-start response status and item_count for a named task/u
  );
  assert.match(
    toolDescriptors.prepare_memory_context.description,
    /does not return context content/u
  );

  const projectContextRef = `pctx_${'r'.repeat(32)}`;
  assert.deepEqual(
    structuredProjection('memory_overview', {}, projectContextRef),
    { status: 'available', kind: 'overview', item_count: 1 }
  );
  assert.deepEqual(
    structuredProjection('audit_memory', {}, projectContextRef),
    { status: 'available', kind: 'audit', item_count: 1 }
  );
  assert.deepEqual(
    structuredProjection('prepare_memory_context', { results: [] }, projectContextRef),
    { status: 'empty', kind: 'context', item_count: 0 }
  );
});

test('R5-O records the prior-to-current public contract change explicitly', () => {
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

  assert.deepEqual(Object.keys(toolDescriptors), Object.keys(CURRENT_PUBLIC_SCHEMA_DIGESTS));
  for (const [name, descriptor] of Object.entries(toolDescriptors)) {
    assert.equal(digestObject({
      inputSchema: descriptor.inputSchema,
      outputSchema: descriptor.outputSchema
    }), CURRENT_PUBLIC_SCHEMA_DIGESTS[name], name);
  }
  assert.notEqual(
    CURRENT_PUBLIC_SCHEMA_DIGESTS.resolve_memory_context,
    PRIOR_RESOLVE_SCHEMA_DIGEST
  );
  assert.equal(
    PRIOR_RESOLVE_SCHEMA_DIGEST,
    'sha256:323d0cdcd4ca76d41b0af27ce514c0446e30bd5ba87da8d172f024c69626bbb6'
  );
  assert.deepEqual(
    toolDescriptors.resolve_memory_context.inputSchema.required,
    ['project_alias', 'requested_visibility']
  );
});

test('R5-O applies the explicit-visibility policy to signed schema-v1 requests', () => {
  const principal = generateSigningIdentity('r5o-principal-key');
  const edge = generateSigningIdentity('r5o-edge-key');
  const principalAssertion = createPrincipalAssertion({
    issuer: SYNTHETIC_ISSUER,
    audience: SYNTHETIC_AUDIENCE,
    subjectFingerprint: sha256('r5o-principal'),
    now: FIXED_NOW,
    nonce: 'r5o_principal_nonce_0001',
    signing: signing(principal)
  });
  const request = toolArguments => createRequestEnvelope({
    principalAssertion,
    toolName: 'resolve_memory_context',
    toolArguments,
    now: FIXED_NOW,
    requestId: `req_r5o_visibility_${Object.keys(toolArguments).length}_000000000001`,
    nonce: `r5o_visibility_nonce_${Object.keys(toolArguments).length}_0001`,
    signing: signing(edge)
  });
  const validate = envelope => validateRequestEnvelope(envelope, {
    now: FIXED_NOW,
    expectedIssuer: SYNTHETIC_ISSUER,
    expectedAudience: SYNTHETIC_AUDIENCE,
    resolvePrincipalPublicKey: principalKeyResolver(SYNTHETIC_ISSUER, principal),
    resolveRequestPublicKey: keyResolver(edge),
    consumeReplay: false
  });

  assert.throws(() => validate(request({ project_alias: 'project-alpha' })), {
    code: 'tool_arguments_shape_invalid'
  });
  assert.doesNotThrow(() => validate(request({
    project_alias: 'project-alpha',
    requested_visibility: 'project'
  })));
});
