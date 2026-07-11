'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateRemainingEvidenceRequest } = require('../src/core/Cm2096Phase8RemainingEvidenceRequestContract');

const docs = path.join(__dirname, '..', 'docs', 'near-model-memory-plan-pack');
const rollback = JSON.parse(fs.readFileSync(path.join(docs, 'phase8_rollback_drill_evidence_authorization_request_cm2096.json'), 'utf8'));
const recovery = JSON.parse(fs.readFileSync(path.join(docs, 'phase8_failure_recovery_evidence_authorization_request_cm2097.json'), 'utf8'));

test('CM-2096 prepares rollback evidence review without authorizing an action', () => {
  const result = evaluateRemainingEvidenceRequest(rollback, 'rollback');
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.phase8Completed, false);
});

test('CM-2097 prepares separate failure-recovery review without authorizing an action', () => {
  const result = evaluateRemainingEvidenceRequest(recovery, 'failure-recovery');
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.phase8Completed, false);
});

test('remaining-evidence requests fail closed on execution, completion, replay, or scope drift', () => {
  for (const [request, kind, drift] of [
    [rollback, 'rollback', { executionRequestedNow: true }],
    [rollback, 'rollback', { rollbackDrillPassed: true }],
    [rollback, 'rollback', { rollbackOrCompensationOperationsAuthorizedNow: 1 }],
    [recovery, 'failure-recovery', { failureRecoveryProofPassed: true }],
    [recovery, 'failure-recovery', { automaticRetryAllowed: true }],
    [recovery, 'failure-recovery', { rollbackOrCompensationAllowed: true }],
    [recovery, 'failure-recovery', { phase8Completed: true }]
  ]) assert.equal(evaluateRemainingEvidenceRequest({ ...request, ...drift }, kind).accepted, false);
});
