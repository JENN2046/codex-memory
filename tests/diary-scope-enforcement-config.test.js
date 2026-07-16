'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { createConfig } = require('../src/config/createConfig');

test('trusted static diary scope binding is fixed and malformed values fail closed', () => {
  const digest = `sha256:${'a'.repeat(64)}`;
  const configured = createConfig({
    expectedDiaryScopeMappingReference: 'jenn-vcp-diary-scope-v1',
    expectedDiaryScopeMappingDigest: digest
  }).governedMcpVcpNativeScopeEnforcement;
  assert.deepEqual(configured, {
    scopeEnforcementMode: 'diary_allowlist_v1',
    expectedMappingReference: 'jenn-vcp-diary-scope-v1',
    expectedMappingDigest: digest,
    configured: true,
    toolArgumentsMayOverride: false,
    governanceMetadataMayOverride: false,
    scopeIdAffectsDiaryAcl: false,
    readinessClaimed: false
  });

  const rejected = createConfig({
    expectedDiaryScopeMappingReference: 'forged-reference',
    expectedDiaryScopeMappingDigest: 'sha256:not-a-digest'
  }).governedMcpVcpNativeScopeEnforcement;
  assert.equal(rejected.configured, false);
  assert.equal(rejected.expectedMappingReference, null);
  assert.equal(rejected.expectedMappingDigest, null);
});
