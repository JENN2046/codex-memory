'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { Phase8OneShotAuthorizationRegistry } = require('../src/core/Phase8OneShotNativeWriteExecutionGate');
const {
  createCm2113VcpToolBoxOwnerNativeProofGate,
  intakeCm2113AuthorizationContentDecision,
  intakeCm2113FinalExecutionReleaseDecision,
  ownerRuntimeReceiptAccepted
} = require('../src/core/Cm2113VcpToolBoxOwnerNativeProofGate');

function fixture() {
  const contentDecisionGitIdentity = { sourceCommit: 'a'.repeat(40), blobOid: 'b'.repeat(40), bytes: 100, sha256: 'c'.repeat(64) };
  const executionPacketGitIdentity = { sourceCommit: '3'.repeat(40), blobOid: '4'.repeat(40), bytes: 300, sha256: '5'.repeat(64) };
  const content = {
    implementation: { commit: '1'.repeat(40), tree: '2'.repeat(40) },
    ownerRuntime: { owner: 'VCPToolBox', component: 'DailyNote', commit: '6'.repeat(40), tree: '7'.repeat(40), communication: 'stdio' },
    transport: { outer: 'stdio_mcp_process', inner: 'local_http_mcp', ownerRuntime: 'stdio' },
    store: {
      reference: 'cm2113-store', identitySha256: '8'.repeat(64), syntheticOnly: true,
      identityPresentBeforeFirstNativeWrite: true, replacementAllowed: false, reinitializationAllowed: false
    },
    payload: { canonicalSha256: '9'.repeat(64), durableSha256: 'd'.repeat(64), durableBytes: 321 },
    authorization: {
      action: 'live_bridge_record_memory_proof', nonce: 'cm2113-nonce-001', receiptId: 'cm2113-receipt-001',
      useCount: 1, replayAllowed: false, expiresAt: '2099-07-12T18:00:00+08:00', approvedAt: '2026-07-12T12:00:00+08:00'
    },
    limits: { nativeWrites: 1, verifyOperations: 1, retries: 0, rollbackOrCompensation: 0 },
    nonClaims: { productionReady: false, releaseReady: false, rcReady: false, fullPlanPackCompleted: false }
  };
  const expected = {
    contentDecisionReference: 'CM-2113-CONTENT',
    finalReleaseDecisionReference: 'CM-2113-FINAL',
    contentDecision: content,
    executionPacketGitIdentity,
    executionBinding: { owner: content.ownerRuntime, transport: content.transport, store: content.store, payload: content.payload },
    allowedScope: { project_id: 'codex-memory', workspace_id: 'cm2113', scope_id: 'owner-proof', visibility: 'project' },
    runtimeTarget: { targetReferenceName: 'cm2113-vcptoolbox-owner-runtime', targetKind: 'mcp_server', primaryRuntime: 'VCPToolBox native memory' },
    rollbackPlanReference: 'cm2113-no-automatic-rollback',
    durableBytes: 321,
    durableSha256: 'd'.repeat(64)
  };
  const contentDecision = {
    schemaVersion: 1,
    taskId: 'CM-2113',
    decisionReference: expected.contentDecisionReference,
    authorizationContentApproved: true,
    nativeWriteAuthorized: false,
    nativeWriteMayExecute: false,
    finalExecutionReleaseRequired: true,
    executionPacketGitIdentity,
    ...structuredClone(content)
  };
  const releaseDecision = {
    schemaVersion: 1,
    taskId: 'CM-2113',
    decisionReference: expected.finalReleaseDecisionReference,
    executionReleaseAuthorized: true,
    nativeWriteAuthorized: true,
    authorizationUseCount: 1,
    automaticRetryAllowed: false,
    rollbackOrCompensationAllowed: false,
    expiresAt: '2099-07-12T18:00:00+08:00',
    approvedAt: '2026-07-12T12:00:00+08:00',
    contentDecisionGitIdentity,
    executionPacketGitIdentity,
    ...structuredClone(content)
  };
  return {
    expected,
    contentDecision,
    releaseDecision,
    contentDecisionGitIdentity,
    finalReleaseDecisionGitIdentity: { sourceCommit: 'e'.repeat(40), blobOid: 'f'.repeat(40), bytes: 200, sha256: '0'.repeat(64) }
  };
}

function nativeResult(expected) {
  return {
    status: 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATED',
    access: { memoryWritePerformed: true, localMemoryFallbackUsed: false },
    receipt: {
      nativeInvocationReceipt: {
        invocationBindingMatched: true,
        transportCategory: 'local_http_transport',
        statusClass: 'success',
        nativeRuntimeReceipt: {
          memoryIntelligenceOwner: 'VCPToolBox',
          ownerRuntimeComponent: 'DailyNote',
          ownerRuntimeCommunication: 'stdio',
          ownerRuntimeSourceCommitMatched: true,
          ownerRuntimeSourceTreeMatched: true,
          ownerRuntimePluginBlobMatched: true,
          ownerRuntimeManifestBlobMatched: true,
          stableStoreIdentityMatched: true,
          nativeRuntimeCalled: true,
          nativeRuntimeInitialized: true,
          memoryWritePerformed: true,
          durableWritePerformed: true,
          isolatedRuntimeStoreUsed: true,
          durableBytes: expected.durableBytes,
          durableSha256: expected.durableSha256,
          providerApiCalled: false,
          primaryMemoryStoreWritePerformed: true,
          derivedIndexWritePerformed: false,
          memoryReadPerformed: false,
          rawRuntimeOutputDisclosed: false,
          rawMemoryContentDisclosed: false,
          runtimeLocatorDisclosed: false,
          tokenMaterialDisclosed: false,
          readinessClaimed: false
        }
      }
    }
  };
}

test('CM-2113 owner-runtime receipt rejects memory reads and raw runtime output disclosure', () => {
  const { expected } = fixture();
  assert.equal(ownerRuntimeReceiptAccepted(nativeResult(expected), expected), true);
  for (const field of ['memoryReadPerformed', 'rawRuntimeOutputDisclosed']) {
    const drift = nativeResult(expected);
    drift.receipt.nativeInvocationReceipt.nativeRuntimeReceipt[field] = true;
    assert.equal(ownerRuntimeReceiptAccepted(drift, expected), false, field);
  }
});

async function registryFixture(root) {
  const rootIdentity = {
    registryRootInstanceId: 'cm2113-test-root',
    registryRootReference: 'cm2113-test-root',
    registryRootReinitializationAllowed: false,
    registryRootReplacementAllowed: false
  };
  await fs.mkdir(root, { recursive: true });
  const canonical = Object.fromEntries(Object.keys(rootIdentity).sort().map(key => [key, rootIdentity[key]]));
  await fs.writeFile(path.join(root, '.phase8-registry-root-identity.json'), JSON.stringify(canonical));
  return new Phase8OneShotAuthorizationRegistry({
    governanceRoot: root,
    rootIdentity,
    identity: {
      authorizationRegistryReference: 'cm2113-owner-proof-registry',
      registryReinitializationAllowed: false,
      registryDeletionAllowed: false
    }
  });
}

test('CM-2113 two-stage gate consumes one assertion and accepts exact owner-runtime receipt', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cm2113-gate-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const { expected, contentDecision, releaseDecision, contentDecisionGitIdentity, finalReleaseDecisionGitIdentity } = fixture();
  const contentIntake = intakeCm2113AuthorizationContentDecision({ decision: contentDecision, expected, gitIdentity: contentDecisionGitIdentity });
  const finalExpected = { ...expected, contentDecisionGitIdentity: contentIntake.gitIdentity };
  const releaseIntake = intakeCm2113FinalExecutionReleaseDecision({ decision: releaseDecision, expected: finalExpected, gitIdentity: finalReleaseDecisionGitIdentity });
  assert.equal(contentIntake.accepted, true, contentIntake.blockers.join(', '));
  assert.equal(releaseIntake.accepted, true, releaseIntake.blockers.join(', '));
  const gate = createCm2113VcpToolBoxOwnerNativeProofGate({ registry: await registryFixture(root), expected });
  let calls = 0;
  const result = await gate.execute({
    contentDecision: contentIntake.decision,
    releaseDecision: releaseIntake.decision,
    executeNativeWrite: async ({ assertion }) => {
      calls += 1;
      assert.equal((await gate.verifyAssertion(assertion)).accepted, true);
      assert.equal((await gate.verifyAssertion(assertion)).accepted, false);
      return nativeResult(expected);
    },
    verifyWrite: async () => ({ accepted: true, selectedFieldsOnly: true })
  });
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.state, 'CONSUMED_SUCCESS');
  assert.equal(result.nativeWriteCalls, 1);
  assert.equal(result.verifyOperations, 1);
  assert.equal(calls, 1);
  assert.equal(result.authorizationReplayAllowed, false);
});

test('CM-2113 content decision is non-executable and final release or receipt drift fails closed', async t => {
  const { expected, contentDecision, releaseDecision, contentDecisionGitIdentity, finalReleaseDecisionGitIdentity } = fixture();
  const invalidContent = structuredClone(contentDecision);
  invalidContent.nativeWriteAuthorized = true;
  assert.equal(intakeCm2113AuthorizationContentDecision({ decision: invalidContent, expected, gitIdentity: contentDecisionGitIdentity }).accepted, false);
  const contentIntake = intakeCm2113AuthorizationContentDecision({ decision: contentDecision, expected, gitIdentity: contentDecisionGitIdentity });
  const finalExpected = { ...expected, contentDecisionGitIdentity: contentIntake.gitIdentity };
  const invalidRelease = structuredClone(releaseDecision);
  invalidRelease.transport.outer = 'direct_app_call';
  assert.equal(intakeCm2113FinalExecutionReleaseDecision({ decision: invalidRelease, expected: finalExpected, gitIdentity: finalReleaseDecisionGitIdentity }).accepted, false);

  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cm2113-gate-drift-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const releaseIntake = intakeCm2113FinalExecutionReleaseDecision({ decision: releaseDecision, expected: finalExpected, gitIdentity: finalReleaseDecisionGitIdentity });
  const gate = createCm2113VcpToolBoxOwnerNativeProofGate({ registry: await registryFixture(root), expected });
  const result = await gate.execute({
    contentDecision: contentIntake.decision,
    releaseDecision: releaseIntake.decision,
    executeNativeWrite: async ({ assertion }) => {
      assert.equal((await gate.verifyAssertion(assertion)).accepted, true);
      const drift = nativeResult(expected);
      drift.receipt.nativeInvocationReceipt.nativeRuntimeReceipt.memoryIntelligenceOwner = null;
      return drift;
    },
    verifyWrite: async () => ({ accepted: true })
  });
  assert.equal(result.accepted, false);
  assert.equal(result.state, 'CONSUMED_AMBIGUOUS_POST_COMMIT');
  assert.equal(result.authorizationReplayAllowed, false);
});

test('CM-2113 final release cannot claim or write before approvedAt', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cm2113-gate-future-approval-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const { expected, contentDecision, releaseDecision, contentDecisionGitIdentity, finalReleaseDecisionGitIdentity } = fixture();
  const contentIntake = intakeCm2113AuthorizationContentDecision({ decision: contentDecision, expected, gitIdentity: contentDecisionGitIdentity });
  const releaseIntake = intakeCm2113FinalExecutionReleaseDecision({
    decision: releaseDecision,
    expected: { ...expected, contentDecisionGitIdentity: contentIntake.gitIdentity },
    gitIdentity: finalReleaseDecisionGitIdentity
  });
  const gate = createCm2113VcpToolBoxOwnerNativeProofGate({
    registry: await registryFixture(root),
    expected,
    now: () => new Date('2026-07-12T11:59:59+08:00')
  });
  let nativeWriteCalls = 0;
  const result = await gate.execute({
    contentDecision: contentIntake.decision,
    releaseDecision: releaseIntake.decision,
    executeNativeWrite: async () => { nativeWriteCalls += 1; return nativeResult(expected); },
    verifyWrite: async () => ({ accepted: true })
  });
  assert.equal(result.accepted, false);
  assert.equal(result.state, 'UNCLAIMED');
  assert.equal(result.authorizationConsumed, false);
  assert.equal(result.nativeWriteCalls, 0);
  assert.equal(nativeWriteCalls, 0);
  assert.ok(result.blockers.includes('releaseDecision.notYetApproved'));
});
