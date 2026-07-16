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
    value => { value.store.reference = 'attacker-selected-store'; },
    value => { value.store.instanceId = 'attacker-selected-instance'; },
    value => { value.store.identitySha256 = '0'.repeat(64); },
    value => { value.authorization.replayAllowed = true; },
    value => { value.priorAttempt.preserved = false; },
    value => { value.completionEvidence.productionReady = true; },
    value => { value.phase8Completed = true; },
    value => { value.nonClaims.productionReady = true; },
    value => { value.nonClaims.realMemoryProofAccepted = true; }
  ]) {
    const value = structuredClone(receipt);
    mutate(value);
    assert.equal(evaluateCm2113VcpToolBoxOwnerNativeProofReceipt(value).accepted, false);
  }
});

test('CM-2113 rejects an additional top-level overclaim field', () => {
  const value = structuredClone(receipt);
  value.productionReady = true;
  assert.equal(evaluateCm2113VcpToolBoxOwnerNativeProofReceipt(value).accepted, false);
});

test('CM-2113 rejects additional claims in every nested receipt section', () => {
  for (const section of [
    'implementation', 'executionPacketGitIdentity', 'contentDecisionGitIdentity',
    'finalReleaseDecisionGitIdentity', 'bootstrapReceiptGitIdentity', 'executionReceipt',
    'transportReceipt', 'ownerRuntime', 'transport', 'store', 'authorization',
    'priorAttempt', 'completionEvidence', 'nonClaims'
  ]) {
    const value = structuredClone(receipt);
    value[section].productionReady = true;
    assert.equal(
      evaluateCm2113VcpToolBoxOwnerNativeProofReceipt(value).accepted,
      false,
      section
    );
  }
});

test('CM-2113 binds every upstream Git identity to its frozen exact object', () => {
  const drifts = {
    sourceCommit: 'f'.repeat(40),
    blobOid: 'e'.repeat(40),
    bytes: 9999,
    sha256: 'd'.repeat(64)
  };
  for (const section of [
    'executionPacketGitIdentity', 'contentDecisionGitIdentity',
    'finalReleaseDecisionGitIdentity', 'bootstrapReceiptGitIdentity'
  ]) {
    for (const [field, drift] of Object.entries(drifts)) {
      const value = structuredClone(receipt);
      value[section][field] = drift;
      assert.equal(
        evaluateCm2113VcpToolBoxOwnerNativeProofReceipt(value).accepted,
        false,
        `${section}.${field}`
      );
    }
  }
});

test('CM-2113 binds the implementation and owner runtime to their frozen sources', () => {
  for (const [section, field, drift, blocker] of [
    ['implementation', 'commit', 'f'.repeat(40), 'receipt.implementation'],
    ['implementation', 'tree', 'e'.repeat(40), 'receipt.implementation'],
    ['ownerRuntime', 'sourceCommit', 'd'.repeat(40), 'receipt.ownerRuntime'],
    ['ownerRuntime', 'sourceTree', 'c'.repeat(40), 'receipt.ownerRuntime']
  ]) {
    const value = structuredClone(receipt);
    value[section][field] = drift;
    const result = evaluateCm2113VcpToolBoxOwnerNativeProofReceipt(value);
    assert.equal(result.accepted, false, `${section}.${field}`);
    assert.ok(result.blockers.includes(blocker), `${section}.${field}`);
  }
});
