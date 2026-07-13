#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { createConfig } = require('../config/createConfig');
const { createCodexMemoryApplication } = require('../app');
const { createRecordMarkdown } = require('../core/GovernedMcpVcpNativeVcpToolBoxMcpShim');
const { evaluatePhase8ExternalAuthorizationDecisionIntake } = require('../core/Phase8ExternalAuthorizationDecisionIntake');
const { evaluatePhase8FinalExecutionReleaseDecisionIntake } = require('../core/Phase8FinalExecutionReleaseDecisionIntake');
const {
  DECISION_SHA256: EXPECTED_FINAL_RELEASE_DECISION_SHA256,
  evaluateCm2094Phase8FinalExecutionReleaseDecision
} = require('../core/Cm2094Phase8FinalExecutionReleaseDecisionContract');
const {
  Phase8OneShotAuthorizationRegistry,
  createPhase8OneShotNativeWriteExecutionGate,
  sha256,
  sha256Canonical,
  verifyPhase8NativeWriteAuditProjection
} = require('../core/Phase8OneShotNativeWriteExecutionGate');

const MANIFEST_PATH = 'docs/near-model-memory-plan-pack/phase8_frozen_execution_manifest.json';
const FINAL_RELEASE_DECISION_PATH = 'docs/near-model-memory-plan-pack/phase8_final_execution_release_decision.json';
const FINAL_RELEASE_DECISION_SOURCE_COMMIT = 'f1e2a8302e91b75beffeb418f57e591cf0789401';
const FINAL_RELEASE_DECISION_BLOB_OID = 'a53c053ab1b882b0d6927152a0d3ee6db540296a';

function git(args, options = {}) {
  return execFileSync('git', args, { encoding: options.encoding || 'utf8', maxBuffer: 1024 * 1024 });
}

function readGitBytes(commit, file) {
  return Buffer.from(execFileSync('git', ['show', `${commit}:${file}`], { maxBuffer: 1024 * 1024 }));
}

function resolvePhase8RegistryGovernanceRoot(gitCommonDir) {
  if (typeof gitCommonDir !== 'string' || gitCommonDir.trim() === '') throw new Error('git_common_dir_required');
  return path.resolve(gitCommonDir, 'codex-memory-governance', 'phase8-one-shot-authorization-registries');
}

function exactAllowlist() {
  return {
    nativeWriteTools: ['record_memory'],
    nativeWriteActions: ['live_bridge_record_memory_proof'],
    maxNativeWrites: 1,
    verifySurface: 'verifyPhase8NativeWriteAuditProjection',
    verifyTool: 'audit_memory',
    verifyAuditFamily: 'governance',
    verifyWindow: 10,
    selectedFieldsOnly: true,
    maxVerifyOperations: 1,
    rollbackOrCompensationActions: [],
    maxRollbackOrCompensationOperations: 0,
    localFallbackWriteAllowed: false,
    automaticRetryAllowed: false,
    automaticRollbackAllowed: false,
    existingMemoryModificationAllowed: false,
    rawPrivateMemoryAccessAllowed: false,
    defaultMcpExpansionAllowed: false,
    remoteGitActionsAllowed: false,
    releaseDeployCutoverAllowed: false,
    readinessClaimAllowed: false
  };
}

async function runFrozenExecutor(executionPacketCommit, finalReleaseDecisionCommit) {
  if (!/^[a-f0-9]{40}$/.test(executionPacketCommit || '')) throw new Error('execution_packet_commit_required');
  if (!/^[a-f0-9]{40}$/.test(finalReleaseDecisionCommit || '')) throw new Error('final_release_decision_commit_required');
  if (finalReleaseDecisionCommit !== FINAL_RELEASE_DECISION_SOURCE_COMMIT) {
    throw new Error('final_release_decision_git_identity_mismatch');
  }
  const manifestBytes = readGitBytes(executionPacketCommit, MANIFEST_PATH);
  const manifestBlobOid = git(['rev-parse', `${executionPacketCommit}:${MANIFEST_PATH}`]).trim();
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const { manifestPayloadSha256, ...manifestPayload } = manifest;
  if (sha256Canonical(manifestPayload) !== manifestPayloadSha256) throw new Error('manifest_hash_mismatch');

  const head = git(['rev-parse', 'HEAD']).trim();
  const tree = git(['show', '-s', '--format=%T', 'HEAD']).trim();
  const clean = git(['status', '--porcelain']).trim() === '';
  if (head !== manifest.runtimeSourceCommit || tree !== manifest.runtimeSourceTree || !clean) {
    throw new Error('runtime_checkout_binding_mismatch');
  }

  const decisionBytes = readGitBytes(manifest.decisionSourceCommit, manifest.decisionPath);
  const decisionBlobOid = git(['rev-parse', `${manifest.decisionSourceCommit}:${manifest.decisionPath}`]).trim();
  const contentIntake = evaluatePhase8ExternalAuthorizationDecisionIntake({
    decisionBytes,
    observedBinding: {
      decisionReference: manifest.decisionReference,
      decisionSourceCommit: manifest.decisionSourceCommit,
      decisionBlobOid,
      decisionPayloadSha256: sha256(decisionBytes)
    },
    expectedBinding: manifest.decisionBinding,
    now: new Date()
  });
  if (contentIntake.accepted !== true) throw new Error('authorization_content_decision_intake_rejected');

  const releaseDecisionBytes = readGitBytes(finalReleaseDecisionCommit, FINAL_RELEASE_DECISION_PATH);
  const releaseDecisionBlobOid = git(['rev-parse', `${finalReleaseDecisionCommit}:${FINAL_RELEASE_DECISION_PATH}`]).trim();
  if (releaseDecisionBlobOid !== FINAL_RELEASE_DECISION_BLOB_OID ||
      sha256(releaseDecisionBytes) !== EXPECTED_FINAL_RELEASE_DECISION_SHA256 ||
      evaluateCm2094Phase8FinalExecutionReleaseDecision(releaseDecisionBytes).accepted !== true) {
    throw new Error('final_execution_release_decision_exact_artifact_rejected');
  }
  const releaseIntake = evaluatePhase8FinalExecutionReleaseDecisionIntake({
    decisionBytes: releaseDecisionBytes,
    observedBinding: {
      decisionSourceCommit: finalReleaseDecisionCommit,
      decisionBlobOid: releaseDecisionBlobOid,
      decisionPayloadSha256: sha256(releaseDecisionBytes)
    },
    expectedBinding: {
      decisionSourceCommit: finalReleaseDecisionCommit,
      decisionBlobOid: FINAL_RELEASE_DECISION_BLOB_OID,
      expectedFinalReleaseDecisionReference: contentIntake.decision.expectedFinalReleaseDecisionReference,
      authorizationContentDecisionReference: contentIntake.decision.decisionReference,
      authorizationContentSourceCommit: manifest.decisionSourceCommit,
      authorizationContentBlobOid: decisionBlobOid,
      authorizationContentPayloadSha256: sha256(decisionBytes),
      executionPacketCommit,
      executionManifestBlobOid: manifestBlobOid,
      executionManifestSha256: sha256(manifestBytes),
      expectedContextHash: manifest.contextCanonicalSha256,
      expectedAllowlistHash: manifest.allowlistCanonicalSha256,
      payloadCanonicalSha256: manifest.payloadCanonicalSha256,
      nonce: contentIntake.decision.nonce,
      receiptId: contentIntake.decision.receiptId
    },
    now: new Date()
  });
  if (releaseIntake.accepted !== true) throw new Error('final_execution_release_decision_intake_rejected');

  const payloadBytes = readGitBytes(manifest.payloadSourceCommit, manifest.payloadPath);
  const payloadBlobOid = git(['rev-parse', `${manifest.payloadSourceCommit}:${manifest.payloadPath}`]).trim();
  const payload = JSON.parse(payloadBytes.toString('utf8'));
  const durableRecordBytes = Buffer.from(createRecordMarkdown(payload));
  if (durableRecordBytes.length !== manifest.durableRecordBytes ||
      sha256(durableRecordBytes) !== manifest.durableRecordSha256) {
    throw new Error('durable_record_binding_mismatch');
  }
  const config = createConfig();
  const target = config.governedMcpVcpNativeRuntimeTarget || {};
  const httpTarget = config.governedMcpVcpNativeHttpMcpTarget || {};
  if (config.governedMcpVcpNativeWriteDelegationMode !== 'primary' ||
      target.accepted !== true ||
      httpTarget.accepted !== true ||
      httpTarget.configured !== true ||
      httpTarget.bearerTokenConfigured !== true ||
      httpTarget.mcpToolNameByAction?.record_memory !== 'knowledge_base.record') {
    throw new Error('runtime_native_write_route_binding_mismatch');
  }
  const registryIdentity = manifest.registryIdentity;
  const registryRootIdentity = manifest.registryRootIdentity;
  if (sha256Canonical(registryRootIdentity) !== manifest.registryRootIdentitySha256) {
    throw new Error('authorization_registry_root_identity_hash_mismatch');
  }
  const actualContext = {
    ...manifest.contextStatic,
    runtimeSourceCommit: head,
    runtimeSourceTree: tree,
    payloadSourceCommit: manifest.payloadSourceCommit,
    payloadBlobOid,
    payloadBytes: payloadBytes.length,
    payloadFileSha256: sha256(payloadBytes),
    payloadCanonicalSha256: sha256Canonical(payload),
    durableRecordBytes: durableRecordBytes.length,
    durableRecordSha256: sha256(durableRecordBytes),
    innerNativeTransport: 'local_http_transport',
    targetReferenceName: target.targetReferenceName,
    targetKind: target.targetKind,
    sourceAuthority: target.sourceAuthority,
    writeEnabledShimRequired: true,
    nativeWriteDelegationMode: config.governedMcpVcpNativeWriteDelegationMode,
    innerHttpTargetAccepted: httpTarget.accepted,
    innerHttpTargetConfigured: httpTarget.configured,
    innerHttpAuthConfigured: httpTarget.bearerTokenConfigured,
    innerRecordMemoryToolName: httpTarget.mcpToolNameByAction.record_memory,
    authorizationRegistryReference: registryIdentity.authorizationRegistryReference,
    authorizationRegistryStorageRole: registryIdentity.registryStorageRole,
    authorizationRegistryReinitializationAllowed: registryIdentity.registryReinitializationAllowed,
    authorizationRegistryDeletionAllowed: registryIdentity.registryDeletionAllowed,
    authorizationRegistryRootReference: registryRootIdentity.registryRootReference,
    authorizationRegistryRootIdentitySha256: manifest.registryRootIdentitySha256,
    authorizationRegistryRootReinitializationAllowed: registryRootIdentity.registryRootReinitializationAllowed,
    authorizationRegistryRootReplacementAllowed: registryRootIdentity.registryRootReplacementAllowed,
    authorizationRegistryRootRole: 'git_common_dir_governance_state'
  };
  const allowlist = exactAllowlist();
  if (sha256Canonical(actualContext) !== manifest.contextCanonicalSha256 ||
      sha256Canonical(allowlist) !== manifest.allowlistCanonicalSha256) {
    throw new Error('runtime_context_or_allowlist_mismatch');
  }

  const gitCommonDir = git(['rev-parse', '--git-common-dir']).trim();
  const registry = new Phase8OneShotAuthorizationRegistry({
    governanceRoot: resolvePhase8RegistryGovernanceRoot(gitCommonDir),
    rootIdentity: registryRootIdentity,
    identity: registryIdentity
  });
  const expectedBinding = {
    runtimeSourceCommit: manifest.runtimeSourceCommit,
    runtimeSourceTree: manifest.runtimeSourceTree,
    payloadBlobOid: manifest.payloadBlobOid,
    payloadFileSha256: manifest.payloadFileSha256,
    payloadCanonicalSha256: manifest.payloadCanonicalSha256,
    allowedScope: manifest.allowedScope,
    runtimeTarget: manifest.runtimeTarget,
    rollbackPlanReference: manifest.rollbackPlanReference,
    buildContext: () => actualContext,
    buildAllowlist: exactAllowlist
  };
  const gate = createPhase8OneShotNativeWriteExecutionGate({ registry, expectedBinding });
  const app = createCodexMemoryApplication({
    phase8OneShotNativeWriteEnforcementEnabled: true,
    phase8OneShotAuthorizationAssertionVerifier: gate.verifyAssertion
  });
  let initialized = false;
  const executionContext = {
    agentAlias: 'Codex', agentId: 'codex-phase8-one-shot', clientId: 'codex',
    projectId: manifest.allowedScope.project_id,
    workspaceId: manifest.allowedScope.workspace_id,
    scopeId: manifest.allowedScope.scope_id,
    visibility: manifest.allowedScope.visibility,
    requestSource: 'phase8-frozen-one-shot-executor'
  };
  try {
    return await gate.execute({
      authorizationContentDecision: contentIntake.decision,
      executionReleaseDecision: releaseIntake.decision,
      runtimeFacts: { clean, commit: head, tree },
      payloadBytes,
      payloadBlobOid,
      executeNativeWrite: async ({ payload, assertion }) => {
        if (!initialized) { await app.initialize(); initialized = true; }
        return app.callTool('record_memory', payload, {
          executionContext,
          phase8OneShotAuthorizationAssertion: assertion,
          auditReceipt: { receiptId: releaseIntake.decision.receiptId },
          rollbackPosture: { mode: 'bounded_rollback_plan', rollbackPlanRef: manifest.rollbackPlanReference },
          outputDisclosureBudget: { level: 'summary', lowDisclosure: true, rawOutput: false, maxItems: 5, maxBytes: 4096 }
        });
      },
      verifyWrite: async ({ claimId }) => verifyPhase8NativeWriteAuditProjection({
        registry, claimId, receiptId: releaseIntake.decision.receiptId,
        approvalDecisionReference: releaseIntake.decision.decisionReference,
        claimBindingHash: (await registry.readClaim(claimId)).bindingHash,
        targetReferenceName: manifest.runtimeTarget.targetReferenceName,
        expectedScopeFingerprint: manifest.expectedScopeFingerprint,
        scope: manifest.allowedScope,
        callAuditMemory: args => app.callTool('audit_memory', args, { executionContext })
      })
    });
  } finally {
    if (initialized) await app.close();
  }
}

if (require.main === module) {
  const index = process.argv.indexOf('--execution-packet-commit');
  const releaseIndex = process.argv.indexOf('--final-release-decision-commit');
  runFrozenExecutor(index >= 0 ? process.argv[index + 1] : null, releaseIndex >= 0 ? process.argv[releaseIndex + 1] : null)
    .then(result => process.stdout.write(`${JSON.stringify({ accepted: result.accepted, state: result.state, blockers: result.blockers, nativeWriteCalls: result.nativeWriteCalls, verifyOperations: result.verifyOperations })}\n`))
    .catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}

module.exports = {
  FINAL_RELEASE_DECISION_BLOB_OID,
  FINAL_RELEASE_DECISION_PATH,
  FINAL_RELEASE_DECISION_SOURCE_COMMIT,
  MANIFEST_PATH,
  exactAllowlist,
  resolvePhase8RegistryGovernanceRoot,
  runFrozenExecutor
};
