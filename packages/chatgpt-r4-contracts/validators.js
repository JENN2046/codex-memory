'use strict';

const {
  ARCHITECTURE_REFERENCE,
  SCHEMA_VERSION,
  KINDS,
  DATA_TOOL_NAMES,
  CONTEXT_VISIBILITIES,
  ZERO_MEMORY_COUNTER_KEYS,
  LIMITS,
  FORBIDDEN_AUTHORITY_KEYS,
  FORBIDDEN_PUBLIC_DISCLOSURE_KEYS
} = require('./constants');
const { isPlainObject, canonicalJson, digestObject, utf8ByteLength, normalizeKey } = require('./canonical');
const { verifySignedObject } = require('./signatures');
const { reject } = require('./errors');

const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const CONTEXT_REF_PATTERN = /^pctx_[A-Za-z0-9_-]{32,96}$/u;
const REQUEST_ID_PATTERN = /^req_[A-Za-z0-9_-]{24,96}$/u;
const RESPONSE_ID_PATTERN = /^res_[A-Za-z0-9_-]{24,96}$/u;
const FORBIDDEN_PUBLIC_VALUE_PATTERNS = Object.freeze([
  /\bBearer\s+[A-Za-z0-9._~+/-]{16,}\b/iu,
  /\b(?:sk|rk)-(?:proj-)?[A-Za-z0-9_-]{16,}\b/u,
  /\bAKIA[0-9A-Z]{16}\b/u,
  /\bgh(?:p|o|u|s|r)_[A-Za-z0-9]{20,}\b/u,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/u,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/u,
  /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/u
]);

function assertPlainObject(value, code) {
  if (!isPlainObject(value)) reject(code);
}

function assertExactKeys(value, expected, code) {
  assertPlainObject(value, code);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    reject(code);
  }
}

function assertString(value, { code, min = 1, max = 2000, pattern } = {}) {
  if (typeof value !== 'string' || value.length < min || value.length > max || value.trim() !== value) {
    reject(code || 'string_invalid');
  }
  if (pattern && !pattern.test(value)) reject(code || 'string_invalid');
  return value;
}

function assertHttpsUri(value, code) {
  assertString(value, { code, max: 2048 });
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    reject(code);
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) reject(code);
}

function parseTime(value, code) {
  assertString(value, { code, max: 40 });
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) reject(code);
  return parsed;
}

function validateTemporal({ issuedAt, expiresAt, now = new Date(), maxTtlSeconds, prefix }) {
  const issuedMs = parseTime(issuedAt, `${prefix}_issued_at_invalid`);
  const expiresMs = parseTime(expiresAt, `${prefix}_expires_at_invalid`);
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const skewMs = LIMITS.maxClockSkewSeconds * 1000;
  if (!Number.isFinite(nowMs)) reject(`${prefix}_clock_invalid`);
  if (expiresMs <= issuedMs) reject(`${prefix}_ttl_invalid`);
  if (expiresMs - issuedMs > maxTtlSeconds * 1000) reject(`${prefix}_ttl_exceeded`);
  if (issuedMs > nowMs + skewMs) reject(`${prefix}_not_yet_valid`);
  if (expiresMs <= nowMs - skewMs) reject(`${prefix}_expired`);
}

function validateSignatureShape(signature) {
  assertExactKeys(signature, ['algorithm', 'key_id', 'value'], 'signature_shape_invalid');
  if (signature.algorithm !== 'Ed25519') reject('signature_algorithm_invalid');
  assertString(signature.key_id, { code: 'signature_key_id_invalid', max: 80 });
  assertString(signature.value, {
    code: 'signature_value_invalid',
    max: 256,
    pattern: /^[A-Za-z0-9_-]+$/u
  });
}

function assertNoNormalizedKeys(value, forbiddenKeys, code, depth = 0) {
  if (depth > 16) reject(`${code}_depth_exceeded`);
  if (Array.isArray(value)) {
    for (const item of value) assertNoNormalizedKeys(item, forbiddenKeys, code, depth + 1);
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = normalizeKey(key);
    if (forbiddenKeys.some(forbiddenKey => normalizedKey.includes(forbiddenKey))) reject(code);
    assertNoNormalizedKeys(child, forbiddenKeys, code, depth + 1);
  }
}

function assertNoForbiddenStringValues(value, code, depth = 0) {
  if (depth > 16) reject(`${code}_depth_exceeded`);
  if (typeof value === 'string') {
    if (FORBIDDEN_PUBLIC_VALUE_PATTERNS.some(pattern => pattern.test(value))) reject(code);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) assertNoForbiddenStringValues(item, code, depth + 1);
    return;
  }
  if (!isPlainObject(value)) return;
  for (const child of Object.values(value)) assertNoForbiddenStringValues(child, code, depth + 1);
}

function validatePrincipalAssertion(assertion, {
  now = new Date(),
  resolvePublicKey,
  expectedAudience,
  requiredScopes = ['memory.read']
} = {}) {
  assertExactKeys(assertion, [
    'schema_version', 'kind', 'architecture_reference', 'issuer', 'audience',
    'subject_fingerprint', 'scopes', 'oauth_version', 'pkce_method',
    'issued_at', 'expires_at', 'nonce', 'signature'
  ], 'principal_assertion_shape_invalid');
  if (assertion.schema_version !== SCHEMA_VERSION) reject('principal_schema_version_invalid');
  if (assertion.kind !== KINDS.principalAssertion) reject('principal_kind_invalid');
  if (assertion.architecture_reference !== ARCHITECTURE_REFERENCE) reject('principal_architecture_invalid');
  assertHttpsUri(assertion.issuer, 'principal_issuer_invalid');
  assertHttpsUri(assertion.audience, 'principal_audience_invalid');
  if (expectedAudience && assertion.audience !== expectedAudience) reject('principal_audience_mismatch');
  assertString(assertion.subject_fingerprint, {
    code: 'principal_fingerprint_invalid',
    max: 71,
    pattern: DIGEST_PATTERN
  });
  if (!Array.isArray(assertion.scopes) || assertion.scopes.length < 1 || new Set(assertion.scopes).size !== assertion.scopes.length) {
    reject('principal_scopes_invalid');
  }
  for (const scope of assertion.scopes) assertString(scope, { code: 'principal_scope_invalid', max: 120 });
  for (const required of requiredScopes) {
    if (!assertion.scopes.includes(required)) reject('principal_scope_missing');
  }
  if (assertion.oauth_version !== '2.1') reject('principal_oauth_version_invalid');
  if (assertion.pkce_method !== 'S256') reject('principal_pkce_method_invalid');
  assertString(assertion.nonce, { code: 'principal_nonce_invalid', min: 16, max: 120 });
  validateTemporal({
    issuedAt: assertion.issued_at,
    expiresAt: assertion.expires_at,
    now,
    maxTtlSeconds: LIMITS.maxAssertionTtlSeconds,
    prefix: 'principal'
  });
  validateSignatureShape(assertion.signature);
  verifySignedObject(assertion, { resolvePublicKey });
  return assertion;
}

function validateProjectContextReference(value) {
  return assertString(value, {
    code: 'project_context_ref_invalid',
    min: 37,
    max: 101,
    pattern: CONTEXT_REF_PATTERN
  });
}

function validateProjectContextClaim(claim, {
  now = new Date(),
  resolvePublicKey,
  expectedPrincipalFingerprint,
  expectedContextRef
} = {}) {
  assertExactKeys(claim, [
    'schema_version', 'kind', 'architecture_reference', 'project_context_ref',
    'principal_fingerprint', 'client_id', 'project_id', 'workspace_id',
    'visibility_allowlist', 'registry_reference', 'mapping_reference',
    'mapping_digest', 'issued_at', 'expires_at', 'nonce', 'signature'
  ], 'project_context_claim_shape_invalid');
  if (claim.schema_version !== SCHEMA_VERSION) reject('project_context_schema_version_invalid');
  if (claim.kind !== KINDS.projectContextClaim) reject('project_context_kind_invalid');
  if (claim.architecture_reference !== ARCHITECTURE_REFERENCE) reject('project_context_architecture_invalid');
  validateProjectContextReference(claim.project_context_ref);
  if (expectedContextRef && claim.project_context_ref !== expectedContextRef) reject('project_context_ref_mismatch');
  assertString(claim.principal_fingerprint, {
    code: 'project_context_principal_invalid',
    max: 71,
    pattern: DIGEST_PATTERN
  });
  if (expectedPrincipalFingerprint && claim.principal_fingerprint !== expectedPrincipalFingerprint) {
    reject('project_context_principal_mismatch');
  }
  if (claim.client_id !== 'ChatGPT') reject('project_context_client_invalid');
  assertString(claim.project_id, { code: 'project_context_project_invalid', max: 160 });
  assertString(claim.workspace_id, { code: 'project_context_workspace_invalid', max: 160 });
  if (!Array.isArray(claim.visibility_allowlist) || claim.visibility_allowlist.length < 1 ||
      new Set(claim.visibility_allowlist).size !== claim.visibility_allowlist.length ||
      claim.visibility_allowlist.some(value => !CONTEXT_VISIBILITIES.includes(value))) {
    reject('project_context_visibility_invalid');
  }
  assertString(claim.registry_reference, { code: 'project_context_registry_invalid', max: 160 });
  assertString(claim.mapping_reference, { code: 'project_context_mapping_reference_invalid', max: 160 });
  assertString(claim.mapping_digest, { code: 'project_context_mapping_digest_invalid', max: 71, pattern: DIGEST_PATTERN });
  assertString(claim.nonce, { code: 'project_context_nonce_invalid', min: 16, max: 120 });
  validateTemporal({
    issuedAt: claim.issued_at,
    expiresAt: claim.expires_at,
    now,
    maxTtlSeconds: LIMITS.maxContextTtlSeconds,
    prefix: 'project_context'
  });
  validateSignatureShape(claim.signature);
  verifySignedObject(claim, { resolvePublicKey });
  return claim;
}

function validateToolArguments(name, args) {
  assertPlainObject(args, 'tool_arguments_invalid');
  if (utf8ByteLength(args) > LIMITS.maxToolArgumentsBytes) reject('tool_arguments_too_large');
  assertNoNormalizedKeys(args, FORBIDDEN_AUTHORITY_KEYS, 'tool_authority_argument_forbidden');

  const definitions = {
    resolve_memory_context: { required: ['project_alias'], optional: ['requested_visibility'] },
    memory_overview: { required: ['project_context_ref'], optional: [] },
    search_memory: { required: ['project_context_ref', 'query'], optional: ['limit'] },
    audit_memory: { required: ['project_context_ref'], optional: ['event_limit'] },
    prepare_memory_context: { required: ['project_context_ref'], optional: ['task_summary'] }
  };
  const definition = definitions[name];
  if (!definition) reject('tool_name_invalid');
  const allowed = [...definition.required, ...definition.optional].sort();
  const actual = Object.keys(args).sort();
  if (actual.some(key => !allowed.includes(key)) || definition.required.some(key => !Object.hasOwn(args, key))) {
    reject('tool_arguments_shape_invalid');
  }

  if (name === 'resolve_memory_context') {
    assertString(args.project_alias, {
      code: 'project_alias_invalid',
      max: LIMITS.maxProjectAliasCharacters,
      pattern: /^[A-Za-z0-9][A-Za-z0-9._-]*$/u
    });
    if (args.requested_visibility !== undefined && !CONTEXT_VISIBILITIES.includes(args.requested_visibility)) {
      reject('requested_visibility_invalid');
    }
  } else {
    validateProjectContextReference(args.project_context_ref);
  }
  if (name === 'search_memory') {
    assertString(args.query, { code: 'search_query_invalid', max: LIMITS.maxQueryCharacters });
    if (args.limit !== undefined && (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > LIMITS.maxResultLimit)) {
      reject('search_limit_invalid');
    }
  }
  if (name === 'audit_memory' && args.event_limit !== undefined &&
      (!Number.isInteger(args.event_limit) || args.event_limit < 1 || args.event_limit > LIMITS.maxResultLimit)) {
    reject('audit_event_limit_invalid');
  }
  if (name === 'prepare_memory_context' && args.task_summary !== undefined) {
    assertString(args.task_summary, { code: 'task_summary_invalid', max: LIMITS.maxQueryCharacters });
  }
  return args;
}

function validateToolRequest(toolRequest) {
  assertExactKeys(toolRequest, ['name', 'arguments'], 'tool_request_shape_invalid');
  if (!DATA_TOOL_NAMES.includes(toolRequest.name)) reject('tool_name_invalid');
  validateToolArguments(toolRequest.name, toolRequest.arguments);
  return toolRequest;
}

function validateRequestEnvelope(envelope, {
  now = new Date(),
  resolveRequestPublicKey,
  resolvePrincipalPublicKey,
  expectedAudience,
  replayGuard,
  consumeReplay = true
} = {}) {
  if (utf8ByteLength(envelope) > LIMITS.maxRequestBytes) reject('request_envelope_too_large');
  assertExactKeys(envelope, [
    'schema_version', 'kind', 'architecture_reference', 'request_id',
    'issued_at', 'expires_at', 'nonce', 'principal_assertion', 'tool_request',
    'signature'
  ], 'request_envelope_shape_invalid');
  if (envelope.schema_version !== SCHEMA_VERSION) reject('request_schema_version_invalid');
  if (envelope.kind !== KINDS.requestEnvelope) reject('request_kind_invalid');
  if (envelope.architecture_reference !== ARCHITECTURE_REFERENCE) reject('request_architecture_invalid');
  assertString(envelope.request_id, { code: 'request_id_invalid', max: 100, pattern: REQUEST_ID_PATTERN });
  assertString(envelope.nonce, { code: 'request_nonce_invalid', min: 16, max: 120 });
  validateTemporal({
    issuedAt: envelope.issued_at,
    expiresAt: envelope.expires_at,
    now,
    maxTtlSeconds: LIMITS.maxEnvelopeTtlSeconds,
    prefix: 'request'
  });
  validatePrincipalAssertion(envelope.principal_assertion, {
    now,
    resolvePublicKey: resolvePrincipalPublicKey,
    expectedAudience
  });
  validateToolRequest(envelope.tool_request);
  validateSignatureShape(envelope.signature);
  verifySignedObject(envelope, { resolvePublicKey: resolveRequestPublicKey });
  if (consumeReplay) {
    if (!replayGuard || typeof replayGuard.consumeMany !== 'function') reject('request_replay_guard_missing');
    replayGuard.consumeMany([
      { namespace: 'edge_request_id', key: envelope.request_id, expiresAt: envelope.expires_at },
      { namespace: 'edge_request_nonce', key: envelope.nonce, expiresAt: envelope.expires_at }
    ]);
  }
  return {
    envelope,
    requestDigest: digestObject(envelope),
    principalFingerprint: envelope.principal_assertion.subject_fingerprint
  };
}

function validateCounters(counters, { requireZero = false } = {}) {
  assertExactKeys(counters, ZERO_MEMORY_COUNTER_KEYS, 'counter_shape_invalid');
  for (const key of ZERO_MEMORY_COUNTER_KEYS) {
    if (!Number.isInteger(counters[key]) || counters[key] < 0) reject('counter_value_invalid');
    if (requireZero && counters[key] !== 0) reject('zero_memory_counter_nonzero');
  }
  return counters;
}

function validateReceiptChain(receiptChain) {
  const keys = ['edge_request', 'relay', 'governance', 'context'];
  assertExactKeys(receiptChain, keys, 'receipt_chain_shape_invalid');
  for (const key of keys) {
    assertString(receiptChain[key], { code: 'receipt_digest_invalid', max: 71, pattern: DIGEST_PATTERN });
  }
  return receiptChain;
}

function validatePublicStructuredContent(content) {
  assertPlainObject(content, 'structured_content_invalid');
  if (utf8ByteLength(content) > LIMITS.maxStructuredContentBytes) reject('structured_content_too_large');
  assertNoNormalizedKeys(content, FORBIDDEN_PUBLIC_DISCLOSURE_KEYS, 'public_disclosure_forbidden');
  assertNoForbiddenStringValues(content, 'public_disclosure_forbidden');
  return content;
}

function validateToolStructuredContent(toolName, content) {
  validatePublicStructuredContent(content);
  if (toolName === 'resolve_memory_context') {
    assertExactKeys(content, [
      'project_context_ref', 'safe_project_alias', 'expires_at',
      'visibility_labels', 'context_status'
    ], 'response_structured_content_shape_invalid');
    validateProjectContextReference(content.project_context_ref);
    assertString(content.safe_project_alias, {
      code: 'response_project_alias_invalid',
      max: LIMITS.maxProjectAliasCharacters,
      pattern: /^[A-Za-z0-9][A-Za-z0-9._-]*$/u
    });
    parseTime(content.expires_at, 'response_context_expiry_invalid');
    validateVisibilityLabels(content.visibility_labels, 'response_visibility_labels_invalid');
    if (content.context_status !== 'resolved') reject('response_context_status_invalid');
    return content;
  }

  if (toolName === 'search_memory') {
    assertExactKeys(content, ['status', 'result_count', 'results'], 'response_structured_content_shape_invalid');
    assertString(content.status, { code: 'response_result_status_invalid', max: 80 });
    if (!Number.isInteger(content.result_count) || content.result_count < 0 ||
        content.result_count > LIMITS.maxResultLimit || !Array.isArray(content.results) ||
        content.results.length !== content.result_count || content.results.length > LIMITS.maxResultLimit) {
      reject('response_search_results_invalid');
    }
    for (const result of content.results) {
      assertExactKeys(result, ['result_ref', 'summary', 'relevance'], 'response_search_result_shape_invalid');
      assertString(result.result_ref, { code: 'response_result_ref_invalid', max: 160 });
      assertString(result.summary, { code: 'response_result_summary_invalid', max: 4000 });
      if (typeof result.relevance !== 'number' || !Number.isFinite(result.relevance) ||
          result.relevance < 0 || result.relevance > 1) {
        reject('response_result_relevance_invalid');
      }
    }
    return content;
  }

  const kindByTool = {
    memory_overview: 'overview',
    audit_memory: 'audit',
    prepare_memory_context: 'context'
  };
  const expectedKind = kindByTool[toolName];
  if (!expectedKind) reject('response_tool_name_invalid');
  assertExactKeys(content, ['status', 'kind', 'item_count'], 'response_structured_content_shape_invalid');
  assertString(content.status, { code: 'response_result_status_invalid', max: 80 });
  if (content.kind !== expectedKind) reject('response_result_kind_invalid');
  if (!Number.isInteger(content.item_count) || content.item_count < 0 ||
      content.item_count > LIMITS.maxResultLimit) {
    reject('response_item_count_invalid');
  }
  return content;
}

function validateVisibilityLabels(labels, code) {
  if (!Array.isArray(labels) || labels.length < 1 ||
      new Set(labels).size !== labels.length ||
      labels.some(value => !CONTEXT_VISIBILITIES.includes(value))) {
    reject(code);
  }
}

function validateResponseEnvelope(envelope, {
  now = new Date(),
  resolveResponsePublicKey,
  expectedRequest,
  requireZeroCounters = false
} = {}) {
  if (utf8ByteLength(envelope) > LIMITS.maxResponseBytes) reject('response_envelope_too_large');
  assertExactKeys(envelope, [
    'schema_version', 'kind', 'architecture_reference', 'response_id',
    'request_id', 'request_digest', 'tool_name', 'status', 'issued_at',
    'expires_at', 'structured_content', 'counters', 'receipt_chain', 'signature'
  ], 'response_envelope_shape_invalid');
  if (envelope.schema_version !== SCHEMA_VERSION) reject('response_schema_version_invalid');
  if (envelope.kind !== KINDS.responseEnvelope) reject('response_kind_invalid');
  if (envelope.architecture_reference !== ARCHITECTURE_REFERENCE) reject('response_architecture_invalid');
  assertString(envelope.response_id, { code: 'response_id_invalid', max: 100, pattern: RESPONSE_ID_PATTERN });
  assertString(envelope.request_id, { code: 'response_request_id_invalid', max: 100, pattern: REQUEST_ID_PATTERN });
  assertString(envelope.request_digest, { code: 'response_request_digest_invalid', max: 71, pattern: DIGEST_PATTERN });
  if (!DATA_TOOL_NAMES.includes(envelope.tool_name)) reject('response_tool_name_invalid');
  if (!['ok', 'denied', 'unavailable'].includes(envelope.status)) reject('response_status_invalid');
  validateTemporal({
    issuedAt: envelope.issued_at,
    expiresAt: envelope.expires_at,
    now,
    maxTtlSeconds: LIMITS.maxEnvelopeTtlSeconds,
    prefix: 'response'
  });
  validateToolStructuredContent(envelope.tool_name, envelope.structured_content);
  validateCounters(envelope.counters, { requireZero: requireZeroCounters });
  validateReceiptChain(envelope.receipt_chain);
  if (envelope.receipt_chain.edge_request !== envelope.request_digest) {
    reject('response_receipt_request_mismatch');
  }
  validateSignatureShape(envelope.signature);
  verifySignedObject(envelope, { resolvePublicKey: resolveResponsePublicKey });

  if (expectedRequest) {
    if (envelope.request_id !== expectedRequest.request_id) reject('response_request_id_mismatch');
    if (envelope.request_digest !== digestObject(expectedRequest)) reject('response_request_digest_mismatch');
    if (envelope.tool_name !== expectedRequest.tool_request?.name) reject('response_tool_name_mismatch');
  }
  return envelope;
}

function validateWidgetDto(dto) {
  assertExactKeys(dto, [
    'schema_version', 'safe_project_alias', 'context_status', 'expires_at',
    'visibility_labels', 'receipt_status'
  ], 'widget_dto_shape_invalid');
  if (dto.schema_version !== SCHEMA_VERSION) reject('widget_dto_schema_version_invalid');
  assertString(dto.safe_project_alias, {
    code: 'widget_project_alias_invalid',
    max: LIMITS.maxProjectAliasCharacters,
    pattern: /^[A-Za-z0-9][A-Za-z0-9._-]*$/u
  });
  if (!['resolved', 'missing', 'expired', 'denied'].includes(dto.context_status)) reject('widget_context_status_invalid');
  if (dto.expires_at !== null) parseTime(dto.expires_at, 'widget_expiry_invalid');
  if (!Array.isArray(dto.visibility_labels) || new Set(dto.visibility_labels).size !== dto.visibility_labels.length ||
      dto.visibility_labels.some(value => !CONTEXT_VISIBILITIES.includes(value))) {
    reject('widget_visibility_labels_invalid');
  }
  if (!['bound', 'not_available', 'invalid'].includes(dto.receipt_status)) reject('widget_receipt_status_invalid');
  assertNoNormalizedKeys(dto, FORBIDDEN_PUBLIC_DISCLOSURE_KEYS, 'widget_public_disclosure_forbidden');
  assertNoForbiddenStringValues(dto, 'widget_public_disclosure_forbidden');
  return dto;
}

module.exports = {
  DIGEST_PATTERN,
  CONTEXT_REF_PATTERN,
  FORBIDDEN_PUBLIC_VALUE_PATTERNS,
  assertExactKeys,
  assertNoNormalizedKeys,
  assertNoForbiddenStringValues,
  validatePrincipalAssertion,
  validateProjectContextReference,
  validateProjectContextClaim,
  validateToolArguments,
  validateToolRequest,
  validateRequestEnvelope,
  validateCounters,
  validateReceiptChain,
  validatePublicStructuredContent,
  validateToolStructuredContent,
  validateResponseEnvelope,
  validateWidgetDto
};
