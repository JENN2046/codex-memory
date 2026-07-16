'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { createCodexMemoryApplication } = require('../src/app');
const {
  IDENTITY_FILENAME,
  STORE_IDENTITY,
  expectedIdentityBytes
} = require('../src/core/Cm2102IdentityBoundRollbackLifecycleFoundation');
const {
  createGovernedMcpVcpNativeVcpToolBoxMcpShimServer,
  createRecordMarkdown,
  createVcpToolBoxNativeMemoryAdapter
} = require('../src/core/GovernedMcpVcpNativeVcpToolBoxMcpShim');
const { sha256Canonical } = require('../src/core/Phase8OneShotNativeWriteExecutionGate');
const { EXPECTED: RECORD_EXPECTED } = require('../src/core/Cm2106IdentityBoundSyntheticRecordWrite');
const {
  ALLOWED_SCOPE,
  EXPECTED,
  RECORD_RECEIPT_BINDING,
  RECORD_RECEIPT_PATH,
  buildTombstonePayload,
  collectPostRollbackProjection,
  collectPreRollbackProjection,
  evaluateRecordReceiptBytes,
  evaluateRollbackReceipt,
  expectedAllowlist,
  expectedRuntimeContext,
  filterEffectiveCandidateRefs,
  projectMarkerAwareLifecycle,
  serializeDurableMarker,
  verifyTombstoneExecution
} = require('../src/core/Cm2107IdentityBoundTombstoneRollback');
const {
  appOverrides,
  finalizeCm2107ExecutionReceipt,
  runFrozenCm2107Tombstone,
  validatePacket
} = require('../src/cli/cm2107-identity-bound-tombstone-rollback');

async function lifecycleStore(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cm2107-lifecycle-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, IDENTITY_FILENAME), expectedIdentityBytes(), { flag: 'wx' });
  const writeDir = path.join(root, STORE_IDENTITY.writeSubdir);
  await fs.mkdir(writeDir);
  const payload = JSON.parse(await fs.readFile(path.join(
    __dirname,
    '../docs/near-model-memory-plan-pack/phase8_identity_bound_synthetic_record_payload_cm2106.json'
  ), 'utf8'));
  await fs.writeFile(
    path.join(writeDir, `fixture-${RECORD_EXPECTED.durableRecordSha256.slice(0, 16)}.md`),
    createRecordMarkdown(payload),
    { flag: 'wx' }
  );
  return root;
}

function packetFixture(overrides = {}) {
  const packet = {
    schemaVersion: 1,
    taskId: 'CM-2107',
    packetType: 'identity_bound_append_only_tombstone_one_shot_execution_packet',
    packetDoesNotAuthorizeExecution: true,
    executionAuthorizedAtPacketFreeze: false,
    expectedDecisionReference: EXPECTED.decisionReference,
    implementationCommit: '1'.repeat(40),
    implementationTree: '2'.repeat(40),
    recordReceiptCommit: RECORD_RECEIPT_BINDING.commit,
    recordReceiptTree: RECORD_RECEIPT_BINDING.tree,
    recordReceiptBlobOid: RECORD_RECEIPT_BINDING.blobOid,
    recordReceiptBytes: RECORD_RECEIPT_BINDING.bytes,
    recordReceiptSha256: RECORD_RECEIPT_BINDING.sha256,
    targetStoreReference: 'phase8-identity-bound-synthetic-rollback-store-001',
    targetStoreIdentitySha256: '017307c9a1cb3e216895934b9c2aae8fa5773b909afebe87d3f91bc0a5736f57',
    targetMemoryIdRef: RECORD_EXPECTED.memoryIdRef,
    targetRecordBytes: RECORD_EXPECTED.durableRecordBytes,
    targetRecordSha256: RECORD_EXPECTED.durableRecordSha256,
    rollbackModel: 'append_only_logical_tombstone',
    payloadCanonicalBytes: EXPECTED.payloadCanonicalBytes,
    payloadCanonicalSha256: EXPECTED.payloadCanonicalSha256,
    durableMarkerBytes: EXPECTED.durableMarkerBytes,
    durableMarkerSha256: EXPECTED.durableMarkerSha256,
    expectedMarkerMemoryIdRef: EXPECTED.markerMemoryIdRef,
    registryRootIdentitySha256: '240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0',
    nonce: EXPECTED.nonce,
    receiptId: EXPECTED.receiptId,
    registryReference: EXPECTED.registryReference,
    authorizationUseCount: 1,
    allowedScope: ALLOWED_SCOPE,
    runtimeTargetReference: EXPECTED.runtimeTargetReference,
    primaryWriteOnly: true,
    expectedScopeFingerprint: EXPECTED.scopeFingerprint,
    expectedContextHash: sha256Canonical(expectedRuntimeContext({
      implementationCommit: '1'.repeat(40), implementationTree: '2'.repeat(40)
    })),
    expectedAllowlistHash: sha256Canonical(expectedAllowlist()),
    maxTombstoneWrites: 1,
    maxVerifyOperations: 1,
    maxRetries: 0,
    maxSupersedeOperations: 0,
    maxCompensationOperations: 0,
    localFallbackAllowed: false,
    providerCallsAllowed: false,
    derivedIndexWritesAllowed: false,
    physicalDeleteAllowed: false,
    inPlaceOverwriteAllowed: false,
    existingRealMemoryModificationAllowed: false,
    otherRealMemoryReadAllowed: false,
    defaultProductRetrievalTombstoneAwarenessProven: false,
    rollbackDrillPassed: false,
    failureRecoveryProofPassed: false,
    phase8Completed: false,
    readinessClaimed: false,
    ...overrides
  };
  packet.packetPayloadSha256 = sha256Canonical(packet);
  return packet;
}

test('CM-2107 freezes the exact append-only tombstone payload and durable marker', () => {
  const marker = serializeDurableMarker();
  assert.equal(sha256Canonical(buildTombstonePayload()), EXPECTED.payloadCanonicalSha256);
  assert.equal(marker.bytes.length, EXPECTED.durableMarkerBytes);
  assert.equal(marker.markerMemoryIdRef, EXPECTED.markerMemoryIdRef);
  assert.equal(marker.targetMemoryIdRef, RECORD_EXPECTED.memoryIdRef);
});

test('CM-2107 collectors prove original record preservation and exact marker append', async t => {
  const root = await lifecycleStore(t);
  const pre = await collectPreRollbackProjection(root);
  assert.equal(pre.accepted, true);
  assert.equal(pre.markerAbsent, true);
  const adapter = createVcpToolBoxNativeMemoryAdapter({
    knowledgeBaseRootPath: root,
    knowledgeBaseStorePath: path.join(root, '..', 'unused-derived'),
    writeSubdir: STORE_IDENTITY.writeSubdir,
    primaryWriteOnly: true
  });
  const result = await adapter.tombstone(buildTombstonePayload());
  assert.equal(result.memory_id_ref, EXPECTED.markerMemoryIdRef);
  const post = await collectPostRollbackProjection(root);
  assert.equal(post.accepted, true);
  assert.equal(post.targetRecordProjection.durableSha256, RECORD_EXPECTED.durableRecordSha256);
  assert.equal(post.tombstoneMarkerProjection.durableSha256, EXPECTED.durableMarkerSha256);
  const lifecycle = projectMarkerAwareLifecycle(post.targetRecordProjection, {
    ...post.tombstoneMarkerProjection,
    receiptBindingMatched: true
  });
  assert.equal(lifecycle.accepted, true);
  assert.deepEqual(filterEffectiveCandidateRefs(post.sourceCandidateMemoryIdRefs, lifecycle), [
    EXPECTED.markerMemoryIdRef
  ]);
  await adapter.shutdown();
});

test('CM-2107 primary-write shim rechecks the exact one-record store before tombstone append', async t => {
  const root = await lifecycleStore(t);
  assert.equal((await collectPreRollbackProjection(root)).accepted, true);
  await fs.writeFile(
    path.join(root, STORE_IDENTITY.writeSubdir, 'concurrent-entry.md'),
    'synthetic-race-fixture'
  );
  const adapter = createVcpToolBoxNativeMemoryAdapter({
    knowledgeBaseRootPath: root,
    knowledgeBaseStorePath: path.join(root, '..', 'unused-derived'),
    writeSubdir: STORE_IDENTITY.writeSubdir,
    primaryWriteOnly: true,
    primaryWritePreflight: () => collectPreRollbackProjection(root)
  });
  t.after(() => adapter.shutdown());
  await assert.rejects(
    adapter.tombstone(buildTombstonePayload()),
    /cm2107_pre_rollback_file_set_mismatch/
  );
  const entries = await fs.readdir(path.join(root, STORE_IDENTITY.writeSubdir));
  assert.equal(entries.some(entry => entry.endsWith(`-${EXPECTED.durableMarkerSha256.slice(0, 16)}.md`)), false);
});

test('CM-2107 packet grants one tombstone, one verify, and no retry/supersede/compensation', () => {
  assert.deepEqual(validatePacket(packetFixture()), []);
  for (const drift of [
    { maxTombstoneWrites: 2 },
    { maxVerifyOperations: 2 },
    { maxRetries: 1 },
    { maxSupersedeOperations: 1 },
    { maxCompensationOperations: 1 },
    { providerCallsAllowed: true },
    { executionAuthorizedAtPacketFreeze: true },
    { rollbackModel: 'supersede' },
    { productionReady: true },
    { rollbackDrillPassed: true }
  ]) assert.notDeepEqual(validatePacket(packetFixture(drift)), [], JSON.stringify(drift));
  const missing = packetFixture();
  delete missing.rollbackModel;
  const { packetPayloadSha256: _oldHash, ...missingPayload } = missing;
  missing.packetPayloadSha256 = sha256Canonical(missingPayload);
  assert.ok(validatePacket(missing).includes('packet.keys'));
});

test('CM-2107 accepts only the exact frozen CM-2106 R1 write receipt', async () => {
  const bytes = await fs.readFile(path.join(__dirname, '..', RECORD_RECEIPT_PATH));
  const result = evaluateRecordReceiptBytes(bytes);
  assert.equal(bytes.length, RECORD_RECEIPT_BINDING.bytes);
  assert.equal(result.accepted, true, result.blockers.join(', '));
});

test('CM-2107 strict bridge delegates one primary-write-only tombstone marker', async t => {
  const root = await lifecycleStore(t);
  const adapter = createVcpToolBoxNativeMemoryAdapter({
    knowledgeBaseRootPath: root,
    knowledgeBaseStorePath: path.join(root, '..', 'unused-derived'),
    writeSubdir: STORE_IDENTITY.writeSubdir,
    primaryWriteOnly: true
  });
  const bearerToken = 'synthetic-fixture-only';
  const server = createGovernedMcpVcpNativeVcpToolBoxMcpShimServer({
    adapter,
    enableWrite: true,
    expectedBearerToken: bearerToken
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await adapter.shutdown();
  });
  const address = server.address();
  const endpoint = ['http:', '', `127.0.0.1:${address.port}`, 'mcp', 'vcp-native'].join('/');
  const rejected = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })
  });
  assert.equal(rejected.status, 401);
  const appStateRoot = path.join(path.dirname(root), `${path.basename(root)}-app`);
  t.after(() => fs.rm(appStateRoot, { recursive: true, force: true }));
  const app = createCodexMemoryApplication({
    ...appOverrides({ endpoint, bearerToken, appStateRoot }),
    cm2096TombstoneOneShotEnforcementEnabled: true,
    cm2096TombstoneAuthorizationAssertionVerifier: async () => ({
      accepted: true,
      exactApprovalResult: {
        accepted: true,
        allowedAction: 'live_bridge_tombstone_memory_proof',
        allowedScope: ALLOWED_SCOPE,
        runtimeTarget: {
          primaryRuntime: 'VCPToolBox native memory',
          targetReferenceName: EXPECTED.runtimeTargetReference,
          targetKind: 'mcp_server'
        },
        rollbackPlanRef: EXPECTED.rollbackPlanReference,
        approvalDecisionReference: EXPECTED.decisionReference,
        claimBindingHash: 'a'.repeat(64),
        approvedAt: '2026-07-12T04:00:00+08:00'
      }
    })
  });
  t.after(() => app.close());
  await app.initialize();
  const result = await app.callTool('tombstone_memory', {
    ...buildTombstonePayload(), actor_client_id: 'Codex', request_source: 'cm2107-fixture',
    dry_run: false, confirm: true
  }, {
    executionContext: {
      agentAlias: 'Codex', agentId: 'cm2107-fixture', clientId: 'codex',
      projectId: ALLOWED_SCOPE.project_id, workspaceId: ALLOWED_SCOPE.workspace_id,
      scopeId: ALLOWED_SCOPE.scope_id, visibility: ALLOWED_SCOPE.visibility,
      requestSource: 'cm2107-fixture'
    },
    cm2096TombstoneAuthorizationAssertion: { fixtureOnly: true },
    auditReceipt: { receiptId: EXPECTED.receiptId },
    rollbackPosture: { mode: 'mutation_cleanup_plan', rollbackPlanRef: EXPECTED.rollbackPlanReference },
    outputDisclosureBudget: {
      level: 'summary', lowDisclosure: true, rawOutput: false, maxItems: 5, maxBytes: 4096
    }
  });
  assert.equal(result.status, 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATED', JSON.stringify({
    decision: result.decision, reasonCode: result.reasonCode, gate: result.gate
  }));
  assert.equal(result.access.memoryWritePerformed, true);
  assert.equal(result.access.localMemoryFallbackUsed, false);
  assert.equal(result.receipt.nativeInvocationReceipt.statusClass, 'success');
  assert.equal(result.receipt.nativeInvocationReceipt.nativeRuntimeReceipt.nativeRuntimeCalled, false);
  assert.equal(result.receipt.nativeInvocationReceipt.nativeRuntimeReceipt.nativeRuntimeInitialized, false);
  assert.equal(result.receipt.nativeInvocationReceipt.nativeRuntimeReceipt.isolatedRuntimeStoreUsed, false);
  assert.equal(result.receipt.nativeInvocationReceipt.nativeRuntimeReceipt.durableWritePerformed, true);
  assert.equal(server.getLowDisclosureAuthorizationProjection().authorizationRequired, true);
  assert.equal(server.getLowDisclosureAuthorizationProjection().rejectedAuthorizationCount, 1);
  assert.equal((await collectPostRollbackProjection(root)).accepted, true);
});

test('CM-2107 verify requires exact audit correlation and yields zero effective target count', async () => {
  const claimId = 'a'.repeat(64);
  const bindingHash = 'b'.repeat(64);
  const postStoreProjection = {
    accepted: true,
    stage: 'post_rollback',
    targetRecordProjection: {
      memoryIdRef: RECORD_EXPECTED.memoryIdRef,
      durableBytes: RECORD_EXPECTED.durableRecordBytes,
      durableSha256: RECORD_EXPECTED.durableRecordSha256,
      rawContentIncluded: false
    },
    tombstoneMarkerProjection: {
      toolName: 'tombstone_memory',
      targetMemoryIdRef: RECORD_EXPECTED.memoryIdRef,
      markerMemoryIdRef: EXPECTED.markerMemoryIdRef,
      durableBytes: EXPECTED.durableMarkerBytes,
      durableSha256: EXPECTED.durableMarkerSha256,
      receiptBindingMatched: false,
      mutationMarkerOnly: true,
      rawContentIncluded: false
    },
    sourceCandidateMemoryIdRefs: [RECORD_EXPECTED.memoryIdRef, EXPECTED.markerMemoryIdRef],
    otherRealMemoryRead: false,
    otherRealMemoryModified: false
  };
  const result = await verifyTombstoneExecution({
    registry: {
      readClaim: async () => ({
        state: 'WRITE_INVOCATION_CONSUMED',
        bindingHash,
        receiptIdHash: require('node:crypto').createHash('sha256').update(EXPECTED.receiptId).digest('hex')
      })
    },
    claimId,
    receiptId: EXPECTED.receiptId,
    decisionReference: EXPECTED.decisionReference,
    claimBindingHash: bindingHash,
    runtimeTargetReferenceName: EXPECTED.runtimeTargetReference,
    postStoreProjection,
    callAuditMemory: async () => ({
      accepted: true,
      access: { rawMemoryReturned: false, rawAuditReturned: false, contentReturned: false },
      findings: [{ governedNativeBridgeReceipt: {
        toolName: 'tombstone_memory',
        auditReceiptReferenceName: EXPECTED.receiptId,
        exactApprovalAction: 'live_bridge_tombstone_memory_proof',
        exactApprovalDecisionReference: EXPECTED.decisionReference,
        exactApprovalClaimBindingHash: bindingHash,
        targetReferenceName: EXPECTED.runtimeTargetReference,
        scopeFingerprintPresent: true,
        scopeFingerprintMatched: true,
        writeAllowed: true,
        exactApprovalActionMatched: true,
        nativeInvocationAttempted: true,
        nativeInvocationReceiptBindingMatched: true,
        memoryWritePerformed: true,
        rawRequestBodyPersisted: false,
        rawResponseBodyPersisted: false
      } }]
    })
  });
  assert.equal(result.accepted, true, result.reasonCode);
  assert.equal(result.originalRecordUnchanged, true);
  assert.equal(result.effectiveLifecycleStatus, 'tombstoned');
  assert.equal(result.rollbackLifecycleProjectionTargetCount, 0);
  assert.equal(result.defaultProductRetrievalTombstoneAwarenessProven, false);
});

test('CM-2107 frozen executor requires packet and decision commits before store access', async () => {
  await assert.rejects(runFrozenCm2107Tombstone(null, null), /cm2107_execution_packet_commit_required/);
  await assert.rejects(runFrozenCm2107Tombstone('a'.repeat(40), null), /cm2107_final_release_decision_commit_required/);
});

test('CM-2107 executor finalizes the printed receipt with durable claim evidence and payload hash', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cm2107-receipt-evidence-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const claim = {
    claimId: 'a'.repeat(64),
    bindingHash: 'b'.repeat(64),
    nonceHash: 'c'.repeat(64),
    receiptIdHash: 'd'.repeat(64),
    writeInvocationCount: 1
  };
  await Promise.all([
    fs.writeFile(path.join(directory, `nonce-${claim.nonceHash}.json`), '{}'),
    fs.writeFile(path.join(directory, `receipt-${claim.receiptIdHash}.json`), '{}'),
    fs.writeFile(path.join(directory, `write-invocation-${claim.claimId}.json`), '{}')
  ]);
  const receipt = await finalizeCm2107ExecutionReceipt(
    { schemaVersion: 1, taskId: 'CM-2107' },
    { directory, readClaim: async () => claim },
    claim.claimId
  );
  const { receiptPayloadSha256, ...payload } = receipt;
  assert.equal(receipt.claimId, claim.claimId);
  assert.equal(receipt.claimBindingHash, claim.bindingHash);
  assert.equal(receipt.nonceMarkerCount, 1);
  assert.equal(receipt.authorizationReceiptMarkerCount, 1);
  assert.equal(receipt.writeInvocationMarkerCount, 1);
  assert.equal(receipt.writeInvocationCount, 1);
  assert.equal(receiptPayloadSha256, sha256Canonical(payload));
});

test('CM-2107 frozen rollback receipt proves exact append-only lifecycle rollback', async () => {
  const receipt = JSON.parse(await fs.readFile(path.join(
    __dirname,
    '../docs/near-model-memory-plan-pack/phase8_identity_bound_tombstone_execution_receipt_cm2107.json'
  ), 'utf8'));
  const result = evaluateRollbackReceipt(receipt);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.acceptedAsRollbackEvidence, true);
  assert.equal(result.rollbackDrillApplicationMayBePrepared, true);
  assert.equal(result.rollbackDrillPassed, false);
  assert.equal(result.failureRecoveryProofPassed, false);
  assert.equal(result.phase8Completed, false);
  assert.equal(result.additionalNativeActionAuthorized, false);
});

test('CM-2107 rollback receipt fails closed on lifecycle, count, replay, or overclaim drift', async () => {
  const source = JSON.parse(await fs.readFile(path.join(
    __dirname,
    '../docs/near-model-memory-plan-pack/phase8_identity_bound_tombstone_execution_receipt_cm2107.json'
  ), 'utf8'));
  for (const drift of [
    { tombstoneWriteCalls: 2 },
    { verifyOperations: 2 },
    { originalRecordUnchanged: false },
    { durableMarkerSha256: 'f'.repeat(64) },
    { rollbackLifecycleProjectionTargetCount: 1 },
    { authorizationReplayAllowed: true },
    { providerCalled: true },
    { compensationPerformed: true },
    { rollbackDrillPassed: true },
    { phase8Completed: true },
    { productionReady: true }
  ]) {
    const receipt = { ...source, ...drift };
    const { receiptPayloadSha256, ...payload } = receipt;
    receipt.receiptPayloadSha256 = sha256Canonical(payload);
    assert.equal(evaluateRollbackReceipt(receipt).accepted, false, JSON.stringify(drift));
  }
});
