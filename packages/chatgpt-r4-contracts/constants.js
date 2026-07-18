'use strict';

const ARCHITECTURE_REFERENCE = 'codex-memory-chatgpt-web-r4-v1';
const SCHEMA_VERSION = 1;
const WIDGET_RESOURCE_URI = 'ui://codex-memory/chatgpt-r4/memory-scope-widget-v1.html';
const PROJECT_CONTEXT_REF_PATTERN_SOURCE = '^pctx_[A-Za-z0-9_-]{32,96}$';
const REQUEST_ID_PATTERN_SOURCE = '^req_[A-Za-z0-9_-]{24,96}$';
const RESULT_REF_PATTERN_SOURCE = '^mref_[A-Za-z0-9_-]{16,120}$';

const KINDS = Object.freeze({
  principalAssertion: 'chatgpt_r4_principal_assertion',
  projectContextClaim: 'chatgpt_r4_project_context_claim',
  requestEnvelope: 'chatgpt_r4_edge_request',
  responseEnvelope: 'chatgpt_r4_edge_response'
});

const DATA_TOOL_NAMES = Object.freeze([
  'resolve_memory_context',
  'memory_overview',
  'search_memory',
  'audit_memory',
  'prepare_memory_context'
]);

const RENDER_TOOL_NAMES = Object.freeze(['render_memory_scope']);

const CONTEXT_VISIBILITIES = Object.freeze([
  'project',
  'workspace',
  'shared',
  'task_start_context'
]);

const ZERO_MEMORY_COUNTER_KEYS = Object.freeze([
  'provider_calls',
  'native_invocations',
  'local_fallbacks',
  'primary_memory_writes',
  'derived_index_writes',
  'other_durable_mutations',
  'unrestricted_native_searches'
]);

const ZERO_MEMORY_COUNTERS = Object.freeze(Object.fromEntries(
  ZERO_MEMORY_COUNTER_KEYS.map(key => [key, 0])
));

const LIMITS = Object.freeze({
  maxAssertionTtlSeconds: 300,
  maxContextTtlSeconds: 300,
  maxEnvelopeTtlSeconds: 30,
  maxClockSkewSeconds: 5,
  maxRequestBytes: 32768,
  maxResponseBytes: 65536,
  maxToolArgumentsBytes: 8192,
  maxStructuredContentBytes: 32768,
  maxQueryCharacters: 2000,
  maxProjectAliasCharacters: 80,
  maxResultLimit: 8
});

const FORBIDDEN_AUTHORITY_KEYS = Object.freeze([
  'alloweddiarynames',
  'classification',
  'clientid',
  'diary',
  'diaryname',
  'diarynames',
  'mappingdigest',
  'mappingreference',
  'partition',
  'partitionreference',
  'projectid',
  'scopeid',
  'trustedscope',
  'visibilityallowlist',
  'workspaceid'
]);

const FORBIDDEN_PUBLIC_DISCLOSURE_KEYS = Object.freeze([
  'authorization',
  'credential',
  'diary',
  'diaryname',
  'diarynames',
  'filepath',
  'fullpath',
  'mappingcontents',
  'mappingdigest',
  'memorycontent',
  'path',
  'providerresponse',
  'rawmemory',
  'secret',
  'token'
]);

module.exports = {
  ARCHITECTURE_REFERENCE,
  SCHEMA_VERSION,
  WIDGET_RESOURCE_URI,
  PROJECT_CONTEXT_REF_PATTERN_SOURCE,
  REQUEST_ID_PATTERN_SOURCE,
  RESULT_REF_PATTERN_SOURCE,
  KINDS,
  DATA_TOOL_NAMES,
  RENDER_TOOL_NAMES,
  CONTEXT_VISIBILITIES,
  ZERO_MEMORY_COUNTER_KEYS,
  ZERO_MEMORY_COUNTERS,
  LIMITS,
  FORBIDDEN_AUTHORITY_KEYS,
  FORBIDDEN_PUBLIC_DISCLOSURE_KEYS
};
