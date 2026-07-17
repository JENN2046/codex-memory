'use strict';

const crypto = require('node:crypto');
const {
  ARCHITECTURE_REFERENCE,
  KINDS,
  SCHEMA_VERSION,
  LIMITS
} = require('./constants');
const { signObject } = require('./signatures');

function toDate(value) {
  return value instanceof Date ? new Date(value.getTime()) : new Date(value);
}

function timestamp(value) {
  return toDate(value).toISOString();
}

function addSeconds(value, seconds) {
  return new Date(toDate(value).getTime() + (seconds * 1000));
}

function createOpaqueId(prefix, randomBytes = crypto.randomBytes, byteCount = 24) {
  return `${prefix}${randomBytes(byteCount).toString('base64url')}`;
}

function createPrincipalAssertion({
  issuer,
  audience,
  subjectFingerprint,
  scopes = ['memory.read'],
  now = new Date(),
  ttlSeconds = LIMITS.maxAssertionTtlSeconds,
  nonce,
  signing
}) {
  return signObject({
    schema_version: SCHEMA_VERSION,
    kind: KINDS.principalAssertion,
    architecture_reference: ARCHITECTURE_REFERENCE,
    issuer,
    audience,
    subject_fingerprint: subjectFingerprint,
    scopes: [...new Set(scopes)].sort(),
    oauth_version: '2.1',
    pkce_method: 'S256',
    issued_at: timestamp(now),
    expires_at: timestamp(addSeconds(now, ttlSeconds)),
    nonce: nonce || createOpaqueId('pn_', signing?.randomBytes, 18)
  }, signing);
}

function createProjectContextClaim({
  projectContextRef,
  principalFingerprint,
  projectId,
  workspaceId,
  visibilityAllowlist,
  registryReference,
  mappingReference,
  mappingDigest,
  now = new Date(),
  ttlSeconds = LIMITS.maxContextTtlSeconds,
  nonce,
  signing
}) {
  return signObject({
    schema_version: SCHEMA_VERSION,
    kind: KINDS.projectContextClaim,
    architecture_reference: ARCHITECTURE_REFERENCE,
    project_context_ref: projectContextRef,
    principal_fingerprint: principalFingerprint,
    client_id: 'ChatGPT',
    project_id: projectId,
    workspace_id: workspaceId,
    visibility_allowlist: [...new Set(visibilityAllowlist)].sort(),
    registry_reference: registryReference,
    mapping_reference: mappingReference,
    mapping_digest: mappingDigest,
    issued_at: timestamp(now),
    expires_at: timestamp(addSeconds(now, ttlSeconds)),
    nonce: nonce || createOpaqueId('cn_', signing?.randomBytes, 18)
  }, signing);
}

function createRequestEnvelope({
  principalAssertion,
  toolName,
  toolArguments,
  now = new Date(),
  ttlSeconds = LIMITS.maxEnvelopeTtlSeconds,
  requestId,
  nonce,
  signing
}) {
  return signObject({
    schema_version: SCHEMA_VERSION,
    kind: KINDS.requestEnvelope,
    architecture_reference: ARCHITECTURE_REFERENCE,
    request_id: requestId || createOpaqueId('req_', signing?.randomBytes),
    issued_at: timestamp(now),
    expires_at: timestamp(addSeconds(now, ttlSeconds)),
    nonce: nonce || createOpaqueId('rn_', signing?.randomBytes, 18),
    principal_assertion: principalAssertion,
    tool_request: {
      name: toolName,
      arguments: toolArguments
    }
  }, signing);
}

function createResponseEnvelope({
  requestId,
  requestDigest,
  toolName,
  status,
  structuredContent,
  counters,
  receiptChain,
  now = new Date(),
  ttlSeconds = LIMITS.maxEnvelopeTtlSeconds,
  responseId,
  signing
}) {
  return signObject({
    schema_version: SCHEMA_VERSION,
    kind: KINDS.responseEnvelope,
    architecture_reference: ARCHITECTURE_REFERENCE,
    response_id: responseId || createOpaqueId('res_', signing?.randomBytes),
    request_id: requestId,
    request_digest: requestDigest,
    tool_name: toolName,
    status,
    issued_at: timestamp(now),
    expires_at: timestamp(addSeconds(now, ttlSeconds)),
    structured_content: structuredContent,
    counters: { ...counters },
    receipt_chain: { ...receiptChain }
  }, signing);
}

module.exports = {
  timestamp,
  addSeconds,
  createOpaqueId,
  createPrincipalAssertion,
  createProjectContextClaim,
  createRequestEnvelope,
  createResponseEnvelope
};
