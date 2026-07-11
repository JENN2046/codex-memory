'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  APPLICATION_PATH,
  createCm2104BootstrapAuthorizationContentApplication,
  evaluateCm2104BootstrapAuthorizationContentApplication,
  loadFrozenGatePacket
} = require('../src/core/Cm2104BootstrapAuthorizationContentApplicationContract');

const repoRoot = path.resolve(__dirname, '..');
const applicationFreezeCommit = '3477c567642e47e12bfed30711b182f18d49b074';
const gatePacket = loadFrozenGatePacket(repoRoot);
const application = JSON.parse(fs.readFileSync(path.join(repoRoot, APPLICATION_PATH), 'utf8'));

function gitObjectExists(commit, objectPath) {
  return spawnSync('git', ['cat-file', '-e', `${commit}:${objectPath}`], {
    cwd: repoRoot,
    stdio: 'ignore'
  }).status === 0;
}

test('CM-2104-A frozen application exactly matches the contract-generated no-execution application', () => {
  assert.deepEqual(application, createCm2104BootstrapAuthorizationContentApplication(gatePacket));
  const result = evaluateCm2104BootstrapAuthorizationContentApplication({ application, gatePacket });
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.contentDecisionIssued, false);
  assert.equal(result.finalExecutionReleaseIssued, false);
  assert.equal(result.executionAuthorized, false);
  assert.equal(gitObjectExists(applicationFreezeCommit, application.contentDecisionPath), false);
  assert.equal(gitObjectExists(applicationFreezeCommit, application.finalExecutionReleaseDecisionPath), false);
  assert.equal(fs.existsSync(path.join(repoRoot, application.finalExecutionReleaseDecisionPath)), false);
});

test('CM-2104-A frozen application preserves zero effects and incomplete Phase 8 boundaries', () => {
  assert.deepEqual(new Set(Object.values(application.applicationEffects)), new Set([0]));
  assert.deepEqual(new Set(Object.values(application.currentAuthority)), new Set([false]));
  assert.deepEqual(new Set(Object.values(application.completionBoundaries)), new Set([false]));
  assert.equal(application.applicationReadyForIndependentContentReview, true);
  assert.equal(application.applicationReadyForFinalExecutionReleaseReview, false);
  assert.equal(application.applicationReadyForBootstrapExecution, false);
});
