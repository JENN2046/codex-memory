#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  REQUIRED_ENV_REFERENCES,
  validateExternalOAuthRuntimePreflight
} = require('../packages/chatgpt-r4-contracts');
const { canonicalSha256 } = require('./validate_chatgpt_web_r4_architecture');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA_PATH = path.join(
  ROOT,
  'schemas',
  'chatgpt-web-r4d-oauth-runtime-preflight-v1.schema.json'
);
const EXAMPLE_PATH = path.join(
  ROOT,
  'examples',
  'chatgpt-web-r4d-oauth-runtime-preflight.redacted.example.json'
);
const DOC_PATH = path.join(ROOT, 'docs', 'CHATGPT_WEB_R4D_EXTERNAL_RUNTIME_PREFLIGHT.md');
const EXPECTED_SCHEMA_SHA256 = '6137b2ba1687a0142ef6802690eafa3e9c2ee99380b1241e2d5bc99da3cf1b0a';

const ENV_REFERENCE_NAMES = Object.freeze([
  'CODEX_MEMORY_R4_OPERATOR_REFERENCE',
  'CODEX_MEMORY_R4_HOST_PROJECT_REFERENCE',
  'CODEX_MEMORY_R4_OAUTH_CLIENT_ID',
  'CODEX_MEMORY_R4_EDGE_SIGNING_PRIVATE_KEY',
  'CODEX_MEMORY_R4_RELAY_AUTH_TOKEN',
  'CODEX_MEMORY_R4_PREVIOUS_BINDING_REFERENCE'
]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function validateSchema(schema) {
  invariant(schema.$schema === 'https://json-schema.org/draft/2020-12/schema', 'r4d schema draft mismatch');
  invariant(schema.$id === 'codex-memory://chatgpt-web-r4d/oauth-runtime-preflight-v1', 'r4d schema id mismatch');
  invariant(schema.additionalProperties === false, 'r4d top-level schema must be exact');
  invariant(schema.properties?.stage?.const === 'R4-D', 'r4d stage schema mismatch');
  invariant(schema.properties?.oauth?.properties?.identity_provider?.const === 'auth0', 'r4d IdP selection mismatch');
  invariant(schema.properties?.oauth?.properties?.pkce_method?.const === 'S256', 'r4d PKCE mismatch');
  invariant(schema.properties?.runtime?.properties?.transport_mode?.const === 'direct_https', 'r4d direct HTTPS mismatch');
  invariant(schema.properties?.runtime?.properties?.adapter_mode?.const === 'none', 'r4d adapter preflight mismatch');
  invariant(schema.properties?.activation_boundary?.properties?.real_memory_allowed?.const === false, 'r4d real-memory boundary mismatch');
  invariant(canonicalSha256(schema) === EXPECTED_SCHEMA_SHA256, 'r4d schema canonical digest mismatch');
}

function validateRedactedExample(example) {
  invariant(example.stage === 'R4-D', 'r4d example stage mismatch');
  invariant(example.oauth?.identity_provider === 'auth0', 'r4d example IdP mismatch');
  invariant(example.runtime?.transport_mode === 'direct_https', 'r4d example transport mismatch');
  invariant(example.activation_boundary?.real_memory_allowed === false, 'r4d example real-memory boundary mismatch');
  let rejectionCode = null;
  try {
    validateExternalOAuthRuntimePreflight(example);
  } catch (error) {
    rejectionCode = error?.code || null;
  }
  invariant(rejectionCode === 'r4d_public_origin_invalid_non_public', 'redacted example must fail closed before activation');
}

function validateDocMarkers() {
  const doc = fs.readFileSync(DOC_PATH, 'utf8');
  for (const marker of [
    'Auth0',
    'predefined public client',
    'Direct HTTPS',
    'PKCE `S256`',
    '`memory.read`',
    'real-memory-reads: 0',
    'production-ready: false'
  ]) {
    invariant(doc.includes(marker), `missing R4-D doc marker: ${marker}`);
  }
}

function environmentPresence(env = process.env) {
  return Object.fromEntries(ENV_REFERENCE_NAMES.map(name => [
    name,
    Object.prototype.hasOwnProperty.call(env, name)
  ]));
}

function main() {
  const schema = loadJson(SCHEMA_PATH);
  const example = loadJson(EXAMPLE_PATH);
  validateSchema(schema);
  validateRedactedExample(example);
  validateDocMarkers();
  const presence = environmentPresence();
  const presentCount = Object.values(presence).filter(Boolean).length;
  process.stdout.write(`${JSON.stringify({
    accepted: true,
    stage: 'R4-D',
    contract: 'oauth_external_runtime_preflight_v1',
    primary_archetype: 'interactive_decoupled',
    identity_provider_selected: 'auth0',
    hosting_provider_selected: 'render',
    direct_https_first: true,
    schema_digest_bound: true,
    redacted_example_activation_ready: false,
    required_env_reference_count: REQUIRED_ENV_REFERENCES.length,
    bound_env_reference_count: presentCount,
    env_reference_presence_only: presence,
    secret_values_read: false,
    runtime_config_written: false,
    external_runtime_called: false,
    service_started: false,
    real_memory_read: false,
    provider_call: false,
    activation_performed: false,
    production_ready_claimed: false,
    release_ready_claimed: false,
    cutover_ready_claimed: false
  })}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  DOC_PATH,
  ENV_REFERENCE_NAMES,
  EXAMPLE_PATH,
  EXPECTED_SCHEMA_SHA256,
  SCHEMA_PATH,
  environmentPresence,
  loadJson,
  validateDocMarkers,
  validateRedactedExample,
  validateSchema
};
