'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  REVALIDATION_FIELDS,
  evaluateCm2112Phase8CompletionRevalidation
} = require('../src/core/Cm2112Phase8CompletionRevalidation');

const DOCS = path.join(__dirname, '../docs/near-model-memory-plan-pack');
const decision = JSON.parse(fs.readFileSync(path.join(DOCS, 'phase8_completion_revalidation_decision_cm2112.json'), 'utf8'));
const historicalBundle = JSON.parse(fs.readFileSync(path.join(DOCS, 'phase8_completion_evidence_bundle_cm2111.json'), 'utf8'));
const historicalReceipt = JSON.parse(fs.readFileSync(path.join(DOCS, 'phase8_completion_audit_application_receipt_cm2111.json'), 'utf8'));

function input() {
  return {
    decision: structuredClone(decision),
    historicalBundle: structuredClone(historicalBundle),
    historicalReceipt: structuredClone(historicalReceipt)
  };
}

test('CM-2112 preserves CM-2111 as history while reopening current Phase 8', () => {
  const result = evaluateCm2112Phase8CompletionRevalidation(input());
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.historicalCm2111Preserved, true);
  assert.equal(result.phase8Completed, false);
  assert.equal(result.phase8CompletionStatus, 'needs_revalidation');
  assert.deepEqual(result.missingRevalidationFields, REVALIDATION_FIELDS);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM-2112 grants no native, verify, rollback, remote, or readiness authority', () => {
  const result = evaluateCm2112Phase8CompletionRevalidation(input());
  assert.equal(result.nativeWriteAuthorized, false);
  assert.equal(result.verifyAuthorized, false);
  assert.equal(result.rollbackOrCompensationAuthorized, false);
  for (const field of Object.values(decision.currentAuthority)) assert.equal(field, false);
});

test('CM-2112 fails closed on route, status, authority, or historical binding drift', () => {
  const mutations = [
    value => { value.decision.currentState.phase8Completed = true; },
    value => { value.decision.selectedRoute.memoryIntelligenceOwner = 'codex-memory'; },
    value => { value.decision.selectedRoute.outerTransport = 'direct_app_call'; },
    value => { value.decision.requiredRevalidationEvidence.actualTransportBindingPassed = true; },
    value => { value.decision.currentAuthority.nativeWriteAuthorized = true; },
    value => { value.historicalBundle.evidence.verifyWritePassed = false; },
    value => { value.historicalReceipt.receiptPayloadSha256 = '0'.repeat(64); }
  ];
  for (const mutate of mutations) {
    const value = input();
    mutate(value);
    assert.equal(evaluateCm2112Phase8CompletionRevalidation(value).accepted, false);
  }
});
