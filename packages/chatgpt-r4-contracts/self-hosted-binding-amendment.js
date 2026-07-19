'use strict';

const {
  ARCHITECTURE_REFERENCE,
  SCHEMA_VERSION,
  ZERO_MEMORY_COUNTERS
} = require('./constants');
const { deepFreeze, digestObject, isPlainObject } = require('./canonical');
const {
  assertCanonicalIssuer,
  assertCanonicalPublicOrigin
} = require('./external-runtime-preflight');
const { reject } = require('./errors');

const D2B_STAGE = 'R4-D-D2B';
const REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{2,255}$/u;
const ENV_PATTERN = /^env:[A-Z][A-Z0-9_]{2,119}$/u;
const SHA40_PATTERN = /^[a-f0-9]{40}$/u;
const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/u;

const D2B_ENV_REFERENCES = deepFreeze({
  operator_reference: 'env:CODEX_MEMORY_R4_OPERATOR_REFERENCE',
  host_project_reference: 'env:CODEX_MEMORY_R4_HOST_PROJECT_REFERENCE',
  oauth_client_id: 'env:CODEX_MEMORY_R4_OAUTH_CLIENT_ID',
  edge_signing_private_key: 'env:CODEX_MEMORY_R4_EDGE_SIGNING_PRIVATE_KEY',
  edge_signing_public_key: 'env:CODEX_MEMORY_R4_EDGE_SIGNING_PUBLIC_KEY',
  edge_signing_key_id: 'env:CODEX_MEMORY_R4_EDGE_SIGNING_KEY_ID',
  relay_signing_private_key: 'env:CODEX_MEMORY_R4_RELAY_SIGNING_PRIVATE_KEY',
  relay_signing_public_key: 'env:CODEX_MEMORY_R4_RELAY_SIGNING_PUBLIC_KEY',
  relay_signing_key_id: 'env:CODEX_MEMORY_R4_RELAY_SIGNING_KEY_ID',
  relay_auth_token: 'env:CODEX_MEMORY_R4_RELAY_AUTH_TOKEN',
  relay_uds_path: 'env:CODEX_MEMORY_R4_RELAY_UDS_PATH',
  previous_binding_reference: 'env:CODEX_MEMORY_R4_PREVIOUS_BINDING_REFERENCE',
  previous_host_config_reference: 'env:CODEX_MEMORY_R4_PREVIOUS_HOST_CONFIG_REFERENCE'
});

const D2B_ZERO_COUNTERS = deepFreeze({
  ...ZERO_MEMORY_COUNTERS,
  external_runtime_calls: 0,
  service_start_stop_actions: 0,
  remote_mutations: 0,
  oauth_token_exchanges: 0,
  chatgpt_tool_calls: 0
});

function validateSelfHostedBindingAmendment(input) {
  const resolved = resolveSelfHostedBindingAmendment(input);
  return resolved.receipt;
}

function resolveSelfHostedBindingAmendment(input) {
  exactKeys(input, [
    'activation_boundary', 'amendment', 'architecture_reference', 'endpoints',
    'oauth', 'ownership', 'relay_authority', 'rollback', 'schema_version',
    'source_identity', 'stage'
  ], 'r4d_d2b_shape_invalid');
  literal(input.schema_version, SCHEMA_VERSION, 'r4d_d2b_schema_version_invalid');
  literal(input.architecture_reference, ARCHITECTURE_REFERENCE, 'r4d_d2b_architecture_invalid');
  literal(input.stage, D2B_STAGE, 'r4d_d2b_stage_invalid');

  exactKeys(input.amendment, [
    'amendment_reference', 'previous_binding_digest', 'reason'
  ], 'r4d_d2b_amendment_shape_invalid');
  reference(input.amendment.amendment_reference, 'r4d_d2b_amendment_reference_invalid');
  digest(input.amendment.previous_binding_digest, SHA256_PATTERN, 'r4d_d2b_previous_digest_invalid');
  literal(input.amendment.reason, 'self_hosted_private_vm_selected', 'r4d_d2b_reason_invalid');

  exactKeys(input.ownership, [
    'deployment_class', 'host_project_reference', 'host_service_mode',
    'hosting_provider', 'operator_count', 'operator_reference', 'operator_role'
  ], 'r4d_d2b_ownership_shape_invalid');
  literal(input.ownership.deployment_class, 'private_development', 'r4d_d2b_deployment_class_invalid');
  literal(input.ownership.hosting_provider, 'self_hosted_private_vm', 'r4d_d2b_hosting_provider_invalid');
  literal(
    input.ownership.host_service_mode,
    'isolated_container_loopback_reverse_proxy',
    'r4d_d2b_host_service_mode_invalid'
  );
  exactEnv(input.ownership.host_project_reference, 'host_project_reference');
  literal(input.ownership.operator_count, 1, 'r4d_d2b_operator_count_invalid');
  exactEnv(input.ownership.operator_reference, 'operator_reference');
  literal(input.ownership.operator_role, 'owner', 'r4d_d2b_operator_role_invalid');

  exactKeys(input.oauth, [
    'client_registration_mode', 'identity_provider', 'issuer', 'oauth_client_id',
    'pkce_method', 'resource', 'scopes'
  ], 'r4d_d2b_oauth_shape_invalid');
  literal(input.oauth.identity_provider, 'auth0', 'r4d_d2b_idp_invalid');
  literal(input.oauth.client_registration_mode, 'predefined_public_client', 'r4d_d2b_client_mode_invalid');
  literal(input.oauth.pkce_method, 'S256', 'r4d_d2b_pkce_invalid');
  exactEnv(input.oauth.oauth_client_id, 'oauth_client_id');
  const issuer = assertCanonicalIssuer(input.oauth.issuer);
  const publicOrigin = assertCanonicalPublicOrigin(input.oauth.resource);
  if (!Array.isArray(input.oauth.scopes) || input.oauth.scopes.length !== 1 ||
      input.oauth.scopes[0] !== 'memory.read') reject('r4d_d2b_scopes_invalid');

  exactKeys(input.endpoints, [
    'authorization_server_discovery_url', 'mcp_path', 'protected_resource_metadata_path',
    'public_origin'
  ], 'r4d_d2b_endpoints_shape_invalid');
  const endpointOrigin = assertCanonicalPublicOrigin(input.endpoints.public_origin);
  if (endpointOrigin.origin !== publicOrigin.origin) reject('r4d_d2b_resource_origin_mismatch');
  literal(input.endpoints.mcp_path, '/mcp', 'r4d_d2b_mcp_path_invalid');
  literal(
    input.endpoints.protected_resource_metadata_path,
    '/.well-known/oauth-protected-resource',
    'r4d_d2b_prmd_path_invalid'
  );
  const expectedDiscovery = new URL('.well-known/openid-configuration', issuer).href;
  if (input.endpoints.authorization_server_discovery_url !== expectedDiscovery) {
    reject('r4d_d2b_discovery_mismatch');
  }

  exactKeys(input.relay_authority, [
    'body_logging_allowed', 'durable_state_allowed', 'edge_signing_key_id',
    'edge_signing_private_key', 'edge_signing_public_key', 'inbound_listener_allowed',
    'relay_auth_token', 'relay_signing_key_id', 'relay_signing_private_key',
    'relay_signing_public_key', 'relay_uds_path',
    'transport_mode'
  ], 'r4d_d2b_relay_shape_invalid');
  exactEnv(input.relay_authority.edge_signing_private_key, 'edge_signing_private_key');
  exactEnv(input.relay_authority.edge_signing_public_key, 'edge_signing_public_key');
  exactEnv(input.relay_authority.edge_signing_key_id, 'edge_signing_key_id');
  exactEnv(input.relay_authority.relay_signing_private_key, 'relay_signing_private_key');
  exactEnv(input.relay_authority.relay_signing_public_key, 'relay_signing_public_key');
  exactEnv(input.relay_authority.relay_signing_key_id, 'relay_signing_key_id');
  exactEnv(input.relay_authority.relay_auth_token, 'relay_auth_token');
  exactEnv(input.relay_authority.relay_uds_path, 'relay_uds_path');
  literal(input.relay_authority.transport_mode, 'outbound_https_to_local_uds', 'r4d_d2b_relay_transport_invalid');
  literal(input.relay_authority.inbound_listener_allowed, false, 'r4d_d2b_relay_listener_forbidden');
  literal(input.relay_authority.body_logging_allowed, false, 'r4d_d2b_relay_body_log_forbidden');
  literal(input.relay_authority.durable_state_allowed, false, 'r4d_d2b_relay_durable_state_forbidden');

  exactKeys(input.rollback, [
    'container_stop_ready', 'credential_revocation_ready', 'previous_binding_reference',
    'previous_host_config_reference', 'relay_stop_ready', 'reverse_proxy_disable_ready'
  ], 'r4d_d2b_rollback_shape_invalid');
  exactEnv(input.rollback.previous_binding_reference, 'previous_binding_reference');
  exactEnv(input.rollback.previous_host_config_reference, 'previous_host_config_reference');
  for (const field of [
    'container_stop_ready', 'credential_revocation_ready', 'relay_stop_ready',
    'reverse_proxy_disable_ready'
  ]) literal(input.rollback[field], true, `r4d_d2b_${field}_invalid`);

  exactKeys(input.source_identity, [
    'base_commit_sha', 'commit_sha', 'repository', 'tree_sha'
  ], 'r4d_d2b_source_shape_invalid');
  literal(input.source_identity.repository, 'JENN2046/codex-memory', 'r4d_d2b_repository_invalid');
  digest(input.source_identity.base_commit_sha, SHA40_PATTERN, 'r4d_d2b_base_commit_invalid');
  digest(input.source_identity.commit_sha, SHA40_PATTERN, 'r4d_d2b_commit_invalid');
  digest(input.source_identity.tree_sha, SHA40_PATTERN, 'r4d_d2b_tree_invalid');

  exactKeys(input.activation_boundary, [
    'chatgpt_app_created', 'deployed', 'external_service_changed', 'memory_read',
    'memory_write', 'oauth_token_exchanges', 'provider_calls', 'service_started'
  ], 'r4d_d2b_activation_shape_invalid');
  for (const field of [
    'chatgpt_app_created', 'deployed', 'external_service_changed', 'memory_read',
    'memory_write', 'service_started'
  ]) literal(input.activation_boundary[field], false, `r4d_d2b_${field}_must_be_false`);
  literal(input.activation_boundary.oauth_token_exchanges, 0, 'r4d_d2b_token_exchange_must_be_zero');
  literal(input.activation_boundary.provider_calls, 0, 'r4d_d2b_provider_calls_must_be_zero');

  const references = [
    input.ownership.operator_reference,
    input.ownership.host_project_reference,
    input.oauth.oauth_client_id,
    ...Object.values(input.relay_authority).filter(value => typeof value === 'string' && ENV_PATTERN.test(value)),
    input.rollback.previous_binding_reference,
    input.rollback.previous_host_config_reference
  ];
  if (new Set(references).size !== references.length) reject('r4d_d2b_env_reference_reused');

  const bindingDigest = digestObject(input);
  const receipt = deepFreeze({
    accepted: true,
    stage: D2B_STAGE,
    verdict: 'SELF_HOSTED_BINDING_AMENDMENT_ACCEPTED_ACTIVATION_FALSE',
    hosting_provider_selected: 'self_hosted_private_vm',
    private_single_operator: true,
    isolated_container_loopback_reverse_proxy: true,
    exact_resource_audience_bound: true,
    oauth_binding_preserved: true,
    outbound_relay_bound: true,
    relay_inbound_listener_allowed: false,
    relay_body_logging_allowed: false,
    relay_durable_state_allowed: false,
    edge_relay_signing_authority_separated: true,
    rollback_metadata_complete: true,
    source_identity_bound: true,
    canonical_binding_digest_computed: true,
    exact_values_returned: false,
    activation_performed: false,
    production_ready_claimed: false,
    release_ready_claimed: false,
    cutover_ready_claimed: false,
    counters: D2B_ZERO_COUNTERS
  });
  return deepFreeze({ bindingDigest, receipt });
}

function exactKeys(value, expected, code) {
  if (!isPlainObject(value)) reject(code);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) reject(code);
}

function literal(value, expected, code) {
  if (value !== expected) reject(code);
}

function exactEnv(value, key) {
  if (value !== D2B_ENV_REFERENCES[key]) reject('r4d_d2b_env_reference_invalid');
}

function reference(value, code) {
  if (typeof value !== 'string' || !REFERENCE_PATTERN.test(value) || /placeholder|example|todo/iu.test(value)) {
    reject(code);
  }
}

function digest(value, pattern, code) {
  if (typeof value !== 'string' || !pattern.test(value) || /^(.)\1+$/u.test(value.replace(/^sha256:/u, ''))) {
    reject(code);
  }
}

module.exports = {
  D2B_ENV_REFERENCES,
  D2B_STAGE,
  D2B_ZERO_COUNTERS,
  resolveSelfHostedBindingAmendment,
  validateSelfHostedBindingAmendment
};
