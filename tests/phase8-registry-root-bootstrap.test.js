'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DECISION_PATH,
  EXPECTED_DECISION_REFERENCE,
  ROOT_IDENTITY_BYTES,
  ROOT_IDENTITY_SHA256,
  bootstrapPhase8RegistryRoot
} = require('../src/cli/phase8-registry-root-bootstrap');
const { sha256 } = require('../src/core/Phase8OneShotNativeWriteExecutionGate');

test('registry root bootstrap constants bind exact approved bytes and remain non-native', () => {
  assert.equal(DECISION_PATH, 'docs/near-model-memory-plan-pack/phase8_content_decision_cm2093.json');
  assert.equal(EXPECTED_DECISION_REFERENCE, 'CM-2093-ER-20260711-CONTENT-ROOT-BOOTSTRAP-PASS-240FD4F7');
  assert.equal(ROOT_IDENTITY_BYTES.length, 216);
  assert.equal(sha256(ROOT_IDENTITY_BYTES), ROOT_IDENTITY_SHA256);
  const value = JSON.parse(ROOT_IDENTITY_BYTES);
  assert.equal(value.registryRootReinitializationAllowed, false);
  assert.equal(value.registryRootReplacementAllowed, false);
});

test('registry root bootstrap rejects missing exact freeze commit before Git or filesystem action', async () => {
  await assert.rejects(bootstrapPhase8RegistryRoot(null), /decision_source_commit_required/);
  await assert.rejects(bootstrapPhase8RegistryRoot({ decisionSourceCommit: 'a'.repeat(40) }), /decision_source_commit_required/);
});
