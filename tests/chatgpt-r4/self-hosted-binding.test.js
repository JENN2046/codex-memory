'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  D2B_ZERO_COUNTERS,
  resolveSelfHostedBindingAmendment,
  sha256,
  validateSelfHostedBindingAmendment
} = require('../../packages/chatgpt-r4-contracts');
const {
  loadJson,
  PRIVATE_FINGERPRINT_KEYS,
  validateRedactedExample,
  validatePrivateBindingEnvelope,
  validateSchema,
  EXAMPLE_PATH,
  SCHEMA_PATH
} = require('../../scripts/validate_chatgpt_r4d_d2b_binding');

function candidate() {
  return {
    schema_version: 1,
    architecture_reference: 'codex-memory-chatgpt-web-r4-v1',
    stage: 'R4-D-D2B',
    amendment: {
      amendment_reference: 'binding:r4d-d2b:private-001',
      binding_reference: 'env:CODEX_MEMORY_R4_BINDING_REFERENCE',
      previous_binding_digest: `sha256:${'0123456789abcdef'.repeat(4)}`,
      reason: 'self_hosted_private_vm_selected'
    },
    ownership: {
      deployment_class: 'private_development',
      hosting_provider: 'self_hosted_private_vm',
      host_service_mode: 'isolated_container_loopback_reverse_proxy',
      host_project_reference: 'env:CODEX_MEMORY_R4_HOST_PROJECT_REFERENCE',
      operator_count: 1,
      operator_reference: 'env:CODEX_MEMORY_R4_OPERATOR_REFERENCE',
      operator_role: 'owner'
    },
    oauth: {
      identity_provider: 'auth0',
      client_registration_mode: 'predefined_public_client',
      issuer: 'https://jenn-dev.us.auth0.com/',
      resource: 'https://memory-edge.jenn.dev',
      scopes: ['memory.read'],
      pkce_method: 'S256',
      oauth_client_id: 'env:CODEX_MEMORY_R4_OAUTH_CLIENT_ID',
      auth0_jwks_uri: 'env:CODEX_MEMORY_R4_AUTH0_JWKS_URI',
      operator_subject_fingerprint: 'env:CODEX_MEMORY_R4_OPERATOR_SUBJECT_FINGERPRINT'
    },
    endpoints: {
      public_origin: 'https://memory-edge.jenn.dev',
      mcp_path: '/mcp',
      protected_resource_metadata_path: '/.well-known/oauth-protected-resource',
      authorization_server_discovery_url: 'https://jenn-dev.us.auth0.com/.well-known/openid-configuration'
    },
    relay_authority: {
      transport_mode: 'outbound_https_to_local_uds',
      edge_signing_private_key: 'env:CODEX_MEMORY_R4_EDGE_SIGNING_PRIVATE_KEY',
      edge_signing_public_key: 'env:CODEX_MEMORY_R4_EDGE_SIGNING_PUBLIC_KEY',
      edge_signing_key_id: 'env:CODEX_MEMORY_R4_EDGE_SIGNING_KEY_ID',
      relay_signing_private_key: 'env:CODEX_MEMORY_R4_RELAY_SIGNING_PRIVATE_KEY',
      relay_signing_public_key: 'env:CODEX_MEMORY_R4_RELAY_SIGNING_PUBLIC_KEY',
      relay_signing_key_id: 'env:CODEX_MEMORY_R4_RELAY_SIGNING_KEY_ID',
      relay_auth_token: 'env:CODEX_MEMORY_R4_RELAY_AUTH_TOKEN',
      relay_uds_path: 'env:CODEX_MEMORY_R4_RELAY_UDS_PATH',
      inbound_listener_allowed: false,
      body_logging_allowed: false,
      durable_state_allowed: false
    },
    rollback: {
      previous_binding_reference: 'env:CODEX_MEMORY_R4_PREVIOUS_BINDING_REFERENCE',
      previous_host_config_reference: 'env:CODEX_MEMORY_R4_PREVIOUS_HOST_CONFIG_REFERENCE',
      relay_stop_ready: true,
      container_stop_ready: true,
      reverse_proxy_disable_ready: true,
      credential_revocation_ready: true
    },
    source_identity: {
      repository: 'JENN2046/codex-memory',
      base_commit_sha: '0123456789abcdef0123456789abcdef01234567',
      commit_sha: '89abcdef0123456789abcdef0123456789abcdef',
      tree_sha: 'fedcba9876543210fedcba9876543210fedcba98',
      lockfile_sha256: `sha256:${'0123456789abcdef'.repeat(4)}`,
      edge_artifact_sha256: `sha256:${'fedcba9876543210'.repeat(4)}`
    },
    activation_boundary: {
      deployed: false,
      service_started: false,
      external_service_changed: false,
      chatgpt_app_created: false,
      oauth_token_exchanges: 0,
      provider_calls: 0,
      memory_read: false,
      memory_write: false
    }
  };
}

test('R4-D D2B accepts only a self-hosted single-operator outbound Relay amendment', () => {
  const input = candidate();
  const resolved = resolveSelfHostedBindingAmendment(input);
  assert.match(resolved.bindingDigest, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(resolved.receipt.accepted, true);
  assert.equal(resolved.receipt.hosting_provider_selected, 'self_hosted_private_vm');
  assert.equal(resolved.receipt.outbound_relay_bound, true);
  assert.equal(resolved.receipt.relay_inbound_listener_allowed, false);
  assert.equal(resolved.receipt.exact_values_returned, false);
  assert.equal(resolved.receipt.activation_performed, false);
  assert.deepEqual(resolved.receipt.counters, D2B_ZERO_COUNTERS);

  const serialized = JSON.stringify(resolved.receipt);
  for (const forbidden of [input.oauth.issuer, input.oauth.resource, 'env:', resolved.bindingDigest]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test('R4-D D2B rejects host, Relay authority, OAuth, rollback, and activation weakening', () => {
  const cases = [
    [value => { value.ownership.hosting_provider = 'render'; }, 'r4d_d2b_hosting_provider_invalid'],
    [value => { value.ownership.operator_count = 2; }, 'r4d_d2b_operator_count_invalid'],
    [value => { value.relay_authority.transport_mode = 'inbound_http'; }, 'r4d_d2b_relay_transport_invalid'],
    [value => { value.relay_authority.inbound_listener_allowed = true; }, 'r4d_d2b_relay_listener_forbidden'],
    [value => { value.relay_authority.body_logging_allowed = true; }, 'r4d_d2b_relay_body_log_forbidden'],
    [value => { value.relay_authority.durable_state_allowed = true; }, 'r4d_d2b_relay_durable_state_forbidden'],
    [value => { value.oauth.resource = 'https://other.jenn.dev'; }, 'r4d_d2b_resource_origin_mismatch'],
    [value => { delete value.oauth.auth0_jwks_uri; }, 'r4d_d2b_oauth_shape_invalid'],
    [value => { delete value.oauth.operator_subject_fingerprint; }, 'r4d_d2b_oauth_shape_invalid'],
    [value => { delete value.amendment.binding_reference; }, 'r4d_d2b_amendment_shape_invalid'],
    [value => { value.oauth.scopes = ['memory.read', 'memory.write']; }, 'r4d_d2b_scopes_invalid'],
    [value => { value.rollback.relay_stop_ready = false; }, 'r4d_d2b_relay_stop_ready_invalid'],
    [value => { value.activation_boundary.deployed = true; }, 'r4d_d2b_deployed_must_be_false'],
    [value => { value.activation_boundary.oauth_token_exchanges = 1; }, 'r4d_d2b_token_exchange_must_be_zero']
  ];
  for (const [mutate, code] of cases) {
    const value = candidate();
    mutate(value);
    assert.throws(() => validateSelfHostedBindingAmendment(value), { code });
  }
});

test('R4-D D2B rejects reused references, placeholders, IP origins, and source placeholders', () => {
  const reused = candidate();
  reused.relay_authority.relay_signing_private_key = reused.relay_authority.edge_signing_public_key;
  assert.throws(() => validateSelfHostedBindingAmendment(reused), {
    code: 'r4d_d2b_env_reference_invalid'
  });

  const incompleteEdge = candidate();
  delete incompleteEdge.relay_authority.edge_signing_private_key;
  assert.throws(() => validateSelfHostedBindingAmendment(incompleteEdge), {
    code: 'r4d_d2b_relay_shape_invalid'
  });

  const incompleteRelay = candidate();
  delete incompleteRelay.relay_authority.relay_signing_public_key;
  assert.throws(() => validateSelfHostedBindingAmendment(incompleteRelay), {
    code: 'r4d_d2b_relay_shape_invalid'
  });

  const placeholder = candidate();
  placeholder.amendment.amendment_reference = 'binding:placeholder';
  assert.throws(() => validateSelfHostedBindingAmendment(placeholder), {
    code: 'r4d_d2b_amendment_reference_invalid'
  });

  const ip = candidate();
  ip.oauth.resource = 'https://127.0.0.1';
  ip.endpoints.public_origin = ip.oauth.resource;
  assert.throws(() => validateSelfHostedBindingAmendment(ip), {
    code: 'r4d_public_origin_invalid_non_public'
  });

  const source = candidate();
  source.source_identity.commit_sha = '0'.repeat(40);
  assert.throws(() => validateSelfHostedBindingAmendment(source), {
    code: 'r4d_d2b_commit_invalid'
  });

  const artifact = candidate();
  artifact.source_identity.edge_artifact_sha256 = `sha256:${'0'.repeat(64)}`;
  assert.throws(() => validateSelfHostedBindingAmendment(artifact), {
    code: 'r4d_d2b_edge_artifact_invalid'
  });
});

test('R4-D D2B schema is frozen and redacted example remains activation-ineligible', () => {
  const schema = loadJson(SCHEMA_PATH);
  assert.doesNotThrow(() => validateSchema(schema));
  assert.equal(schema.properties.oauth.properties.scopes.minItems, 1);
  assert.equal(schema.properties.oauth.properties.scopes.maxItems, 1);
  assert.equal(new RegExp(schema.$defs.sha40.pattern, 'u').test('0'.repeat(40)), false);
  assert.equal(new RegExp(schema.$defs.sha256.pattern, 'u').test(`sha256:${'f'.repeat(64)}`), false);
  const publicOrigin = new RegExp(schema.$defs.publicOrigin.pattern, 'u');
  const publicIssuer = new RegExp(schema.$defs.publicIssuer.pattern, 'u');
  const publicDiscovery = new RegExp(schema.$defs.publicDiscovery.pattern, 'u');
  assert.equal(publicOrigin.test('https://memory.jenn.dev'), true);
  assert.equal(publicOrigin.test('https://memory.jenn.dev:65535'), true);
  assert.equal(publicIssuer.test('https://tenant.auth0.com/'), true);
  assert.equal(publicDiscovery.test('https://tenant.auth0.com/.well-known/openid-configuration'), true);
  for (const value of [
    'https://127.0.0.1',
    'https://memory.local',
    'https://example.invalid',
    'https://memory.jenn.dev:443',
    'https://memory.jenn.dev:65536'
  ]) {
    assert.equal(publicOrigin.test(value), false);
    assert.equal(publicIssuer.test(`${value}/`), false);
    assert.equal(publicDiscovery.test(`${value}/.well-known/openid-configuration`), false);
  }
  assert.doesNotThrow(() => validateRedactedExample(loadJson(EXAMPLE_PATH)));
});

test('R4-D D2B private envelope binds exact-value fingerprints without returning them', () => {
  const privateBindingReference = 'binding:r4d-d2b:private-test-0001';
  const exactValueFingerprints = Object.fromEntries(
    PRIVATE_FINGERPRINT_KEYS.map((key, index) => [
      key,
      `sha256:${(index + 1).toString(16).padStart(2, '0').repeat(32)}`
    ])
  );
  exactValueFingerprints.binding_reference_sha256 = sha256(privateBindingReference);
  const envelope = {
    private_binding_reference: privateBindingReference,
    amendment: candidate(),
    exact_value_fingerprints: exactValueFingerprints
  };
  const resolved = validatePrivateBindingEnvelope(envelope);
  assert.match(resolved.bindingDigest, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(resolved.amendmentReceipt.accepted, true);
  assert.equal(JSON.stringify(resolved.amendmentReceipt).includes('auth0_issuer_sha256'), false);

  const reusedPublicKey = structuredClone(envelope);
  reusedPublicKey.exact_value_fingerprints.relay_signing_public_key_sha256 =
    reusedPublicKey.exact_value_fingerprints.edge_signing_public_key_sha256;
  assert.throws(() => validatePrivateBindingEnvelope(reusedPublicKey), {
    message: 'r4d_d2b_private_signing_public_key_reused'
  });
  const reusedKeyId = structuredClone(envelope);
  reusedKeyId.exact_value_fingerprints.relay_signing_key_id_sha256 =
    reusedKeyId.exact_value_fingerprints.edge_signing_key_id_sha256;
  assert.throws(() => validatePrivateBindingEnvelope(reusedKeyId), {
    message: 'r4d_d2b_private_signing_key_id_reused'
  });

  const mismatchedBindingReference = structuredClone(envelope);
  mismatchedBindingReference.private_binding_reference = 'binding:r4d-d2b:private-test-0002';
  assert.throws(() => validatePrivateBindingEnvelope(mismatchedBindingReference), {
    message: 'r4d_d2b_private_binding_reference_fingerprint_mismatch'
  });

  delete envelope.exact_value_fingerprints.relay_auth_token_sha256;
  assert.throws(() => validatePrivateBindingEnvelope(envelope), {
    message: 'r4d_d2b_private_fingerprint_shape_invalid'
  });
});

module.exports = { candidate };
