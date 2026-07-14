'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { executeCm2095Phase8CompletionEvidenceApplication } = require('../src/core/Cm2095Phase8CompletionEvidenceApplication');
const { buildInput, runCli } = require('../src/cli/cm2095-phase8-completion-evidence-application');

test('CM-2095 CLI verifies the exact committed receipt without replaying the application', () => {
  for (const argv of [[], ['--verify-only']]) {
    const result = runCli(argv);
    assert.equal(result.accepted, true, result.blockers.join(', '));
    assert.equal(result.mode, 'committed_receipt_verification');
    assert.equal(result.applicationReceiptAccepted, true);
    assert.equal(result.phase8ReceiptBundleAppliedToCompletionAudit, true);
    assert.equal(result.phase8Completed, false);
    assert.equal(result.additionalNativeWriteAuthorized, false);
  }
  const output = JSON.parse(execFileSync(process.execPath, [
    'src/cli/cm2095-phase8-completion-evidence-application.js'
  ], { encoding: 'utf8' }));
  assert.equal(output.accepted, true);
  assert.equal(output.mode, 'committed_receipt_verification');
});

test('CM-2095 CLI keeps pre-application generation separate after receipt persistence', () => {
  const result = runCli(['--pre-application']);
  assert.equal(result.accepted, false);
  assert.equal(result.mode, 'pre_application_gate');
  assert.ok(result.blockers.includes('baseline.applicationReceiptAbsent'));
  assert.equal(result.patchApplicationAccepted, false);
});

test('CM-2095 CLI rejects unexpected arguments without entering either mode', () => {
  const result = runCli(['--output', '/tmp/not-allowed']);
  assert.equal(result.accepted, false);
  assert.equal(result.mode, 'argument_validation');
  assert.deepEqual(result.blockers, ['arguments']);
});

test('CM-2095 application gate, patch boundary, and patch application accept only six supported fields', () => {
  const input = buildInput();
  input.runtimeFacts.clean = true;
  input.baseline.completionAuditWorktreeMatchesHead = true;
  input.baseline.traceMatrixWorktreeMatchesHead = true;
  input.baseline.applicationReceiptAbsent = true;
  const result = executeCm2095Phase8CompletionEvidenceApplication(input);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.applicationGateAccepted, true);
  assert.equal(result.patchBoundaryAccepted, true);
  assert.equal(result.patchApplicationAccepted, true);
  assert.equal(result.appliedEvidence.phase8ReceiptBundleAppliedToCompletionAudit, true);
  assert.equal(result.appliedEvidence.rollbackDrillPassed, false);
  assert.equal(result.appliedEvidence.failureRecoveryProofPassed, false);
  assert.equal(result.phase8Completed, false);
  assert.equal(result.additionalNativeWriteAuthorized, false);
});

test('CM-2095 application fails before patch on binding, baseline, replay, or authority drift', () => {
  const input = buildInput();
  input.runtimeFacts.clean = true;
  input.baseline.completionAuditWorktreeMatchesHead = true;
  input.baseline.traceMatrixWorktreeMatchesHead = true;
  input.baseline.applicationReceiptAbsent = true;
  for (const drift of [
    { bindings: { ...input.bindings, decisionSha256: '0'.repeat(64) } },
    { runtimeFacts: { ...input.runtimeFacts, clean: false } },
    { baseline: { ...input.baseline, completionAuditWorktreeMatchesHead: false } },
    { baseline: { ...input.baseline, applicationReceiptAbsent: false } },
    { decision: { ...input.decision, applicationAuthorizationReplayAllowed: true } },
    { decision: { ...input.decision, phase8Completed: true } }
  ]) {
    const result = executeCm2095Phase8CompletionEvidenceApplication({ ...input, ...drift });
    assert.equal(result.accepted, false);
    assert.equal(result.patchApplicationAccepted, false);
    assert.equal(result.phase8Completed, false);
    assert.equal(result.additionalNativeWriteAuthorized, false);
  }
});
