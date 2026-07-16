'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateCm2095Phase8CompletionEvidenceApplicationDecision } = require('../src/core/Cm2095Phase8CompletionEvidenceApplicationDecisionContract');

const decision = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'near-model-memory-plan-pack', 'phase8_completion_evidence_application_decision_cm2095.json'), 'utf8'));

test('CM-2095 decision authorizes one evidence application without Phase 8 completion', () => {
  const result = evaluateCm2095Phase8CompletionEvidenceApplicationDecision(decision);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.applicationAuthorized, true);
  assert.equal(result.applicationAlreadyExecuted, false);
  assert.equal(result.phase8Completed, false);
  assert.equal(result.additionalNativeWriteAuthorized, false);
});

test('CM-2095 decision rejects replay, unsupported evidence, or completion authority drift', () => {
  for (const drift of [
    { applicationAuthorizationReplayAllowed: true },
    { allowedEvidence: { ...decision.allowedEvidence, rollbackDrillPassed: true } },
    { requiredFalseEvidence: { ...decision.requiredFalseEvidence, failureRecoveryProofPassed: true } },
    { completionEvidenceAlreadyApplied: true },
    { phase8Completed: true },
    { additionalNativeWriteAuthorized: true }
  ]) assert.equal(evaluateCm2095Phase8CompletionEvidenceApplicationDecision({ ...decision, ...drift }).accepted, false);
});
