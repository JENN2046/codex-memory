'use strict';

const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  GOVERNANCE_ROOT_IDENTITY_BYTES,
  GOVERNANCE_ROOT_IDENTITY_SHA256,
  deriveCm2103GovernancePaths
} = require('../src/core/Cm2103IdentityBoundStoreGovernance');
const {
  summarizeCm2103BootstrapState,
  transitionCm2103BootstrapState
} = require('../src/core/Cm2103IdentityBoundStoreBootstrapState');
const { sha256 } = require('../src/core/Cm2102IdentityBoundRollbackLifecycleFoundation');

test('CM-2103 state machine consumes directory and identity attempts before side effects', () => {
  let state = 'UNCLAIMED';
  state = transitionCm2103BootstrapState(state, 'CLAIM');
  assert.equal(state, 'CLAIMED');
  state = transitionCm2103BootstrapState(state, 'CONSUME_DIRECTORY_CREATE');
  assert.equal(state, 'STORE_DIRECTORY_CREATE_CONSUMED');
  assert.equal(summarizeCm2103BootstrapState(state).directoryCreateAttempted, true);
  assert.equal(summarizeCm2103BootstrapState(state).automaticRetryAllowed, false);
  state = transitionCm2103BootstrapState(state, 'DIRECTORY_CREATED');
  state = transitionCm2103BootstrapState(state, 'CONSUME_IDENTITY_WRITE');
  assert.equal(state, 'IDENTITY_WRITE_CONSUMED');
  state = transitionCm2103BootstrapState(state, 'IDENTITY_CREATED');
  state = transitionCm2103BootstrapState(state, 'READBACK_VERIFIED');
  assert.equal(state, 'CONSUMED_SUCCESS');
  assert.equal(summarizeCm2103BootstrapState(state).authorizationReplayAllowed, false);
  assert.throws(() => transitionCm2103BootstrapState(state, 'CLAIM'), /terminal_state/);
});

test('CM-2103 state machine preserves partial and ambiguous outcomes without retry or cleanup', () => {
  assert.equal(
    transitionCm2103BootstrapState('STORE_DIRECTORY_CREATE_CONSUMED', 'DIRECTORY_CREATE_AMBIGUOUS'),
    'CONSUMED_AMBIGUOUS'
  );
  assert.equal(
    transitionCm2103BootstrapState('IDENTITY_WRITE_CONSUMED', 'PARTIAL'),
    'CONSUMED_PARTIAL_BOOTSTRAP'
  );
  for (const state of ['CONSUMED_AMBIGUOUS', 'CONSUMED_PARTIAL_BOOTSTRAP']) {
    const summary = summarizeCm2103BootstrapState(state);
    assert.equal(summary.terminal, true);
    assert.equal(summary.authorizationReplayAllowed, false);
    assert.equal(summary.automaticRetryAllowed, false);
    assert.equal(summary.automaticCleanupAllowed, false);
    assert.equal(summary.reconciliationRequired, true);
  }
});

test('CM-2103 derives the store only from Git common-dir governance state', () => {
  const value = deriveCm2103GovernancePaths('/safe/repository/.git');
  assert.equal(value.storeRoot, path.resolve(
    '/safe/repository/.git',
    'codex-memory-governance',
    'phase8-identity-bound-synthetic-rollback-store-001'
  ));
  assert.equal(value.authorizationRegistryRoot, path.resolve(
    '/safe/repository/.git',
    'codex-memory-governance',
    'phase8-one-shot-authorization-registries'
  ));
  assert.equal(GOVERNANCE_ROOT_IDENTITY_BYTES.length, 216);
  assert.equal(sha256(GOVERNANCE_ROOT_IDENTITY_BYTES), GOVERNANCE_ROOT_IDENTITY_SHA256);
  assert.throws(() => deriveCm2103GovernancePaths(''), /git_common_dir_required/);
});
