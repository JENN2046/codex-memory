'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { createCodexMemoryApplication } = require('../src/app');
const { createGovernedMcpVcpNativeVcpToolBoxMcpShimServer } = require('../src/core/GovernedMcpVcpNativeVcpToolBoxMcpShim');
const { evaluatePhase8ExternalAuthorizationDecisionIntake } = require('../src/core/Phase8ExternalAuthorizationDecisionIntake');
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
const registryIdentity = {
  authorizationRegistryReference: 'test-phase8-one-shot-registry',
  registryStorageRole: 'durable-local-governance-state',
  registryReinitializationAllowed: false,
  registryDeletionAllowed: false
};
const newRegistry = governanceRoot => new Phase8OneShotAuthorizationRegistry({ governanceRoot, identity: registryIdentity });

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

function decision(expected, overrides = {}) {
  const value = {
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
    expectedAllowlistHash: sha256Canonical(expected.allowlist),
    payloadCanonicalSha256: expected.payloadCanonicalSha256,
    ...overrides
  };
  const decisionBytes = Buffer.from(JSON.stringify(value));
  const expectedBinding = {
    decisionReference: value.decisionReference,
    decisionSourceCommit: 'd'.repeat(40),
    decisionBlobOid: 'e'.repeat(40),
    decisionPayloadSha256: sha256(decisionBytes),
    expectedContextHash: value.expectedContextHash,
    expectedAllowlistHash: value.expectedAllowlistHash,
    payloadCanonicalSha256: value.payloadCanonicalSha256,
    nonce: value.nonce,
    receiptId: value.receiptId
  };
  const intake = evaluatePhase8ExternalAuthorizationDecisionIntake({
    decisionBytes,
    observedBinding: expectedBinding,
    expectedBinding,
    now: new Date('2026-07-11T00:00:00.000Z')
  });
  assert.equal(intake.accepted, true, intake.blockers.join(', '));
  return intake.decision;
}

test('Phase 8 gate atomically claims once, generates internal approval, and consumes success', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'phase8-one-shot-'));
  const expected = binding();
  const registry = newRegistry(dir);
  const gate = createPhase8OneShotNativeWriteExecutionGate({ registry, expectedBinding: expected, now: () => new Date('2026-07-11T00:00:00.000Z') });
  let calls = 0;
  const executeNativeWrite = async ({ assertion }) => {
    calls += 1;
    const verified = await gate.verifyAssertion(assertion);
    assert.equal(verified.accepted, true);
    assert.equal(verified.exactApprovalResult.accepted, true);
    const replay = await gate.verifyAssertion(assertion);
    assert.equal(replay.accepted, false);
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

test('two concurrent assertion verifications permit exactly one write invocation', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'phase8-one-shot-'));
  const expected = binding();
  const gate = createPhase8OneShotNativeWriteExecutionGate({ registry: newRegistry(dir), expectedBinding: expected, now: () => new Date('2026-07-11T00:00:00.000Z') });
  const result = await gate.execute({
    decision: decision(expected, { nonce: 'concurrent-nonce', receiptId: 'concurrent-receipt' }),
    runtimeFacts,
    payloadBytes: payload,
    payloadBlobOid,
    executeNativeWrite: async ({ assertion }) => {
      const attempts = await Promise.all([
        gate.verifyAssertion(assertion),
        gate.verifyAssertion(assertion)
      ]);
      assert.equal(attempts.filter(item => item.accepted === true).length, 1);
      return { nativeWritePerformed: true, durableWritePerformed: true };
    },
    verifyWrite: async () => ({ accepted: true })
  });
  assert.equal(result.accepted, true);
  assert.equal(result.nativeWriteCalls, 1);
});

test('Phase 8 gate does not claim or call runtime when binding validation fails', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'phase8-one-shot-'));
  const expected = binding();
  const gate = createPhase8OneShotNativeWriteExecutionGate({ registry: newRegistry(dir), expectedBinding: expected });
  let calls = 0;
  const badDecision = decision(expected, { expectedContextHash: '0'.repeat(64) });
  const result = await gate.execute({ decision: badDecision, runtimeFacts, payloadBytes: payload, payloadBlobOid, executeNativeWrite: async () => { calls += 1; }, verifyWrite: async () => ({ accepted: true }) });
  assert.equal(result.accepted, false);
  assert.equal(result.state, 'UNCLAIMED');
  assert.equal(calls, 0);
});

test('Phase 8 gate rejects an un-intaken or cloned authorization decision', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'phase8-one-shot-'));
  const expected = binding();
  const gate = createPhase8OneShotNativeWriteExecutionGate({ registry: newRegistry(root), expectedBinding: expected });
  let calls = 0;
  const result = await gate.execute({
    decision: { ...decision(expected), decisionReference: 'CM-FORGED-BUT-HASHES-SAME' },
    runtimeFacts,
    payloadBytes: payload,
    payloadBlobOid,
    executeNativeWrite: async () => { calls += 1; },
    verifyWrite: async () => ({ accepted: true })
  });
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('decision.machineBoundIntake'));
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
  const gate = createPhase8OneShotNativeWriteExecutionGate({ registry: newRegistry(dir), expectedBinding: expected, now: () => new Date('2026-07-11T00:00:00.000Z') });
  const result = await gate.execute({ decision: decision(expected), runtimeFacts, payloadBytes: payload, payloadBlobOid, executeNativeWrite: async ({ assertion }) => {
    const verified = await gate.verifyAssertion(assertion);
    assert.equal(verified.accepted, true);
    return { nativeWritePerformed: null };
  }, verifyWrite: async () => ({ accepted: true }) });
  assert.equal(result.accepted, false);
  assert.equal(result.state, 'CONSUMED_AMBIGUOUS_POST_COMMIT');
  await assert.rejects(
    gate.execute({ decision: decision(expected), runtimeFacts, payloadBytes: payload, payloadBlobOid, executeNativeWrite: async () => ({}), verifyWrite: async () => ({ accepted: true }) }),
    /authorization_already_claimed/
  );
});

test('exact verify calls audit_memory shape once and accepts selected receipt fields only', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'phase8-one-shot-'));
  const registry = newRegistry(dir);
  const claim = await registry.claim({ nonce: 'verify-nonce', receiptId: 'verify-receipt', bindingHash: 'd'.repeat(64) });
  await registry.consumeWriteInvocation(claim.claimId, 'd'.repeat(64));
  let calls = 0;
  const result = await verifyPhase8NativeWriteAuditProjection({
    registry,
    claimId: claim.claimId,
    receiptId: 'verify-receipt',
    approvalDecisionReference: 'CM-TEST-APPROVAL',
    claimBindingHash: 'd'.repeat(64),
    targetReferenceName: 'phase8-target',
    expectedScopeFingerprint: 'e'.repeat(64),
    scope: { project_id: 'codex-memory', scope_id: 'proof-scope', workspace_id: 'proof-workspace', visibility: 'project' },
    callAuditMemory: async input => {
      calls += 1;
      assert.equal(input.audit_family, 'governance');
      assert.equal(input.window, 10);
      assert.equal(input.include_raw, false);
      return {
        accepted: true,
        access: { rawMemoryReturned: false, rawAuditReturned: false, contentReturned: false },
        findings: [
          { governedNativeBridgeReceipt: { toolName: 'record_memory', auditReceiptReferenceName: 'old-receipt', memoryWritePerformed: true } },
          { governedNativeBridgeReceipt: { toolName: 'record_memory', auditReceiptReferenceName: 'verify-receipt', exactApprovalDecisionReference: 'CM-TEST-APPROVAL', exactApprovalClaimBindingHash: 'd'.repeat(64), targetReferenceName: 'phase8-target', scopeFingerprintPresent: true, scopeFingerprintMatched: true, writeAllowed: true, exactApprovalAction: 'live_bridge_record_memory_proof', exactApprovalActionMatched: true, nativeInvocationAttempted: true, nativeInvocationReceiptBindingMatched: true, memoryWritePerformed: true, rawRequestBodyPersisted: false, rawResponseBodyPersisted: false } }
        ]
      };
    }
  });
  assert.equal(result.accepted, true);
  assert.equal(result.selectedFieldsOnly, true);
  assert.equal(calls, 1);
});

test('exact verify rejects receipt, approval, claim, target, or scope drift', async t => {
  const exact = {
    toolName: 'record_memory',
    auditReceiptReferenceName: 'verify-receipt',
    exactApprovalDecisionReference: 'CM-TEST-APPROVAL',
    exactApprovalClaimBindingHash: 'd'.repeat(64),
    targetReferenceName: 'phase8-target',
    scopeFingerprintPresent: true,
    scopeFingerprintMatched: true,
    writeAllowed: true,
    exactApprovalAction: 'live_bridge_record_memory_proof',
    exactApprovalActionMatched: true,
    nativeInvocationAttempted: true,
    nativeInvocationReceiptBindingMatched: true,
    memoryWritePerformed: true,
    rawRequestBodyPersisted: false,
    rawResponseBodyPersisted: false
  };
  const cases = [
    ['receipt id', { auditReceiptReferenceName: 'old-receipt' }],
    ['approval decision', { exactApprovalDecisionReference: 'CM-OTHER' }],
    ['claim binding', { exactApprovalClaimBindingHash: '0'.repeat(64) }],
    ['target reference', { targetReferenceName: 'other-target' }],
    ['scope fingerprint match', { scopeFingerprintMatched: false }]
  ];
  for (const [name, drift] of cases) {
    await t.test(name, async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), 'phase8-verify-drift-'));
      const registry = newRegistry(root);
      const claim = await registry.claim({ nonce: `nonce-${name}`, receiptId: 'verify-receipt', bindingHash: 'd'.repeat(64) });
      await registry.consumeWriteInvocation(claim.claimId, 'd'.repeat(64));
      const result = await verifyPhase8NativeWriteAuditProjection({
        registry,
        claimId: claim.claimId,
        receiptId: 'verify-receipt',
        approvalDecisionReference: 'CM-TEST-APPROVAL',
        claimBindingHash: 'd'.repeat(64),
        targetReferenceName: 'phase8-target',
        expectedScopeFingerprint: 'e'.repeat(64),
        scope: { project_id: 'codex-memory', scope_id: 'proof-scope', workspace_id: 'proof-workspace', visibility: 'project' },
        callAuditMemory: async () => ({
          accepted: true,
          access: { rawMemoryReturned: false, rawAuditReturned: false, contentReturned: false },
          findings: [{ governedNativeBridgeReceipt: { ...exact, ...drift } }]
        })
      });
      assert.equal(result.accepted, false);
      assert.equal(result.observedSelectedBinding, null);
    });
  }
});

test('frozen path reaches real app, HTTP MCP shim, durable fixture write, and exact audit verify once', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'phase8-e2e-'));
  await fs.writeFile(path.join(root, 'KnowledgeBaseManager.js'), 'module.exports={initialize:async()=>{}};');
  await fs.writeFile(path.join(root, 'EmbeddingUtils.js'), 'module.exports={};');
  const shim = createGovernedMcpVcpNativeVcpToolBoxMcpShimServer({
    vcpToolBoxRoot: root,
    knowledgeBaseRootPath: path.join(root, 'native-memory'),
    enableWrite: true
  });
  await new Promise(resolve => shim.listen(0, '127.0.0.1', resolve));
  const endpoint = `http://127.0.0.1:${shim.address().port}`;
  const expected = binding();
  expected.runtimeTarget = { primaryRuntime: 'VCPToolBox native memory', targetReferenceName: 'phase8-target', targetKind: 'mcp_server' };
  expected.allowedScope = { scope_id: 'proof-scope', project_id: 'codex-memory', workspace_id: 'proof-workspace', client_id: 'Codex', visibility: 'project' };
  const registry = newRegistry(path.join(root, 'registry'));
  const gate = createPhase8OneShotNativeWriteExecutionGate({ registry, expectedBinding: expected, now: () => new Date('2026-07-11T00:00:00.000Z') });
  const app = createCodexMemoryApplication({
    projectBasePath: path.join(root, 'app'), dailyNoteRootPath: path.join(root, 'app-diary'), logsDir: path.join(root, 'logs'), dataDir: path.join(root, 'data'),
    governedMcpVcpNativeBridgeGateMode: 'observe', governedMcpVcpNativeWriteDelegationMode: 'primary', governedMcpVcpNativeReadDelegationMode: 'off',
    governedMcpVcpNativeRuntimeTarget: { accepted: true, targetReferenceName: 'phase8-target', targetKind: 'mcp_server', sourceAuthority: 'bridge_runtime_or_static_config' },
    governedMcpVcpNativeHttpMcpTarget: { endpoint, bearerToken: 'fixture-only-token', mcpToolNameByAction: { record_memory: 'knowledge_base.record' }, requestTimeoutMs: 2000 },
    phase8OneShotNativeWriteEnforcementEnabled: true,
    phase8OneShotAuthorizationAssertionVerifier: gate.verifyAssertion
  });
  const exactPayload = Buffer.from(JSON.stringify({ target: 'process', title: 'proof', content: 'synthetic', evidence: 'fixture e2e', validated: true, reusable: false, sensitivity: 'none', scope_id: 'proof-scope', project_id: 'codex-memory', workspace_id: 'proof-workspace', client_id: 'codex', visibility: 'project' }));
  expected.payloadFileSha256 = sha256(exactPayload);
  expected.payloadCanonicalSha256 = sha256Canonical(JSON.parse(exactPayload));
  expected.buildContext = () => expected.context;
  let initialized = false;
  const decisionValue = decision(expected, { nonce: 'e2e-nonce', receiptId: 'e2e-receipt', decisionReference: 'CM-TEST-E2E' });
  const scopeFingerprint = sha256Canonical({ client_id: 'Codex', project_id: 'codex-memory', scope_id: 'proof-scope', visibility: 'project', workspace_id: 'proof-workspace' });
  try {
    const result = await gate.execute({
      decision: decisionValue, runtimeFacts, payloadBytes: exactPayload, payloadBlobOid,
      executeNativeWrite: async ({ payload: args, assertion }) => {
        if (!initialized) { await app.initialize(); initialized = true; }
        const options = { executionContext: { agentAlias: 'Codex', agentId: 'phase8-test', clientId: 'codex', projectId: 'codex-memory', workspaceId: 'proof-workspace', scopeId: 'proof-scope', visibility: 'project', requestSource: 'phase8-e2e' }, phase8OneShotAuthorizationAssertion: assertion, auditReceipt: { receiptId: 'e2e-receipt' }, rollbackPosture: { mode: 'bounded_rollback_plan', rollbackPlanRef: 'phase8-rollback-plan' } };
        const concurrent = await Promise.all([
          app.callTool('record_memory', args, options),
          app.callTool('record_memory', args, options)
        ]);
        const delegated = concurrent.filter(item => item.status === 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATED');
        const rejected = concurrent.filter(item => item.reasonCode === 'phase8_one_shot_authorization_claim_invalid');
        assert.equal(delegated.length, 1);
        assert.equal(rejected.length, 1);
        const sequentialReplay = await app.callTool('record_memory', args, options);
        assert.equal(sequentialReplay.reasonCode, 'phase8_one_shot_authorization_claim_invalid');
        return delegated[0];
      },
      verifyWrite: async ({ claimId }) => verifyPhase8NativeWriteAuditProjection({ registry, claimId, receiptId: 'e2e-receipt', approvalDecisionReference: 'CM-TEST-E2E', claimBindingHash: (await registry.readClaim(claimId)).bindingHash, targetReferenceName: 'phase8-target', expectedScopeFingerprint: scopeFingerprint, scope: expected.allowedScope, callAuditMemory: args => app.callTool('audit_memory', args, { executionContext: { agentAlias: 'Codex', agentId: 'phase8-test', clientId: 'codex', projectId: 'codex-memory', workspaceId: 'proof-workspace', scopeId: 'proof-scope', visibility: 'project', requestSource: 'phase8-e2e' } }) })
    });
    assert.equal(result.accepted, true, JSON.stringify({ blockers: result.blockers, nativeStatus: result.result?.status, access: result.result?.access, receipt: result.result?.receipt, verify: result.verifyResult }));
    assert.equal(result.nativeWriteCalls, 1);
    assert.equal(result.verifyOperations, 1);
    const files = await fs.readdir(path.join(root, 'native-memory', 'codex-memory-governed'));
    assert.equal(files.length, 1);
  } finally {
    if (initialized) await app.close();
    await new Promise(resolve => shim.close(resolve));
    await fs.rm(root, { recursive: true, force: true });
  }
});
