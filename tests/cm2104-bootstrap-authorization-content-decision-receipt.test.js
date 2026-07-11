'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  evaluateCm2104BootstrapAuthorizationContentDecisionIntake
} = require('../src/core/Cm2104IdentityBoundStoreBootstrapAuthorizationContentDecisionIntake');
const {
  contentDecisionBindingFromPacket,
  loadFrozenGatePacket
} = require('../src/core/Cm2104BootstrapAuthorizationContentApplicationContract');
const {
  RECEIPT_PATH,
  evaluateCm2104BootstrapAuthorizationContentDecisionReceipt
} = require('../src/core/Cm2104BootstrapAuthorizationContentDecisionReceiptContract');
const {
  FINAL_EXECUTION_RELEASE_DECISION_PATH
} = require('../src/core/Cm2104IdentityBoundStoreBootstrapAuthorizationGatePacketContract');

const repoRoot = path.resolve(__dirname, '..');
const receipt = JSON.parse(fs.readFileSync(path.join(repoRoot, RECEIPT_PATH), 'utf8'));
const receiptFreezeCommit = '4cf5f44dde337fd09c6d71295b628f7a8408025c';

function gitObjectExists(commit, objectPath) {
  try {
    execFileSync('git', ['cat-file', '-e', `${commit}:${objectPath}`], {
      cwd: repoRoot,
      stdio: 'ignore'
    });
    return true;
  } catch {
    return false;
  }
}

test('CM-2104 exact Git object content decision intake is accepted without execution authority', () => {
  const binding = receipt.receiptPayload.decision;
  const decisionBytes = execFileSync('git', ['show', `${binding.sourceCommit}:${binding.path}`], {
    cwd: repoRoot
  });
  assert.equal(execFileSync('git', ['rev-parse', `${binding.sourceCommit}^{tree}`], {
    cwd: repoRoot,
    encoding: 'utf8'
  }).trim(), binding.sourceTree);
  assert.equal(execFileSync('git', ['rev-parse', `${binding.sourceCommit}:${binding.path}`], {
    cwd: repoRoot,
    encoding: 'utf8'
  }).trim(), binding.blobOid);
  assert.equal(decisionBytes.length, binding.bytes);
  assert.equal(crypto.createHash('sha256').update(decisionBytes).digest('hex'), binding.sha256);

  const result = evaluateCm2104BootstrapAuthorizationContentDecisionIntake({
    decisionBytes,
    observedBinding: {
      decisionSourceCommit: binding.sourceCommit,
      decisionBlobOid: binding.blobOid,
      decisionSha256: binding.sha256
    },
    expectedBinding: contentDecisionBindingFromPacket(loadFrozenGatePacket(repoRoot)),
    now: new Date('2026-07-12T03:00:00+08:00')
  });
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.authorizationContentApproved, true);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.finalExecutionReleaseRequired, true);
});

test('CM-2104 content decision receipt records the self-decision and preserves the execution hard stop', () => {
  const result = evaluateCm2104BootstrapAuthorizationContentDecisionReceipt(receipt);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.authorizationContentApproved, true);
  assert.equal(result.contentDecisionFrozen, true);
  assert.equal(result.finalExecutionReleaseIssued, false);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.executorRun, false);
  assert.equal(result.executionEffects, 0);
  assert.equal(result.phase8Completed, false);
  assert.equal(gitObjectExists(receiptFreezeCommit, FINAL_EXECUTION_RELEASE_DECISION_PATH), false);
});

test('CM-2104 content decision receipt fails closed on authority, effect, completion, or hash drift', () => {
  const cases = [
    value => { value.receiptPayload.currentAuthority.bootstrapExecutionAuthorized = true; },
    value => { value.receiptPayload.currentAuthority.finalExecutionReleaseDecisionPresent = true; },
    value => { value.receiptPayload.executionEffects.claimEnvelopeCreates = 1; },
    value => { value.receiptPayload.completionBoundaries.phase8Completed = true; },
    value => { value.receiptPayloadSha256 = '0'.repeat(64); }
  ];
  for (const mutate of cases) {
    const drifted = structuredClone(receipt);
    mutate(drifted);
    const result = evaluateCm2104BootstrapAuthorizationContentDecisionReceipt(drifted);
    assert.equal(result.accepted, false);
    assert.equal(result.executionAuthorized, false);
    assert.equal(result.phase8Completed, false);
  }
});
