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

test('trusted diary scope binding loads from process environment and constructor overrides win', () => {
  const keys = [
    'CODEX_MEMORY_EXPECTED_DIARY_SCOPE_MAPPING_REFERENCE',
    'CODEX_MEMORY_EXPECTED_DIARY_SCOPE_MAPPING_DIGEST'
  ];
  const before = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    process.env.CODEX_MEMORY_EXPECTED_DIARY_SCOPE_MAPPING_REFERENCE = 'jenn-vcp-diary-scope-v1';
    process.env.CODEX_MEMORY_EXPECTED_DIARY_SCOPE_MAPPING_DIGEST = `sha256:${'b'.repeat(64)}`;
    const fromEnv = createConfig().governedMcpVcpNativeScopeEnforcement;
    assert.equal(fromEnv.configured, true);
    assert.equal(fromEnv.expectedMappingDigest, `sha256:${'b'.repeat(64)}`);

    const override = createConfig({
      expectedDiaryScopeMappingReference: 'forged-reference',
      expectedDiaryScopeMappingDigest: 'sha256:not-a-digest'
    }).governedMcpVcpNativeScopeEnforcement;
    assert.equal(override.configured, false);
    assert.equal(override.expectedMappingReference, null);
    assert.equal(override.expectedMappingDigest, null);
  } finally {
    for (const key of keys) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  }
});
