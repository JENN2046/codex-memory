#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createConfig } = require('../config/createConfig');
const { createCodexMemoryApplication } = require('../app');
const {
  Phase8OneShotAuthorizationRegistry,
  sha256Canonical
} = require('../core/Phase8OneShotNativeWriteExecutionGate');
const {
  evaluateCm2096TombstoneExecutionDecisionIntake
} = require('../core/Cm2096TombstoneExecutionDecisionIntake');
const { createCm2096TombstoneOneShotGate } = require('../core/Cm2096TombstoneOneShotGate');
const { verifyCm2103GovernanceRoot } = require('../core/Cm2103IdentityBoundStoreGovernance');
const {
  collectExecutionClaimEvidence,
  startPrimaryWriteOnlyShim,
  withReceiptPayloadSha256
} = require('./cm2106-identity-bound-synthetic-record-write');
const {
  ALLOWED_SCOPE,
  DECISION_PATH,
  EXPECTED,
  PACKET_PATH,
  RECORD_RECEIPT_BINDING,
  RECORD_RECEIPT_PATH,
  REGISTRY_IDENTITY,
  REGISTRY_ROOT_IDENTITY,
  buildTombstonePayload,
  collectPostRollbackProjection,
  collectPreRollbackProjection,
  evaluateRecordReceiptBytes,
  expectedAllowlist,
  expectedRuntimeContext,
  serializeDurableMarker,
  sha256,
  verifyTombstoneExecution
} = require('../core/Cm2107IdentityBoundTombstoneRollback');

function git(args, options = {}) {
  return execFileSync('git', args, {
    encoding: options.buffer ? undefined : 'utf8',
    maxBuffer: 2 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function readGitBytes(commit, file) {
  return Buffer.from(git(['show', `${commit}:${file}`], { buffer: true }));
}

function hash40(value) {
  return typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
}

function hash64(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

function validatePacket(packet) {
  const blockers = [];
  if (!packet || typeof packet !== 'object' || Array.isArray(packet)) return ['packet.missing'];
  const { packetPayloadSha256, ...payload } = packet;
  if (!hash64(packetPayloadSha256) || sha256Canonical(payload) !== packetPayloadSha256) {
    blockers.push('packet.payloadHash');
  }
  const exact = {
    schemaVersion: 1,
    taskId: 'CM-2107',
    packetType: 'identity_bound_append_only_tombstone_one_shot_execution_packet',
    packetDoesNotAuthorizeExecution: true,
    executionAuthorizedAtPacketFreeze: false,
    expectedDecisionReference: EXPECTED.decisionReference,
    recordReceiptCommit: RECORD_RECEIPT_BINDING.commit,
    recordReceiptTree: RECORD_RECEIPT_BINDING.tree,
    recordReceiptBlobOid: RECORD_RECEIPT_BINDING.blobOid,
    recordReceiptBytes: RECORD_RECEIPT_BINDING.bytes,
    recordReceiptSha256: RECORD_RECEIPT_BINDING.sha256,
    targetStoreReference: 'phase8-identity-bound-synthetic-rollback-store-001',
    targetStoreIdentitySha256: '017307c9a1cb3e216895934b9c2aae8fa5773b909afebe87d3f91bc0a5736f57',
    targetMemoryIdRef: 'vcp-kb-5b140bdb1f30f1b0',
    targetRecordBytes: 327,
    targetRecordSha256: '5b140bdb1f30f1b0d08ad3f066bde9a07b56940eecef20a9a196ef278970a5c3',
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
    runtimeTargetReference: EXPECTED.runtimeTargetReference,
    primaryWriteOnly: true,
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
    readinessClaimed: false
  };
  for (const [field, expected] of Object.entries(exact)) {
    if (packet[field] !== expected) blockers.push(`packet.${field}`);
  }
  for (const field of ['implementationCommit', 'implementationTree']) {
    if (!hash40(packet[field])) blockers.push(`packet.${field}`);
  }
  for (const field of ['expectedContextHash', 'expectedAllowlistHash', 'expectedScopeFingerprint']) {
    if (!hash64(packet[field])) blockers.push(`packet.${field}`);
  }
  const expectedKeys = new Set([
    ...Object.keys(exact),
    'implementationCommit', 'implementationTree', 'allowedScope', 'expectedContextHash',
    'expectedAllowlistHash', 'expectedScopeFingerprint', 'packetPayloadSha256'
  ]);
  if (Object.keys(packet).length !== expectedKeys.size ||
      Object.keys(packet).some(field => !expectedKeys.has(field))) blockers.push('packet.keys');
  if (sha256Canonical(packet.allowedScope) !== sha256Canonical(ALLOWED_SCOPE)) blockers.push('packet.allowedScope');
  if (packet.expectedScopeFingerprint !== EXPECTED.scopeFingerprint) blockers.push('packet.expectedScopeFingerprint');
  if (packet.expectedAllowlistHash !== sha256Canonical(expectedAllowlist())) blockers.push('packet.allowlist');
  if (packet.expectedContextHash !== sha256Canonical(expectedRuntimeContext({
    implementationCommit: packet.implementationCommit,
    implementationTree: packet.implementationTree
  }))) blockers.push('packet.context');
  return [...new Set(blockers)];
}

function expectedDecisionBinding({ packet, packetCommit, packetBlobOid, packetBytes }) {
  return {
    expectedDecisionReference: packet.expectedDecisionReference,
    executionPacketCommit: packetCommit,
    executionPacketBlobOid: packetBlobOid,
    executionPacketSha256: sha256(packetBytes),
    implementationCommit: packet.implementationCommit,
    implementationTree: packet.implementationTree,
    targetStoreReference: packet.targetStoreReference,
    targetStoreIdentitySha256: packet.targetStoreIdentitySha256,
    targetMemoryIdRef: packet.targetMemoryIdRef,
    targetRecordBytes: packet.targetRecordBytes,
    targetRecordSha256: packet.targetRecordSha256,
    payloadCanonicalBytes: packet.payloadCanonicalBytes,
    payloadCanonicalSha256: packet.payloadCanonicalSha256,
    durableMarkerBytes: packet.durableMarkerBytes,
    durableMarkerSha256: packet.durableMarkerSha256,
    expectedMarkerMemoryIdRef: packet.expectedMarkerMemoryIdRef,
    expectedContextHash: packet.expectedContextHash,
    expectedAllowlistHash: packet.expectedAllowlistHash,
    expectedScopeFingerprint: packet.expectedScopeFingerprint,
    registryRootIdentitySha256: packet.registryRootIdentitySha256,
    nonce: packet.nonce,
    receiptId: packet.receiptId,
    registryReference: packet.registryReference
  };
}

function statePaths(governanceParent) {
  return {
    appStateRoot: path.join(governanceParent, EXPECTED.appStateReference),
    derivedRuntimeStore: path.join(governanceParent, EXPECTED.derivedRuntimeStoreReference)
  };
}

async function ensureAbsent(target, code) {
  try {
    await fs.lstat(target);
    throw new Error(code);
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
}

async function finalizeCm2107ExecutionReceipt(receiptPayload, registry, claimId) {
  const claimEvidence = await collectExecutionClaimEvidence(registry, claimId);
  return withReceiptPayloadSha256({ ...receiptPayload, ...claimEvidence });
}

function appOverrides({ endpoint, bearerToken, appStateRoot }) {
  return {
    projectBasePath: appStateRoot,
    dataDir: path.join(appStateRoot, 'data'),
    logsDir: path.join(appStateRoot, 'logs'),
    dailyNoteRootPath: path.join(appStateRoot, 'dailynote'),
    auditLogPath: path.join(appStateRoot, 'logs', 'write-audit.jsonl'),
    recallLogPath: path.join(appStateRoot, 'logs', 'recall-audit.jsonl'),
    dbPath: path.join(appStateRoot, 'data', 'memory.sqlite'),
    vectorIndexPath: path.join(appStateRoot, 'data', 'vector-index.json'),
    chatIndexPath: path.join(appStateRoot, 'data', 'chat-index.json'),
    candidateCachePath: path.join(appStateRoot, 'data', 'candidate-cache.json'),
    allowExternalProvider: false,
    enableShadowWrites: false,
    enableVectorIndex: false,
    enableCandidateCache: false,
    autoRebuildShadowOnStart: false,
    autoRebuildActiveMemoryOnStart: false,
    governedMcpVcpNativeRuntimeProfile: 'off',
    governedMcpVcpNativeBridgeGateMode: 'strict',
    governedMcpVcpNativeReadDelegationMode: 'off',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: EXPECTED.runtimeTargetReference,
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeHttpMcpTarget: {
      targetReferenceName: EXPECTED.runtimeTargetReference,
      endpoint,
      bearerToken,
      requestTimeoutMs: 30000,
      mcpToolNameByAction: { tombstone_memory: 'knowledge_base.tombstone' }
    }
  };
}

async function runFrozenCm2107Tombstone(packetCommit, decisionCommit) {
  if (!hash40(packetCommit)) throw new Error('cm2107_execution_packet_commit_required');
  if (!hash40(decisionCommit)) throw new Error('cm2107_final_release_decision_commit_required');
  const packetBytes = readGitBytes(packetCommit, PACKET_PATH);
  const packetBlobOid = git(['rev-parse', `${packetCommit}:${PACKET_PATH}`]).trim();
  const packet = JSON.parse(packetBytes.toString('utf8'));
  const packetBlockers = validatePacket(packet);
  if (packetBlockers.length) throw new Error(`cm2107_execution_packet_rejected:${packetBlockers.join(',')}`);

  const head = git(['rev-parse', 'HEAD']).trim();
  const tree = git(['rev-parse', 'HEAD^{tree}']).trim();
  const clean = git(['status', '--porcelain']).trim() === '';
  let attached = false;
  try { git(['symbolic-ref', '-q', 'HEAD']); attached = true; } catch {}
  if (!clean || attached || head !== packet.implementationCommit || tree !== packet.implementationTree) {
    throw new Error('cm2107_runtime_checkout_binding_mismatch');
  }

  const recordReceiptBytes = readGitBytes(RECORD_RECEIPT_BINDING.commit, RECORD_RECEIPT_PATH);
  const recordReceiptBlobOid = git([
    'rev-parse', `${RECORD_RECEIPT_BINDING.commit}:${RECORD_RECEIPT_PATH}`
  ]).trim();
  const recordReview = evaluateRecordReceiptBytes(recordReceiptBytes);
  if (recordReceiptBlobOid !== RECORD_RECEIPT_BINDING.blobOid || !recordReview.accepted) {
    throw new Error('cm2107_record_receipt_binding_rejected');
  }

  const decisionBytes = readGitBytes(decisionCommit, DECISION_PATH);
  const decisionBlobOid = git(['rev-parse', `${decisionCommit}:${DECISION_PATH}`]).trim();
  const decisionIntake = evaluateCm2096TombstoneExecutionDecisionIntake({
    decisionBytes,
    observedBinding: {
      decisionSourceCommit: decisionCommit,
      decisionBlobOid,
      decisionPayloadSha256: sha256(decisionBytes)
    },
    expectedBinding: expectedDecisionBinding({ packet, packetCommit, packetBlobOid, packetBytes }),
    now: new Date()
  });
  if (!decisionIntake.accepted) throw new Error('cm2107_tombstone_decision_intake_rejected');

  const governance = await verifyCm2103GovernanceRoot(git(['rev-parse', '--git-common-dir']).trim());
  const preStoreProjection = await collectPreRollbackProjection(governance.internalPaths.storeRoot);
  const paths = statePaths(governance.internalPaths.governanceParent);
  await ensureAbsent(paths.appStateRoot, 'cm2107_app_state_already_exists');
  await ensureAbsent(paths.derivedRuntimeStore, 'cm2107_derived_runtime_store_already_exists');
  const context = expectedRuntimeContext({ implementationCommit: head, implementationTree: tree });
  if (sha256Canonical(context) !== packet.expectedContextHash ||
      sha256Canonical(expectedAllowlist()) !== packet.expectedAllowlistHash) {
    throw new Error('cm2107_runtime_context_or_allowlist_mismatch');
  }

  const registry = new Phase8OneShotAuthorizationRegistry({
    governanceRoot: governance.internalPaths.authorizationRegistryRoot,
    rootIdentity: REGISTRY_ROOT_IDENTITY,
    identity: REGISTRY_IDENTITY
  });
  const expectedBinding = {
    ...expectedDecisionBinding({ packet, packetCommit, packetBlobOid, packetBytes }),
    allowedScope: ALLOWED_SCOPE,
    runtimeTarget: {
      primaryRuntime: 'VCPToolBox native memory',
      targetReferenceName: EXPECTED.runtimeTargetReference,
      targetKind: 'mcp_server'
    },
    rollbackPlanReference: EXPECTED.rollbackPlanReference
  };
  const gate = createCm2096TombstoneOneShotGate({ registry, expectedBinding });
  const claim = await gate.claim({ decision: decisionIntake.decision, preStoreProjection });
  if (!claim.accepted) {
    return { result: 'STOPPED', finalState: 'UNCLAIMED', blockers: claim.blockers };
  }

  let app = null;
  let shim = null;
  const bearerToken = crypto.randomBytes(32).toString('hex');
  const executionContext = {
    agentAlias: 'Codex',
    agentId: 'codex-cm2107-identity-bound-tombstone',
    clientId: 'codex',
    projectId: ALLOWED_SCOPE.project_id,
    workspaceId: ALLOWED_SCOPE.workspace_id,
    scopeId: ALLOWED_SCOPE.scope_id,
    visibility: ALLOWED_SCOPE.visibility,
    requestSource: 'cm2107-frozen-identity-bound-tombstone'
  };
  try {
    shim = await startPrimaryWriteOnlyShim({
      storeRoot: governance.internalPaths.storeRoot,
      derivedRuntimeStore: paths.derivedRuntimeStore,
      bearerToken,
      primaryWritePreflight: () => collectPreRollbackProjection(governance.internalPaths.storeRoot)
    });
    if (shim.authorizationProjection().authorizationRequired !== true) {
      throw new Error('cm2107_local_shim_bearer_not_enforced');
    }
    const overrides = appOverrides({ endpoint: shim.endpoint, bearerToken, appStateRoot: paths.appStateRoot });
    const config = createConfig(overrides);
    if (config.governedMcpVcpNativeWriteDelegationMode !== 'primary' ||
        config.governedMcpVcpNativeReadDelegationMode !== 'off' ||
        config.governedMcpVcpNativeRuntimeTarget?.accepted !== true ||
        config.governedMcpVcpNativeRuntimeTarget?.targetReferenceName !== EXPECTED.runtimeTargetReference ||
        config.governedMcpVcpNativeHttpMcpTarget?.accepted !== true ||
        config.governedMcpVcpNativeHttpMcpTarget?.bearerTokenConfigured !== true ||
        config.governedMcpVcpNativeHttpMcpTarget?.mcpToolNameByAction?.tombstone_memory !== 'knowledge_base.tombstone') {
      throw new Error('cm2107_runtime_native_tombstone_route_rejected');
    }
    app = createCodexMemoryApplication({
      ...overrides,
      cm2096TombstoneOneShotEnforcementEnabled: true,
      cm2096TombstoneAuthorizationAssertionVerifier: gate.verifyAssertion
    });
    await app.initialize();
    const payload = buildTombstonePayload();
    const nativeResult = await app.callTool('tombstone_memory', {
      ...payload,
      actor_client_id: 'Codex',
      request_source: 'cm2107-frozen-identity-bound-tombstone',
      dry_run: false,
      confirm: true
    }, {
      executionContext,
      cm2096TombstoneAuthorizationAssertion: claim.assertion,
      auditReceipt: { receiptId: EXPECTED.receiptId },
      rollbackPosture: {
        mode: 'mutation_cleanup_plan',
        rollbackPlanRef: EXPECTED.rollbackPlanReference
      },
      outputDisclosureBudget: {
        level: 'summary', lowDisclosure: true, rawOutput: false, maxItems: 5, maxBytes: 4096
      }
    });
    const current = await registry.readClaim(claim.claimId);
    if (current.state !== 'WRITE_INVOCATION_CONSUMED') {
      await gate.finalize(claim.claimId, 'CONSUMED_FAILED_PRE_COMMIT');
      return { result: 'STOPPED', finalState: 'CONSUMED_FAILED_PRE_COMMIT', tombstoneWriteCalls: 0 };
    }
    const nativeSuccess = nativeResult?.status === 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATED' &&
      nativeResult?.access?.memoryWritePerformed === true &&
      nativeResult?.access?.localMemoryFallbackUsed === false &&
      nativeResult?.receipt?.nativeInvocationReceipt?.invocationBindingMatched === true &&
      nativeResult?.receipt?.nativeInvocationReceipt?.statusClass === 'success' &&
      nativeResult?.receipt?.localAuditReceipt?.status === 'appended';
    if (!nativeSuccess) {
      await gate.finalize(claim.claimId, 'CONSUMED_AMBIGUOUS_POST_COMMIT');
      return { result: 'STOPPED', finalState: 'CONSUMED_AMBIGUOUS_POST_COMMIT', tombstoneWriteCalls: 1 };
    }
    const postStoreProjection = await collectPostRollbackProjection(governance.internalPaths.storeRoot);
    const verify = await verifyTombstoneExecution({
      registry,
      claimId: claim.claimId,
      receiptId: EXPECTED.receiptId,
      decisionReference: decisionIntake.decision.decisionReference,
      claimBindingHash: claim.bindingHash,
      runtimeTargetReferenceName: EXPECTED.runtimeTargetReference,
      postStoreProjection,
      callAuditMemory: args => app.callTool('audit_memory', args, { executionContext })
    });
    const state = verify.accepted ? 'CONSUMED_SUCCESS' : 'CONSUMED_AMBIGUOUS_POST_COMMIT';
    await gate.finalize(claim.claimId, state);
    const derivedStoreCreated = await fs.lstat(paths.derivedRuntimeStore).then(
      () => true,
      error => error.code === 'ENOENT' ? false : Promise.reject(error)
    );
    const receiptPayload = {
      schemaVersion: 1,
      taskId: 'CM-2107',
      receiptType: 'identity_bound_append_only_tombstone_execution_receipt',
      result: verify.accepted ? 'PASS' : 'STOPPED',
      finalState: state,
      executionAccepted: verify.accepted === true,
      implementationCommit: head,
      implementationTree: tree,
      executionPacketCommit: packetCommit,
      executionPacketBlobOid: packetBlobOid,
      executionPacketSha256: sha256(packetBytes),
      decisionReference: decisionIntake.decision.decisionReference,
      decisionCommit,
      decisionBlobOid,
      decisionSha256: sha256(decisionBytes),
      recordReceiptCommit: RECORD_RECEIPT_BINDING.commit,
      recordReceiptBlobOid: RECORD_RECEIPT_BINDING.blobOid,
      recordReceiptSha256: RECORD_RECEIPT_BINDING.sha256,
      recordReceiptAccepted: true,
      storeIdentityMatched: postStoreProjection.identity.identitySha256 === packet.targetStoreIdentitySha256,
      storeIdentitySha256: postStoreProjection.identity.identitySha256,
      targetMemoryIdRef: packet.targetMemoryIdRef,
      targetRecordBytes: postStoreProjection.targetRecordProjection.durableBytes,
      targetRecordSha256: postStoreProjection.targetRecordProjection.durableSha256,
      originalRecordUnchanged: verify.originalRecordUnchanged === true,
      tombstonePayloadCanonicalBytes: packet.payloadCanonicalBytes,
      tombstonePayloadCanonicalSha256: packet.payloadCanonicalSha256,
      durableMarkerBytes: postStoreProjection.tombstoneMarkerProjection.durableBytes,
      durableMarkerSha256: postStoreProjection.tombstoneMarkerProjection.durableSha256,
      markerMemoryIdRef: postStoreProjection.tombstoneMarkerProjection.markerMemoryIdRef,
      authorizationUseCount: 1,
      authorizationConsumed: true,
      authorizationReplayAllowed: false,
      tombstoneWriteCalls: 1,
      verifyOperations: 1,
      verifyAccepted: verify.accepted === true,
      effectiveLifecycleStatus: verify.effectiveLifecycleStatus,
      rollbackLifecycleProjectionTargetCount: verify.rollbackLifecycleProjectionTargetCount,
      rollbackDrillLifecycleProjectionProven: verify.rollbackDrillLifecycleProjectionProven === true,
      defaultProductRetrievalTombstoneAwarenessProven: false,
      nativeInvocationReceiptBindingMatched: verify.nativeInvocationReceiptBindingMatched === true,
      primaryWriteOnly: true,
      providerCalled: false,
      derivedIndexWritePerformed: false,
      derivedRuntimeStoreCreated: derivedStoreCreated,
      localFallbackUsed: false,
      automaticRetryPerformed: false,
      supersedePerformed: false,
      compensationPerformed: false,
      physicalDeletePerformed: false,
      inPlaceOverwritePerformed: false,
      otherRealMemoryRead: false,
      otherRealMemoryModified: false,
      rawMemoryReturned: false,
      rawAuditReturned: false,
      rawPathDisclosed: false,
      rollbackDrillPassed: false,
      failureRecoveryProofPassed: false,
      phase8Completed: false,
      readinessClaimed: false
    };
    return finalizeCm2107ExecutionReceipt(receiptPayload, registry, claim.claimId);
  } catch (error) {
    const current = await registry.readClaim(claim.claimId).catch(() => null);
    const state = current?.state === 'CLAIMED'
      ? 'CONSUMED_FAILED_PRE_COMMIT'
      : 'CONSUMED_AMBIGUOUS_POST_COMMIT';
    await gate.finalize(claim.claimId, state).catch(() => {});
    return {
      result: 'STOPPED',
      finalState: state,
      tombstoneWriteCalls: current?.state === 'CLAIMED' ? 0 : 1,
      verifyOperations: 0,
      authorizationConsumed: true,
      authorizationReplayAllowed: false
    };
  } finally {
    if (app) await app.close().catch(() => {});
    if (shim) await shim.close().catch(() => {});
  }
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (require.main === module) {
  runFrozenCm2107Tombstone(
    argumentValue('--execution-packet-commit'),
    argumentValue('--final-release-decision-commit')
  )
    .then(result => process.stdout.write(`${JSON.stringify(result)}\n`))
    .catch(error => {
      const message = String(error?.message || '');
      process.stderr.write(`${message.startsWith('cm2107_') ? message : 'cm2107_execution_failed'}\n`);
      process.exitCode = 1;
    });
}

module.exports = {
  appOverrides,
  expectedDecisionBinding,
  finalizeCm2107ExecutionReceipt,
  runFrozenCm2107Tombstone,
  statePaths,
  validatePacket
};
