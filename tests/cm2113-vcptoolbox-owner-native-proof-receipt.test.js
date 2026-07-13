'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateCm2113VcpToolBoxOwnerNativeProofReceipt } = require('../src/core/Cm2113VcpToolBoxOwnerNativeProofReceiptContract');

const receipt = JSON.parse(fs.readFileSync(path.join(
  __dirname,
  '../docs/near-model-memory-plan-pack/phase8_vcptoolbox_owner_native_proof_receipt_cm2113.json'
), 'utf8'));

test('CM-2113 accepts exact VCPToolBox owner runtime, transport, and stable store proof', () => {
  const result = evaluateCm2113VcpToolBoxOwnerNativeProofReceipt(receipt);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.vcpToolBoxOwnedRuntimeWritePassed, true);
  assert.equal(result.actualTransportBindingPassed, true);
  assert.equal(result.stableTargetStoreIdentityPassed, true);
  assert.equal(result.phase8Completed, false);
  assert.equal(result.additionalNativeWriteAuthorized, false);
});

test('CM-2113 fails closed on owner, transport, store, replay, or completion overclaim drift', () => {
  for (const mutate of [
    value => { value.ownerRuntime.memoryIntelligenceOwner = 'codex-memory'; },
    value => { value.transport.outerProcessBoundary = false; },
    value => { value.transport.innerAuthorizationMatched = false; },
    value => { value.store.identitySha256 = '0'.repeat(64); },
    value => { value.authorization.replayAllowed = true; },
    value => { value.priorAttempt.preserved = false; },
    value => { value.phase8Completed = true; },
    value => { value.nonClaims.productionReady = true; },
    value => { value.nonClaims.realMemoryProofAccepted = true; }
  ]) {
    const value = structuredClone(receipt);
    mutate(value);
    assert.equal(evaluateCm2113VcpToolBoxOwnerNativeProofReceipt(value).accepted, false);
  }
});
