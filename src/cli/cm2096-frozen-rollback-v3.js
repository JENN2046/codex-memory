#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { createConfig } = require('../config/createConfig');
const { createCodexMemoryApplication } = require('../app');
const {
  Phase8OneShotAuthorizationRegistry,
  sha256,
  sha256Canonical
} = require('../core/Phase8OneShotNativeWriteExecutionGate');
const {
  evaluateCm2096TombstoneExecutionDecisionIntake
} = require('../core/Cm2096TombstoneExecutionDecisionIntake');
const { createCm2096TombstoneOneShotGate } = require('../core/Cm2096TombstoneOneShotGate');
const { collectCm2096RealStoreProjection } = require('../core/Cm2096RealStoreProjectionCollector');
const { verifyCm2096TombstoneExecution } = require('../core/Cm2096TombstoneExecutionVerifier');
const {
  EXPECTED_IDENTITY,
  EXPECTED_IDENTITY_SHA256
} = require('../core/Cm2096TargetStoreIdentity');
const {
  buildCm2096TombstonePayload,
  serializeCm2096DurableTombstoneMarker
} = require('../core/Cm2096TombstonePayloadSerializer');

const PACKET_PATH = 'docs/near-model-memory-plan-pack/phase8_rollback_execution_packet_cm2096_v3.json';
const DECISION_PATH = 'docs/near-model-memory-plan-pack/cm2096_tombstone_execution_decision.json';

function git(args, options = {}) {
  return execFileSync('git', args, { encoding: options.encoding || 'utf8', maxBuffer: 1024 * 1024 });
}

function readGitBytes(commit, file) {
  return Buffer.from(execFileSync('git', ['show', `${commit}:${file}`], { maxBuffer: 1024 * 1024 }));
}

function resolveCm2096RegistryGovernanceRoot(gitCommonDir) {
  if (typeof gitCommonDir !== 'string' || gitCommonDir.trim() === '') throw new Error('git_common_dir_required');
  return path.resolve(gitCommonDir, 'codex-memory-governance', 'phase8-one-shot-authorization-registries');
}

function resolveCm2096TargetStoreRootFromRuntimeAuthority() {
  const root = process.env.KNOWLEDGEBASE_ROOT_PATH;
  if (typeof root !== 'string' || root.trim() === '') throw new Error('cm2096_target_store_runtime_authority_missing');
  if (typeof process.env.KNOWLEDGEBASE_STORE_PATH !== 'string' || process.env.KNOWLEDGEBASE_STORE_PATH.trim() === '') {
    throw new Error('cm2096_isolated_runtime_store_authority_missing');
  }
  return path.resolve(root);
}

function exactCm2096Allowlist() {
  return {
    nativeWriteTools: ['tombstone_memory'],
    nativeWriteActions: ['live_bridge_tombstone_memory_proof'],
    maxTombstoneWrites: 1,
    nativeReadTools: [],
    nativeReadAllowed: false,
    verifySurface: 'verifyCm2096TombstoneExecution',
    verifyTool: 'audit_memory',
    verifyAuditFamily: 'governance',
    verifyWindow: 10,
    selectedFieldsOnly: true,
    maxVerifyOperations: 1,
    recordMemoryAllowed: false,
    supersedeMemoryAllowed: false,
    compensationActions: [],
    maxRetries: 0,
    maxSupersedeOperations: 0,
    maxCompensationOperations: 0,
    localFallbackWriteAllowed: false,
    automaticRetryAllowed: false,
    automaticRollbackAllowed: false,
    physicalDeleteAllowed: false,
    inPlaceOverwriteAllowed: false,
    existingRealMemoryModificationAllowed: false,
    otherRealMemoryReadAllowed: false,
    rawPrivateMemoryAccessAllowed: false,
    registryMarkerDeletionAllowed: false,
    registryRebuildAllowed: false,
    defaultMcpExpansionAllowed: false,
    remoteGitActionsAllowed: false,
    releaseDeployCutoverAllowed: false,
    readinessClaimAllowed: false
  };
}

function validatePacketShape(packet) {
  const blockers = [];
  const { packetPayloadSha256, ...payload } = packet || {};
  if (sha256Canonical(payload) !== packetPayloadSha256) blockers.push('packet.payloadHash');
  if (packet?.schemaVersion !== 3 || packet?.taskId !== 'CM-2096') blockers.push('packet.identity');
  if (packet?.packetType !== 'frozen_rollback_execution_packet_v3_non_executing') blockers.push('packet.type');
  if (!/^[a-f0-9]{40}$/.test(packet?.implementationCommit || '') || !/^[a-f0-9]{40}$/.test(packet?.implementationTree || '')) blockers.push('packet.implementation');
  if (packet?.targetStoreIdentitySha256 !== EXPECTED_IDENTITY_SHA256 || packet?.targetStoreReference !== EXPECTED_IDENTITY.storeReference) blockers.push('packet.targetStoreIdentity');
  const marker = serializeCm2096DurableTombstoneMarker();
  if (packet?.targetMemoryIdRef !== marker.targetMemoryIdRef || packet?.targetRecordBytes !== marker.targetRecordBytes || packet?.targetRecordSha256 !== marker.targetRecordSha256) blockers.push('packet.target');
  if (packet?.tombstonePayloadCanonicalBytes !== 331 || packet?.tombstonePayloadCanonicalSha256 !== '661e7eaf21cee1d31ebbaf81188fb65d4a1a0f5116ebd114aa37ca15a1251166') blockers.push('packet.payload');
  if (packet?.durableMarkerBytes !== marker.bytes || packet?.durableMarkerSha256 !== marker.durableMarkerSha256 || packet?.expectedMarkerMemoryIdRef !== marker.markerMemoryIdRef) blockers.push('packet.marker');
  if (packet?.nonce !== 'cm2096-tombstone-drill-001' || packet?.receiptId !== 'cm2096-tombstone-drill-receipt-001' || packet?.registryIdentity?.authorizationRegistryReference !== 'cm2096-isolated-tombstone-drill-registry-001') blockers.push('packet.oneShotBinding');
  if (packet?.maxTombstoneWrites !== 1 || packet?.maxVerifyOperations !== 1 || packet?.maxRetries !== 0 || packet?.maxSupersedeOperations !== 0 || packet?.maxCompensationOperations !== 0) blockers.push('packet.limits');
  if (packet?.executionAuthorizedAtPacketFreeze !== false || packet?.tombstoneExecutionAuthorizedAtPacketFreeze !== false || packet?.verifyAuthorizedAtPacketFreeze !== false || packet?.authorizationDecisionPresentAtPacketFreeze !== false) blockers.push('packet.currentAuthority');
  if (packet?.nativeActionCount !== 0 || packet?.verifyOperationCount !== 0 || packet?.rollbackDrillPassed !== false || packet?.failureRecoveryProofPassed !== false || packet?.phase8Completed !== false || packet?.fullPlanPackCompleted !== false || packet?.readinessClaimed !== false) blockers.push('packet.currentState');
  if (sha256Canonical(packet?.registryRootIdentity) !== packet?.registryRootIdentitySha256 || packet?.registryRootIdentitySha256 !== '240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0') blockers.push('packet.registryRootIdentity');
  if (sha256Canonical(exactCm2096Allowlist()) !== packet?.allowlistCanonicalSha256) blockers.push('packet.allowlist');
  return blockers;
}

function buildRuntimeContext({ packet, head, tree, config, storeIdentityProjection }) {
  const target = config.governedMcpVcpNativeRuntimeTarget || {};
  const httpTarget = config.governedMcpVcpNativeHttpMcpTarget || {};
  return {
    schemaVersion: 1,
    taskId: 'CM-2096',
    implementationCommit: head,
    implementationTree: tree,
    cleanDetachedCheckoutRequired: true,
    outerTransport: 'isolated_stdio_mcp',
    innerNativeTransport: 'local_http_mcp',
    primaryRuntime: 'VCPToolBox native memory',
    nativeWriteDelegationMode: config.governedMcpVcpNativeWriteDelegationMode,
    nativeReadDelegationMode: config.governedMcpVcpNativeReadDelegationMode,
    innerHttpTargetAccepted: httpTarget.accepted,
    innerHttpTargetConfigured: httpTarget.configured,
    innerHttpAuthConfigured: httpTarget.bearerTokenConfigured,
    innerTombstoneToolName: httpTarget.mcpToolNameByAction?.tombstone_memory || null,
    runtimeTargetReferenceName: target.targetReferenceName,
    runtimeTargetKind: target.targetKind,
    runtimeTargetSourceAuthority: target.sourceAuthority,
    targetStoreReference: storeIdentityProjection.storeReference,
    targetStoreRole: storeIdentityProjection.storeRole,
    targetStoreIdentityBytes: storeIdentityProjection.identityBytes,
    targetStoreIdentitySha256: storeIdentityProjection.identitySha256,
    targetStoreSyntheticOnly: storeIdentityProjection.syntheticOnly,
    targetMemoryIdRef: packet.targetMemoryIdRef,
    targetRecordBytes: packet.targetRecordBytes,
    targetRecordSha256: packet.targetRecordSha256,
    tombstonePayloadCanonicalBytes: packet.tombstonePayloadCanonicalBytes,
    tombstonePayloadCanonicalSha256: packet.tombstonePayloadCanonicalSha256,
    durableMarkerBytes: packet.durableMarkerBytes,
    durableMarkerSha256: packet.durableMarkerSha256,
    expectedMarkerMemoryIdRef: packet.expectedMarkerMemoryIdRef,
    authorizationRegistryReference: packet.registryIdentity.authorizationRegistryReference,
    authorizationRegistryStorageRole: packet.registryIdentity.registryStorageRole,
    authorizationRegistryRootReference: packet.registryRootIdentity.registryRootReference,
    authorizationRegistryRootIdentitySha256: packet.registryRootIdentitySha256,
    scope: packet.allowedScope,
    expectedScopeFingerprint: packet.expectedScopeFingerprint
  };
}

function exactDecisionExpectedBinding({ packet, packetCommit, packetBlobOid, packetBytes }) {
  return {
    expectedDecisionReference: packet.expectedFutureDecisionReference,
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
    payloadCanonicalBytes: packet.tombstonePayloadCanonicalBytes,
    payloadCanonicalSha256: packet.tombstonePayloadCanonicalSha256,
    durableMarkerBytes: packet.durableMarkerBytes,
    durableMarkerSha256: packet.durableMarkerSha256,
    expectedMarkerMemoryIdRef: packet.expectedMarkerMemoryIdRef,
    expectedContextHash: packet.contextCanonicalSha256,
    expectedAllowlistHash: packet.allowlistCanonicalSha256,
    expectedScopeFingerprint: packet.expectedScopeFingerprint,
    registryRootIdentitySha256: packet.registryRootIdentitySha256,
    nonce: packet.nonce,
    receiptId: packet.receiptId,
    registryReference: packet.registryIdentity.authorizationRegistryReference
  };
}

function cm2096RuntimeRouteAccepted(config, expectedRuntimeTarget) {
  const target = config?.governedMcpVcpNativeRuntimeTarget || {};
  const httpTarget = config?.governedMcpVcpNativeHttpMcpTarget || {};
  return ['observe', 'strict'].includes(config?.governedMcpVcpNativeBridgeGateMode) &&
    config?.governedMcpVcpNativeWriteDelegationMode === 'primary' &&
    config?.governedMcpVcpNativeReadDelegationMode === 'off' &&
    target.accepted === true &&
    target.targetReferenceName === expectedRuntimeTarget?.targetReferenceName &&
    target.targetKind === expectedRuntimeTarget?.targetKind &&
    httpTarget.accepted === true &&
    httpTarget.configured === true &&
    httpTarget.bearerTokenConfigured === true &&
    httpTarget.mcpToolNameByAction?.tombstone_memory === 'knowledge_base.tombstone';
}

async function runCm2096VerifyForPostStoreProjection(postStoreProjection, verify) {
  if (postStoreProjection?.accepted !== true) {
    return {
      verifyResult: { accepted: false, reasonCode: postStoreProjection?.reasonCode },
      verifyOperations: 0
    };
  }
  return { verifyResult: await verify(), verifyOperations: 1 };
}

async function runFrozenCm2096RollbackV3(executionPacketCommit, futureDecisionCommit) {
  if (!/^[a-f0-9]{40}$/.test(executionPacketCommit || '')) throw new Error('cm2096_execution_packet_commit_required');
  if (!/^[a-f0-9]{40}$/.test(futureDecisionCommit || '')) throw new Error('cm2096_future_tombstone_decision_commit_required');

  const packetBytes = readGitBytes(executionPacketCommit, PACKET_PATH);
  const packetBlobOid = git(['rev-parse', `${executionPacketCommit}:${PACKET_PATH}`]).trim();
  const packet = JSON.parse(packetBytes.toString('utf8'));
  const packetBlockers = validatePacketShape(packet);
  if (packetBlockers.length) throw new Error(`cm2096_execution_packet_rejected:${packetBlockers.join(',')}`);

  const head = git(['rev-parse', 'HEAD']).trim();
  const tree = git(['show', '-s', '--format=%T', 'HEAD']).trim();
  const clean = git(['status', '--porcelain']).trim() === '';
  const attached = (() => {
    try { git(['symbolic-ref', '-q', 'HEAD']); return true; } catch { return false; }
  })();
  if (!clean || attached || head !== packet.implementationCommit || tree !== packet.implementationTree) {
    throw new Error('cm2096_runtime_checkout_binding_mismatch');
  }

  const decisionBytes = readGitBytes(futureDecisionCommit, DECISION_PATH);
  const decisionBlobOid = git(['rev-parse', `${futureDecisionCommit}:${DECISION_PATH}`]).trim();
  const decisionIntake = evaluateCm2096TombstoneExecutionDecisionIntake({
    decisionBytes,
    observedBinding: {
      decisionSourceCommit: futureDecisionCommit,
      decisionBlobOid,
      decisionPayloadSha256: sha256(decisionBytes)
    },
    expectedBinding: exactDecisionExpectedBinding({ packet, packetCommit: executionPacketCommit, packetBlobOid, packetBytes }),
    now: new Date()
  });
  if (decisionIntake.accepted !== true) throw new Error('cm2096_tombstone_decision_intake_rejected');

  const config = createConfig();
  if (!cm2096RuntimeRouteAccepted(config, packet.runtimeTarget)) {
    throw new Error('cm2096_runtime_native_tombstone_route_binding_mismatch');
  }

  const targetStoreRoot = resolveCm2096TargetStoreRootFromRuntimeAuthority();
  const preStoreProjection = await collectCm2096RealStoreProjection({ knowledgeBaseRootPath: targetStoreRoot, stage: 'pre_rollback' });
  if (preStoreProjection.accepted !== true) throw new Error(`cm2096_target_store_preflight_rejected:${preStoreProjection.reasonCode}`);
  const runtimeContext = buildRuntimeContext({
    packet,
    head,
    tree,
    config,
    storeIdentityProjection: preStoreProjection.identity
  });
  if (sha256Canonical(runtimeContext) !== packet.contextCanonicalSha256 || sha256Canonical(exactCm2096Allowlist()) !== packet.allowlistCanonicalSha256) {
    throw new Error('cm2096_runtime_context_or_allowlist_mismatch');
  }

  const registry = new Phase8OneShotAuthorizationRegistry({
    governanceRoot: resolveCm2096RegistryGovernanceRoot(git(['rev-parse', '--git-common-dir']).trim()),
    rootIdentity: packet.registryRootIdentity,
    identity: packet.registryIdentity
  });
  const expectedBinding = {
    ...exactDecisionExpectedBinding({ packet, packetCommit: executionPacketCommit, packetBlobOid, packetBytes }),
    allowedScope: packet.allowedScope,
    runtimeTarget: packet.runtimeTarget,
    rollbackPlanReference: packet.rollbackPlanReference
  };
  const gate = createCm2096TombstoneOneShotGate({ registry, expectedBinding });
  const claim = await gate.claim({ decision: decisionIntake.decision, preStoreProjection });
  if (claim.accepted !== true) return { accepted: false, state: 'UNCLAIMED', blockers: claim.blockers, tombstoneWriteCalls: 0, verifyOperations: 0 };

  const app = createCodexMemoryApplication({
    cm2096TombstoneOneShotEnforcementEnabled: true,
    cm2096TombstoneAuthorizationAssertionVerifier: gate.verifyAssertion
  });
  const executionContext = {
    agentAlias: 'Codex',
    agentId: 'codex-cm2096-tombstone-one-shot',
    clientId: 'codex',
    projectId: packet.allowedScope.project_id,
    workspaceId: packet.allowedScope.workspace_id,
    scopeId: packet.allowedScope.scope_id,
    visibility: packet.allowedScope.visibility,
    requestSource: 'cm2096-frozen-rollback-v3'
  };
  let initialized = false;
  try {
    await app.initialize();
    initialized = true;
    const payload = buildCm2096TombstonePayload();
    const nativeResult = await app.callTool('tombstone_memory', {
      ...payload,
      actor_client_id: 'Codex',
      request_source: 'cm2096-frozen-rollback-v3',
      dry_run: false,
      confirm: true
    }, {
      executionContext,
      cm2096TombstoneAuthorizationAssertion: claim.assertion,
      auditReceipt: { receiptId: decisionIntake.decision.receiptId },
      rollbackPosture: { mode: 'mutation_cleanup_plan', rollbackPlanRef: packet.rollbackPlanReference },
      outputDisclosureBudget: { level: 'summary', lowDisclosure: true, rawOutput: false, maxItems: 5, maxBytes: 4096 }
    });
    const invocationConsumed = (await registry.readClaim(claim.claimId)).state === 'WRITE_INVOCATION_CONSUMED';
    if (!invocationConsumed) {
      await gate.finalize(claim.claimId, 'CONSUMED_FAILED_PRE_COMMIT');
      return { accepted: false, state: 'CONSUMED_FAILED_PRE_COMMIT', blockers: ['write_invocation_not_consumed'], tombstoneWriteCalls: 0, verifyOperations: 0 };
    }
    const nativeSuccess = nativeResult?.status === 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATED' &&
      nativeResult?.access?.memoryWritePerformed === true &&
      nativeResult?.access?.localMemoryFallbackUsed === false &&
      nativeResult?.receipt?.nativeInvocationReceipt?.invocationBindingMatched === true &&
      nativeResult?.receipt?.nativeInvocationReceipt?.statusClass === 'success' &&
      nativeResult?.receipt?.localAuditReceipt?.status === 'appended';
    if (!nativeSuccess) {
      const explicitPreCommitFailure = nativeResult?.access?.memoryWritePerformed === false && nativeResult?.access?.durableWritePerformed !== true;
      const state = explicitPreCommitFailure ? 'CONSUMED_FAILED_PRE_COMMIT' : 'CONSUMED_AMBIGUOUS_POST_COMMIT';
      await gate.finalize(claim.claimId, state);
      return { accepted: false, state, blockers: ['cm2096_native_tombstone_result_not_success'], tombstoneWriteCalls: 1, verifyOperations: 0 };
    }
    const postStoreProjection = await collectCm2096RealStoreProjection({ knowledgeBaseRootPath: targetStoreRoot, stage: 'post_rollback' });
    const { verifyResult, verifyOperations } = await runCm2096VerifyForPostStoreProjection(
      postStoreProjection,
      () => verifyCm2096TombstoneExecution({
        registry,
        claimId: claim.claimId,
        receiptId: decisionIntake.decision.receiptId,
        decisionReference: decisionIntake.decision.decisionReference,
        claimBindingHash: claim.bindingHash,
        runtimeTargetReferenceName: packet.runtimeTarget.targetReferenceName,
        scope: packet.allowedScope,
        expectedScopeFingerprint: packet.expectedScopeFingerprint,
        postStoreProjection,
        callAuditMemory: args => app.callTool('audit_memory', args, { executionContext })
      })
    );
    const state = verifyResult.accepted === true ? 'CONSUMED_SUCCESS' : 'CONSUMED_AMBIGUOUS_POST_COMMIT';
    await gate.finalize(claim.claimId, state);
    return {
      accepted: verifyResult.accepted === true,
      state,
      blockers: verifyResult.accepted === true ? [] : [verifyResult.reasonCode],
      tombstoneWriteCalls: 1,
      verifyOperations,
      localFallbackUsed: false,
      retryCount: 0,
      supersedeCount: 0,
      compensationCount: 0,
      rawMemoryReturned: false,
      rawAuditReturned: false
    };
  } catch (error) {
    const current = await registry.readClaim(claim.claimId).catch(() => null);
    const state = current?.state === 'CLAIMED' || error?.commitState === 'pre_commit'
      ? 'CONSUMED_FAILED_PRE_COMMIT'
      : 'CONSUMED_AMBIGUOUS_POST_COMMIT';
    await gate.finalize(claim.claimId, state).catch(() => {});
    return { accepted: false, state, blockers: [state], tombstoneWriteCalls: current?.state === 'CLAIMED' ? 0 : 1, verifyOperations: 0 };
  } finally {
    if (initialized) await app.close();
  }
}

if (require.main === module) {
  const packetIndex = process.argv.indexOf('--execution-packet-commit');
  const decisionIndex = process.argv.indexOf('--future-decision-commit');
  runFrozenCm2096RollbackV3(
    packetIndex >= 0 ? process.argv[packetIndex + 1] : null,
    decisionIndex >= 0 ? process.argv[decisionIndex + 1] : null
  )
    .then(result => process.stdout.write(`${JSON.stringify(result)}\n`))
    .catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}

module.exports = {
  DECISION_PATH,
  PACKET_PATH,
  cm2096RuntimeRouteAccepted,
  exactCm2096Allowlist,
  resolveCm2096RegistryGovernanceRoot,
  runCm2096VerifyForPostStoreProjection,
  runFrozenCm2096RollbackV3
};
