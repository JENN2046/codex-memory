'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  buildRecordMemoryPrincipalScopeAuthorizationRuntime,
  normalizeRecordMemoryPrincipalScopeAuthorizationConfig
} = require('../src/core/RecordMemoryPrincipalScopeAuthorizationConfig');

const policy = {
  allowedAgentAlias: 'Codex',
  allowedAgentIds: ['codex-desktop', 'codex-desktop'],
  allowedRequestSources: 'codex-memory-mcp|codex-memory-mcp',
  allowedProjectIds: ['codex-memory'],
  allowedWorkspaceIds: 'workspace-alpha, workspace-alpha',
  allowedClientIds: ['codex']
};

test('CM1640 defaults record_memory principal scope authorization config to off', () => {
  const config = normalizeRecordMemoryPrincipalScopeAuthorizationConfig();
  const runtime = buildRecordMemoryPrincipalScopeAuthorizationRuntime();

  assert.equal(config.mode, 'off');
  assert.equal(config.enabled, false);
  assert.equal(config.defaultOff, true);
  assert.equal(config.strictMode, false);
  assert.equal(config.currentRuntimeAuthorizationChanged, false);
  assert.equal(config.publicMcpExpanded, false);
  assert.deepEqual(config.policy.allowedAgentIds, []);
  assert.equal(runtime.preflight, null);
  assert.equal(runtime.policy, null);
  assert.equal(runtime.strictMode, false);
});

test('CM1640 normalizes observe policy without strict enforcement', () => {
  const config = normalizeRecordMemoryPrincipalScopeAuthorizationConfig({
    mode: 'observe',
    policy
  });
  const runtime = buildRecordMemoryPrincipalScopeAuthorizationRuntime(config);

  assert.equal(config.mode, 'observe');
  assert.equal(config.enabled, true);
  assert.equal(config.observeOnly, true);
  assert.equal(config.strictMode, false);
  assert.equal(config.requiredPolicyPresent, true);
  assert.deepEqual(config.policy.allowedAgentIds, ['codex-desktop']);
  assert.deepEqual(config.policy.allowedRequestSources, ['codex-memory-mcp']);
  assert.deepEqual(config.policy.allowedWorkspaceIds, ['workspace-alpha']);
  assert.equal(typeof runtime.preflight, 'function');
  assert.deepEqual(runtime.policy, config.policy);
  assert.equal(runtime.strictMode, false);
});

test('CM1640 normalizes strict policy from flat config shape', () => {
  const config = normalizeRecordMemoryPrincipalScopeAuthorizationConfig({
    mode: 'strict',
    ...policy
  });
  const runtime = buildRecordMemoryPrincipalScopeAuthorizationRuntime(config);

  assert.equal(config.mode, 'strict');
  assert.equal(config.enabled, true);
  assert.equal(config.observeOnly, false);
  assert.equal(config.strictMode, true);
  assert.equal(config.requiredPolicyPresent, true);
  assert.equal(config.lowDisclosureRejection, true);
  assert.equal(typeof runtime.preflight, 'function');
  assert.equal(runtime.strictMode, true);
});

test('CM1640 invalid mode fails closed to off instead of accidental enforcement', () => {
  const config = normalizeRecordMemoryPrincipalScopeAuthorizationConfig({
    mode: 'production',
    policy
  });
  const runtime = buildRecordMemoryPrincipalScopeAuthorizationRuntime(config);

  assert.equal(config.mode, 'off');
  assert.equal(config.enabled, false);
  assert.equal(config.defaultOff, true);
  assert.equal(config.strictMode, false);
  assert.equal(runtime.preflight, null);
  assert.equal(runtime.policy, null);
  assert.equal(runtime.strictMode, false);
});
