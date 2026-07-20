'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ZERO_PREFLIGHT_COUNTERS,
  validateExternalOAuthRuntimePreflight
} = require('../../packages/chatgpt-r4-contracts');
const {
  ENV_REFERENCE_NAMES,
  environmentPresence,
  loadJson,
  validateRedactedExample,
  validateSchema,
  EXAMPLE_PATH,
  SCHEMA_PATH
} = require('../../scripts/validate_chatgpt_r4d_preflight');

function candidate() {
  return {
    schema_version: 1,
    architecture_reference: 'codex-memory-chatgpt-web-r4-v1',
    stage: 'R4-D',
    ownership: {
      deployment_class: 'private_development',
      hosting_provider: 'render',
      host_service_mode: 'dedicated_single_instance_web_service',
      host_project_reference: 'env:CODEX_MEMORY_R4_HOST_PROJECT_REFERENCE',
      operator_count: 1,
      operator_reference: 'env:CODEX_MEMORY_R4_OPERATOR_REFERENCE',
      operator_role: 'owner'
    },
    oauth: {
      identity_provider: 'auth0',
      client_registration_mode: 'predefined_public_client',
      issuer: 'https://jenn-dev.us.auth0.com/',
      resource: 'https://memory-edge.jenn.dev/mcp',
      scopes: ['memory.read'],
      pkce_method: 'S256',
      token_endpoint_auth_method: 'none',
      resource_parameter_on_authorization: true,
      resource_parameter_on_token: true,
      audience_claim_required: true,
      anonymous_access: false
    },
    endpoints: {
      public_origin: 'https://memory-edge.jenn.dev',
      mcp_path: '/mcp',
      protected_resource_metadata_path: '/.well-known/oauth-protected-resource',
      authorization_server_discovery_url: 'https://jenn-dev.us.auth0.com/.well-known/openid-configuration'
    },
    credential_references: {
      oauth_client_id: 'env:CODEX_MEMORY_R4_OAUTH_CLIENT_ID',
      edge_signing_private_key: 'env:CODEX_MEMORY_R4_EDGE_SIGNING_PRIVATE_KEY',
      relay_auth_token: 'env:CODEX_MEMORY_R4_RELAY_AUTH_TOKEN'
    },
    runtime: {
      transport_mode: 'direct_https',
      adapter_mode: 'none',
      direct_https_canary_required: true,
      request_or_response_body_logging_allowed: false,
      durable_remote_state_allowed: false,
      max_in_flight_requests: 16,
      request_ttl_seconds: 30,
      restart_behavior: 'fail_closed_and_expire_inflight'
    },
    rollback: {
      previous_binding_reference: 'env:CODEX_MEMORY_R4_PREVIOUS_BINDING_REFERENCE',
      app_disable_ready: true,
      credential_revocation_ready: true,
      edge_disable_ready: true,
      relay_stop_ready: true
    },
    supply_chain: {
      repository: 'JENN2046/codex-memory',
      commit_sha: '0123456789abcdef0123456789abcdef01234567',
      tree_sha: '89abcdef0123456789abcdef0123456789abcdef',
      lockfile_sha256: `sha256:${'0123456789abcdef'.repeat(4)}`,
      edge_artifact_sha256: `sha256:${'fedcba9876543210'.repeat(4)}`
    },
    activation_boundary: {
      external_runtime_activated: false,
      service_started: false,
      chatgpt_app_created: false,
      direct_https_canary_passed: false,
      real_memory_allowed: false,
      real_memory_reads: 0,
      provider_calls: 0,
      write_tools_enabled: false,
      public_tool_surface_expanded: false
    }
  };
}

test('R4-D complete metadata preflight accepts Auth0 predefined PKCE over direct HTTPS', () => {
  const input = candidate();
  const receipt = validateExternalOAuthRuntimePreflight(input);
  assert.equal(receipt.accepted, true);
  assert.equal(receipt.verdict, 'PREFLIGHT_METADATA_ACCEPTED_PRIVATE_BINDING_REQUIRED');
  assert.equal(receipt.primary_archetype, 'interactive_decoupled');
  assert.equal(receipt.identity_provider_selected, 'auth0');
  assert.equal(receipt.hosting_provider_selected, 'render');
  assert.equal(receipt.private_single_operator, true);
  assert.equal(receipt.exact_resource_audience_bound, true);
  assert.equal(receipt.direct_https_first, true);
  assert.equal(receipt.optional_transport_adapter_enabled, false);
  assert.equal(receipt.rollback_metadata_complete, true);
  assert.equal(receipt.rollback_executability_verified, false);
  assert.equal(receipt.supply_chain_metadata_bound, true);
  assert.equal(receipt.supply_chain_identity_verified, false);
  assert.equal(receipt.activation_performed, false);
  assert.equal(receipt.real_memory_allowed, false);
  assert.deepEqual(receipt.counters, ZERO_PREFLIGHT_COUNTERS);
  assert.equal(Object.isFrozen(receipt), true);
  assert.equal(Object.isFrozen(receipt.counters), true);

  const serialized = JSON.stringify(receipt);
  for (const forbidden of [
    input.oauth.issuer,
    input.oauth.resource,
    'env:',
    'client_id',
    'private_key',
    'relay_auth_token'
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test('R4-D redacted example is schema-shaped but intentionally not activation-ready', () => {
  const schema = loadJson(SCHEMA_PATH);
  const example = loadJson(EXAMPLE_PATH);
  assert.doesNotThrow(() => validateSchema(schema));
  assert.doesNotThrow(() => validateRedactedExample(example));
  assert.throws(() => validateExternalOAuthRuntimePreflight(example), {
    code: 'r4d_public_origin_invalid_non_public'
  });
});

test('R4-D schema rejects credentialed OAuth and public endpoint URLs', () => {
  const schema = loadJson(SCHEMA_PATH);
  const cases = [
    [schema.properties.oauth.properties.issuer.pattern, 'https://user:pass@tenant.auth0.com/'],
    [schema.properties.oauth.properties.resource.pattern, 'https://user:pass@edge.jenn.dev'],
    [schema.properties.endpoints.properties.public_origin.pattern, 'https://user:pass@edge.jenn.dev'],
    [
      schema.properties.endpoints.properties.authorization_server_discovery_url.pattern,
      'https://user:pass@tenant.auth0.com/.well-known/openid-configuration'
    ]
  ];
  for (const [pattern, value] of cases) {
    assert.equal(new RegExp(pattern, 'u').test(value), false);
  }
  assert.doesNotThrow(() => validateSchema(schema));
});

test('R4-D rejects placeholder, local, path-bearing, or mismatched public authority URLs', () => {
  for (const [mutate, code] of [
    [value => { value.endpoints.public_origin = 'https://edge.example.invalid'; value.oauth.resource = `${value.endpoints.public_origin}/mcp`; }, 'r4d_public_origin_invalid_non_public'],
    [value => { value.endpoints.public_origin = 'https://localhost'; value.oauth.resource = `${value.endpoints.public_origin}/mcp`; }, 'r4d_public_origin_invalid_non_public'],
    [value => { value.endpoints.public_origin = 'https://127.0.0.1'; value.oauth.resource = `${value.endpoints.public_origin}/mcp`; }, 'r4d_public_origin_invalid_non_public'],
    [value => { value.endpoints.public_origin = 'https://bad-.com'; value.oauth.resource = `${value.endpoints.public_origin}/mcp`; }, 'r4d_public_origin_invalid_non_public'],
    [value => { value.endpoints.public_origin = 'https://a..com'; value.oauth.resource = `${value.endpoints.public_origin}/mcp`; }, 'r4d_public_origin_invalid_non_public'],
    [value => { value.endpoints.public_origin = `https://${'a'.repeat(64)}.com`; value.oauth.resource = `${value.endpoints.public_origin}/mcp`; }, 'r4d_public_origin_invalid_non_public'],
    [value => { value.endpoints.public_origin = 'https://memory.local'; value.oauth.resource = `${value.endpoints.public_origin}/mcp`; }, 'r4d_public_origin_invalid_non_public'],
    [value => { value.endpoints.public_origin = 'https://edge.home.arpa'; value.oauth.resource = `${value.endpoints.public_origin}/mcp`; }, 'r4d_public_origin_invalid_non_public'],
    [value => { value.endpoints.public_origin = 'https://edge.example.com'; value.oauth.resource = `${value.endpoints.public_origin}/mcp`; }, 'r4d_public_origin_invalid_non_public'],
    [value => { value.endpoints.public_origin = 'https://memory.internal'; value.oauth.resource = `${value.endpoints.public_origin}/mcp`; }, 'r4d_public_origin_invalid_non_public'],
    [value => { value.endpoints.public_origin = 'https://memory.onion'; value.oauth.resource = `${value.endpoints.public_origin}/mcp`; }, 'r4d_public_origin_invalid_non_public'],
    [value => { value.endpoints.public_origin = 'https://memory-edge.jenn.dev/base'; }, 'r4d_public_origin_invalid'],
    [value => { value.oauth.resource = 'https://another-edge.jenn.dev'; }, 'r4d_resource_audience_mismatch'],
    [value => { value.endpoints.mcp_path = '/api/mcp'; }, 'r4d_mcp_path_invalid'],
    [value => { value.endpoints.protected_resource_metadata_path = '/oauth/resource'; }, 'r4d_prmd_path_invalid'],
    [value => { value.endpoints.authorization_server_discovery_url = 'https://other.us.auth0.com/.well-known/openid-configuration'; }, 'r4d_discovery_issuer_mismatch'],
    [value => { value.oauth.issuer = 'https://jenn-dev.us.auth0.com'; }, 'r4d_issuer_not_canonical'],
    [value => { value.oauth.issuer = 'https://auth0/'; }, 'r4d_issuer_invalid_non_public'],
    [value => { value.oauth.issuer = 'https://bad-.auth0.com/'; }, 'r4d_issuer_invalid_non_public'],
    [value => { value.oauth.issuer = 'https://tenant.local/'; }, 'r4d_issuer_invalid_non_public'],
    [value => { value.oauth.issuer = 'https://jenn-dev.us.auth0.com/tenant/'; }, 'r4d_issuer_not_canonical']
  ]) {
    const value = candidate();
    mutate(value);
    assert.throws(() => validateExternalOAuthRuntimePreflight(value), { code });
  }
});

test('R4-D freezes Auth0 predefined public client, exact memory.read, resource echo, and PKCE S256', () => {
  for (const [field, replacement, code] of [
    ['identity_provider', 'descope', 'r4d_identity_provider_invalid'],
    ['client_registration_mode', 'cimd', 'r4d_client_registration_mode_invalid'],
    ['pkce_method', 'plain', 'r4d_pkce_method_invalid'],
    ['token_endpoint_auth_method', 'client_secret_post', 'r4d_token_endpoint_auth_method_invalid'],
    ['resource_parameter_on_authorization', false, 'r4d_authorization_resource_parameter_missing'],
    ['resource_parameter_on_token', false, 'r4d_token_resource_parameter_missing'],
    ['audience_claim_required', false, 'r4d_audience_claim_not_required'],
    ['anonymous_access', true, 'r4d_anonymous_access_forbidden']
  ]) {
    const value = candidate();
    value.oauth[field] = replacement;
    assert.throws(() => validateExternalOAuthRuntimePreflight(value), { code });
  }
  for (const scopes of [[], ['memory.read', 'memory.write'], ['openid']]) {
    const value = candidate();
    value.oauth.scopes = scopes;
    assert.throws(() => validateExternalOAuthRuntimePreflight(value), { code: 'r4d_scopes_invalid' });
  }
});

test('R4-D accepts only distinct env references and never credential values', () => {
  for (const replacement of [
    'client-id-value',
    'env:',
    'secret://runtime/key',
    'env:lower_case',
    'env:CODEX_MEMORY_R4_WRONG_CLIENT_ID',
    'env:CODEX_MEMORY_R4_OAUTH_CLIENT_ID=value'
  ]) {
    const value = candidate();
    value.credential_references.oauth_client_id = replacement;
    assert.throws(() => validateExternalOAuthRuntimePreflight(value), {
      code: 'r4d_credential_reference_invalid'
    });
  }
  const reusedCredential = candidate();
  reusedCredential.credential_references.relay_auth_token =
    reusedCredential.credential_references.oauth_client_id;
  assert.throws(() => validateExternalOAuthRuntimePreflight(reusedCredential), {
    code: 'r4d_credential_reference_reused'
  });
  const reusedAcrossBoundaries = candidate();
  reusedAcrossBoundaries.rollback.previous_binding_reference =
    reusedAcrossBoundaries.ownership.operator_reference;
  assert.throws(() => validateExternalOAuthRuntimePreflight(reusedAcrossBoundaries), {
    code: 'r4d_previous_binding_reference_invalid'
  });
  const reusedHostProject = candidate();
  reusedHostProject.ownership.host_project_reference =
    reusedHostProject.ownership.operator_reference;
  assert.throws(() => validateExternalOAuthRuntimePreflight(reusedHostProject), {
    code: 'r4d_host_project_reference_invalid'
  });
});

test('R4-D rejects Tunnel-first runtime, body logs, durable remote state, and unbounded in-flight settings', () => {
  for (const [field, replacement, code] of [
    ['transport_mode', 'secure_mcp_tunnel', 'r4d_transport_mode_invalid'],
    ['adapter_mode', 'tunnel', 'r4d_adapter_mode_invalid'],
    ['direct_https_canary_required', false, 'r4d_direct_https_canary_not_required'],
    ['request_or_response_body_logging_allowed', true, 'r4d_body_logging_forbidden'],
    ['durable_remote_state_allowed', true, 'r4d_durable_remote_state_forbidden'],
    ['max_in_flight_requests', 65, 'r4d_max_in_flight_invalid'],
    ['request_ttl_seconds', 31, 'r4d_request_ttl_invalid'],
    ['restart_behavior', 'restore_from_disk', 'r4d_restart_behavior_invalid']
  ]) {
    const value = candidate();
    value.runtime[field] = replacement;
    assert.throws(() => validateExternalOAuthRuntimePreflight(value), { code });
  }
});

test('R4-D requires rollback and non-placeholder supply-chain identity', () => {
  for (const field of [
    'app_disable_ready', 'credential_revocation_ready', 'edge_disable_ready', 'relay_stop_ready'
  ]) {
    const value = candidate();
    value.rollback[field] = false;
    assert.throws(() => validateExternalOAuthRuntimePreflight(value), {
      code: `r4d_${field}_invalid`
    });
  }
  for (const [field, replacement, code] of [
    ['commit_sha', '0'.repeat(40), 'r4d_commit_sha_invalid_placeholder'],
    ['tree_sha', 'f'.repeat(40), 'r4d_tree_sha_invalid_placeholder'],
    ['lockfile_sha256', `sha256:${'0'.repeat(64)}`, 'r4d_lockfile_sha256_invalid_placeholder'],
    ['edge_artifact_sha256', `sha256:${'a'.repeat(64)}`, 'r4d_edge_artifact_sha256_invalid_placeholder']
  ]) {
    const value = candidate();
    value.supply_chain[field] = replacement;
    assert.throws(() => validateExternalOAuthRuntimePreflight(value), { code });
  }
});

test('R4-D preflight cannot claim activation, tool expansion, memory, provider, or service effects', () => {
  for (const field of [
    'external_runtime_activated', 'service_started', 'chatgpt_app_created',
    'direct_https_canary_passed', 'real_memory_allowed', 'write_tools_enabled',
    'public_tool_surface_expanded'
  ]) {
    const value = candidate();
    value.activation_boundary[field] = true;
    assert.throws(() => validateExternalOAuthRuntimePreflight(value), {
      code: `r4d_${field}_must_be_false`
    });
  }
  for (const [field, code] of [
    ['real_memory_reads', 'r4d_real_memory_reads_must_be_zero'],
    ['provider_calls', 'r4d_provider_calls_must_be_zero']
  ]) {
    const value = candidate();
    value.activation_boundary[field] = 1;
    assert.throws(() => validateExternalOAuthRuntimePreflight(value), { code });
  }
  const extra = candidate();
  extra.token = 'forbidden';
  assert.throws(() => validateExternalOAuthRuntimePreflight(extra), {
    code: 'r4d_preflight_shape_invalid'
  });
});

test('R4-D environment audit reports presence only and never reads values', () => {
  const env = {
    CODEX_MEMORY_R4_OPERATOR_REFERENCE: 'sensitive-operator-value',
    CODEX_MEMORY_R4_HOST_PROJECT_REFERENCE: 'sensitive-host-project-value',
    CODEX_MEMORY_R4_RELAY_AUTH_TOKEN: 'sensitive-token-value'
  };
  const presence = environmentPresence(env);
  assert.deepEqual(Object.keys(presence), ENV_REFERENCE_NAMES);
  assert.equal(presence.CODEX_MEMORY_R4_OPERATOR_REFERENCE, true);
  assert.equal(presence.CODEX_MEMORY_R4_HOST_PROJECT_REFERENCE, true);
  assert.equal(presence.CODEX_MEMORY_R4_RELAY_AUTH_TOKEN, true);
  assert.equal(presence.CODEX_MEMORY_R4_OAUTH_CLIENT_ID, false);
  const serialized = JSON.stringify(presence);
  assert.equal(serialized.includes('sensitive-operator-value'), false);
  assert.equal(serialized.includes('sensitive-host-project-value'), false);
  assert.equal(serialized.includes('sensitive-token-value'), false);
});
