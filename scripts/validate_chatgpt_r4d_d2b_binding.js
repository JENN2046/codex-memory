#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  D2B_ENV_REFERENCES,
  digestObject,
  isPlainObject,
  resolveSelfHostedBindingAmendment,
  validateSelfHostedBindingAmendment
} = require('../packages/chatgpt-r4-contracts');
const { canonicalSha256 } = require('./validate_chatgpt_web_r4_architecture');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA_PATH = path.join(
  ROOT,
  'schemas',
  'chatgpt-web-r4d-self-hosted-binding-amendment-v1.schema.json'
);
const EXAMPLE_PATH = path.join(
  ROOT,
  'examples',
  'chatgpt-web-r4d-self-hosted-binding-amendment.redacted.example.json'
);
const EXPECTED_SCHEMA_SHA256 = 'a864b6289443bc1b2162aa24410736b871927835f27580af2c02028e1f4af86e';
const PRIVATE_FINGERPRINT_KEYS = Object.freeze([
  'auth0_issuer_sha256',
  'edge_signing_key_id_sha256',
  'edge_signing_public_key_sha256',
  'host_project_reference_sha256',
  'oauth_client_id_sha256',
  'operator_reference_sha256',
  'previous_binding_reference_sha256',
  'previous_host_config_reference_sha256',
  'public_origin_sha256',
  'relay_auth_token_sha256',
  'relay_signing_key_id_sha256',
  'relay_signing_public_key_sha256',
  'relay_uds_path_sha256'
]);

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function validateSchema(schema) {
  invariant(schema.$schema === 'https://json-schema.org/draft/2020-12/schema', 'r4d_d2b_schema_draft_mismatch');
  invariant(schema.$id === 'codex-memory://chatgpt-web-r4d/self-hosted-binding-amendment-v1', 'r4d_d2b_schema_id_mismatch');
  invariant(schema.additionalProperties === false, 'r4d_d2b_schema_not_exact');
  invariant(schema.properties?.stage?.const === 'R4-D-D2B', 'r4d_d2b_schema_stage_mismatch');
  invariant(schema.properties?.ownership?.properties?.hosting_provider?.const === 'self_hosted_private_vm', 'r4d_d2b_schema_host_mismatch');
  invariant(schema.properties?.relay_authority?.properties?.transport_mode?.const === 'outbound_https_to_local_uds', 'r4d_d2b_schema_relay_mismatch');
  invariant(schema.properties?.relay_authority?.properties?.inbound_listener_allowed?.const === false, 'r4d_d2b_schema_listener_mismatch');
  invariant(schema.properties?.oauth?.properties?.scopes?.minItems === 1 &&
    schema.properties?.oauth?.properties?.scopes?.maxItems === 1,
  'r4d_d2b_schema_scope_cardinality_mismatch');
  invariant(rejectsRepeatedPlaceholder(schema.$defs?.sha40?.pattern, '0'.repeat(40)),
    'r4d_d2b_schema_sha40_placeholder_allowed');
  invariant(rejectsRepeatedPlaceholder(schema.$defs?.sha256?.pattern, `sha256:${'0'.repeat(64)}`),
    'r4d_d2b_schema_sha256_placeholder_allowed');
  invariant(schema.properties?.activation_boundary?.properties?.deployed?.const === false, 'r4d_d2b_schema_activation_mismatch');
  invariant(canonicalSha256(schema) === EXPECTED_SCHEMA_SHA256, 'r4d_d2b_schema_digest_mismatch');
}

function rejectsRepeatedPlaceholder(pattern, value) {
  try {
    return typeof pattern === 'string' && !new RegExp(pattern, 'u').test(value);
  } catch {
    return false;
  }
}

function validateRedactedExample(example) {
  let code = null;
  try {
    validateSelfHostedBindingAmendment(example);
  } catch (error) {
    code = error?.code || null;
  }
  invariant(
    code === 'r4d_issuer_invalid_non_public' || code === 'r4d_public_origin_invalid_non_public',
    'r4d_d2b_example_must_fail_closed'
  );
}

function validatePrivateBinding(file, { expectedCommit, expectedTree, digestFile } = {}) {
  const absolute = path.resolve(file);
  invariant(!isWithin(absolute, ROOT), 'r4d_d2b_private_binding_inside_repository');
  invariant(/^[a-f0-9]{40}$/u.test(expectedCommit || ''), 'r4d_d2b_expected_commit_invalid');
  invariant(/^[a-f0-9]{40}$/u.test(expectedTree || ''), 'r4d_d2b_expected_tree_invalid');
  assertOwnerOnlyFile(absolute);
  const input = loadJson(absolute);
  invariant(input.amendment?.source_identity?.commit_sha === expectedCommit, 'r4d_d2b_private_commit_mismatch');
  invariant(input.amendment?.source_identity?.tree_sha === expectedTree, 'r4d_d2b_private_tree_mismatch');
  const resolved = validatePrivateBindingEnvelope(input);
  if (digestFile) writeOwnerOnlyDigest(digestFile, resolved.bindingDigest);
  return {
    ...resolved.amendmentReceipt,
    private_binding_file_owner_only: true,
    exact_source_identity_match: true,
    exact_value_fingerprint_count: PRIVATE_FINGERPRINT_KEYS.length,
    exact_value_fingerprints_bound: true,
    canonical_digest_written_privately: Boolean(digestFile),
    reference_count: Object.keys(D2B_ENV_REFERENCES).length,
    secret_values_read: false,
    exact_values_returned: false
  };
}

function validatePrivateBindingEnvelope(input) {
  exactKeys(input, [
    'amendment', 'exact_value_fingerprints', 'private_binding_reference'
  ], 'r4d_d2b_private_envelope_shape_invalid');
  invariant(
    typeof input.private_binding_reference === 'string' &&
      /^binding:r4d-d2b:[A-Za-z0-9][A-Za-z0-9._-]{7,119}$/u.test(input.private_binding_reference) &&
      !/placeholder|example|todo/iu.test(input.private_binding_reference),
    'r4d_d2b_private_binding_reference_invalid'
  );
  exactKeys(
    input.exact_value_fingerprints,
    PRIVATE_FINGERPRINT_KEYS,
    'r4d_d2b_private_fingerprint_shape_invalid'
  );
  for (const key of PRIVATE_FINGERPRINT_KEYS) {
    const value = input.exact_value_fingerprints[key];
    invariant(
      typeof value === 'string' && /^sha256:[a-f0-9]{64}$/u.test(value) &&
        !/^(.)\1+$/u.test(value.slice(7)),
      'r4d_d2b_private_fingerprint_invalid'
    );
  }
  const amendment = resolveSelfHostedBindingAmendment(input.amendment);
  return {
    amendmentReceipt: amendment.receipt,
    bindingDigest: digestObject(input)
  };
}

function exactKeys(value, expected, code) {
  invariant(isPlainObject(value), code);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  invariant(
    actual.length === wanted.length && actual.every((key, index) => key === wanted[index]),
    code
  );
}

function assertOwnerOnlyFile(file) {
  const directory = path.dirname(file);
  const directoryStat = fs.statSync(directory);
  const stat = fs.statSync(file);
  const uid = typeof process.getuid === 'function' ? process.getuid() : null;
  invariant(directoryStat.isDirectory() && (directoryStat.mode & 0o077) === 0, 'r4d_d2b_private_directory_permissions_invalid');
  invariant(stat.isFile() && (stat.mode & 0o077) === 0 && stat.size > 0 && stat.size <= 64 * 1024, 'r4d_d2b_private_file_permissions_invalid');
  if (uid !== null) {
    invariant(directoryStat.uid === uid && stat.uid === uid, 'r4d_d2b_private_file_owner_invalid');
  }
}

function writeOwnerOnlyDigest(file, digest) {
  const absolute = path.resolve(file);
  invariant(!isWithin(absolute, ROOT), 'r4d_d2b_digest_inside_repository');
  const directory = path.dirname(absolute);
  const directoryStat = fs.statSync(directory);
  const uid = typeof process.getuid === 'function' ? process.getuid() : null;
  invariant(directoryStat.isDirectory() && (directoryStat.mode & 0o077) === 0, 'r4d_d2b_digest_directory_permissions_invalid');
  if (uid !== null) invariant(directoryStat.uid === uid, 'r4d_d2b_digest_directory_owner_invalid');
  fs.writeFileSync(absolute, `${digest}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
}

function isWithin(file, directory) {
  const relative = path.relative(directory, file);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function invariant(condition, code) {
  if (!condition) throw new Error(code);
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!['--private-binding', '--expected-commit', '--expected-tree', '--write-digest'].includes(flag)) {
      throw new Error('r4d_d2b_argument_invalid');
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error('r4d_d2b_argument_value_missing');
    options[flag.slice(2).replaceAll('-', '_')] = value;
    index += 1;
  }
  return options;
}

function main(argv = process.argv.slice(2)) {
  validateSchema(loadJson(SCHEMA_PATH));
  validateRedactedExample(loadJson(EXAMPLE_PATH));
  const options = parseArguments(argv);
  const receipt = options.private_binding
    ? validatePrivateBinding(options.private_binding, {
      expectedCommit: options.expected_commit,
      expectedTree: options.expected_tree,
      digestFile: options.write_digest
    })
    : {
      accepted: true,
      stage: 'R4-D-D2B',
      contract: 'self_hosted_binding_amendment_v1',
      schema_digest_bound: true,
      redacted_example_activation_ready: false,
      private_binding_validated: false,
      activation_performed: false,
      production_ready_claimed: false,
      release_ready_claimed: false,
      cutover_ready_claimed: false
    };
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
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
  EXAMPLE_PATH,
  EXPECTED_SCHEMA_SHA256,
  PRIVATE_FINGERPRINT_KEYS,
  ROOT,
  SCHEMA_PATH,
  assertOwnerOnlyFile,
  loadJson,
  parseArguments,
  validatePrivateBinding,
  validatePrivateBindingEnvelope,
  validateRedactedExample,
  validateSchema,
  writeOwnerOnlyDigest
};
