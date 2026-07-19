'use strict';

const { ARCHITECTURE_REFERENCE, SCHEMA_VERSION, ZERO_MEMORY_COUNTERS } = require('./constants');
const { deepFreeze, isPlainObject } = require('./canonical');
const { reject } = require('./errors');

const STAGE = 'R4-D';
const REQUIRED_SCOPE = 'memory.read';
const PUBLIC_ORIGIN_PATTERN = /^https:\/\/[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?(?::[1-9][0-9]{0,4})?$/u;
const ENV_REFERENCE_PATTERN = /^env:[A-Z][A-Z0-9_]{2,119}$/u;
const SHA40_PATTERN = /^[a-f0-9]{40}$/u;
const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const NON_PUBLIC_DNS_SUFFIXES = deepFreeze([
  'alt',
  'arpa',
  'example',
  'example.com',
  'example.net',
  'example.org',
  'internal',
  'invalid',
  'local',
  'localhost',
  'onion',
  'test'
]);

const ENV_REFERENCES = deepFreeze({
  operator_reference: 'env:CODEX_MEMORY_R4_OPERATOR_REFERENCE',
  host_project_reference: 'env:CODEX_MEMORY_R4_HOST_PROJECT_REFERENCE',
  oauth_client_id: 'env:CODEX_MEMORY_R4_OAUTH_CLIENT_ID',
  edge_signing_private_key: 'env:CODEX_MEMORY_R4_EDGE_SIGNING_PRIVATE_KEY',
  relay_auth_token: 'env:CODEX_MEMORY_R4_RELAY_AUTH_TOKEN',
  previous_binding_reference: 'env:CODEX_MEMORY_R4_PREVIOUS_BINDING_REFERENCE'
});

const REQUIRED_ENV_REFERENCES = deepFreeze(Object.values(ENV_REFERENCES));

const ZERO_PREFLIGHT_COUNTERS = deepFreeze({
  ...ZERO_MEMORY_COUNTERS,
  external_runtime_calls: 0,
  service_start_stop_actions: 0,
  runtime_config_writes: 0,
  oauth_token_exchanges: 0,
  chatgpt_tool_calls: 0
});

function assertObject(value, code) {
  if (!isPlainObject(value)) reject(code);
}

function assertExactKeys(value, expected, code) {
  assertObject(value, code);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    reject(code);
  }
}

function assertLiteral(value, expected, code) {
  if (value !== expected) reject(code);
}

function assertBoolean(value, expected, code) {
  if (typeof value !== 'boolean' || value !== expected) reject(code);
}

function assertInteger(value, minimum, maximum, code) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) reject(code);
}

function assertEnvReference(value, code) {
  if (typeof value !== 'string' || !ENV_REFERENCE_PATTERN.test(value)) reject(code);
  return value;
}

function assertExactEnvReference(value, expected, code) {
  assertEnvReference(value, code);
  if (value !== expected) reject(code);
}

function assertNonPlaceholderDigest(value, pattern, code) {
  if (typeof value !== 'string' || !pattern.test(value)) reject(code);
  const digest = value.includes(':') ? value.slice(value.indexOf(':') + 1) : value;
  if (/^(.)\1+$/u.test(digest)) reject(`${code}_placeholder`);
}

function hasDnsSuffix(hostname, suffix) {
  return hostname === suffix || hostname.endsWith(`.${suffix}`);
}

function parseHttpsUrl(value, code) {
  if (typeof value !== 'string' || value.trim() !== value || value.length > 2048) reject(code);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    reject(code);
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash) reject(code);
  const hostname = parsed.hostname.toLowerCase();
  const dnsLabels = hostname.split('.');
  const dnsLabelsValid = hostname.length <= 253 && dnsLabels.every(label =>
    label.length >= 1 &&
    label.length <= 63 &&
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(label));
  if (
    !dnsLabelsValid ||
    NON_PUBLIC_DNS_SUFFIXES.some(suffix => hasDnsSuffix(hostname, suffix)) ||
    !hostname.includes('.') ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/u.test(hostname) ||
    hostname.startsWith('[')
  ) {
    reject(`${code}_non_public`);
  }
  return parsed;
}

function assertCanonicalPublicOrigin(value) {
  if (typeof value !== 'string' || !PUBLIC_ORIGIN_PATTERN.test(value)) {
    reject('r4d_public_origin_invalid');
  }
  const parsed = parseHttpsUrl(value, 'r4d_public_origin_invalid');
  if (parsed.origin !== value || parsed.pathname !== '/' || parsed.search) {
    reject('r4d_public_origin_not_canonical');
  }
  return parsed;
}

function assertCanonicalIssuer(value) {
  const parsed = parseHttpsUrl(value, 'r4d_issuer_invalid');
  if (
    parsed.href !== value ||
    parsed.pathname !== '/' ||
    parsed.search ||
    !value.endsWith('/')
  ) {
    reject('r4d_issuer_not_canonical');
  }
  return parsed;
}

function validateOwnership(value) {
  assertExactKeys(value, [
    'deployment_class', 'host_project_reference', 'host_service_mode',
    'hosting_provider', 'operator_count', 'operator_reference', 'operator_role'
  ], 'r4d_ownership_shape_invalid');
  assertLiteral(value.deployment_class, 'private_development', 'r4d_deployment_class_invalid');
  assertLiteral(value.hosting_provider, 'render', 'r4d_hosting_provider_invalid');
  assertLiteral(
    value.host_service_mode,
    'dedicated_single_instance_web_service',
    'r4d_host_service_mode_invalid'
  );
  assertExactEnvReference(
    value.host_project_reference,
    ENV_REFERENCES.host_project_reference,
    'r4d_host_project_reference_invalid'
  );
  assertLiteral(value.operator_count, 1, 'r4d_operator_count_invalid');
  assertLiteral(value.operator_role, 'owner', 'r4d_operator_role_invalid');
  assertExactEnvReference(
    value.operator_reference,
    ENV_REFERENCES.operator_reference,
    'r4d_operator_reference_invalid'
  );
}

function validateOAuth(value, publicOrigin) {
  assertExactKeys(value, [
    'anonymous_access', 'audience_claim_required', 'client_registration_mode',
    'identity_provider', 'issuer', 'pkce_method', 'resource',
    'resource_parameter_on_authorization', 'resource_parameter_on_token',
    'scopes', 'token_endpoint_auth_method'
  ], 'r4d_oauth_shape_invalid');
  assertLiteral(value.identity_provider, 'auth0', 'r4d_identity_provider_invalid');
  assertLiteral(
    value.client_registration_mode,
    'predefined_public_client',
    'r4d_client_registration_mode_invalid'
  );
  assertLiteral(value.pkce_method, 'S256', 'r4d_pkce_method_invalid');
  assertLiteral(value.token_endpoint_auth_method, 'none', 'r4d_token_endpoint_auth_method_invalid');
  assertBoolean(value.resource_parameter_on_authorization, true, 'r4d_authorization_resource_parameter_missing');
  assertBoolean(value.resource_parameter_on_token, true, 'r4d_token_resource_parameter_missing');
  assertBoolean(value.audience_claim_required, true, 'r4d_audience_claim_not_required');
  assertBoolean(value.anonymous_access, false, 'r4d_anonymous_access_forbidden');
  if (!Array.isArray(value.scopes) || value.scopes.length !== 1 || value.scopes[0] !== REQUIRED_SCOPE) {
    reject('r4d_scopes_invalid');
  }
  assertCanonicalIssuer(value.issuer);
  if (value.resource !== publicOrigin) reject('r4d_resource_audience_mismatch');
}

function validateEndpoints(value, publicOrigin, issuer) {
  assertExactKeys(value, [
    'authorization_server_discovery_url', 'mcp_path',
    'protected_resource_metadata_path', 'public_origin'
  ], 'r4d_endpoints_shape_invalid');
  assertCanonicalPublicOrigin(value.public_origin);
  if (value.public_origin !== publicOrigin) reject('r4d_public_origin_mismatch');
  assertLiteral(value.mcp_path, '/mcp', 'r4d_mcp_path_invalid');
  assertLiteral(
    value.protected_resource_metadata_path,
    '/.well-known/oauth-protected-resource',
    'r4d_prmd_path_invalid'
  );
  const discovery = parseHttpsUrl(
    value.authorization_server_discovery_url,
    'r4d_discovery_url_invalid'
  );
  const expectedDiscovery = new URL('.well-known/openid-configuration', issuer).href;
  if (discovery.href !== expectedDiscovery) reject('r4d_discovery_issuer_mismatch');
}

function validateCredentialReferences(value) {
  assertExactKeys(value, [
    'edge_signing_private_key', 'oauth_client_id', 'relay_auth_token'
  ], 'r4d_credential_references_shape_invalid');
  const references = Object.values(value).map(reference =>
    assertEnvReference(reference, 'r4d_credential_reference_invalid'));
  if (new Set(references).size !== references.length) reject('r4d_credential_reference_reused');
  for (const key of Object.keys(value)) {
    assertExactEnvReference(
      value[key],
      ENV_REFERENCES[key],
      'r4d_credential_reference_invalid'
    );
  }
}

function validateRuntime(value) {
  assertExactKeys(value, [
    'adapter_mode', 'direct_https_canary_required', 'durable_remote_state_allowed',
    'max_in_flight_requests', 'request_or_response_body_logging_allowed',
    'request_ttl_seconds', 'restart_behavior', 'transport_mode'
  ], 'r4d_runtime_shape_invalid');
  assertLiteral(value.transport_mode, 'direct_https', 'r4d_transport_mode_invalid');
  assertLiteral(value.adapter_mode, 'none', 'r4d_adapter_mode_invalid');
  assertBoolean(value.direct_https_canary_required, true, 'r4d_direct_https_canary_not_required');
  assertBoolean(
    value.request_or_response_body_logging_allowed,
    false,
    'r4d_body_logging_forbidden'
  );
  assertBoolean(value.durable_remote_state_allowed, false, 'r4d_durable_remote_state_forbidden');
  assertInteger(value.max_in_flight_requests, 1, 64, 'r4d_max_in_flight_invalid');
  assertInteger(value.request_ttl_seconds, 1, 30, 'r4d_request_ttl_invalid');
  assertLiteral(
    value.restart_behavior,
    'fail_closed_and_expire_inflight',
    'r4d_restart_behavior_invalid'
  );
}

function validateRollback(value) {
  assertExactKeys(value, [
    'app_disable_ready', 'credential_revocation_ready', 'edge_disable_ready',
    'previous_binding_reference', 'relay_stop_ready'
  ], 'r4d_rollback_shape_invalid');
  assertExactEnvReference(
    value.previous_binding_reference,
    ENV_REFERENCES.previous_binding_reference,
    'r4d_previous_binding_reference_invalid'
  );
  for (const key of [
    'app_disable_ready', 'credential_revocation_ready', 'edge_disable_ready', 'relay_stop_ready'
  ]) {
    assertBoolean(value[key], true, `r4d_${key}_invalid`);
  }
}

function validateSupplyChain(value) {
  assertExactKeys(value, [
    'commit_sha', 'edge_artifact_sha256', 'lockfile_sha256', 'repository', 'tree_sha'
  ], 'r4d_supply_chain_shape_invalid');
  assertLiteral(value.repository, 'JENN2046/codex-memory', 'r4d_repository_invalid');
  assertNonPlaceholderDigest(value.commit_sha, SHA40_PATTERN, 'r4d_commit_sha_invalid');
  assertNonPlaceholderDigest(value.tree_sha, SHA40_PATTERN, 'r4d_tree_sha_invalid');
  assertNonPlaceholderDigest(value.lockfile_sha256, SHA256_PATTERN, 'r4d_lockfile_sha256_invalid');
  assertNonPlaceholderDigest(
    value.edge_artifact_sha256,
    SHA256_PATTERN,
    'r4d_edge_artifact_sha256_invalid'
  );
}

function validateActivationBoundary(value) {
  assertExactKeys(value, [
    'chatgpt_app_created', 'direct_https_canary_passed', 'external_runtime_activated',
    'provider_calls', 'public_tool_surface_expanded', 'real_memory_allowed',
    'real_memory_reads', 'service_started', 'write_tools_enabled'
  ], 'r4d_activation_boundary_shape_invalid');
  for (const key of [
    'chatgpt_app_created', 'direct_https_canary_passed', 'external_runtime_activated',
    'public_tool_surface_expanded', 'real_memory_allowed', 'service_started',
    'write_tools_enabled'
  ]) {
    assertBoolean(value[key], false, `r4d_${key}_must_be_false`);
  }
  assertLiteral(value.provider_calls, 0, 'r4d_provider_calls_must_be_zero');
  assertLiteral(value.real_memory_reads, 0, 'r4d_real_memory_reads_must_be_zero');
}

function validateExternalOAuthRuntimePreflight(input) {
  assertExactKeys(input, [
    'activation_boundary', 'architecture_reference', 'credential_references',
    'endpoints', 'oauth', 'ownership', 'rollback', 'runtime', 'schema_version',
    'stage', 'supply_chain'
  ], 'r4d_preflight_shape_invalid');
  assertLiteral(input.schema_version, SCHEMA_VERSION, 'r4d_schema_version_invalid');
  assertLiteral(
    input.architecture_reference,
    ARCHITECTURE_REFERENCE,
    'r4d_architecture_reference_invalid'
  );
  assertLiteral(input.stage, STAGE, 'r4d_stage_invalid');
  validateOwnership(input.ownership);
  const publicOrigin = assertCanonicalPublicOrigin(input.endpoints?.public_origin);
  const issuer = assertCanonicalIssuer(input.oauth?.issuer);
  validateOAuth(input.oauth, publicOrigin.origin);
  validateEndpoints(input.endpoints, publicOrigin.origin, issuer);
  validateCredentialReferences(input.credential_references);
  validateRuntime(input.runtime);
  validateRollback(input.rollback);
  validateSupplyChain(input.supply_chain);
  validateActivationBoundary(input.activation_boundary);

  const allReferences = [
    input.ownership.operator_reference,
    input.ownership.host_project_reference,
    ...Object.values(input.credential_references),
    input.rollback.previous_binding_reference
  ];
  if (new Set(allReferences).size !== REQUIRED_ENV_REFERENCES.length) {
    reject('r4d_env_reference_reused');
  }

  return deepFreeze({
    accepted: true,
    stage: STAGE,
    verdict: 'PREFLIGHT_METADATA_ACCEPTED_PRIVATE_BINDING_REQUIRED',
    primary_archetype: 'interactive_decoupled',
    hosting_provider_selected: 'render',
    host_service_mode: 'dedicated_single_instance_web_service',
    identity_provider_selected: 'auth0',
    client_registration_mode: 'predefined_public_client',
    private_single_operator: true,
    exact_resource_audience_bound: true,
    protected_resource_metadata_bound: true,
    authorization_server_discovery_bound: true,
    pkce_s256_required: true,
    direct_https_first: true,
    optional_transport_adapter_enabled: false,
    no_body_log_enforced: true,
    durable_remote_state_allowed: false,
    rollback_metadata_complete: true,
    rollback_executability_verified: false,
    supply_chain_metadata_bound: true,
    supply_chain_identity_verified: false,
    credential_reference_count: 3,
    secret_values_accepted: false,
    exact_runtime_values_returned: false,
    activation_performed: false,
    real_memory_allowed: false,
    public_tool_surface_expanded: false,
    production_ready_claimed: false,
    release_ready_claimed: false,
    cutover_ready_claimed: false,
    counters: ZERO_PREFLIGHT_COUNTERS
  });
}

module.exports = {
  ENV_REFERENCES,
  ENV_REFERENCE_PATTERN,
  NON_PUBLIC_DNS_SUFFIXES,
  REQUIRED_ENV_REFERENCES,
  STAGE,
  ZERO_PREFLIGHT_COUNTERS,
  validateExternalOAuthRuntimePreflight
};
