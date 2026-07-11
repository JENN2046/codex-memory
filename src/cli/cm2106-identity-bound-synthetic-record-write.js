#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createConfig } = require('../config/createConfig');
const { createCodexMemoryApplication } = require('../app');
const {
  createGovernedMcpVcpNativeVcpToolBoxMcpShimServer,
  createVcpToolBoxNativeMemoryAdapter
} = require('../core/GovernedMcpVcpNativeVcpToolBoxMcpShim');
const {
  evaluatePhase8ExternalAuthorizationDecisionIntake
} = require('../core/Phase8ExternalAuthorizationDecisionIntake');
const {
  evaluatePhase8FinalExecutionReleaseDecisionIntake
} = require('../core/Phase8FinalExecutionReleaseDecisionIntake');
const {
  Phase8OneShotAuthorizationRegistry,
  createPhase8OneShotNativeWriteExecutionGate,
  sha256Canonical,
  verifyPhase8NativeWriteAuditProjection
} = require('../core/Phase8OneShotNativeWriteExecutionGate');
const {
  evaluateCm2102EmptyStorePreflightReceiptShape
} = require('../core/Cm2102IdentityBoundEmptyStorePreflightContract');
const {
  verifyCm2103GovernanceRoot
} = require('../core/Cm2103IdentityBoundStoreGovernance');
const {
  ALLOWED_SCOPE,
  CONTENT_DECISION_PATH,
  EXPECTED,
  FINAL_RELEASE_DECISION_PATH,
  PACKET_PATH,
  PAYLOAD_PATH,
  REGISTRY_IDENTITY,
  REGISTRY_ROOT_IDENTITY,
  collectPostWriteProjection,
  collectPreWriteProjection,
  expectedAllowlist,
  expectedRuntimeContext,
  sha256,
  verifyPayloadBytes
} = require('../core/Cm2106IdentityBoundSyntheticRecordWrite');

const PREFLIGHT_RECEIPT_PATH =
  'docs/near-model-memory-plan-pack/phase8_identity_bound_empty_store_preflight_execution_receipt_cm2105.json';
const REGISTRY_ROOT_IDENTITY_SHA256 =
  '240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0';

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
    taskId: 'CM-2106',
    packetType: 'identity_bound_synthetic_record_one_shot_execution_packet',
    packetDoesNotAuthorizeExecution: true,
    executionAuthorizedAtPacketFreeze: false,
    contentDecisionReference: EXPECTED.contentDecisionReference,
    expectedFinalReleaseDecisionReference: EXPECTED.finalReleaseDecisionReference,
    payloadPath: PAYLOAD_PATH,
    payloadBytes: EXPECTED.payloadBytes,
    payloadFileSha256: EXPECTED.payloadFileSha256,
    payloadCanonicalSha256: EXPECTED.payloadCanonicalSha256,
    durableRecordBytes: EXPECTED.durableRecordBytes,
    durableRecordSha256: EXPECTED.durableRecordSha256,
    expectedMemoryIdRef: EXPECTED.memoryIdRef,
    storeRootBindingSha256: '0a7ceb6cf658d517de2a3eb30ee09195dbeb9d46800f42ac87edf7f7cb11dd94',
    storeIdentitySha256: '017307c9a1cb3e216895934b9c2aae8fa5773b909afebe87d3f91bc0a5736f57',
    registryRootIdentitySha256: REGISTRY_ROOT_IDENTITY_SHA256,
    nonce: EXPECTED.nonce,
    receiptId: EXPECTED.receiptId,
    authorizationRegistryReference: EXPECTED.registryReference,
    authorizationUseCount: 1,
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
    readinessClaimed: false
  };
  for (const [field, expected] of Object.entries(exact)) {
    if (packet[field] !== expected) blockers.push(`packet.${field}`);
  }
  for (const field of [
    'implementationCommit', 'implementationTree', 'payloadSourceCommit', 'payloadBlobOid',
    'contentDecisionCommit', 'contentDecisionBlobOid', 'preflightReceiptCommit',
    'preflightReceiptBlobOid'
  ]) if (!hash40(packet[field])) blockers.push(`packet.${field}`);
  for (const field of [
    'contentDecisionSha256', 'preflightReceiptSha256', 'contextCanonicalSha256',
    'allowlistCanonicalSha256', 'expectedScopeFingerprint'
  ]) if (!hash64(packet[field])) blockers.push(`packet.${field}`);
  if (packet.payloadSourceCommit !== packet.implementationCommit) blockers.push('packet.payloadSourceCommit');
  if (packet.expectedScopeFingerprint !== EXPECTED.scopeFingerprint) blockers.push('packet.expectedScopeFingerprint');
  if (packet.allowlistCanonicalSha256 !== sha256Canonical(expectedAllowlist())) blockers.push('packet.allowlist');
  const context = expectedRuntimeContext({
    implementationCommit: packet.implementationCommit,
    implementationTree: packet.implementationTree,
    payloadBlobOid: packet.payloadBlobOid,
    preflightReceiptCommit: packet.preflightReceiptCommit,
    preflightReceiptBlobOid: packet.preflightReceiptBlobOid,
    preflightReceiptSha256: packet.preflightReceiptSha256
  });
  if (packet.contextCanonicalSha256 !== sha256Canonical(context)) blockers.push('packet.context');
  return [...new Set(blockers)];
}

function preflightReceiptBinding() {
  return {
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

function statePaths(governanceParent) {
  return {
    appStateRoot: path.join(governanceParent, EXPECTED.appStateReference),
    derivedRuntimeStore: path.join(governanceParent, EXPECTED.derivedRuntimeStoreReference)
  };
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
      mcpToolNameByAction: { record_memory: 'knowledge_base.record' }
    }
  };
}

async function startPrimaryWriteOnlyShim({ storeRoot, derivedRuntimeStore }) {
  const adapter = createVcpToolBoxNativeMemoryAdapter({
    vcpToolBoxRoot: path.resolve(process.cwd(), '../../runtime/VCPToolBox'),
    knowledgeBaseRootPath: storeRoot,
    knowledgeBaseStorePath: derivedRuntimeStore,
    writeSubdir: 'codex-memory-governed',
    primaryWriteOnly: true
  });
  const server = createGovernedMcpVcpNativeVcpToolBoxMcpShimServer({
    adapter,
    enableWrite: true
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address !== 'object') throw new Error('cm2106_local_shim_address_invalid');
  return {
    endpoint: `http://127.0.0.1:${address.port}/mcp/vcp-native`,
    async close() {
      await new Promise(resolve => server.close(resolve));
      await adapter.shutdown();
    }
  };
}

async function runFrozenCm2106RecordWrite(packetCommit, contentDecisionCommit, finalDecisionCommit) {
  if (!hash40(packetCommit)) throw new Error('cm2106_execution_packet_commit_required');
  if (!hash40(contentDecisionCommit)) throw new Error('cm2106_content_decision_commit_required');
  if (!hash40(finalDecisionCommit)) throw new Error('cm2106_final_release_decision_commit_required');

  const packetBytes = readGitBytes(packetCommit, PACKET_PATH);
  const packetBlobOid = git(['rev-parse', `${packetCommit}:${PACKET_PATH}`]).trim();
  const packet = JSON.parse(packetBytes.toString('utf8'));
  const packetBlockers = validatePacket(packet);
  if (packetBlockers.length) throw new Error(`cm2106_execution_packet_rejected:${packetBlockers.join(',')}`);
  if (contentDecisionCommit !== packet.contentDecisionCommit) {
    throw new Error('cm2106_content_decision_commit_mismatch');
  }

  const head = git(['rev-parse', 'HEAD']).trim();
  const tree = git(['rev-parse', 'HEAD^{tree}']).trim();
  const clean = git(['status', '--porcelain']).trim() === '';
  let attached = false;
  try { git(['symbolic-ref', '-q', 'HEAD']); attached = true; } catch {}
  if (!clean || attached || head !== packet.implementationCommit || tree !== packet.implementationTree) {
    throw new Error('cm2106_runtime_checkout_binding_mismatch');
  }

  const payloadBytes = readGitBytes(packet.payloadSourceCommit, PAYLOAD_PATH);
  const payloadBlobOid = git(['rev-parse', `${packet.payloadSourceCommit}:${PAYLOAD_PATH}`]).trim();
  if (payloadBlobOid !== packet.payloadBlobOid) throw new Error('cm2106_payload_blob_mismatch');
  verifyPayloadBytes(payloadBytes);

  const preflightBytes = readGitBytes(packet.preflightReceiptCommit, PREFLIGHT_RECEIPT_PATH);
  const preflightBlobOid = git(['rev-parse', `${packet.preflightReceiptCommit}:${PREFLIGHT_RECEIPT_PATH}`]).trim();
  if (preflightBlobOid !== packet.preflightReceiptBlobOid ||
      sha256(preflightBytes) !== packet.preflightReceiptSha256) {
    throw new Error('cm2106_preflight_receipt_git_binding_mismatch');
  }
  const preflightReview = evaluateCm2102EmptyStorePreflightReceiptShape({
    receipt: JSON.parse(preflightBytes.toString('utf8')),
    expectedBinding: preflightReceiptBinding()
  });
  if (!preflightReview.shapeAccepted) {
    throw new Error(`cm2106_preflight_receipt_rejected:${preflightReview.blockers.join(',')}`);
  }

  const contentBytes = readGitBytes(contentDecisionCommit, CONTENT_DECISION_PATH);
  const contentBlobOid = git(['rev-parse', `${contentDecisionCommit}:${CONTENT_DECISION_PATH}`]).trim();
  if (contentBlobOid !== packet.contentDecisionBlobOid || sha256(contentBytes) !== packet.contentDecisionSha256) {
    throw new Error('cm2106_content_decision_git_binding_mismatch');
  }
  const contentIntake = evaluatePhase8ExternalAuthorizationDecisionIntake({
    decisionBytes: contentBytes,
    observedBinding: {
      decisionReference: packet.contentDecisionReference,
      decisionSourceCommit: contentDecisionCommit,
      decisionBlobOid: contentBlobOid,
      decisionPayloadSha256: sha256(contentBytes)
    },
    expectedBinding: {
      decisionReference: packet.contentDecisionReference,
      decisionSourceCommit: contentDecisionCommit,
      decisionBlobOid: contentBlobOid,
      decisionPayloadSha256: sha256(contentBytes),
      registryRootIdentitySha256: REGISTRY_ROOT_IDENTITY_SHA256,
      expectedContextHash: packet.contextCanonicalSha256,
      expectedAllowlistHash: packet.allowlistCanonicalSha256,
      payloadCanonicalSha256: packet.payloadCanonicalSha256,
      nonce: packet.nonce,
      receiptId: packet.receiptId,
      expectedFinalReleaseDecisionReference: packet.expectedFinalReleaseDecisionReference
    },
    now: new Date()
  });
  if (!contentIntake.accepted) throw new Error('cm2106_content_decision_intake_rejected');

  const finalBytes = readGitBytes(finalDecisionCommit, FINAL_RELEASE_DECISION_PATH);
  const finalBlobOid = git(['rev-parse', `${finalDecisionCommit}:${FINAL_RELEASE_DECISION_PATH}`]).trim();
  const finalIntake = evaluatePhase8FinalExecutionReleaseDecisionIntake({
    decisionBytes: finalBytes,
    observedBinding: {
      decisionSourceCommit: finalDecisionCommit,
      decisionBlobOid: finalBlobOid,
      decisionPayloadSha256: sha256(finalBytes)
    },
    expectedBinding: {
      expectedFinalReleaseDecisionReference: packet.expectedFinalReleaseDecisionReference,
      authorizationContentDecisionReference: packet.contentDecisionReference,
      authorizationContentSourceCommit: contentDecisionCommit,
      authorizationContentBlobOid: contentBlobOid,
      authorizationContentPayloadSha256: sha256(contentBytes),
      executionPacketCommit: packetCommit,
      executionManifestBlobOid: packetBlobOid,
      executionManifestSha256: sha256(packetBytes),
      expectedContextHash: packet.contextCanonicalSha256,
      expectedAllowlistHash: packet.allowlistCanonicalSha256,
      payloadCanonicalSha256: packet.payloadCanonicalSha256,
      nonce: packet.nonce,
      receiptId: packet.receiptId
    },
    now: new Date()
  });
  if (!finalIntake.accepted) throw new Error('cm2106_final_release_decision_intake_rejected');

  const gitCommonDir = git(['rev-parse', '--git-common-dir']).trim();
  const governance = await verifyCm2103GovernanceRoot(gitCommonDir);
  const preWriteProjection = await collectPreWriteProjection(governance.internalPaths.storeRoot);
  const paths = statePaths(governance.internalPaths.governanceParent);
  await ensureAbsent(paths.appStateRoot, 'cm2106_app_state_already_exists');
  await ensureAbsent(paths.derivedRuntimeStore, 'cm2106_derived_runtime_store_already_exists');

  const runtimeContext = expectedRuntimeContext({
    implementationCommit: head,
    implementationTree: tree,
    payloadBlobOid,
    preflightReceiptCommit: packet.preflightReceiptCommit,
    preflightReceiptBlobOid: packet.preflightReceiptBlobOid,
    preflightReceiptSha256: packet.preflightReceiptSha256
  });
  if (sha256Canonical(runtimeContext) !== packet.contextCanonicalSha256 ||
      sha256Canonical(expectedAllowlist()) !== packet.allowlistCanonicalSha256) {
    throw new Error('cm2106_runtime_context_or_allowlist_mismatch');
  }

  const registry = new Phase8OneShotAuthorizationRegistry({
    governanceRoot: governance.internalPaths.authorizationRegistryRoot,
    rootIdentity: REGISTRY_ROOT_IDENTITY,
    identity: REGISTRY_IDENTITY
  });
  const expectedBinding = {
    runtimeSourceCommit: head,
    runtimeSourceTree: tree,
    payloadBlobOid,
    payloadFileSha256: packet.payloadFileSha256,
    payloadCanonicalSha256: packet.payloadCanonicalSha256,
    allowedScope: ALLOWED_SCOPE,
    runtimeTarget: {
      primaryRuntime: 'VCPToolBox native memory',
      targetReferenceName: EXPECTED.runtimeTargetReference,
      targetKind: 'mcp_server'
    },
    rollbackPlanReference: 'cm2106-r1-identity-bound-append-only-tombstone-plan',
    buildContext: () => runtimeContext,
    buildAllowlist: expectedAllowlist
  };
  const gate = createPhase8OneShotNativeWriteExecutionGate({ registry, expectedBinding });
  let app = null;
  let shim = null;
  const bearerToken = crypto.randomBytes(32).toString('hex');
  const executionContext = {
    agentAlias: 'Codex',
    agentId: 'codex-cm2106-identity-bound-record',
    clientId: 'codex',
    projectId: ALLOWED_SCOPE.project_id,
    workspaceId: ALLOWED_SCOPE.workspace_id,
    scopeId: ALLOWED_SCOPE.scope_id,
    visibility: ALLOWED_SCOPE.visibility,
    requestSource: 'cm2106-frozen-identity-bound-record-executor'
  };
  try {
    shim = await startPrimaryWriteOnlyShim({
      storeRoot: governance.internalPaths.storeRoot,
      derivedRuntimeStore: paths.derivedRuntimeStore
    });
    const overrides = appOverrides({
      endpoint: shim.endpoint,
      bearerToken,
      appStateRoot: paths.appStateRoot
    });
    const config = createConfig(overrides);
    if (config.governedMcpVcpNativeWriteDelegationMode !== 'primary' ||
        config.governedMcpVcpNativeReadDelegationMode !== 'off' ||
        config.governedMcpVcpNativeRuntimeTarget?.accepted !== true ||
        config.governedMcpVcpNativeRuntimeTarget?.targetReferenceName !== EXPECTED.runtimeTargetReference ||
        config.governedMcpVcpNativeHttpMcpTarget?.accepted !== true ||
        config.governedMcpVcpNativeHttpMcpTarget?.bearerTokenConfigured !== true ||
        config.governedMcpVcpNativeHttpMcpTarget?.mcpToolNameByAction?.record_memory !== 'knowledge_base.record') {
      throw new Error('cm2106_runtime_native_write_route_rejected');
    }
    app = createCodexMemoryApplication({
      ...overrides,
      phase8OneShotNativeWriteEnforcementEnabled: true,
      phase8OneShotAuthorizationAssertionVerifier: gate.verifyAssertion
    });
    const execution = await gate.execute({
      authorizationContentDecision: contentIntake.decision,
      executionReleaseDecision: finalIntake.decision,
      runtimeFacts: { clean, commit: head, tree },
      payloadBytes,
      payloadBlobOid,
      executeNativeWrite: async ({ payload, assertion }) => {
        await app.initialize();
        return app.callTool('record_memory', payload, {
          executionContext,
          phase8OneShotAuthorizationAssertion: assertion,
          auditReceipt: { receiptId: packet.receiptId },
          rollbackPosture: {
            mode: 'bounded_rollback_plan',
            rollbackPlanRef: expectedBinding.rollbackPlanReference
          },
          outputDisclosureBudget: {
            level: 'summary', lowDisclosure: true, rawOutput: false, maxItems: 5, maxBytes: 4096
          }
        });
      },
      verifyWrite: async ({ claimId }) => {
        const postWriteProjection = await collectPostWriteProjection(governance.internalPaths.storeRoot);
        const claim = await registry.readClaim(claimId);
        const auditProjection = await verifyPhase8NativeWriteAuditProjection({
          registry,
          claimId,
          receiptId: packet.receiptId,
          approvalDecisionReference: finalIntake.decision.decisionReference,
          claimBindingHash: claim.bindingHash,
          targetReferenceName: EXPECTED.runtimeTargetReference,
          expectedScopeFingerprint: EXPECTED.scopeFingerprint,
          scope: ALLOWED_SCOPE,
          callAuditMemory: args => app.callTool('audit_memory', args, { executionContext })
        });
        return {
          accepted: postWriteProjection.accepted === true && auditProjection.accepted === true,
          postWriteProjection,
          auditProjection
        };
      }
    });
    const derivedStoreAbsent = await fs.lstat(paths.derivedRuntimeStore).then(
      () => false,
      error => error.code === 'ENOENT' ? true : Promise.reject(error)
    );
    const post = execution.verifyResult?.postWriteProjection || null;
    const audit = execution.verifyResult?.auditProjection || null;
    return {
      schemaVersion: 1,
      taskId: 'CM-2106',
      receiptType: 'identity_bound_synthetic_record_one_shot_execution_receipt',
      result: execution.accepted === true ? 'PASS' : 'STOPPED',
      finalState: execution.state,
      executionAccepted: execution.accepted === true,
      implementationCommit: head,
      implementationTree: tree,
      executionPacketCommit: packetCommit,
      executionPacketBlobOid: packetBlobOid,
      executionPacketSha256: sha256(packetBytes),
      contentDecisionReference: contentIntake.decision.decisionReference,
      contentDecisionCommit,
      contentDecisionBlobOid: contentBlobOid,
      contentDecisionSha256: sha256(contentBytes),
      finalReleaseDecisionReference: finalIntake.decision.decisionReference,
      finalReleaseDecisionCommit: finalDecisionCommit,
      finalReleaseDecisionBlobOid: finalBlobOid,
      finalReleaseDecisionSha256: sha256(finalBytes),
      preflightReceiptCommit: packet.preflightReceiptCommit,
      preflightReceiptBlobOid: packet.preflightReceiptBlobOid,
      preflightReceiptSha256: packet.preflightReceiptSha256,
      preflightReceiptAccepted: true,
      storeRootBindingSha256: packet.storeRootBindingSha256,
      storeIdentityMatched: preWriteProjection.storeIdentityMatched === true && post?.storeIdentityMatched === true,
      storeIdentitySha256: packet.storeIdentitySha256,
      payloadBlobOid,
      payloadBytes: packet.payloadBytes,
      payloadFileSha256: packet.payloadFileSha256,
      payloadCanonicalSha256: packet.payloadCanonicalSha256,
      durableRecordCount: post?.recordCount ?? 0,
      durableRecordBytes: post?.durableRecordBytes ?? 0,
      durableRecordSha256: post?.durableRecordSha256 ?? null,
      memoryIdRef: post?.memoryIdRef ?? null,
      authorizationUseCount: 1,
      authorizationConsumed: execution.state !== 'UNCLAIMED',
      authorizationReplayAllowed: false,
      nativeWriteCalls: execution.nativeWriteCalls,
      verifyOperations: execution.verifyOperations || 0,
      verifyAccepted: audit?.accepted === true,
      auditReceiptSelectedFieldsOnly: audit?.selectedFieldsOnly === true,
      nativeInvocationReceiptBindingMatched:
        audit?.observedSelectedBinding?.nativeInvocationReceiptBindingMatched === true,
      primaryMemoryStoreWritePerformed: execution.accepted === true && post?.accepted === true,
      durableWritePerformed: execution.accepted === true && post?.accepted === true,
      primaryWriteOnly: true,
      providerCalled: false,
      derivedIndexWritePerformed: false,
      derivedRuntimeStoreCreated: derivedStoreAbsent === false,
      localFallbackUsed: false,
      automaticRetryPerformed: false,
      rollbackOrCompensationPerformed: false,
      existingMemoryModified: false,
      otherRealMemoryRead: false,
      otherRealMemoryModified: false,
      rawMemoryReturned: false,
      rawAuditReturned: false,
      rawPathDisclosed: false,
      readinessClaimed: false,
      rollbackDrillPassed: false,
      failureRecoveryProofPassed: false,
      phase8Completed: false
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
  runFrozenCm2106RecordWrite(
    argumentValue('--execution-packet-commit'),
    argumentValue('--content-decision-commit'),
    argumentValue('--final-release-decision-commit')
  )
    .then(result => process.stdout.write(`${JSON.stringify(result)}\n`))
    .catch(error => {
      const message = String(error?.message || '');
      process.stderr.write(`${message.startsWith('cm2106_') ? message : 'cm2106_execution_failed'}\n`);
      process.exitCode = 1;
    });
}

module.exports = {
  PREFLIGHT_RECEIPT_PATH,
  appOverrides,
  preflightReceiptBinding,
  runFrozenCm2106RecordWrite,
  startPrimaryWriteOnlyShim,
  statePaths,
  validatePacket
};
