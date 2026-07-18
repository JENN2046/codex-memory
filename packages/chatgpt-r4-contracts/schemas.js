'use strict';

const { deepFreeze } = require('./canonical');
const {
  ARCHITECTURE_REFERENCE,
  CONTEXT_VISIBILITIES,
  DATA_TOOL_NAMES,
  KINDS,
  LIMITS,
  SCHEMA_VERSION,
  ZERO_MEMORY_COUNTER_KEYS
} = require('./constants');

const projectContextReference = {
  type: 'string',
  pattern: '^pctx_[A-Za-z0-9_-]{32,96}$'
};

function exactArguments({ required, properties }) {
  return {
    type: 'object',
    additionalProperties: false,
    required,
    properties
  };
}

function toolRequest(name, argumentsSchema) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'arguments'],
    properties: {
      name: { const: name },
      arguments: argumentsSchema
    }
  };
}

const toolRequestVariants = [
  toolRequest('resolve_memory_context', exactArguments({
    required: ['project_alias'],
    properties: {
      project_alias: {
        type: 'string',
        minLength: 1,
        maxLength: LIMITS.maxProjectAliasCharacters,
        pattern: '^[A-Za-z0-9][A-Za-z0-9._-]*$'
      },
      requested_visibility: { enum: CONTEXT_VISIBILITIES }
    }
  })),
  toolRequest('memory_overview', exactArguments({
    required: ['project_context_ref'],
    properties: { project_context_ref: projectContextReference }
  })),
  toolRequest('search_memory', exactArguments({
    required: ['project_context_ref', 'query'],
    properties: {
      project_context_ref: projectContextReference,
      query: { type: 'string', minLength: 1, maxLength: LIMITS.maxQueryCharacters },
      limit: { type: 'integer', minimum: 1, maximum: LIMITS.maxResultLimit }
    }
  })),
  toolRequest('audit_memory', exactArguments({
    required: ['project_context_ref'],
    properties: {
      project_context_ref: projectContextReference,
      event_limit: { type: 'integer', minimum: 1, maximum: LIMITS.maxResultLimit }
    }
  })),
  toolRequest('prepare_memory_context', exactArguments({
    required: ['project_context_ref'],
    properties: {
      project_context_ref: projectContextReference,
      task_summary: { type: 'string', minLength: 1, maxLength: LIMITS.maxQueryCharacters }
    }
  }))
];

const signature = {
  type: 'object',
  additionalProperties: false,
  required: ['algorithm', 'key_id', 'value'],
  properties: {
    algorithm: { const: 'Ed25519' },
    key_id: { type: 'string', minLength: 1, maxLength: 80 },
    value: { type: 'string', pattern: '^[A-Za-z0-9_-]+$' }
  }
};

const PRINCIPAL_ASSERTION_SCHEMA = deepFreeze({
  $id: 'codex-memory://chatgpt-r4/principal-assertion-v1',
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version', 'kind', 'architecture_reference', 'issuer', 'audience',
    'subject_fingerprint', 'scopes', 'oauth_version', 'pkce_method',
    'issued_at', 'expires_at', 'nonce', 'signature'
  ],
  properties: {
    schema_version: { const: SCHEMA_VERSION },
    kind: { const: KINDS.principalAssertion },
    architecture_reference: { const: ARCHITECTURE_REFERENCE },
    issuer: { type: 'string', format: 'uri' },
    audience: { type: 'string', format: 'uri' },
    subject_fingerprint: { type: 'string', pattern: '^sha256:[a-f0-9]{64}$' },
    scopes: { type: 'array', minItems: 1, uniqueItems: true, items: { type: 'string' } },
    oauth_version: { const: '2.1' },
    pkce_method: { const: 'S256' },
    issued_at: { type: 'string', format: 'date-time' },
    expires_at: { type: 'string', format: 'date-time' },
    nonce: { type: 'string', minLength: 16, maxLength: 120 },
    signature
  }
});

const PROJECT_CONTEXT_CLAIM_SCHEMA = deepFreeze({
  $id: 'codex-memory://chatgpt-r4/project-context-claim-v1',
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version', 'kind', 'architecture_reference', 'project_context_ref',
    'principal_fingerprint', 'client_id', 'project_id', 'workspace_id',
    'visibility_allowlist', 'registry_reference', 'mapping_reference',
    'mapping_digest', 'issued_at', 'expires_at', 'nonce', 'signature'
  ],
  properties: {
    schema_version: { const: SCHEMA_VERSION },
    kind: { const: KINDS.projectContextClaim },
    architecture_reference: { const: ARCHITECTURE_REFERENCE },
    project_context_ref: { type: 'string', pattern: '^pctx_[A-Za-z0-9_-]{32,96}$' },
    principal_fingerprint: { type: 'string', pattern: '^sha256:[a-f0-9]{64}$' },
    client_id: { const: 'ChatGPT' },
    project_id: { type: 'string', minLength: 1, maxLength: 160 },
    workspace_id: { type: 'string', minLength: 1, maxLength: 160 },
    visibility_allowlist: {
      type: 'array',
      minItems: 1,
      uniqueItems: true,
      items: { enum: ['project', 'workspace', 'shared', 'task_start_context'] }
    },
    registry_reference: { type: 'string', minLength: 1, maxLength: 160 },
    mapping_reference: { type: 'string', minLength: 1, maxLength: 160 },
    mapping_digest: { type: 'string', pattern: '^sha256:[a-f0-9]{64}$' },
    issued_at: { type: 'string', format: 'date-time' },
    expires_at: { type: 'string', format: 'date-time' },
    nonce: { type: 'string', minLength: 16, maxLength: 120 },
    signature
  }
});

const REQUEST_ENVELOPE_SCHEMA = deepFreeze({
  $id: 'codex-memory://chatgpt-r4/edge-request-envelope-v1',
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version', 'kind', 'architecture_reference', 'request_id',
    'issued_at', 'expires_at', 'nonce', 'principal_assertion', 'tool_request',
    'signature'
  ],
  properties: {
    schema_version: { const: SCHEMA_VERSION },
    kind: { const: KINDS.requestEnvelope },
    architecture_reference: { const: ARCHITECTURE_REFERENCE },
    request_id: { type: 'string', pattern: '^req_[A-Za-z0-9_-]{24,96}$' },
    issued_at: { type: 'string', format: 'date-time' },
    expires_at: { type: 'string', format: 'date-time' },
    nonce: { type: 'string', minLength: 16, maxLength: 120 },
    principal_assertion: PRINCIPAL_ASSERTION_SCHEMA,
    tool_request: { oneOf: toolRequestVariants },
    signature
  }
});

const RESPONSE_ENVELOPE_SCHEMA = deepFreeze({
  $id: 'codex-memory://chatgpt-r4/edge-response-envelope-v1',
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version', 'kind', 'architecture_reference', 'response_id',
    'request_id', 'request_digest', 'tool_name', 'status', 'issued_at',
    'expires_at', 'structured_content', 'counters', 'receipt_chain', 'signature'
  ],
  properties: {
    schema_version: { const: SCHEMA_VERSION },
    kind: { const: KINDS.responseEnvelope },
    architecture_reference: { const: ARCHITECTURE_REFERENCE },
    response_id: { type: 'string', pattern: '^res_[A-Za-z0-9_-]{24,96}$' },
    request_id: { type: 'string' },
    request_digest: { type: 'string', pattern: '^sha256:[a-f0-9]{64}$' },
    tool_name: { enum: DATA_TOOL_NAMES },
    status: { enum: ['ok', 'denied', 'unavailable'] },
    issued_at: { type: 'string', format: 'date-time' },
    expires_at: { type: 'string', format: 'date-time' },
    structured_content: { type: 'object' },
    counters: {
      type: 'object',
      additionalProperties: false,
      required: ZERO_MEMORY_COUNTER_KEYS,
      properties: Object.fromEntries(ZERO_MEMORY_COUNTER_KEYS.map(key => [key, { type: 'integer', minimum: 0 }]))
    },
    receipt_chain: {
      type: 'object',
      additionalProperties: false,
      required: ['edge_request', 'relay', 'governance', 'context'],
      properties: Object.fromEntries(['edge_request', 'relay', 'governance', 'context'].map(key => [key, {
        type: 'string', pattern: '^sha256:[a-f0-9]{64}$'
      }]))
    },
    signature
  }
});

const WIDGET_DTO_SCHEMA = deepFreeze({
  $id: 'codex-memory://chatgpt-r4/memory-scope-widget-dto-v1',
  type: 'object',
  additionalProperties: false,
  required: ['schema_version', 'safe_project_alias', 'context_status', 'expires_at', 'visibility_labels', 'receipt_status'],
  properties: {
    schema_version: { const: SCHEMA_VERSION },
    safe_project_alias: {
      type: 'string',
      minLength: 1,
      maxLength: LIMITS.maxProjectAliasCharacters,
      pattern: '^[A-Za-z0-9][A-Za-z0-9._-]*$'
    },
    context_status: { enum: ['resolved', 'missing', 'expired', 'denied'] },
    expires_at: { type: ['string', 'null'], format: 'date-time' },
    visibility_labels: {
      type: 'array',
      uniqueItems: true,
      items: { enum: ['project', 'workspace', 'shared', 'task_start_context'] }
    },
    receipt_status: { enum: ['bound', 'not_available', 'invalid'] }
  }
});

module.exports = {
  PRINCIPAL_ASSERTION_SCHEMA,
  PROJECT_CONTEXT_CLAIM_SCHEMA,
  REQUEST_ENVELOPE_SCHEMA,
  RESPONSE_ENVELOPE_SCHEMA,
  WIDGET_DTO_SCHEMA
};
