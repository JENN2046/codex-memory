'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');

const {
  DATA_TOOL_NAMES,
  HTTPS_URI_PATTERN_SOURCE,
  InMemoryReplayGuard,
  PRINCIPAL_ASSERTION_SCHEMA,
  PROJECT_CONTEXT_CLAIM_SCHEMA,
  PROJECT_CONTEXT_REF_PATTERN_SOURCE,
  REQUEST_ID_PATTERN_SOURCE,
  REQUEST_ENVELOPE_SCHEMA,
  RESPONSE_ENVELOPE_SCHEMA,
  RESULT_REF_PATTERN_SOURCE,
  WIDGET_DTO_SCHEMA,
  ZERO_MEMORY_COUNTERS,
  canonicalJson,
  createPrincipalAssertion,
  createProjectContextClaim,
  createRequestEnvelope,
  createResponseEnvelope,
  digestObject,
  sha256,
  validateProjectContextClaim,
  validatePublicStructuredContent,
  validateRequestEnvelope,
  validateResponseEnvelope,
  validateToolStructuredContent,
  validateToolArguments
} = require('../../packages/chatgpt-r4-contracts');
const {
  generateSigningIdentity,
  keyResolver,
  principalKeyResolver,
  signing,
  FIXED_NOW,
  SYNTHETIC_ISSUER,
  SYNTHETIC_AUDIENCE
} = require('./synthetic-harness');

function fixture() {
  const principal = generateSigningIdentity('principal-test-key');
  const edge = generateSigningIdentity('edge-test-key');
  const context = generateSigningIdentity('context-test-key');
  const relay = generateSigningIdentity('relay-test-key');
  const clock = () => new Date(FIXED_NOW.getTime());
  const principalAssertion = createPrincipalAssertion({
    issuer: SYNTHETIC_ISSUER,
    audience: SYNTHETIC_AUDIENCE,
    subjectFingerprint: sha256('principal'),
    now: clock(),
    nonce: 'principal_nonce_contract_01',
    signing: signing(principal)
  });
  return { principal, edge, context, relay, clock, principalAssertion };
}

test('R4-B exports frozen principal, context, request, response, and widget schemas', () => {
  for (const schema of [
    PRINCIPAL_ASSERTION_SCHEMA,
    PROJECT_CONTEXT_CLAIM_SCHEMA,
    REQUEST_ENVELOPE_SCHEMA,
    RESPONSE_ENVELOPE_SCHEMA,
    WIDGET_DTO_SCHEMA
  ]) {
    assert.equal(Object.isFrozen(schema), true);
    assert.equal(schema.additionalProperties, false);
  }
  assert.equal(PRINCIPAL_ASSERTION_SCHEMA.properties.oauth_version.const, '2.1');
  assert.equal(PRINCIPAL_ASSERTION_SCHEMA.properties.issuer.pattern, HTTPS_URI_PATTERN_SOURCE);
  assert.equal(PRINCIPAL_ASSERTION_SCHEMA.properties.audience.pattern, HTTPS_URI_PATTERN_SOURCE);
  assert.deepEqual(PRINCIPAL_ASSERTION_SCHEMA.properties.scopes.contains, { const: 'memory.read' });
  assert.equal(PROJECT_CONTEXT_CLAIM_SCHEMA.properties.client_id.const, 'ChatGPT');
  const requestVariants = REQUEST_ENVELOPE_SCHEMA.properties.tool_request.oneOf;
  assert.deepEqual(requestVariants.map(variant => variant.properties.name.const), DATA_TOOL_NAMES);
  assert.equal(requestVariants.every(variant => variant.additionalProperties === false), true);
  assert.equal(requestVariants.every(variant => variant.properties.arguments.additionalProperties === false), true);
  const searchRequest = requestVariants.find(variant => variant.properties.name.const === 'search_memory');
  assert.deepEqual(searchRequest.properties.arguments.required, ['project_context_ref', 'query']);
  assert.equal(
    searchRequest.properties.arguments.properties.project_context_ref.pattern,
    PROJECT_CONTEXT_REF_PATTERN_SOURCE
  );
  assert.equal(searchRequest.properties.arguments.properties.limit.maximum, 8);
  assert.equal(requestVariants.some(variant => variant.properties.name.const === 'record_memory'), false);
  assert.deepEqual(RESPONSE_ENVELOPE_SCHEMA.properties.tool_name.enum, DATA_TOOL_NAMES);
  assert.equal(REQUEST_ENVELOPE_SCHEMA.properties.request_id.pattern, REQUEST_ID_PATTERN_SOURCE);
  assert.equal(RESPONSE_ENVELOPE_SCHEMA.properties.request_id.pattern, REQUEST_ID_PATTERN_SOURCE);
  const responseVariants = RESPONSE_ENVELOPE_SCHEMA.allOf[0].oneOf;
  assert.deepEqual(
    [...new Set(responseVariants.map(variant => variant.properties.tool_name.const))],
    DATA_TOOL_NAMES
  );
  const overviewResponse = responseVariants.find(variant =>
    variant.properties.tool_name.const === 'memory_overview');
  const searchResponse = responseVariants.find(variant =>
    variant.properties.tool_name.const === 'search_memory');
  assert.deepEqual(overviewResponse.properties.structured_content.required, ['status', 'kind', 'item_count']);
  assert.equal(overviewResponse.properties.structured_content.properties.kind.const, 'overview');
  assert.equal(overviewResponse.properties.structured_content.additionalProperties, false);
  const contextResponses = responseVariants.filter(variant =>
    variant.properties.tool_name.const === 'resolve_memory_context');
  assert.deepEqual(contextResponses.map(variant => variant.properties.status.const), [
    'ok', 'denied', 'unavailable'
  ]);
  for (const toolName of ['memory_overview', 'search_memory', 'audit_memory', 'prepare_memory_context']) {
    assert.deepEqual(
      responseVariants
        .filter(variant => variant.properties.tool_name.const === toolName)
        .map(variant => variant.properties.status.const),
      ['ok', 'denied', 'unavailable']
    );
  }
  const deniedSearchResponse = responseVariants.find(variant =>
    variant.properties.tool_name.const === 'search_memory' &&
    variant.properties.status.const === 'denied');
  assert.equal(deniedSearchResponse.properties.structured_content.properties.result_count.const, 0);
  assert.equal(deniedSearchResponse.properties.structured_content.properties.results.maxItems, 0);
  assert.equal(
    searchResponse.properties.structured_content.properties.results.items.properties.result_ref.pattern,
    RESULT_REF_PATTERN_SOURCE
  );
  const searchCountVariants = searchResponse.properties.structured_content.allOf[0].oneOf;
  assert.deepEqual(
    searchCountVariants.map(variant => variant.properties.result_count.const),
    Array.from({ length: 9 }, (_, count) => count)
  );
  for (const variant of searchCountVariants) {
    const count = variant.properties.result_count.const;
    assert.equal(variant.properties.results.minItems, count);
    assert.equal(variant.properties.results.maxItems, count);
  }
  assert.equal(WIDGET_DTO_SCHEMA.properties.safe_project_alias.pattern, '^[A-Za-z0-9][A-Za-z0-9._-]*$');
  assert.deepEqual(
    WIDGET_DTO_SCHEMA.allOf[0].oneOf.map(variant => variant.properties.context_status),
    [{ const: 'resolved' }, { enum: ['missing', 'denied', 'unavailable'] }, { const: 'expired' }]
  );
});

test('canonical JSON and digests are stable across key order', () => {
  const left = { b: [2, { z: true, a: null }], a: 1 };
  const right = { a: 1, b: [2, { a: null, z: true }] };
  assert.equal(canonicalJson(left), canonicalJson(right));
  assert.equal(digestObject(left), digestObject(right));
  assert.throws(() => canonicalJson({ value: Number.NaN }), { code: 'non_finite_number' });
});

test('signed principal and request validate with exact audience and one-time replay guard', () => {
  const { principal, edge, clock, principalAssertion } = fixture();
  const replayGuard = new InMemoryReplayGuard({ clock });
  const request = createRequestEnvelope({
    principalAssertion,
    toolName: 'memory_overview',
    toolArguments: { project_context_ref: `pctx_${'a'.repeat(32)}` },
    now: clock(),
    requestId: 'req_contract_validation_0001',
    nonce: 'request_nonce_contract_0001',
    signing: signing(edge)
  });
  const result = validateRequestEnvelope(request, {
    now: clock(),
    expectedIssuer: SYNTHETIC_ISSUER,
    expectedAudience: SYNTHETIC_AUDIENCE,
    resolvePrincipalPublicKey: principalKeyResolver(SYNTHETIC_ISSUER, principal),
    resolveRequestPublicKey: keyResolver(edge),
    replayGuard
  });
  assert.equal(result.requestDigest, digestObject(request));
  assert.equal(replayGuard.size, 2);

  const reusedRequestId = createRequestEnvelope({
    principalAssertion,
    toolName: 'audit_memory',
    toolArguments: { project_context_ref: `pctx_${'a'.repeat(32)}` },
    now: clock(),
    requestId: request.request_id,
    nonce: 'request_nonce_contract_0002',
    signing: signing(edge)
  });
  assert.throws(() => validateRequestEnvelope(reusedRequestId, {
    now: clock(),
    expectedIssuer: SYNTHETIC_ISSUER,
    expectedAudience: SYNTHETIC_AUDIENCE,
    resolvePrincipalPublicKey: principalKeyResolver(SYNTHETIC_ISSUER, principal),
    resolveRequestPublicKey: keyResolver(edge),
    replayGuard
  }), { code: 'replay_detected' });
  assert.equal(replayGuard.size, 2);

  const reusedNonce = createRequestEnvelope({
    principalAssertion,
    toolName: 'audit_memory',
    toolArguments: { project_context_ref: `pctx_${'a'.repeat(32)}` },
    now: clock(),
    requestId: 'req_contract_validation_0002',
    nonce: request.nonce,
    signing: signing(edge)
  });
  assert.throws(() => validateRequestEnvelope(reusedNonce, {
    now: clock(),
    expectedIssuer: SYNTHETIC_ISSUER,
    expectedAudience: SYNTHETIC_AUDIENCE,
    resolvePrincipalPublicKey: principalKeyResolver(SYNTHETIC_ISSUER, principal),
    resolveRequestPublicKey: keyResolver(edge),
    replayGuard
  }), { code: 'replay_detected' });
  assert.equal(replayGuard.size, 2);

  assert.throws(() => validateRequestEnvelope(request, {
    now: clock(),
    expectedIssuer: SYNTHETIC_ISSUER,
    expectedAudience: SYNTHETIC_AUDIENCE,
    resolvePrincipalPublicKey: principalKeyResolver(SYNTHETIC_ISSUER, principal),
    resolveRequestPublicKey: keyResolver(edge),
    replayGuard
  }), { code: 'replay_detected' });
  assert.equal(replayGuard.size, 2);
});

test('principal key resolution is issuer-scoped and rejects a colliding key id', () => {
  const { principal, edge, clock, principalAssertion } = fixture();
  const request = createRequestEnvelope({
    principalAssertion,
    toolName: 'memory_overview',
    toolArguments: { project_context_ref: `pctx_${'v'.repeat(32)}` },
    now: clock(),
    requestId: 'req_issuer_key_binding_000001',
    nonce: 'request_nonce_issuer_binding_01',
    signing: signing(edge)
  });
  const issuerResolver = principalKeyResolver(SYNTHETIC_ISSUER, principal);
  let observedKeyReference;
  validateRequestEnvelope(request, {
    now: clock(),
    expectedIssuer: SYNTHETIC_ISSUER,
    expectedAudience: SYNTHETIC_AUDIENCE,
    resolvePrincipalPublicKey(keyReference) {
      observedKeyReference = keyReference;
      return issuerResolver(keyReference);
    },
    resolveRequestPublicKey: keyResolver(edge),
    consumeReplay: false
  });
  assert.deepEqual(observedKeyReference, {
    issuer: SYNTHETIC_ISSUER,
    key_id: principal.keyId
  });
  assert.equal(Object.isFrozen(observedKeyReference), true);

  assert.throws(() => validateRequestEnvelope(request, {
    now: clock(),
    expectedIssuer: SYNTHETIC_ISSUER,
    expectedAudience: SYNTHETIC_AUDIENCE,
    resolvePrincipalPublicKey: keyResolver(principal),
    resolveRequestPublicKey: keyResolver(edge),
    consumeReplay: false
  }), { code: 'signature_public_key_missing' });

  const collidingPrincipal = generateSigningIdentity(principal.keyId);
  const collidingAssertion = createPrincipalAssertion({
    issuer: SYNTHETIC_ISSUER,
    audience: SYNTHETIC_AUDIENCE,
    subjectFingerprint: sha256('colliding-principal'),
    now: clock(),
    nonce: 'principal_nonce_collision_01',
    signing: signing(collidingPrincipal)
  });
  const collidingRequest = createRequestEnvelope({
    principalAssertion: collidingAssertion,
    toolName: 'memory_overview',
    toolArguments: { project_context_ref: `pctx_${'w'.repeat(32)}` },
    now: clock(),
    requestId: 'req_issuer_key_collision_0001',
    nonce: 'request_nonce_key_collision_01',
    signing: signing(edge)
  });
  assert.throws(() => validateRequestEnvelope(collidingRequest, {
    now: clock(),
    expectedIssuer: SYNTHETIC_ISSUER,
    expectedAudience: SYNTHETIC_AUDIENCE,
    resolvePrincipalPublicKey: issuerResolver,
    resolveRequestPublicKey: keyResolver(edge),
    consumeReplay: false
  }), { code: 'signature_verification_failed' });
});

test('principal audience, expiry, and signature drift fail closed', () => {
  const { principal, edge, principalAssertion } = fixture();
  const request = createRequestEnvelope({
    principalAssertion,
    toolName: 'memory_overview',
    toolArguments: { project_context_ref: `pctx_${'b'.repeat(32)}` },
    now: FIXED_NOW,
    requestId: 'req_contract_negative_000001',
    nonce: 'request_nonce_negative_0001',
    signing: signing(edge)
  });
  const options = {
    resolvePrincipalPublicKey: principalKeyResolver(SYNTHETIC_ISSUER, principal),
    resolveRequestPublicKey: keyResolver(edge),
    consumeReplay: false
  };
  assert.throws(() => validateRequestEnvelope(request, {
    ...options,
    now: FIXED_NOW,
    expectedIssuer: SYNTHETIC_ISSUER
  }), { code: 'principal_expected_audience_invalid' });
  assert.throws(() => validateRequestEnvelope(request, {
    ...options,
    now: FIXED_NOW,
    expectedAudience: SYNTHETIC_AUDIENCE
  }), { code: 'principal_expected_issuer_invalid' });
  assert.throws(() => validateRequestEnvelope(request, {
    ...options,
    now: FIXED_NOW,
    expectedIssuer: 'https://wrong-issuer.synthetic.invalid',
    expectedAudience: SYNTHETIC_AUDIENCE
  }), { code: 'principal_issuer_mismatch' });
  assert.throws(() => validateRequestEnvelope(request, {
    ...options,
    now: FIXED_NOW,
    expectedIssuer: SYNTHETIC_ISSUER,
    expectedAudience: 'https://wrong.synthetic.invalid/mcp'
  }), { code: 'principal_audience_mismatch' });
  assert.throws(() => validateRequestEnvelope(request, {
    ...options,
    now: new Date(FIXED_NOW.getTime() + 600_000),
    expectedIssuer: SYNTHETIC_ISSUER,
    expectedAudience: SYNTHETIC_AUDIENCE
  }), { code: 'request_expired' });
  const tampered = structuredClone(request);
  tampered.tool_request.arguments.project_context_ref = `pctx_${'c'.repeat(32)}`;
  assert.throws(() => validateRequestEnvelope(tampered, {
    ...options,
    now: FIXED_NOW,
    expectedIssuer: SYNTHETIC_ISSUER,
    expectedAudience: SYNTHETIC_AUDIENCE
  }), { code: 'signature_verification_failed' });
});

test('project context is opaque, signed, principal-bound, and excludes private visibility', () => {
  const { context, clock, principalAssertion } = fixture();
  const claim = createProjectContextClaim({
    projectContextRef: `pctx_${'d'.repeat(32)}`,
    principalFingerprint: principalAssertion.subject_fingerprint,
    projectId: 'internal-project',
    workspaceId: 'internal-workspace',
    visibilityAllowlist: ['project', 'workspace', 'task_start_context'],
    registryReference: 'registry-v1',
    mappingReference: 'mapping-v1',
    mappingDigest: sha256('mapping'),
    now: clock(),
    nonce: 'context_nonce_contract_0001',
    signing: signing(context)
  });
  assert.equal(validateProjectContextClaim(claim, {
    now: clock(),
    resolvePublicKey: keyResolver(context),
    expectedPrincipalFingerprint: principalAssertion.subject_fingerprint
  }), claim);
  assert.throws(() => validateProjectContextClaim(claim, {
    now: clock(),
    resolvePublicKey: keyResolver(context),
    expectedPrincipalFingerprint: sha256('other')
  }), { code: 'project_context_principal_mismatch' });

  const privateClaim = createProjectContextClaim({
    projectContextRef: `pctx_${'e'.repeat(32)}`,
    principalFingerprint: principalAssertion.subject_fingerprint,
    projectId: 'internal-project',
    workspaceId: 'internal-workspace',
    visibilityAllowlist: ['private'],
    registryReference: 'registry-v1',
    mappingReference: 'mapping-v1',
    mappingDigest: sha256('mapping'),
    now: clock(),
    nonce: 'context_nonce_contract_0002',
    signing: signing(context)
  });
  assert.throws(() => validateProjectContextClaim(privateClaim, {
    now: clock(),
    resolvePublicKey: keyResolver(context)
  }), { code: 'project_context_visibility_invalid' });
});

test('public tool arguments cannot forge scope, mapping, diary, or ownership fields', () => {
  for (const forged of [
    { client_id: 'Codex' },
    { project_id: 'other-project' },
    { mapping_digest: sha256('forged') },
    { nested: { diaryName: 'forbidden' } },
    { trusted_scope: { visibility: 'private' } }
  ]) {
    assert.throws(() => validateToolArguments('search_memory', {
      project_context_ref: `pctx_${'f'.repeat(32)}`,
      query: 'safe synthetic query',
      ...forged
    }), { code: 'tool_authority_argument_forbidden' });
  }
  assert.throws(() => validateToolArguments('search_memory', {
    project_context_ref: `pctx_${'g'.repeat(32)}`,
    query: 'x'.repeat(2001)
  }), { code: 'search_query_invalid' });
  for (const key of ['access_token', 'secret_value', 'provider_response_body', 'raw_memory_excerpt']) {
    assert.throws(() => validatePublicStructuredContent({ [key]: 'synthetic-forbidden-value' }), {
      code: 'public_disclosure_forbidden'
    });
  }
  for (const credentialLikeValue of [
    ['Bearer', 'synthetic_credential_material_1234567890'].join(' '),
    ['sk', 'syntheticCredentialMaterial1234567890'].join('-'),
    ['eyJsyntheticHeader', 'syntheticPayload1234', 'syntheticSignature1234'].join('.')
  ]) {
    assert.throws(() => validatePublicStructuredContent({ summary: credentialLikeValue }), {
      code: 'public_disclosure_forbidden'
    });
  }
  for (const pathLikeValue of [
    '/home/jenn/data/private.sqlite',
    'file=/home/jenn/data/private.sqlite',
    'C:\\Users\\Jenn\\private.sqlite',
    '../data/private.sqlite',
    '\\\\server\\private\\memory.db',
    'file:///home/jenn/data/private.sqlite',
    'sqlite:///home/jenn/data/private.sqlite',
    'vscode://file/C:/Users/Jenn/private.sqlite',
    'vscode-insiders://file/home/jenn/private.sqlite'
  ]) {
    assert.throws(() => validatePublicStructuredContent({ summary: pathLikeValue }), {
      code: 'public_disclosure_forbidden'
    });
  }
  assert.doesNotThrow(() => validatePublicStructuredContent({
    summary: 'See https://example.invalid/docs/memory for public guidance.'
  }));
  assert.doesNotThrow(() => validatePublicStructuredContent({ summary: 'No secret values are included.' }));
});

test('response binds request, counters, receipts, and relay signature', () => {
  const { principal, edge, relay, clock, principalAssertion } = fixture();
  const request = createRequestEnvelope({
    principalAssertion,
    toolName: 'memory_overview',
    toolArguments: { project_context_ref: `pctx_${'h'.repeat(32)}` },
    now: clock(),
    requestId: 'req_response_binding_0000001',
    nonce: 'request_nonce_response_0001',
    signing: signing(edge)
  });
  const response = createResponseEnvelope({
    requestId: request.request_id,
    requestDigest: digestObject(request),
    toolName: 'memory_overview',
    status: 'ok',
    structuredContent: { status: 'empty', kind: 'overview', item_count: 0 },
    counters: ZERO_MEMORY_COUNTERS,
    receiptChain: {
      edge_request: digestObject(request),
      relay: sha256('relay'),
      governance: sha256('governance'),
      context: sha256('context')
    },
    now: clock(),
    responseId: 'res_response_binding_0000001',
    signing: signing(relay)
  });
  assert.equal(validateResponseEnvelope(response, {
    now: clock(),
    resolveResponsePublicKey: keyResolver(relay),
    expectedRequest: request,
    requireZeroCounters: true
  }), response);

  const mismatchedReceipt = createResponseEnvelope({
    requestId: request.request_id,
    requestDigest: digestObject(request),
    toolName: 'memory_overview',
    status: 'ok',
    structuredContent: { status: 'empty', kind: 'overview', item_count: 0 },
    counters: ZERO_MEMORY_COUNTERS,
    receiptChain: {
      edge_request: sha256('different-request'),
      relay: sha256('relay'),
      governance: sha256('governance'),
      context: sha256('context')
    },
    now: clock(),
    responseId: 'res_response_binding_0000002',
    signing: signing(relay)
  });
  assert.throws(() => validateResponseEnvelope(mismatchedReceipt, {
    now: clock(),
    resolveResponsePublicKey: keyResolver(relay),
    requireZeroCounters: true
  }), { code: 'response_receipt_request_mismatch' });

  const invalidStructuredContent = createResponseEnvelope({
    requestId: request.request_id,
    requestDigest: digestObject(request),
    toolName: 'memory_overview',
    status: 'ok',
    structuredContent: { foo: 'bar' },
    counters: ZERO_MEMORY_COUNTERS,
    receiptChain: {
      edge_request: digestObject(request),
      relay: sha256('relay'),
      governance: sha256('governance'),
      context: sha256('context')
    },
    now: clock(),
    responseId: 'res_response_binding_0000003',
    signing: signing(relay)
  });
  assert.throws(() => validateResponseEnvelope(invalidStructuredContent, {
    now: clock(),
    resolveResponsePublicKey: keyResolver(relay),
    expectedRequest: request,
    requireZeroCounters: true
  }), { code: 'response_structured_content_shape_invalid' });

  assert.doesNotThrow(() => validateToolStructuredContent('resolve_memory_context', {
    project_context_ref: `pctx_${'j'.repeat(32)}`,
    safe_project_alias: 'project-alpha',
    expires_at: '2026-07-18T00:05:00.000Z',
    visibility_labels: ['project', 'workspace'],
    context_status: 'resolved'
  }));
  assert.doesNotThrow(() => validateToolStructuredContent(
    'resolve_memory_context',
    { context_status: 'denied' },
    { status: 'denied' }
  ));
  assert.doesNotThrow(() => validateToolStructuredContent(
    'resolve_memory_context',
    { context_status: 'unavailable' },
    { status: 'unavailable' }
  ));
  assert.throws(() => validateToolStructuredContent(
    'resolve_memory_context',
    { context_status: 'resolved' },
    { status: 'denied' }
  ), { code: 'response_context_status_invalid' });
  const deniedContextRequest = createRequestEnvelope({
    principalAssertion,
    toolName: 'resolve_memory_context',
    toolArguments: { project_alias: 'unregistered-project' },
    now: clock(),
    requestId: 'req_denied_context_response_0001',
    nonce: 'request_nonce_denied_context_01',
    signing: signing(edge)
  });
  const deniedContextResponse = createResponseEnvelope({
    requestId: deniedContextRequest.request_id,
    requestDigest: digestObject(deniedContextRequest),
    toolName: 'resolve_memory_context',
    status: 'denied',
    structuredContent: { context_status: 'denied' },
    counters: ZERO_MEMORY_COUNTERS,
    receiptChain: {
      edge_request: digestObject(deniedContextRequest),
      relay: sha256('denied-relay'),
      governance: sha256('denied-governance'),
      context: sha256('denied-context')
    },
    now: clock(),
    responseId: 'res_denied_context_response_0001',
    signing: signing(relay)
  });
  assert.doesNotThrow(() => validateResponseEnvelope(deniedContextResponse, {
    now: clock(),
    resolveResponsePublicKey: keyResolver(relay),
    expectedRequest: deniedContextRequest,
    requireZeroCounters: true
  }));
  assert.doesNotThrow(() => validateToolStructuredContent('search_memory', {
    status: 'ok',
    result_count: 1,
    results: [{ result_ref: `mref_${'r'.repeat(24)}`, summary: 'Synthetic summary', relevance: 0.9 }]
  }));
  for (const status of ['denied', 'unavailable']) {
    assert.doesNotThrow(() => validateToolStructuredContent('search_memory', {
      status,
      result_count: 0,
      results: []
    }, { status }));
    assert.throws(() => validateToolStructuredContent('search_memory', {
      status,
      result_count: 1,
      results: [{ result_ref: `mref_${'r'.repeat(24)}`, summary: 'Stale summary', relevance: 0.9 }]
    }, { status }), { code: 'response_search_results_invalid' });
  }
  assert.throws(() => validateToolStructuredContent('search_memory', {
    status: 'denied', result_count: 0, results: []
  }, { status: 'unavailable' }), { code: 'response_result_status_mismatch' });
  for (const resultRef of ['/home/jenn/private.sqlite', '..\\private.sqlite', '../private.sqlite']) {
    assert.throws(() => validateToolStructuredContent('search_memory', {
      status: 'ok',
      result_count: 1,
      results: [{ result_ref: resultRef, summary: 'Synthetic summary', relevance: 0.9 }]
    }), { code: 'public_disclosure_forbidden' });
  }
  assert.doesNotThrow(() => validateToolStructuredContent('audit_memory', {
    status: 'empty', kind: 'audit', item_count: 0
  }));
  assert.doesNotThrow(() => validateToolStructuredContent('prepare_memory_context', {
    status: 'empty', kind: 'context', item_count: 0
  }));
  assert.doesNotThrow(() => validateToolStructuredContent('memory_overview', {
    status: 'denied', kind: 'overview', item_count: 0
  }, { status: 'denied' }));
  assert.throws(() => validateToolStructuredContent('memory_overview', {
    status: 'denied', kind: 'overview', item_count: 1
  }, { status: 'denied' }), { code: 'response_item_count_invalid' });

  const nonzero = structuredClone(response);
  nonzero.counters.provider_calls = 1;
  assert.throws(() => validateResponseEnvelope(nonzero, {
    now: clock(),
    resolveResponsePublicKey: keyResolver(relay),
    expectedRequest: request,
    requireZeroCounters: true
  }), { code: 'zero_memory_counter_nonzero' });

  const wrongRequest = structuredClone(request);
  wrongRequest.request_id = 'req_response_binding_9999999';
  assert.throws(() => validateResponseEnvelope(response, {
    now: clock(),
    resolveResponsePublicKey: keyResolver(relay),
    expectedRequest: wrongRequest,
    requireZeroCounters: true
  }), { code: 'response_request_id_mismatch' });
  assert.ok(principal.publicKey.asymmetricKeyType === 'ed25519');
  assert.ok(crypto.createHash('sha256'));
});

test('request and response byte ceilings reject oversized signed payloads before invocation', () => {
  const { principal, edge, relay, clock, principalAssertion } = fixture();
  const oversizedRequest = createRequestEnvelope({
    principalAssertion,
    toolName: 'search_memory',
    toolArguments: {
      project_context_ref: `pctx_${'i'.repeat(32)}`,
      query: 'x'.repeat(40_000)
    },
    now: clock(),
    requestId: 'req_oversized_contract_000001',
    nonce: 'request_nonce_oversized_0001',
    signing: signing(edge)
  });
  assert.throws(() => validateRequestEnvelope(oversizedRequest, {
    now: clock(),
    expectedIssuer: SYNTHETIC_ISSUER,
    expectedAudience: SYNTHETIC_AUDIENCE,
    resolvePrincipalPublicKey: principalKeyResolver(SYNTHETIC_ISSUER, principal),
    resolveRequestPublicKey: keyResolver(edge),
    consumeReplay: false
  }), { code: 'request_envelope_too_large' });

  const requestDigest = digestObject(oversizedRequest);
  const oversizedResponse = createResponseEnvelope({
    requestId: oversizedRequest.request_id,
    requestDigest,
    toolName: 'search_memory',
    status: 'ok',
    structuredContent: { status: 'ok', summary: 'x'.repeat(70_000) },
    counters: ZERO_MEMORY_COUNTERS,
    receiptChain: {
      edge_request: requestDigest,
      relay: sha256('relay'),
      governance: sha256('governance'),
      context: sha256('context')
    },
    now: clock(),
    responseId: 'res_oversized_contract_000001',
    signing: signing(relay)
  });
  assert.throws(() => validateResponseEnvelope(oversizedResponse, {
    now: clock(),
    resolveResponsePublicKey: keyResolver(relay),
    expectedRequest: oversizedRequest,
    requireZeroCounters: true
  }), { code: 'response_envelope_too_large' });
});
