'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DECISION_PATH,
  EXPECTED_DECISION_BLOB_OID,
  EXPECTED_DECISION_BYTES,
  EXPECTED_DECISION_REFERENCE,
  EXPECTED_DECISION_SHA256,
  EXPECTED_DECISION_SOURCE_COMMIT,
  ROOT_IDENTITY_BYTES,
  ROOT_IDENTITY_SHA256,
  bootstrapPhase8RegistryRoot
} = require('../src/cli/phase8-registry-root-bootstrap');
const { sha256 } = require('../src/core/Phase8OneShotNativeWriteExecutionGate');

test('registry root bootstrap constants bind exact approved bytes and remain non-native', () => {
  assert.equal(DECISION_PATH, 'docs/near-model-memory-plan-pack/phase8_content_decision_cm2093.json');
  assert.equal(EXPECTED_DECISION_REFERENCE, 'CM-2093-ER-20260711-CONTENT-ROOT-BOOTSTRAP-PASS-240FD4F7');
  assert.equal(EXPECTED_DECISION_SOURCE_COMMIT, 'aecc431de4533e1c3a0e9f42948b217f835b4c7e');
  assert.equal(EXPECTED_DECISION_BLOB_OID, 'bc251e7a34152b41724f3c098fee12baefe0f787');
  assert.equal(EXPECTED_DECISION_BYTES, 1062);
  assert.equal(EXPECTED_DECISION_SHA256, '9fb37b29e18ee65225e8e2fcb9628260ba93afb5ced6c195388e390570daa5dc');
  assert.equal(ROOT_IDENTITY_BYTES.length, 216);
  assert.equal(sha256(ROOT_IDENTITY_BYTES), ROOT_IDENTITY_SHA256);
  const value = JSON.parse(ROOT_IDENTITY_BYTES);
  assert.equal(value.registryRootReinitializationAllowed, false);
  assert.equal(value.registryRootReplacementAllowed, false);
});

test('registry root bootstrap rejects missing exact freeze commit before Git or filesystem action', async () => {
  await assert.rejects(bootstrapPhase8RegistryRoot(null), /decision_source_commit_required/);
  await assert.rejects(bootstrapPhase8RegistryRoot({ decisionSourceCommit: 'a'.repeat(40) }), /decision_source_commit_required/);
  await assert.rejects(bootstrapPhase8RegistryRoot('a'.repeat(40)), /content_decision_git_identity_mismatch/);
});
