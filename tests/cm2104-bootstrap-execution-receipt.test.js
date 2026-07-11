'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  evaluateCm2103BootstrapReceipt
} = require('../src/core/Cm2103IdentityBoundStoreBootstrapReceiptContract');

const repoRoot = path.resolve(__dirname, '..');
const receipt = JSON.parse(fs.readFileSync(path.join(
  repoRoot,
  'docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_execution_receipt_cm2104.json'
), 'utf8'));

const expectedBinding = Object.freeze({
  authorizationContentDecisionReference: 'CM-2104-ER-IDENTITY-BOUND-STORE-BOOTSTRAP-CONTENT-0A7CEB6C-017307C9',
  authorizationContentDecisionSourceCommit: 'e2000e4d823cdbbf53152a27aa0122131fb34eb9',
  authorizationContentDecisionBlobOid: 'b460ad94ed6b66c7c7e38ca2732ee907aea6c8bf',
  authorizationContentDecisionSha256: '2414b28a3474984f81fd50769c07da2461d5f5d9ac1801f2e601f9ff56ccfbb3',
  finalExecutionReleaseDecisionReference: 'CM-2104-ER-IDENTITY-BOUND-STORE-BOOTSTRAP-FINAL-RELEASE-0A7CEB6C-017307C9',
  finalExecutionReleaseDecisionSourceCommit: 'd691fe25cc14cb42f778c0d993a6d7f2582a9068',
  finalExecutionReleaseDecisionBlobOid: 'ed92d720b34124853d8329580a1d1102ea56be19',
  finalExecutionReleaseDecisionSha256: '6121eb25d34954cd15137788ab3e1775824c2695dd3e91a0a59e6d9c9a0b5ad2',
  executionPacketCommit: '9ba0800a6b4b401df0b72dac024bc6668602414b',
  executionPacketBlobOid: 'b0fa9da564b2628c33ca758b1e34f5879e0c5538',
  executionPacketSha256: 'f15ac74db5d34e806ae5fb90f70c76edec3ec07a9e3301326803ad8bbdf9d3e4',
  foundationDecisionReference: 'CM-2102-ER-20260711-FOUNDATION-PASS-NO-EXECUTION-D6CE7C74',
  foundationDecisionSourceCommit: '9f73db8c6d1b7cba1a24d262880c7d37b953d2a0',
  foundationDecisionBlobOid: 'ea628021d499fcc883a7489a8f93a6284fdb2164',
  foundationDecisionSha256: '9dfd43e3ad9dea0c072a181bf8ae7fd48b4e1c49e171936518972abd22d7a0dc',
  bootstrapRequestCommit: '0c80561ae6ce2145becf438624ffdd21d1a62726',
  bootstrapRequestBlobOid: 'a75b15ae7519b608338160b8ba52ede3e9ff832c',
  bootstrapRequestSha256: '2318692aec334acd75b54d9bdac71ada9a2c2d3d3255b76cf97a5095421927ad',
  implementationCommit: '2fdf97f1854964c88d244b731cc0b45f3102de92',
  implementationTree: 'a4e74f74871b663683bd6e26cbba9a21e3443dc4',
  bindingHash: '3fee174a66462f651a751a23b4ce2069293d20aaf0458303d66d843b651ea8aa',
  nonce: 'cm2102-identity-bound-store-bootstrap-001',
  receiptId: 'cm2102-identity-bound-store-bootstrap-receipt-001'
});

test('CM-2104 R1 bootstrap receipt is accepted as exact bootstrap evidence', () => {
  const result = evaluateCm2103BootstrapReceipt({ receipt, expectedBinding });
  assert.equal(result.shapeAccepted, true, result.blockers.join(', '));
  assert.equal(result.acceptedAsBootstrapEvidence, true);
  assert.equal(result.acceptedAsReconciliationEvidence, false);
  assert.equal(result.receiptVariant, 'CONSUMED_SUCCESS');
  assert.equal(result.emptyStorePreflightAuthorizedByThisContract, false);
  assert.equal(result.nativeActionsPerformedByThisContract, 0);
});

test('CM-2104 R1 bootstrap receipt rejects replay, native action, effect, or completion drift', () => {
  const cases = [
    value => { value.authorizationReplayAllowed = true; },
    value => { value.storeDirectoryCreates = 2; },
    value => { value.identityReadbackMatched = false; },
    value => { value.nativeWrites = 1; },
    value => { value.phase8Completed = true; }
  ];
  for (const mutate of cases) {
    const drifted = structuredClone(receipt);
    mutate(drifted);
    const result = evaluateCm2103BootstrapReceipt({ receipt: drifted, expectedBinding });
    assert.equal(result.acceptedAsBootstrapEvidence, false);
  }
});
