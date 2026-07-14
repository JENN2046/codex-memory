'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { CASE_IDS, buildCm2097CaseManifest } = require('../src/core/Cm2097IsolatedFailureRecoveryHarness');
const {
  FAILURE_FIXTURE_MARKDOWN,
  HARNESS_IDENTITY_BYTES,
  evaluateFailureRecoveryReceipt,
  executeIsolatedFailureRecoveryHarness,
  sha256,
  sha256Canonical
} = require('../src/core/Cm2109IsolatedFailureRecoveryExecution');
const { runFrozenCm2109, validateDecision, validatePacket } = require('../src/cli/cm2109-isolated-failure-recovery');

function executionBinding() {
  return {
    implementationCommit: '1'.repeat(40),
    implementationTree: '2'.repeat(40),
    executionPacketCommit: '3'.repeat(40),
    executionPacketBlobOid: '4'.repeat(40),
    executionPacketSha256: '5'.repeat(64),
    decisionReference: 'CM-2109-SELF-ISOLATED-FAILURE-RECOVERY-EXECUTION',
    decisionCommit: '6'.repeat(40),
    decisionBlobOid: '7'.repeat(40),
    decisionSha256: '8'.repeat(64),
    governanceRootIdentitySha256: '9'.repeat(64)
  };
}

test('CM-2109 executes all three isolated cases with exact terminal states', async t => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'cm2109-test-'));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  const root = path.join(parent, 'harness');
  const receipt = await executeIsolatedFailureRecoveryHarness({ harnessRoot: root, executionBinding: executionBinding() });
  const result = evaluateFailureRecoveryReceipt(receipt, executionBinding());
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.deepEqual(receipt.receiptPayload.caseResults.map(item => item.finalState), [
    'UNCLAIMED',
    'CONSUMED_FAILED_PRE_COMMIT',
    'CONSUMED_AMBIGUOUS_POST_COMMIT'
  ]);
  assert.equal(receipt.receiptPayload.summary.totalClaimCount, 2);
  assert.equal(receipt.receiptPayload.summary.totalWriteInvocationCount, 1);
  assert.equal(receipt.receiptPayload.summary.totalDurableWrites, 1);
  assert.equal(receipt.receiptPayload.summary.totalRetryCount, 0);
  assert.equal(receipt.failureRecoveryProofPassed, false);
  assert.equal((await fs.readFile(path.join(root, '.cm2109-harness-identity.json'))).equals(HARNESS_IDENTITY_BYTES), true);
});

test('CM-2109 frozen receipt passes exact binding review but does not apply evidence', async () => {
  const source = await fs.readFile(path.join(
    __dirname,
    '../docs/near-model-memory-plan-pack/phase8_failure_recovery_execution_receipt_cm2109.json'
  ), 'utf8');
  const receipt = JSON.parse(source);
  const result = evaluateFailureRecoveryReceipt(receipt, executionBinding());
  assert.equal(result.accepted, false, 'fixture binding intentionally differs from frozen binding');
  const exactBinding = receipt.receiptPayload.executionBinding;
  const exact = evaluateFailureRecoveryReceipt(receipt, exactBinding);
  assert.equal(exact.accepted, true, exact.blockers.join(', '));
  assert.equal(exact.acceptedAsFailureRecoveryEvidence, true);
  assert.equal(exact.failureRecoveryProofPassed, false);
  assert.equal(exact.phase8Completed, false);
});

test('CM-2109 ambiguous case persists one exact synthetic fixture and no acknowledgement', async t => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'cm2109-ambiguous-'));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  const root = path.join(parent, 'harness');
  const receipt = await executeIsolatedFailureRecoveryHarness({ harnessRoot: root, executionBinding: executionBinding() });
  const item = receipt.receiptPayload.caseResults.find(value => value.caseId === CASE_IDS[2]);
  assert.equal(item.durableFixtureBytes, FAILURE_FIXTURE_MARKDOWN.length);
  assert.equal(item.durableFixtureSha256, sha256(FAILURE_FIXTURE_MARKDOWN));
  assert.equal(item.acknowledgementReturned, false);
  assert.equal(item.retryCount, 0);
  assert.equal(item.rollbackCount, 0);
  assert.equal(item.compensationCount, 0);
});

test('CM-2109 harness root is one-shot and cannot replay', async t => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'cm2109-replay-'));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  const root = path.join(parent, 'harness');
  await executeIsolatedFailureRecoveryHarness({ harnessRoot: root, executionBinding: executionBinding() });
  await assert.rejects(
    executeIsolatedFailureRecoveryHarness({ harnessRoot: root, executionBinding: executionBinding() }),
    error => error && error.code === 'EEXIST'
  );
});

test('CM-2109 receipt fails closed on retry, replay, provider, real-memory, or phase overclaim', async t => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'cm2109-drift-'));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  const receipt = await executeIsolatedFailureRecoveryHarness({ harnessRoot: path.join(parent, 'harness'), executionBinding: executionBinding() });
  for (const mutate of [
    payload => { payload.summary.totalRetryCount = 1; },
    payload => { payload.authorization.replayAllowed = true; },
    payload => { payload.boundaries.productionProviderCalled = true; },
    payload => { payload.boundaries.realMemoryRead = true; },
    payload => { payload.boundaries.productionFailureRecoveryProven = true; },
    payload => { payload.summary.failureRecoveryProofPassed = true; },
    payload => { payload.summary.phase8Completed = true; }
  ]) {
    const drift = structuredClone(receipt);
    mutate(drift.receiptPayload);
    const crypto = require('node:crypto');
    const canonicalize = value => Array.isArray(value) ? value.map(canonicalize) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])])) : value;
    drift.receiptPayloadSha256 = crypto.createHash('sha256').update(JSON.stringify(canonicalize(drift.receiptPayload))).digest('hex');
    assert.equal(evaluateFailureRecoveryReceipt(drift, executionBinding()).accepted, false);
  }
});

test('CM-2109 receipt rejects rehashed top-level receipt or payload overclaims', async t => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'cm2109-extra-field-'));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  const receipt = await executeIsolatedFailureRecoveryHarness({
    harnessRoot: path.join(parent, 'harness'),
    executionBinding: executionBinding()
  });
  assert.equal(evaluateFailureRecoveryReceipt({ ...receipt, productionReady: true }, executionBinding()).accepted, false);
  const drift = structuredClone(receipt);
  drift.receiptPayload.productionReady = true;
  drift.receiptPayloadSha256 = sha256Canonical(drift.receiptPayload);
  assert.equal(evaluateFailureRecoveryReceipt(drift, executionBinding()).accepted, false);
});

test('CM-2109 receipt fixes its schema version and receipt type identity', async t => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'cm2109-identity-drift-'));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  const receipt = await executeIsolatedFailureRecoveryHarness({
    harnessRoot: path.join(parent, 'harness'),
    executionBinding: executionBinding()
  });
  for (const mutate of [
    payload => { payload.schemaVersion = 2; },
    payload => { payload.receiptType = 'forged_failure_recovery_receipt'; }
  ]) {
    const drift = structuredClone(receipt);
    mutate(drift.receiptPayload);
    drift.receiptPayloadSha256 = sha256Canonical(drift.receiptPayload);
    assert.equal(evaluateFailureRecoveryReceipt(drift, executionBinding()).accepted, false);
  }
});

test('CM-2109 packet and decision boundaries reject authority expansion', () => {
  const manifests = CASE_IDS.map(buildCm2097CaseManifest);
  const manifestBindings = manifests.map(() => ({ blobOid: 'a'.repeat(40), bytes: 100, sha256: 'b'.repeat(64) }));
  const packet = {
    schemaVersion: 1,
    taskId: 'CM-2109',
    packetType: 'isolated_three_case_failure_recovery_execution_packet',
    packetDoesNotAuthorizeExecution: true,
    executionAuthorizedAtPacketFreeze: false,
    routeDecisionReference: 'CM-2097-ROUTE',
    implementationCommit: '1'.repeat(40),
    implementationTree: '2'.repeat(40),
    manifestSourceCommit: '1'.repeat(40),
    expectedDecisionReference: 'CM-2109-SELF-ISOLATED-FAILURE-RECOVERY-EXECUTION',
    harnessRootDirectory: 'phase8-isolated-failure-recovery-harness-001',
    harnessRootAuthority: 'git_common_dir_governance_state',
    governanceRootIdentitySha256: '240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0',
    harnessIdentityBytes: 322,
    harnessIdentitySha256: 'c'.repeat(64),
    ambiguousPostCommitFixtureBytes: 139,
    ambiguousPostCommitFixtureSha256: 'd'.repeat(64),
    callerPathOverrideAllowed: false,
    environmentPathOverrideAllowed: false,
    caseManifests: CASE_IDS.map((caseId, index) => ({ caseId, ...manifestBindings[index] })),
    maxHarnessRuns: 1,
    maxClaimCount: 2,
    maxNativeWriteCalls: 1,
    maxDurableWrites: 1,
    maxRetryCount: 0,
    maxRollbackCount: 0,
    maxCompensationCount: 0,
    usesCm2094LiveAuthorization: false,
    usesCm2094Nonce: false,
    usesCm2094RegistryClaim: false,
    modifiesCm2094Record: false,
    productionProviderAllowed: false,
    realMemoryAllowed: false,
    localFallbackAllowed: false,
    defaultMcpExpansionAllowed: false,
    readinessClaimAllowed: false,
    failureRecoveryProofPassedAtPacketFreeze: false,
    phase8CompletedAtPacketFreeze: false
  };
  assert.equal(validatePacket(packet, { runtimeCommit: packet.implementationCommit, runtimeTree: packet.implementationTree, manifestBindings }).accepted, true);
  assert.equal(validatePacket({ ...packet, retryAuthorized: true }, { runtimeCommit: packet.implementationCommit, runtimeTree: packet.implementationTree, manifestBindings }).accepted, false);
  const extraCaseClaim = structuredClone(packet);
  extraCaseClaim.caseManifests[0].readinessClaimed = false;
  assert.equal(validatePacket(extraCaseClaim, { runtimeCommit: packet.implementationCommit, runtimeTree: packet.implementationTree, manifestBindings }).accepted, false);
  assert.equal(validatePacket({ ...packet, maxRetryCount: 1 }, { runtimeCommit: packet.implementationCommit, runtimeTree: packet.implementationTree, manifestBindings }).accepted, false);
  assert.equal(validatePacket({ ...packet, failureRecoveryProofPassedAtPacketFreeze: true }, { runtimeCommit: packet.implementationCommit, runtimeTree: packet.implementationTree, manifestBindings }).accepted, false);
  assert.equal(validatePacket({ ...packet, phase8CompletedAtPacketFreeze: true }, { runtimeCommit: packet.implementationCommit, runtimeTree: packet.implementationTree, manifestBindings }).accepted, false);
  const binding = { implementationCommit: packet.implementationCommit, implementationTree: packet.implementationTree, executionPacketCommit: 'c'.repeat(40), executionPacketBlobOid: 'd'.repeat(40), executionPacketSha256: 'e'.repeat(64) };
  const decision = { schemaVersion: 1, taskId: 'CM-2109', decisionType: 'self_governed_exact_isolated_failure_recovery_execution', decisionReference: 'CM-2109-SELF-ISOLATED-FAILURE-RECOVERY-EXECUTION', decisionBasis: 'repository_reality_and_user_delegated_prohibited_first_authority', failureRecoveryExecutionAuthorized: true, authorizationUseCount: 1, authorizationReplayAllowed: false, ...binding, governanceRootIdentitySha256: '240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0', harnessRootReference: 'phase8-isolated-failure-recovery-harness-001', caseCount: 3, maxHarnessRuns: 1, maxClaimCount: 2, maxNativeWriteCalls: 1, maxDurableWrites: 1, maxRetryCount: 0, maxRollbackCount: 0, maxCompensationCount: 0, approvedAt: '2026-07-12T00:00:00Z', expiresAt: '2099-01-01T00:00:00Z', productionProviderAuthorized: false, realMemoryAuthorized: false, cm2094AuthorizationReuseAuthorized: false, retryAuthorized: false, rollbackAuthorized: false, compensationAuthorized: false, defaultMcpExpansionAuthorized: false, readinessClaimAuthorized: false, failureRecoveryProofPassedByDecisionAlone: false, phase8CompletedByDecisionAlone: false };
  assert.equal(validateDecision(decision, binding).accepted, true);
  assert.equal(validateDecision({ ...decision, approvedAt: '2098-01-01T00:00:00Z' }, binding).accepted, false);
  assert.equal(validateDecision({ ...decision, approvedAt: decision.expiresAt }, binding).accepted, false);
  assert.equal(validateDecision({ ...decision, maxRetryCount: 1 }, binding).accepted, false);
  assert.equal(validateDecision({ ...decision, governanceRootIdentitySha256: 'f'.repeat(64) }, binding).accepted, false);
  assert.equal(validateDecision({ ...decision, productionReady: true }, binding).accepted, false);
  assert.equal(validateDecision({ ...decision, retryAuthorized: true }, binding).accepted, false);
  assert.equal(validateDecision({ ...decision, failureRecoveryProofPassedByDecisionAlone: true }, binding).accepted, false);
  assert.equal(validateDecision({ ...decision, phase8CompletedByDecisionAlone: true }, binding).accepted, false);
});

test('CM-2109 frozen executor requires packet and decision commits before governance access', async () => {
  await assert.rejects(runFrozenCm2109(null, null), /cm2109_execution_packet_commit_required/);
  await assert.rejects(runFrozenCm2109('a'.repeat(40), null), /cm2109_execution_decision_commit_required/);
});
