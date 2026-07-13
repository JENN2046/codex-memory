'use strict';

const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  Phase8OneShotAuthorizationRegistry,
  sha256,
  sha256Canonical
} = require('../src/core/Phase8OneShotNativeWriteExecutionGate');
const {
  evaluateCm2096TombstoneExecutionDecisionIntake,
  isMachineBoundCm2096TombstoneDecision
} = require('../src/core/Cm2096TombstoneExecutionDecisionIntake');
const { createCm2096TombstoneOneShotGate } = require('../src/core/Cm2096TombstoneOneShotGate');
const { verifyCm2096TombstoneExecution } = require('../src/core/Cm2096TombstoneExecutionVerifier');
const { createCodexMemoryApplication } = require('../src/app');
const {
  createGovernedMcpVcpNativeVcpToolBoxMcpShimServer,
  createRecordMarkdown
} = require('../src/core/GovernedMcpVcpNativeVcpToolBoxMcpShim');
const {
  buildCm2096TombstonePayload,
  serializeCm2096DurableTombstoneMarker
} = require('../src/core/Cm2096TombstonePayloadSerializer');
const { IDENTITY_FILENAME, expectedIdentityBytes } = require('../src/core/Cm2096TargetStoreIdentity');
const { collectCm2096RealStoreProjection } = require('../src/core/Cm2096RealStoreProjectionCollector');

const proofPayload = require('../docs/near-model-memory-plan-pack/phase8_native_write_proof_record_cm2089.json');

const registryRootIdentity = {
  registryRootInstanceId: 'test-cm2096-governance-root-instance-001',
  registryRootReference: 'test-cm2096-governance-root',
  registryRootReinitializationAllowed: false,
  registryRootReplacementAllowed: false
};
const registryIdentity = {
  authorizationRegistryReference: 'cm2096-isolated-tombstone-drill-registry-001',
  registryStorageRole: 'durable-local-governance-state',
  registryReinitializationAllowed: false,
  registryDeletionAllowed: false
};

function expectedBinding() {
  return {
    expectedDecisionReference: 'CM-2096-ER-FUTURE-TOMBSTONE-EXECUTION-DECISION',
    executionPacketCommit: '1'.repeat(40),
    executionPacketBlobOid: '2'.repeat(40),
    executionPacketSha256: '3'.repeat(64),
    implementationCommit: '4'.repeat(40),
    implementationTree: '5'.repeat(40),
    targetStoreReference: 'cm2094-phase8-synthetic-native-write-store',
    targetStoreIdentitySha256: 'e28d9b2ffae919aeb2f49a5882badac92a0df20d6886400137cdbf3527000a13',
    targetMemoryIdRef: 'vcp-kb-4f863f52455147c6',
    targetRecordBytes: 269,
    targetRecordSha256: '4f863f52455147c691c873cc5821f82e9904b6df554d6aeaf2ac960a1baa3828',
    payloadCanonicalBytes: 331,
    payloadCanonicalSha256: '661e7eaf21cee1d31ebbaf81188fb65d4a1a0f5116ebd114aa37ca15a1251166',
    durableMarkerBytes: 507,
    durableMarkerSha256: '27a5e58649908bbc4f835d891149d028e71dcc5042dcb13daaa597bd4286263a',
    expectedMarkerMemoryIdRef: 'vcp-kb-27a5e58649908bbc',
    expectedContextHash: '9'.repeat(64),
    expectedAllowlistHash: 'a'.repeat(64),
    expectedScopeFingerprint: '8'.repeat(64),
    registryRootIdentitySha256: sha256Canonical(registryRootIdentity),
    nonce: 'cm2096-tombstone-drill-001',
    receiptId: 'cm2096-tombstone-drill-receipt-001',
    registryReference: registryIdentity.authorizationRegistryReference,
    allowedScope: {
      project_id: 'codex-memory',
      scope_id: 'cm2089-phase8-native-write-proof-001',
      workspace_id: 'codex-memory-phase8-proof',
      client_id: 'Codex',
      visibility: 'project'
    },
    runtimeTarget: {
      primaryRuntime: 'VCPToolBox native memory',
      targetReferenceName: 'cm2096-vcptoolbox-native-memory-target',
      targetKind: 'mcp_server'
    },
    rollbackPlanReference: 'cm2096-append-only-logical-tombstone-rollback-drill'
  };
}

function decisionBytes(binding = expectedBinding(), overrides = {}) {
  return Buffer.from(JSON.stringify({
    decisionReference: binding.expectedDecisionReference,
    executionReleaseAuthorized: true,
    tombstoneExecutionAuthorized: true,
    verifyExecutionAuthorized: true,
    token: 'APPROVE_VCP_BRIDGE_LIVE_TOMBSTONE_MEMORY_PROOF_EXACT',
    allowedAction: 'live_bridge_tombstone_memory_proof',
    executionPacketCommit: binding.executionPacketCommit,
    executionPacketBlobOid: binding.executionPacketBlobOid,
    executionPacketSha256: binding.executionPacketSha256,
    implementationCommit: binding.implementationCommit,
    implementationTree: binding.implementationTree,
    targetStoreReference: binding.targetStoreReference,
    targetStoreIdentitySha256: binding.targetStoreIdentitySha256,
    targetMemoryIdRef: binding.targetMemoryIdRef,
    targetRecordBytes: binding.targetRecordBytes,
    targetRecordSha256: binding.targetRecordSha256,
    payloadCanonicalBytes: binding.payloadCanonicalBytes,
    payloadCanonicalSha256: binding.payloadCanonicalSha256,
    durableMarkerBytes: binding.durableMarkerBytes,
    durableMarkerSha256: binding.durableMarkerSha256,
    expectedMarkerMemoryIdRef: binding.expectedMarkerMemoryIdRef,
    expectedContextHash: binding.expectedContextHash,
    expectedAllowlistHash: binding.expectedAllowlistHash,
    expectedScopeFingerprint: binding.expectedScopeFingerprint,
    registryRootIdentitySha256: binding.registryRootIdentitySha256,
    nonce: binding.nonce,
    receiptId: binding.receiptId,
    registryReference: binding.registryReference,
    authorizationUseCount: 1,
    maxTombstoneWrites: 1,
    maxVerifyOperations: 1,
    maxRetries: 0,
    maxSupersedeOperations: 0,
    maxCompensationOperations: 0,
    localFallbackAllowed: false,
    registryMarkerDeletionAllowed: false,
    registryRebuildAllowed: false,
    expiresAt: '2030-01-01T00:00:00.000Z',
    approvedAt: '2026-07-11T00:00:00.000Z',
    ...overrides
  }), 'utf8');
}

function intakeDecision(binding = expectedBinding(), overrides = {}, now = new Date('2026-07-11T00:00:00.000Z')) {
  const bytes = decisionBytes(binding, overrides);
  const intake = evaluateCm2096TombstoneExecutionDecisionIntake({
    decisionBytes: bytes,
    observedBinding: {
      decisionSourceCommit: '6'.repeat(40),
      decisionBlobOid: '7'.repeat(40),
      decisionPayloadSha256: sha256(bytes)
    },
    expectedBinding: binding,
    now
  });
  assert.equal(intake.accepted, true, intake.blockers.join(', '));
  return intake.decision;
}

async function newRegistry() {
  const governanceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cm2096-one-shot-'));
  fsSync.writeFileSync(
    path.join(governanceRoot, '.phase8-registry-root-identity.json'),
    JSON.stringify(Object.fromEntries(Object.keys(registryRootIdentity).sort().map(key => [key, registryRootIdentity[key]])))
  );
  return new Phase8OneShotAuthorizationRegistry({ governanceRoot, rootIdentity: registryRootIdentity, identity: registryIdentity });
}

function preStoreProjection(binding = expectedBinding()) {
  return {
    accepted: true,
    stage: 'pre_rollback',
    markerAbsent: true,
    identity: { identitySha256: binding.targetStoreIdentitySha256 },
    targetRecordProjection: {
      memoryIdRef: binding.targetMemoryIdRef,
      durableBytes: binding.targetRecordBytes,
      durableSha256: binding.targetRecordSha256
    },
    otherRealMemoryRead: false,
    otherRealMemoryModified: false,
    rawMemoryReturned: false,
    rawPathDisclosed: false
  };
}

function postStoreProjection(binding = expectedBinding()) {
  return {
    accepted: true,
    stage: 'post_rollback',
    identity: { identitySha256: binding.targetStoreIdentitySha256 },
    targetRecordProjection: {
      accepted: true,
      memoryIdRef: binding.targetMemoryIdRef,
      durableBytes: binding.targetRecordBytes,
      durableSha256: binding.targetRecordSha256,
      rawContentIncluded: false,
      rawPathDisclosed: false
    },
    tombstoneMarkerProjection: {
      accepted: true,
      memoryIdRef: binding.expectedMarkerMemoryIdRef,
      toolName: 'tombstone_memory',
      targetMemoryIdRef: binding.targetMemoryIdRef,
      markerMemoryIdRef: binding.expectedMarkerMemoryIdRef,
      durableBytes: 507,
      durableSha256: binding.durableMarkerSha256,
      receiptBindingMatched: false,
      mutationMarkerOnly: true,
      rawContentIncluded: false,
      rawPathDisclosed: false
    },
    sourceCandidateMemoryIdRefs: [binding.targetMemoryIdRef, binding.expectedMarkerMemoryIdRef],
    otherRealMemoryRead: false,
    otherRealMemoryModified: false,
    rawMemoryReturned: false,
    rawPathDisclosed: false
  };
}

function auditReport(binding, decisionReference, claimBindingHash, overrides = {}) {
  return {
    accepted: true,
    access: { rawMemoryReturned: false, rawAuditReturned: false, contentReturned: false },
    findings: [
      { governedNativeBridgeReceipt: { toolName: 'tombstone_memory', auditReceiptReferenceName: 'old-unrelated-receipt', memoryWritePerformed: true } },
      { governedNativeBridgeReceipt: {
        toolName: 'tombstone_memory',
        auditReceiptReferenceName: binding.receiptId,
        exactApprovalAction: 'live_bridge_tombstone_memory_proof',
        exactApprovalActionMatched: true,
        exactApprovalDecisionReference: decisionReference,
        exactApprovalClaimBindingHash: claimBindingHash,
        targetReferenceName: binding.runtimeTarget.targetReferenceName,
        scopeFingerprintPresent: true,
        scopeFingerprintMatched: true,
        writeAllowed: true,
        nativeInvocationAttempted: true,
        nativeInvocationReceiptBindingMatched: true,
        memoryWritePerformed: true,
        rawRequestBodyPersisted: false,
        rawResponseBodyPersisted: false,
        ...overrides
      } }
    ]
  };
}

test('CM-2096 decision intake machine-binds exact bytes and rejects drift', () => {
  const binding = expectedBinding();
  const decision = intakeDecision(binding);
  assert.equal(isMachineBoundCm2096TombstoneDecision(decision), true);
  assert.equal(isMachineBoundCm2096TombstoneDecision({ ...decision }), false);
  const drifted = decisionBytes(binding, { maxTombstoneWrites: 2 });
  const result = evaluateCm2096TombstoneExecutionDecisionIntake({
    decisionBytes: drifted,
    observedBinding: { decisionSourceCommit: '6'.repeat(40), decisionBlobOid: '7'.repeat(40), decisionPayloadSha256: sha256(drifted) },
    expectedBinding: binding,
    now: new Date('2026-07-11T00:00:00.000Z')
  });
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('decision.maxTombstoneWrites'));

  const expanded = decisionBytes(binding, { compensationAuthorized: true });
  const expandedResult = evaluateCm2096TombstoneExecutionDecisionIntake({
    decisionBytes: expanded,
    observedBinding: { decisionSourceCommit: '6'.repeat(40), decisionBlobOid: '7'.repeat(40), decisionPayloadSha256: sha256(expanded) },
    expectedBinding: binding,
    now: new Date('2026-07-11T00:00:00.000Z')
  });
  assert.equal(expandedResult.accepted, false);
  assert.ok(expandedResult.blockers.includes('decision.fields'));
});

test('CM-2096 decision intake rejects malformed, future, or inverted approval windows', () => {
  const binding = expectedBinding();
  for (const [name, overrides] of [
    ['malformed approvedAt', { approvedAt: 'not-a-timestamp' }],
    ['future approvedAt', { approvedAt: '2026-07-12T00:00:00.000Z' }],
    ['approvedAt after expiresAt', {
      approvedAt: '2031-01-01T00:00:00.000Z',
      expiresAt: '2030-01-01T00:00:00.000Z'
    }],
    ['malformed expiresAt', { expiresAt: 'not-a-timestamp' }]
  ]) {
    const bytes = decisionBytes(binding, overrides);
    const result = evaluateCm2096TombstoneExecutionDecisionIntake({
      decisionBytes: bytes,
      observedBinding: {
        decisionSourceCommit: '6'.repeat(40),
        decisionBlobOid: '7'.repeat(40),
        decisionPayloadSha256: sha256(bytes)
      },
      expectedBinding: binding,
      now: new Date('2026-07-11T00:00:00.000Z')
    });

    assert.equal(result.accepted, false, name);
    assert.ok(
      result.blockers.includes('decision.approvedAt') ||
      result.blockers.includes('decision.expiresAt'),
      name
    );
  }
});

test('CM-2096 tombstone assertion is atomically consumable exactly once', async () => {
  const binding = expectedBinding();
  const registry = await newRegistry();
  const gate = createCm2096TombstoneOneShotGate({ registry, expectedBinding: binding, now: () => new Date('2026-07-11T00:00:00.000Z') });
  const claim = await gate.claim({ decision: intakeDecision(binding), preStoreProjection: preStoreProjection(binding) });
  assert.equal(claim.accepted, true, claim.blockers.join(', '));
  const attempts = await Promise.all([gate.verifyAssertion(claim.assertion), gate.verifyAssertion(claim.assertion)]);
  assert.equal(attempts.filter(item => item.accepted === true).length, 1);
  assert.equal((await gate.verifyAssertion(claim.assertion)).accepted, false);
  const record = await registry.readClaim(claim.claimId);
  assert.equal(record.state, 'WRITE_INVOCATION_CONSUMED');
  assert.equal(record.writeInvocationCount, 1);
});

test('CM-2096 claim fails before registry mutation for copied decision, expiry, or store drift', async () => {
  const binding = expectedBinding();
  for (const [decision, projection, now, blocker] of [
    [{ ...intakeDecision(binding) }, preStoreProjection(binding), new Date('2026-07-11T00:00:00.000Z'), 'decision.machineBoundIntake'],
    [intakeDecision(binding), preStoreProjection(binding), new Date('2031-01-01T00:00:00.000Z'), 'decision.expired'],
    [intakeDecision(binding), { ...preStoreProjection(binding), markerAbsent: false }, new Date('2026-07-11T00:00:00.000Z'), 'store.preflight']
  ]) {
    const registry = await newRegistry();
    const gate = createCm2096TombstoneOneShotGate({ registry, expectedBinding: binding, now: () => now });
    const result = await gate.claim({ decision, preStoreProjection: projection });
    assert.equal(result.accepted, false);
    assert.ok(result.blockers.includes(blocker));
    await assert.rejects(fs.access(path.join(registry.directory, '.claim.lock')));
  }
});

test('CM-2096 claim rejects a machine-bound decision paired with a drifted gate binding', async () => {
  const decisionBinding = expectedBinding();
  const decision = intakeDecision(decisionBinding);
  const gateBinding = {
    ...decisionBinding,
    targetStoreReference: 'drifted-store',
    allowedScope: { ...decisionBinding.allowedScope, scope_id: 'drifted-scope' }
  };
  const registry = await newRegistry();
  const gate = createCm2096TombstoneOneShotGate({
    registry,
    expectedBinding: gateBinding,
    now: () => new Date('2026-07-11T00:00:00.000Z')
  });
  const result = await gate.claim({ decision, preStoreProjection: preStoreProjection(gateBinding) });
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('decision.executionBinding'));
});

test('CM-2096 verify accepts only the exact write receipt and then derives tombstoned visibility', async () => {
  const binding = expectedBinding();
  const decision = intakeDecision(binding);
  const registry = await newRegistry();
  const gate = createCm2096TombstoneOneShotGate({ registry, expectedBinding: binding, now: () => new Date('2026-07-11T00:00:00.000Z') });
  const claimed = await gate.claim({ decision, preStoreProjection: preStoreProjection(binding) });
  assert.equal((await gate.verifyAssertion(claimed.assertion)).accepted, true);
  let calls = 0;
  const result = await verifyCm2096TombstoneExecution({
    registry,
    claimId: claimed.claimId,
    receiptId: binding.receiptId,
    decisionReference: decision.decisionReference,
    claimBindingHash: claimed.bindingHash,
    runtimeTargetReferenceName: binding.runtimeTarget.targetReferenceName,
    scope: binding.allowedScope,
    expectedScopeFingerprint: sha256Canonical(binding.allowedScope),
    postStoreProjection: postStoreProjection(binding),
    callAuditMemory: async input => {
      calls += 1;
      assert.equal(input.include_raw, false);
      assert.equal(input.window, 10);
      return auditReport(binding, decision.decisionReference, claimed.bindingHash);
    }
  });
  assert.equal(result.accepted, true, result.reasonCode);
  assert.equal(result.effectiveLifecycleStatus, 'tombstoned');
  assert.equal(result.governedRetrievalEffectiveTargetCount, 0);
  assert.equal(result.originalRecordUnchanged, true);
  assert.equal(result.rawMemoryReturned, false);
  assert.equal(result.rawPathDisclosed, false);
  assert.equal(calls, 1);
});

test('CM-2096 verify rejects receipt, decision, claim, target, or raw-output drift', async t => {
  const binding = expectedBinding();
  const decision = intakeDecision(binding);
  for (const [name, receiptOverrides, reportOverrides] of [
    ['receipt', { auditReceiptReferenceName: 'wrong' }, {}],
    ['decision', { exactApprovalDecisionReference: 'wrong' }, {}],
    ['claim', { exactApprovalClaimBindingHash: '0'.repeat(64) }, {}],
    ['target', { targetReferenceName: 'wrong' }, {}],
    ['raw-output', {}, { access: { rawMemoryReturned: false, rawAuditReturned: false, contentReturned: true } }]
  ]) {
    await t.test(name, async () => {
      const registry = await newRegistry();
      const gate = createCm2096TombstoneOneShotGate({ registry, expectedBinding: binding, now: () => new Date('2026-07-11T00:00:00.000Z') });
      const claimed = await gate.claim({ decision, preStoreProjection: preStoreProjection(binding) });
      assert.equal((await gate.verifyAssertion(claimed.assertion)).accepted, true);
      const report = auditReport(binding, decision.decisionReference, claimed.bindingHash, receiptOverrides);
      Object.assign(report, reportOverrides);
      const result = await verifyCm2096TombstoneExecution({
        registry,
        claimId: claimed.claimId,
        receiptId: binding.receiptId,
        decisionReference: decision.decisionReference,
        claimBindingHash: claimed.bindingHash,
        runtimeTargetReferenceName: binding.runtimeTarget.targetReferenceName,
        scope: binding.allowedScope,
        expectedScopeFingerprint: sha256Canonical(binding.allowedScope),
        postStoreProjection: postStoreProjection(binding),
        callAuditMemory: async () => report
      });
      assert.equal(result.accepted, false);
    });
  }
});

test('CM-2096 verify rejects a receipt argument not bound to the registry claim before audit', async () => {
  const binding = expectedBinding();
  const decision = intakeDecision(binding);
  const registry = await newRegistry();
  const gate = createCm2096TombstoneOneShotGate({ registry, expectedBinding: binding, now: () => new Date('2026-07-11T00:00:00.000Z') });
  const claimed = await gate.claim({ decision, preStoreProjection: preStoreProjection(binding) });
  assert.equal((await gate.verifyAssertion(claimed.assertion)).accepted, true);
  let called = false;
  const result = await verifyCm2096TombstoneExecution({
    registry,
    claimId: claimed.claimId,
    receiptId: 'different-receipt',
    decisionReference: decision.decisionReference,
    claimBindingHash: claimed.bindingHash,
    runtimeTargetReferenceName: binding.runtimeTarget.targetReferenceName,
    scope: binding.allowedScope,
    expectedScopeFingerprint: sha256Canonical(binding.allowedScope),
    postStoreProjection: postStoreProjection(binding),
    callAuditMemory: async () => { called = true; return {}; }
  });
  assert.equal(result.reasonCode, 'cm2096_verify_claim_binding_invalid');
  assert.equal(called, false);
});

test('CM-2096 verify rejects a valid-looking fingerprint not derived from the exact scope', async () => {
  const binding = expectedBinding();
  const decision = intakeDecision(binding);
  const registry = await newRegistry();
  const gate = createCm2096TombstoneOneShotGate({ registry, expectedBinding: binding, now: () => new Date('2026-07-11T00:00:00.000Z') });
  const claimed = await gate.claim({ decision, preStoreProjection: preStoreProjection(binding) });
  assert.equal((await gate.verifyAssertion(claimed.assertion)).accepted, true);
  let called = false;
  const result = await verifyCm2096TombstoneExecution({
    registry,
    claimId: claimed.claimId,
    receiptId: binding.receiptId,
    decisionReference: decision.decisionReference,
    claimBindingHash: claimed.bindingHash,
    runtimeTargetReferenceName: binding.runtimeTarget.targetReferenceName,
    scope: binding.allowedScope,
    expectedScopeFingerprint: '8'.repeat(64),
    postStoreProjection: postStoreProjection(binding),
    callAuditMemory: async () => { called = true; return {}; }
  });
  assert.equal(result.reasonCode, 'cm2096_verify_scope_fingerprint_invalid');
  assert.equal(called, false);
});

test('CM-2096 fixture path reaches app, HTTP MCP shim, exact marker, real collector, and exact verify once', async () => {
  const binding = expectedBinding();
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cm2096-e2e-'));
  const targetRoot = path.join(root, 'native-memory');
  const targetDir = path.join(targetRoot, 'codex-memory-governed');
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(root, 'KnowledgeBaseManager.js'), 'module.exports={initialize:async()=>{}};', { flag: 'wx' });
  await fs.writeFile(path.join(root, 'EmbeddingUtils.js'), 'module.exports={};', { flag: 'wx' });
  await fs.writeFile(path.join(targetRoot, IDENTITY_FILENAME), expectedIdentityBytes(), { flag: 'wx' });
  await fs.writeFile(path.join(targetDir, 'synthetic-target-4f863f52455147c6.md'), createRecordMarkdown(proofPayload), { flag: 'wx' });
  const shim = createGovernedMcpVcpNativeVcpToolBoxMcpShimServer({
    vcpToolBoxRoot: root,
    knowledgeBaseRootPath: targetRoot,
    knowledgeBaseStorePath: path.join(root, 'isolated-index'),
    enableWrite: true
  });
  await new Promise(resolve => shim.listen(0, '127.0.0.1', resolve));
  const oldRoot = process.env.KNOWLEDGEBASE_ROOT_PATH;
  const oldStore = process.env.KNOWLEDGEBASE_STORE_PATH;
  const registry = await newRegistry();
  const gate = createCm2096TombstoneOneShotGate({ registry, expectedBinding: binding, now: () => new Date('2026-07-11T00:00:00.000Z') });
  const app = createCodexMemoryApplication({
    projectBasePath: path.join(root, 'app'),
    dailyNoteRootPath: path.join(root, 'app-diary'),
    logsDir: path.join(root, 'logs'),
    dataDir: path.join(root, 'data'),
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeReadDelegationMode: 'off',
    governedMcpVcpNativeRuntimeTarget: {
      accepted: true,
      targetReferenceName: binding.runtimeTarget.targetReferenceName,
      targetKind: binding.runtimeTarget.targetKind,
      sourceAuthority: 'bridge_runtime_or_static_config'
    },
    governedMcpVcpNativeHttpMcpTarget: {
      endpoint: `http://127.0.0.1:${shim.address().port}`,
      bearerToken: 'fixture-only-token',
      mcpToolNameByAction: { tombstone_memory: 'knowledge_base.tombstone' },
      requestTimeoutMs: 2000
    },
    cm2096TombstoneOneShotEnforcementEnabled: true,
    cm2096TombstoneAuthorizationAssertionVerifier: gate.verifyAssertion
  });
  const executionContext = {
    agentAlias: 'Codex',
    agentId: 'cm2096-fixture-test',
    clientId: 'codex',
    projectId: binding.allowedScope.project_id,
    workspaceId: binding.allowedScope.workspace_id,
    scopeId: binding.allowedScope.scope_id,
    visibility: binding.allowedScope.visibility,
    requestSource: 'cm2096-fixture-e2e'
  };
  try {
    await app.initialize();
    const pre = await collectCm2096RealStoreProjection({ knowledgeBaseRootPath: targetRoot, stage: 'pre_rollback' });
    const decision = intakeDecision(binding);
    const claimed = await gate.claim({ decision, preStoreProjection: pre });
    assert.equal(claimed.accepted, true, claimed.blockers.join(', '));
    const payload = {
      ...buildCm2096TombstonePayload(),
      actor_client_id: 'Codex',
      request_source: 'cm2096-frozen-rollback-v3',
      dry_run: false,
      confirm: true
    };
    const options = {
      executionContext,
      cm2096TombstoneAuthorizationAssertion: claimed.assertion,
      auditReceipt: { receiptId: binding.receiptId },
      rollbackPosture: { mode: 'mutation_cleanup_plan', rollbackPlanRef: binding.rollbackPlanReference }
    };
    const concurrent = await Promise.all([
      app.callTool('tombstone_memory', payload, options),
      app.callTool('tombstone_memory', payload, options)
    ]);
    const resultShapes = concurrent.map(result => ({ status: result.status, reasonCode: result.reasonCode, decision: result.decision, blockers: result.gate?.blockers }));
    assert.equal(concurrent.filter(result => result.status === 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATED').length, 1, JSON.stringify(resultShapes));
    assert.equal(concurrent.filter(result => result.reasonCode === 'cm2096_tombstone_one_shot_authorization_claim_invalid').length, 1);
    assert.equal((await app.callTool('tombstone_memory', payload, options)).reasonCode, 'cm2096_tombstone_one_shot_authorization_claim_invalid');
    const post = await collectCm2096RealStoreProjection({ knowledgeBaseRootPath: targetRoot, stage: 'post_rollback' });
    assert.equal(post.accepted, true, post.reasonCode);
    const scopeFingerprint = sha256Canonical(binding.allowedScope);
    const verified = await verifyCm2096TombstoneExecution({
      registry,
      claimId: claimed.claimId,
      receiptId: binding.receiptId,
      decisionReference: decision.decisionReference,
      claimBindingHash: claimed.bindingHash,
      runtimeTargetReferenceName: binding.runtimeTarget.targetReferenceName,
      scope: binding.allowedScope,
      expectedScopeFingerprint: scopeFingerprint,
      postStoreProjection: post,
      callAuditMemory: args => app.callTool('audit_memory', args, { executionContext })
    });
    assert.equal(verified.accepted, true, verified.reasonCode);
    await gate.finalize(claimed.claimId, 'CONSUMED_SUCCESS');
    assert.equal((await registry.readClaim(claimed.claimId)).state, 'CONSUMED_SUCCESS');
    const files = await fs.readdir(targetDir);
    assert.equal(files.length, 2);
    assert.ok(files.some(name => name.endsWith(`-${serializeCm2096DurableTombstoneMarker().markerMemoryIdRef.replace('vcp-kb-', '')}.md`)));
  } finally {
    await app.close();
    await new Promise(resolve => shim.close(resolve));
    if (oldRoot === undefined) delete process.env.KNOWLEDGEBASE_ROOT_PATH;
    else process.env.KNOWLEDGEBASE_ROOT_PATH = oldRoot;
    if (oldStore === undefined) delete process.env.KNOWLEDGEBASE_STORE_PATH;
    else process.env.KNOWLEDGEBASE_STORE_PATH = oldStore;
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('CM-2096 exact root identity remains canonical in registry tests', () => {
  assert.equal(sha256Canonical(registryRootIdentity).length, 64);
});
