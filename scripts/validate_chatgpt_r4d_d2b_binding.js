#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  D2B_ENV_REFERENCES,
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
const EXPECTED_SCHEMA_SHA256 = '8aaa62da452fcc16c4953adb38d5f298586194e6e49760da2d59525a06355cb3';

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
  invariant(schema.properties?.activation_boundary?.properties?.deployed?.const === false, 'r4d_d2b_schema_activation_mismatch');
  invariant(canonicalSha256(schema) === EXPECTED_SCHEMA_SHA256, 'r4d_d2b_schema_digest_mismatch');
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
  invariant(input.source_identity?.commit_sha === expectedCommit, 'r4d_d2b_private_commit_mismatch');
  invariant(input.source_identity?.tree_sha === expectedTree, 'r4d_d2b_private_tree_mismatch');
  const resolved = resolveSelfHostedBindingAmendment(input);
  if (digestFile) writeOwnerOnlyDigest(digestFile, resolved.bindingDigest);
  return {
    ...resolved.receipt,
    private_binding_file_owner_only: true,
    exact_source_identity_match: true,
    canonical_digest_written_privately: Boolean(digestFile),
    reference_count: Object.keys(D2B_ENV_REFERENCES).length,
    secret_values_read: false,
    exact_values_returned: false
  };
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
  ROOT,
  SCHEMA_PATH,
  assertOwnerOnlyFile,
  loadJson,
  parseArguments,
  validatePrivateBinding,
  validateRedactedExample,
  validateSchema,
  writeOwnerOnlyDigest
};
