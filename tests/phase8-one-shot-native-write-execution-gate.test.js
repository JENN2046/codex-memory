'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { createCodexMemoryApplication } = require('../src/app');
const {
  Phase8OneShotAuthorizationRegistry,
  createPhase8OneShotNativeWriteExecutionGate,
  sha256,
  sha256Canonical,
  verifyPhase8NativeWriteAuditProjection
} = require('../src/core/Phase8OneShotNativeWriteExecutionGate');

const payload = Buffer.from(JSON.stringify({ title: 'proof', content: 'synthetic' }));
const runtimeFacts = { clean: true, commit: 'a'.repeat(40), tree: 'b'.repeat(40) };
const payloadBlobOid = 'c'.repeat(40);

function binding() {
  const context = { commit: runtimeFacts.commit, tree: runtimeFacts.tree, payloadBlobOid };
  const allowlist = { tools: ['record_memory'], maxNativeWrites: 1, maxVerifyOperations: 1, maxCompensationWrites: 0 };
  return {
    runtimeSourceCommit: runtimeFacts.commit,
    runtimeSourceTree: runtimeFacts.tree,
    payloadBlobOid,
    payloadFileSha256: sha256(payload),
    payloadCanonicalSha256: sha256Canonical(JSON.parse(payload)),
    allowedScope: { scope_id: 'proof-scope', project_id: 'codex-memory', workspace_id: 'proof-workspace', client_id: 'Codex', visibility: 'project' },
    runtimeTarget: { primaryRuntime: 'VCPToolBox native memory', targetReferenceName: 'phase8-target', targetKind: 'mcp_server' },
    rollbackPlanReference: 'phase8-rollback-plan',
    buildContext: () => context,
    buildAllowlist: () => allowlist,
    context,
    allowlist
  };
}

function decision(expected) {
  return {
    phase8NativeWriteAuthorized: true,
    decisionReference: 'TEST-ONLY-PHASE8-APPROVAL',
    token: 'APPROVE_VCP_BRIDGE_LIVE_RECORD_MEMORY_PROOF_EXACT',
    allowedAction: 'live_bridge_record_memory_proof',
    expiresAt: '2030-01-01T00:00:00.000Z',
    authorizationUseCount: 1,
    nonce: 'one-shot-nonce',
    receiptId: 'one-shot-receipt',
    approvedAt: '2026-07-11T00:00:00.000Z',
    expectedContextHash: sha256Canonical(expected.context),
    expectedAllowlistHash: sha256Canonical(expected.allowlist)
  };
}

test('Phase 8 gate atomically claims once, generates internal approval, and consumes success', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'phase8-one-shot-'));
  const expected = binding();
  const registry = new Phase8OneShotAuthorizationRegistry({ directory: dir });
  const gate = createPhase8OneShotNativeWriteExecutionGate({ registry, expectedBinding: expected, now: () => new Date('2026-07-11T00:00:00.000Z') });
  let calls = 0;
  const executeNativeWrite = async ({ assertion }) => {
    calls += 1;
    const verified = await gate.verifyAssertion(assertion);
    assert.equal(verified.accepted, true);
    assert.equal(verified.exactApprovalResult.accepted, true);
    return { nativeWritePerformed: true, durableWritePerformed: true };
  };
  const first = await gate.execute({ decision: decision(expected), runtimeFacts, payloadBytes: payload, payloadBlobOid, executeNativeWrite, verifyWrite: async () => ({ accepted: true }) });
  assert.equal(first.accepted, true);
  assert.equal(first.state, 'CONSUMED_SUCCESS');
  assert.equal(calls, 1);
  await assert.rejects(
    gate.execute({ decision: decision(expected), runtimeFacts, payloadBytes: payload, payloadBlobOid, executeNativeWrite, verifyWrite: async () => ({ accepted: true }) }),
    /authorization_already_claimed/
  );
  assert.equal(calls, 1);
});

test('Phase 8 gate does not claim or call runtime when binding validation fails', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'phase8-one-shot-'));
  const expected = binding();
  const gate = createPhase8OneShotNativeWriteExecutionGate({ registry: new Phase8OneShotAuthorizationRegistry({ directory: dir }), expectedBinding: expected });
  let calls = 0;
  const badDecision = { ...decision(expected), expectedContextHash: '0'.repeat(64) };
  const result = await gate.execute({ decision: badDecision, runtimeFacts, payloadBytes: payload, payloadBlobOid, executeNativeWrite: async () => { calls += 1; }, verifyWrite: async () => ({ accepted: true }) });
  assert.equal(result.accepted, false);
  assert.equal(result.state, 'UNCLAIMED');
  assert.equal(calls, 0);
});

test('record_memory Phase 8 enforcement rejects caller-supplied accepted=true before stores or runtime', async () => {
  const app = createCodexMemoryApplication({
    phase8OneShotNativeWriteEnforcementEnabled: true,
    phase8OneShotAuthorizationAssertionVerifier: async () => ({ accepted: true })
  });
  const result = await app.callTool('record_memory', {}, { exactApprovalResult: { accepted: true } });
  assert.equal(result.decision, 'rejected');
  assert.equal(result.reasonCode, 'phase8_one_shot_authorization_required');
  assert.equal(result.nativeWritePerformed, false);
  assert.equal(result.localFallbackWritePerformed, false);
});

test('unknown post-commit result consumes ambiguous and never retries', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'phase8-one-shot-'));
  const expected = binding();
  const gate = createPhase8OneShotNativeWriteExecutionGate({ registry: new Phase8OneShotAuthorizationRegistry({ directory: dir }), expectedBinding: expected, now: () => new Date('2026-07-11T00:00:00.000Z') });
  const result = await gate.execute({ decision: decision(expected), runtimeFacts, payloadBytes: payload, payloadBlobOid, executeNativeWrite: async () => ({ nativeWritePerformed: null }), verifyWrite: async () => ({ accepted: true }) });
  assert.equal(result.accepted, false);
  assert.equal(result.state, 'CONSUMED_AMBIGUOUS_POST_COMMIT');
  await assert.rejects(
    gate.execute({ decision: decision(expected), runtimeFacts, payloadBytes: payload, payloadBlobOid, executeNativeWrite: async () => ({}), verifyWrite: async () => ({ accepted: true }) }),
    /authorization_already_claimed/
  );
});

test('exact verify calls audit_memory shape once and accepts selected receipt fields only', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'phase8-one-shot-'));
  const registry = new Phase8OneShotAuthorizationRegistry({ directory: dir });
  const claim = await registry.claim({ nonce: 'verify-nonce', receiptId: 'verify-receipt', bindingHash: 'd'.repeat(64) });
  let calls = 0;
  const result = await verifyPhase8NativeWriteAuditProjection({
    registry,
    claimId: claim.claimId,
    receiptId: 'verify-receipt',
    scope: { project_id: 'codex-memory', scope_id: 'proof-scope', workspace_id: 'proof-workspace', visibility: 'project' },
    callAuditMemory: async input => {
      calls += 1;
      assert.equal(input.audit_family, 'governance');
      assert.equal(input.window, 1);
      assert.equal(input.include_raw, false);
      return {
        accepted: true,
        access: { rawMemoryReturned: false, rawAuditReturned: false, contentReturned: false },
        findings: [{ governedNativeBridgeReceipt: { toolName: 'record_memory', writeAllowed: true, exactApprovalAction: 'live_bridge_record_memory_proof', exactApprovalActionMatched: true, nativeInvocationAttempted: true, memoryWritePerformed: true, rawRequestBodyPersisted: false, rawResponseBodyPersisted: false } }]
      };
    }
  });
  assert.equal(result.accepted, true);
  assert.equal(result.selectedFieldsOnly, true);
  assert.equal(calls, 1);
});
