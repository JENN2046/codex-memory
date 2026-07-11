'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { createConfig } = require('../src/config/createConfig');
const {
  IDENTITY_FILENAME,
  STORE_IDENTITY,
  expectedIdentityBytes
} = require('../src/core/Cm2102IdentityBoundRollbackLifecycleFoundation');
const {
  createGovernedMcpVcpNativeVcpToolBoxMcpShimServer,
  createVcpToolBoxNativeMemoryAdapter
} = require('../src/core/GovernedMcpVcpNativeVcpToolBoxMcpShim');
const { createCodexMemoryApplication } = require('../src/app');
const {
  sha256Canonical
} = require('../src/core/Phase8OneShotNativeWriteExecutionGate');
const {
  ALLOWED_SCOPE,
  EXPECTED,
  PAYLOAD_PATH,
  collectPostWriteProjection,
  collectPreWriteProjection,
  expectedAllowlist,
  expectedRuntimeContext,
  verifyPayloadBytes
} = require('../src/core/Cm2106IdentityBoundSyntheticRecordWrite');
const {
  appOverrides,
  runFrozenCm2106RecordWrite,
  validatePacket
} = require('../src/cli/cm2106-identity-bound-synthetic-record-write');

async function identityStore(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cm2106-identity-store-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, IDENTITY_FILENAME), expectedIdentityBytes(), { flag: 'wx' });
  return root;
}

function packetFixture(overrides = {}) {
  const packet = {
    schemaVersion: 1,
    taskId: 'CM-2106',
    packetType: 'identity_bound_synthetic_record_one_shot_execution_packet',
    packetDoesNotAuthorizeExecution: true,
    executionAuthorizedAtPacketFreeze: false,
    implementationCommit: '1'.repeat(40),
    implementationTree: '2'.repeat(40),
    contentDecisionReference: EXPECTED.contentDecisionReference,
    contentDecisionCommit: '3'.repeat(40),
    contentDecisionBlobOid: '4'.repeat(40),
    contentDecisionSha256: '5'.repeat(64),
    expectedFinalReleaseDecisionReference: EXPECTED.finalReleaseDecisionReference,
    preflightReceiptCommit: '6'.repeat(40),
    preflightReceiptBlobOid: '7'.repeat(40),
    preflightReceiptSha256: '8'.repeat(64),
    payloadSourceCommit: '1'.repeat(40),
    payloadPath: PAYLOAD_PATH,
    payloadBlobOid: '9'.repeat(40),
    payloadBytes: EXPECTED.payloadBytes,
    payloadFileSha256: EXPECTED.payloadFileSha256,
    payloadCanonicalSha256: EXPECTED.payloadCanonicalSha256,
    durableRecordBytes: EXPECTED.durableRecordBytes,
    durableRecordSha256: EXPECTED.durableRecordSha256,
    expectedMemoryIdRef: EXPECTED.memoryIdRef,
    storeRootBindingSha256: '0a7ceb6cf658d517de2a3eb30ee09195dbeb9d46800f42ac87edf7f7cb11dd94',
    storeIdentitySha256: '017307c9a1cb3e216895934b9c2aae8fa5773b909afebe87d3f91bc0a5736f57',
    registryRootIdentitySha256: '240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0',
    nonce: EXPECTED.nonce,
    receiptId: EXPECTED.receiptId,
    authorizationRegistryReference: EXPECTED.registryReference,
    authorizationUseCount: 1,
    expectedScopeFingerprint: EXPECTED.scopeFingerprint,
    contextCanonicalSha256: sha256Canonical(expectedRuntimeContext({
      implementationCommit: '1'.repeat(40),
      implementationTree: '2'.repeat(40),
      payloadBlobOid: '9'.repeat(40),
      preflightReceiptCommit: '6'.repeat(40),
      preflightReceiptBlobOid: '7'.repeat(40),
      preflightReceiptSha256: '8'.repeat(64)
    })),
    allowlistCanonicalSha256: sha256Canonical(expectedAllowlist()),
    maxNativeWrites: 1,
    maxVerifyOperations: 1,
    maxRollbackOrCompensationOperations: 0,
    automaticRetryAllowed: false,
    automaticRollbackAllowed: false,
    localFallbackAllowed: false,
    providerCallsAllowed: false,
    derivedIndexWritesAllowed: false,
    existingMemoryModificationAllowed: false,
    realMemoryReadAllowed: false,
    rawPrivateMemoryAccessAllowed: false,
    rollbackDrillPassed: false,
    failureRecoveryProofPassed: false,
    phase8Completed: false,
    readinessClaimed: false,
    ...overrides
  };
  packet.packetPayloadSha256 = sha256Canonical(packet);
  return packet;
}

test('CM-2106 payload freezes one exact synthetic durable record', async () => {
  const payloadBytes = await fs.readFile(path.join(__dirname, '..', PAYLOAD_PATH));
  const result = verifyPayloadBytes(payloadBytes);
  assert.equal(payloadBytes.length, EXPECTED.payloadBytes);
  assert.equal(result.durable.length, EXPECTED.durableRecordBytes);
  assert.equal(result.payload.content.includes('No user memory.'), true);
  assert.equal(EXPECTED.memoryIdRef, `vcp-kb-${EXPECTED.durableRecordSha256.slice(0, 16)}`);
  assert.equal(sha256Canonical(ALLOWED_SCOPE), EXPECTED.scopeFingerprint);
});

test('CM-2106 pre/post collectors prove an identity-bound one-record lifecycle', async t => {
  const root = await identityStore(t);
  const pre = await collectPreWriteProjection(root);
  assert.equal(pre.accepted, true);
  assert.equal(pre.recordContentReads, 0);
  const adapter = createVcpToolBoxNativeMemoryAdapter({
    knowledgeBaseRootPath: root,
    knowledgeBaseStorePath: path.join(root, '..', 'unused-derived-store'),
    writeSubdir: STORE_IDENTITY.writeSubdir,
    primaryWriteOnly: true
  });
  const payloadBytes = await fs.readFile(path.join(__dirname, '..', PAYLOAD_PATH));
  const native = await adapter.record(JSON.parse(payloadBytes.toString('utf8')));
  assert.equal(native.memory_id_ref, EXPECTED.memoryIdRef);
  const post = await collectPostWriteProjection(root);
  assert.equal(post.accepted, true);
  assert.equal(post.recordCount, 1);
  assert.equal(post.durableRecordSha256, EXPECTED.durableRecordSha256);
  assert.equal(post.rawMemoryReturned, false);
  await adapter.shutdown();
});

test('primary-write-only adapter does not initialize or create the derived runtime store', async t => {
  const root = await identityStore(t);
  const derived = path.join(root, '..', `cm2106-derived-${process.pid}-${Date.now()}`);
  t.after(() => fs.rm(derived, { recursive: true, force: true }));
  const adapter = createVcpToolBoxNativeMemoryAdapter({
    knowledgeBaseRootPath: root,
    knowledgeBaseStorePath: derived,
    writeSubdir: STORE_IDENTITY.writeSubdir,
    primaryWriteOnly: true
  });
  const payloadBytes = await fs.readFile(path.join(__dirname, '..', PAYLOAD_PATH));
  await adapter.record(JSON.parse(payloadBytes.toString('utf8')));
  await assert.rejects(fs.lstat(derived), error => error.code === 'ENOENT');
  await adapter.shutdown();
});

test('CM-2106 packet binds exact one-write/one-verify/zero-retry authority', () => {
  assert.deepEqual(validatePacket(packetFixture()), []);
  for (const drift of [
    { maxNativeWrites: 2 },
    { maxVerifyOperations: 2 },
    { automaticRetryAllowed: true },
    { providerCallsAllowed: true },
    { derivedIndexWritesAllowed: true },
    { executionAuthorizedAtPacketFreeze: true },
    { expectedScopeFingerprint: 'f'.repeat(64) }
  ]) {
    const result = validatePacket(packetFixture(drift));
    assert.notDeepEqual(result, [], JSON.stringify(drift));
  }
});

test('CM-2106 app route is local, primary-write-only, and provider disabled', () => {
  const config = createConfig(appOverrides({
    endpoint: 'http://127.0.0.1:1/mcp/vcp-native',
    bearerToken: 'synthetic-test-only',
    appStateRoot: path.join(os.tmpdir(), 'cm2106-config-only')
  }));
  assert.equal(config.allowExternalProvider, false);
  assert.equal(config.governedMcpVcpNativeReadDelegationMode, 'off');
  assert.equal(config.governedMcpVcpNativeWriteDelegationMode, 'primary');
  assert.equal(config.governedMcpVcpNativeRuntimeTarget.accepted, true);
  assert.equal(config.governedMcpVcpNativeHttpMcpTarget.endpointDisclosed, false);
  assert.equal(config.governedMcpVcpNativeHttpMcpTarget.tokenMaterialDisclosed, false);
});

test('CM-2106 strict bridge delegates one primary-write-only record with bounded rollback controls', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cm2106-strict-e2e-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = path.join(root, 'store');
  await fs.mkdir(store);
  await fs.writeFile(path.join(store, IDENTITY_FILENAME), expectedIdentityBytes(), { flag: 'wx' });
  const adapter = createVcpToolBoxNativeMemoryAdapter({
    knowledgeBaseRootPath: store,
    knowledgeBaseStorePath: path.join(root, 'derived'),
    writeSubdir: STORE_IDENTITY.writeSubdir,
    primaryWriteOnly: true
  });
  const server = createGovernedMcpVcpNativeVcpToolBoxMcpShimServer({ adapter, enableWrite: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await adapter.shutdown();
  });
  const address = server.address();
  const endpoint = ['http:', '', `127.0.0.1:${address.port}`, 'mcp', 'vcp-native'].join('/');
  const rollbackPlanRef = 'cm2106-r1-identity-bound-append-only-tombstone-plan';
  const app = createCodexMemoryApplication({
    ...appOverrides({ endpoint, bearerToken: 'synthetic-fixture-only', appStateRoot: path.join(root, 'app') }),
    phase8OneShotNativeWriteEnforcementEnabled: true,
    phase8OneShotAuthorizationAssertionVerifier: async () => ({
      accepted: true,
      exactApprovalResult: {
        accepted: true,
        allowedAction: 'live_bridge_record_memory_proof',
        allowedScope: ALLOWED_SCOPE,
        runtimeTarget: {
          primaryRuntime: 'VCPToolBox native memory',
          targetReferenceName: EXPECTED.runtimeTargetReference,
          targetKind: 'mcp_server'
        },
        rollbackPlanRef,
        approvalDecisionReference: EXPECTED.finalReleaseDecisionReference,
        claimBindingHash: 'a'.repeat(64),
        approvedAt: '2026-07-12T03:40:00+08:00'
      }
    })
  });
  t.after(() => app.close());
  await app.initialize();
  const payload = JSON.parse(await fs.readFile(path.join(__dirname, '..', PAYLOAD_PATH), 'utf8'));
  const result = await app.callTool('record_memory', payload, {
    executionContext: {
      agentAlias: 'Codex', agentId: 'cm2106-r1-fixture', clientId: 'codex',
      projectId: ALLOWED_SCOPE.project_id, workspaceId: ALLOWED_SCOPE.workspace_id,
      scopeId: ALLOWED_SCOPE.scope_id, visibility: ALLOWED_SCOPE.visibility,
      requestSource: 'cm2106-r1-strict-fixture'
    },
    phase8OneShotAuthorizationAssertion: { fixtureOnly: true },
    auditReceipt: { receiptId: EXPECTED.receiptId },
    rollbackPosture: { mode: 'bounded_rollback_plan', rollbackPlanRef },
    outputDisclosureBudget: {
      level: 'summary', lowDisclosure: true, rawOutput: false, maxItems: 5, maxBytes: 4096
    }
  });
  assert.equal(result.status, 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATED', JSON.stringify({
    decision: result.decision,
    reasonCode: result.reasonCode,
    gate: result.gate
  }));
  assert.equal(result.access.memoryWritePerformed, true);
  assert.equal(result.access.localMemoryFallbackUsed, false);
  assert.equal(result.receipt.nativeInvocationReceipt.statusClass, 'success');
  const post = await collectPostWriteProjection(store);
  assert.equal(post.accepted, true);
  assert.equal(post.durableRecordSha256, EXPECTED.durableRecordSha256);
});

test('CM-2106 frozen executor rejects missing Git decisions before runtime or store access', async () => {
  await assert.rejects(runFrozenCm2106RecordWrite(null, null, null), /cm2106_execution_packet_commit_required/);
  await assert.rejects(runFrozenCm2106RecordWrite('a'.repeat(40), null, null), /cm2106_content_decision_commit_required/);
  await assert.rejects(runFrozenCm2106RecordWrite('a'.repeat(40), 'b'.repeat(40), null), /cm2106_final_release_decision_commit_required/);
});
