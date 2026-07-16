'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  IDENTITY_FILENAME,
  expectedIdentityBytes
} = require('../src/core/Cm2102IdentityBoundRollbackLifecycleFoundation');
const {
  evaluateCm2102EmptyStorePreflightReceiptShape
} = require('../src/core/Cm2102IdentityBoundEmptyStorePreflightContract');
const {
  evaluateCm2105PreflightDecisionIntake,
  expectedCm2105PreflightDecision,
  isMachineBoundCm2105PreflightDecision
} = require('../src/core/Cm2105IdentityBoundEmptyStorePreflightDecisionIntake');
const {
  collectCm2105EmptyStorePreflight,
  runFrozenCm2105Preflight
} = require('../src/cli/cm2105-identity-bound-empty-store-preflight');

const expectedBinding = Object.freeze({
  implementationCommit: '1'.repeat(40),
  implementationTree: '2'.repeat(40),
  expectedExpiresAt: '2026-07-15T18:00:00+08:00'
});

const frozenReceiptBinding = Object.freeze({
  preflightDecisionReference: 'CM-2105-SELF-EMPTY-STORE-PREFLIGHT-017307C9-0622A6E4',
  preflightDecisionCommit: '30035c6cd9654b93f3ded0261fdf42543419d5ea',
  preflightDecisionBlobOid: '63a0c2a7ff0a2a493efb38ecde171b041dd47c2e',
  preflightDecisionSha256: 'e49d2949da35a2e4b2c9ac715c5262041f0d1b851f424e6018e9d594b3394db0',
  bootstrapDecisionReference: 'CM-2104-ER-IDENTITY-BOUND-STORE-BOOTSTRAP-FINAL-RELEASE-0A7CEB6C-017307C9',
  bootstrapDecisionCommit: 'd691fe25cc14cb42f778c0d993a6d7f2582a9068',
  bootstrapDecisionBlobOid: 'ed92d720b34124853d8329580a1d1102ea56be19',
  bootstrapDecisionSha256: '6121eb25d34954cd15137788ab3e1775824c2695dd3e91a0a59e6d9c9a0b5ad2',
  bootstrapReceiptReviewReference: 'CM-2105-SELF-BOOTSTRAP-RECEIPT-PASS-0622A6E4',
  bootstrapReceiptCommit: '030d777fb90845c1c448c5f8e0c99c9681ab7b4f',
  bootstrapReceiptSha256: '0622a6e45262f5c127bc2a22394ed9567cbecec317c793daa2f4b3378e8930b8',
  storeRootBindingSha256: '0a7ceb6cf658d517de2a3eb30ee09195dbeb9d46800f42ac87edf7f7cb11dd94'
});

function decision(overrides = {}) {
  return {
    ...expectedCm2105PreflightDecision(expectedBinding),
    expiresAt: expectedBinding.expectedExpiresAt,
    approvedAt: '2026-07-12T03:10:00+08:00',
    ...overrides
  };
}

function decisionFixture(value = decision()) {
  const decisionBytes = Buffer.from(JSON.stringify(value), 'utf8');
  return {
    decisionBytes,
    observedBinding: {
      decisionSourceCommit: '3'.repeat(40),
      decisionBlobOid: '4'.repeat(40),
      decisionSha256: crypto.createHash('sha256').update(decisionBytes).digest('hex')
    },
    expectedBinding,
    now: new Date('2026-07-12T03:20:00+08:00')
  };
}

function collectorDecisionIdentity() {
  return {
    decision: decision(),
    commit: '3'.repeat(40),
    blobOid: '4'.repeat(40),
    sha256: '5'.repeat(64)
  };
}

test('CM-2105 preflight decision intake grants only one bounded read-only observation', () => {
  const result = evaluateCm2105PreflightDecisionIntake(decisionFixture());
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.emptyStorePreflightAuthorized, true);
  assert.equal(result.nativeActionsAuthorized, 0);
  assert.equal(isMachineBoundCm2105PreflightDecision(result.decision), true);
  assert.equal(isMachineBoundCm2105PreflightDecision({ ...result.decision }), false);
});

test('CM-2105 preflight decision rejects native, content-read, authority, or expiry drift', () => {
  for (const drift of [
    { maxRecordContentReadOperations: 1 },
    { maxNativeReadCalls: 1 },
    { maxNativeWrites: 1 },
    { recordMemoryAuthorized: true },
    { realMemoryReadAuthorized: true },
    { rawPathDisclosureAuthorized: true },
    { approvedAt: '2026-07-12T03:21:00+08:00' },
    { expiresAt: '2026-07-12T03:15:00+08:00' },
    { unexpected: true }
  ]) {
    const result = evaluateCm2105PreflightDecisionIntake(decisionFixture(decision(drift)));
    assert.equal(result.accepted, false, JSON.stringify(drift));
    assert.equal(result.emptyStorePreflightAuthorized, false);
  }
});

test('CM-2105 collector accepts an identity-only synthetic store without reading record content', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cm2105-empty-store-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, IDENTITY_FILENAME), expectedIdentityBytes(), { flag: 'wx' });
  const result = await collectCm2105EmptyStorePreflight({
    storeRoot: root,
    decisionIdentity: collectorDecisionIdentity()
  });
  assert.equal(result.accepted, true);
  assert.equal(result.receipt.syntheticStoreEmpty, true);
  assert.equal(result.receipt.observedMarkdownCount, 0);
  assert.equal(result.receipt.unexpectedEntries, 0);
  assert.equal(result.receipt.identityReadOperations, 1);
  assert.equal(result.receipt.directoryEnumerationOperations, 1);
  assert.equal(result.receipt.recordContentReadOperations, 0);
  assert.equal(result.receipt.nativeReadCalls, 0);
  assert.equal(result.receipt.nativeWritePerformed, false);
  assert.equal(result.nativeActions, 0);
});

test('CM-2105 collector fails closed on any unexpected store entry', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cm2105-nonempty-store-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, IDENTITY_FILENAME), expectedIdentityBytes(), { flag: 'wx' });
  await fs.writeFile(path.join(root, 'unexpected.md'), 'not-read-by-preflight', { flag: 'wx' });
  await assert.rejects(
    collectCm2105EmptyStorePreflight({ storeRoot: root, decisionIdentity: collectorDecisionIdentity() }),
    /cm2105_preflight_store_not_empty/
  );
});

test('CM-2105 frozen preflight stops before Git or store access without an exact decision commit', async () => {
  await assert.rejects(runFrozenCm2105Preflight(null), /cm2105_preflight_decision_commit_required/);
});

test('CM-2105 frozen execution receipt matches the low-disclosure preflight contract', async () => {
  const receipt = JSON.parse(await fs.readFile(path.join(
    __dirname,
    '../docs/near-model-memory-plan-pack/phase8_identity_bound_empty_store_preflight_execution_receipt_cm2105.json'
  ), 'utf8'));
  const result = evaluateCm2102EmptyStorePreflightReceiptShape({
    receipt,
    expectedBinding: frozenReceiptBinding
  });
  assert.equal(result.shapeAccepted, true, result.blockers.join(', '));
  assert.equal(receipt.syntheticStoreEmpty, true);
  assert.equal(receipt.recordContentReadOperations, 0);
  assert.equal(receipt.nativeReadCalls, 0);
  assert.equal(receipt.nativeWritePerformed, false);
});
