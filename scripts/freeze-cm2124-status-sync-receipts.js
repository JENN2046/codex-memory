#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const {
  BINDING_RECEIPT_FILENAME,
  CONTENT_DECISION_FREEZE,
  EXECUTION_RECEIPT_FILENAME,
  FUTURE_BRANCH_REF,
  Cm2122StatusSyncClaimRegistry,
  assertSafeGitEnvironment,
  buildClaimBindingHash,
  evaluateBindingReceipt,
  evaluateDurableDetachedBinding,
  evaluateExecutionReceipt,
  intakeExecutionPacket,
  intakeFinalReleaseDecision,
  resolveFixedGovernanceRoot,
  verifyDetachedCommitBinding
} = require('../src/core/Cm2122FullPlanStatusSyncExecution');
const {
  canonicalize,
  sha256Canonical
} = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  gitBlobOid,
  serializeArtifact
} = require('../src/core/Cm2117ExactFullPlanApplicationDecision');
const {
  gitText
} = require('./cm2115-r2-git');
const {
  resolverOptions
} = require('./generate-cm2116-exact-full-plan-application-gate');

const PACKET_COMMIT = 'd9f5f8c1cbfb17ac013846006f466c1b0c3ae67f';
const FINAL_RELEASE_COMMIT = '869d9d6e62eebd7ce1c04cfe9e7a3b394355937f';
const DETACHED_STATUS_COMMIT = 'eb016872c834a8a8b36ed8edd8ce1aeb0db599c8';
const DETACHED_STATUS_TREE = 'c129ecfaa134a47f30ed98f17d74151989c1a547';
const OUTPUTS = Object.freeze({
  execution: 'docs/near-model-memory-plan-pack/cm2124_status_sync_execution_receipt.json',
  binding: 'docs/near-model-memory-plan-pack/cm2124_status_sync_binding_receipt.json',
  manifest: 'docs/near-model-memory-plan-pack/cm2124_status_sync_receipt_freeze_manifest.json',
  markdown: 'docs/near-model-memory-plan-pack/cm2124_status_sync_receipt_freeze_manifest.md'
});
const EXPECTED = Object.freeze({
  execution: Object.freeze({
    bytes: 12435,
    sha256: '8d3aefd3a335f4b850dfc07369d23c411bd0bd49028c597455c28d5d8f518120',
    canonicalPayloadSha256: 'a040c6e948fe1ac740fa5bf22a7f29d95e901b1a64102599384221204ddf5e2d'
  }),
  binding: Object.freeze({
    bytes: 12174,
    sha256: '5ce9d65ab6e2c6d3a957c30ce65c7195dce0619cb88312fb18bb52ecd982f28f',
    canonicalPayloadSha256: 'f03cb5d8a78d17c5f9b90005edc7a45d32b2113c39a29b0f403ffe268e01d023'
  })
});

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function parseArgs(argv) {
  if (argv.length !== 0) throw new Error('cm2124_freeze_no_arguments_allowed');
}

function readExactReceipt(root, filename, expected) {
  const source = path.join(root, filename);
  const stat = fs.lstatSync(source);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`cm2124_receipt_source_invalid:${filename}`);
  const bytes = fs.readFileSync(source);
  const receipt = JSON.parse(bytes.toString('utf8'));
  if (bytes.length !== expected.bytes || sha256(bytes) !== expected.sha256 ||
      receipt.canonicalPayloadSha256 !== expected.canonicalPayloadSha256) {
    throw new Error(`cm2124_receipt_identity_mismatch:${filename}`);
  }
  return { bytes, receipt };
}

function receiptIdentity(outputPath, sourceFilename, value) {
  return {
    sourceFilename,
    outputPath,
    gitMode: '100644',
    blobOid: gitBlobOid(value.bytes),
    bytes: value.bytes.length,
    sha256: sha256(value.bytes),
    canonicalPayloadSha256: value.receipt.canonicalPayloadSha256,
    artifactType: value.receipt.artifactType
  };
}

function renderMarkdown(manifest, jsonText) {
  return [
    '# CM-2124 Status-sync Receipt Freeze Manifest',
    '',
    `Canonical payload SHA-256: \`${manifest.canonicalPayloadSha256}\``,
    '',
    'This manifest freezes the exact CM-2122-R2 execution and binding receipts',
    'after one successful detached status-sync commit. It does not update the',
    'target branch, authorize Branch CAS, perform a remote action, or claim readiness.',
    '',
    '## Exact JSON mirror',
    '',
    '```json',
    jsonText.trimEnd(),
    '```',
    ''
  ].join('\n');
}

async function buildFreezeArtifacts() {
  assertSafeGitEnvironment();
  if (gitText(['status', '--porcelain']) !== '') throw new Error('cm2124_clean_worktree_required');
  if (gitText(['branch', '--show-current']) !== '') throw new Error('cm2124_detached_worktree_required');
  if (gitText(['rev-parse', 'HEAD^{commit}']) !== DETACHED_STATUS_COMMIT ||
      gitText(['rev-parse', 'HEAD^{tree}']) !== DETACHED_STATUS_TREE ||
      gitText(['show-ref', '--hash', '--verify', FUTURE_BRANCH_REF]) !== FINAL_RELEASE_COMMIT) {
    throw new Error('cm2124_exact_status_commit_and_target_branch_required');
  }
  for (const output of Object.values(OUTPUTS)) {
    if (fs.existsSync(output)) throw new Error(`cm2124_output_already_exists:${output}`);
  }
  const options = resolverOptions();
  const packetEvidence = intakeExecutionPacket({ packetCommit: PACKET_COMMIT, ...options });
  if (!packetEvidence.accepted) throw new Error(`cm2124_packet_rejected:${packetEvidence.blockers.join(',')}`);
  const finalReleaseEvidence = intakeFinalReleaseDecision({
    finalReleaseCommit: FINAL_RELEASE_COMMIT,
    packetEvidence,
    now: new Date(),
    ...options
  });
  if (!finalReleaseEvidence.accepted) throw new Error(`cm2124_final_release_rejected:${finalReleaseEvidence.blockers.join(',')}`);
  const bindingHash = buildClaimBindingHash({ packetEvidence, finalReleaseEvidence });
  const root = resolveFixedGovernanceRoot();
  const registry = new Cm2122StatusSyncClaimRegistry({ governanceRoot: root });
  const claim = await registry.read(bindingHash, finalReleaseEvidence);
  if (claim.state !== 'CONSUMED_SUCCESS_DETACHED_COMMIT_BOUND_AWAITING_REF_DECISION' ||
      claim.detachedStatusCommit !== DETACHED_STATUS_COMMIT || claim.detachedStatusTree !== DETACHED_STATUS_TREE ||
      claim.branchRefUpdateCount !== 0 || claim.authorizationReplayAllowed !== false) {
    throw new Error('cm2124_claim_state_rejected');
  }
  const execution = readExactReceipt(root, EXECUTION_RECEIPT_FILENAME, EXPECTED.execution);
  const binding = readExactReceipt(root, BINDING_RECEIPT_FILENAME, EXPECTED.binding);
  const executionEvaluation = evaluateExecutionReceipt(execution.receipt, { packetEvidence, finalReleaseEvidence });
  if (!executionEvaluation.accepted) throw new Error(`cm2124_execution_receipt_rejected:${executionEvaluation.blockers.join(',')}`);
  const detachedBinding = verifyDetachedCommitBinding({
    detachedCommit: DETACHED_STATUS_COMMIT,
    packetEvidence,
    finalReleaseEvidence,
    ...options
  });
  if (!detachedBinding.accepted) throw new Error(`cm2124_detached_binding_rejected:${detachedBinding.blockers.join(',')}`);
  const preBindingClaim = {
    ...claim,
    state: 'EXECUTION_RECEIPT_WRITTEN',
    bindingReceiptCreated: false,
    bindingReceiptSha256: null,
    reconciliationRequired: true
  };
  const bindingEvaluation = evaluateBindingReceipt(binding.receipt, {
    detachedBinding,
    executionReceipt: execution.receipt,
    claimEnvelope: preBindingClaim,
    packetEvidence,
    finalReleaseEvidence
  });
  if (!bindingEvaluation.accepted) throw new Error(`cm2124_binding_receipt_rejected:${bindingEvaluation.blockers.join(',')}`);
  const durable = await evaluateDurableDetachedBinding({
    contentDecisionCommit: CONTENT_DECISION_FREEZE.commit,
    packetCommit: PACKET_COMMIT,
    finalReleaseCommit: FINAL_RELEASE_COMMIT
  });
  if (!durable.accepted || durable.detachedStatusCommit !== DETACHED_STATUS_COMMIT) {
    throw new Error(`cm2124_durable_binding_rejected:${durable.blockers.join(',')}`);
  }
  const payload = {
    freezeReference: 'CM-2124-STATUS-SYNC-RECEIPT-FREEZE-EB016872-8D3AEFD3-5CE9D65A',
    contentDecisionCommit: CONTENT_DECISION_FREEZE.commit,
    executionPacketCommit: PACKET_COMMIT,
    finalReleaseCommit: FINAL_RELEASE_COMMIT,
    detachedStatusCommit: DETACHED_STATUS_COMMIT,
    detachedStatusTree: DETACHED_STATUS_TREE,
    detachedStatusParent: FINAL_RELEASE_COMMIT,
    targetBranchRef: FUTURE_BRANCH_REF,
    targetBranchObservedOid: FINAL_RELEASE_COMMIT,
    executionReceipt: receiptIdentity(OUTPUTS.execution, EXECUTION_RECEIPT_FILENAME, execution),
    bindingReceipt: receiptIdentity(OUTPUTS.binding, BINDING_RECEIPT_FILENAME, binding),
    claim: {
      claimId: claim.claimId,
      bindingHash: claim.bindingHash,
      finalState: claim.state,
      authorizationUseCount: claim.authorizationUseCount,
      authorizationConsumed: claim.authorizationConsumed,
      authorizationReplayAllowed: claim.authorizationReplayAllowed,
      detachedCommitInvocationCount: claim.detachedCommitInvocationCount,
      branchRefUpdateCount: claim.branchRefUpdateCount
    },
    verification: {
      executionReceiptAccepted: true,
      bindingReceiptAccepted: true,
      durableDetachedBindingAccepted: true,
      exactNineModifiedPaths: true
    },
    currentState: {
      detachedStatusCommitBound: true,
      branchRefUpdated: false,
      statusSyncPerformed: false,
      currentBranchStatusSynchronized: false,
      readinessClaimed: false,
      remoteActions: 0,
      nativeReads: 0,
      nativeWrites: 0,
      providerCalls: 0,
      realMemoryReads: 0
    }
  };
  const manifest = {
    schemaVersion: 1,
    taskId: 'CM-2124',
    artifactType: 'cm2124_status_sync_receipt_freeze_manifest_v1',
    canonicalPayloadSha256: sha256Canonical(payload),
    payload
  };
  return { execution, binding, manifest };
}

async function main(argv = process.argv.slice(2)) {
  parseArgs(argv);
  const artifacts = await buildFreezeArtifacts();
  const manifestText = serializeArtifact(artifacts.manifest);
  const markdownText = renderMarkdown(artifacts.manifest, manifestText);
  fs.writeFileSync(OUTPUTS.execution, artifacts.execution.bytes, { flag: 'wx' });
  fs.writeFileSync(OUTPUTS.binding, artifacts.binding.bytes, { flag: 'wx' });
  fs.writeFileSync(OUTPUTS.manifest, manifestText, { flag: 'wx' });
  fs.writeFileSync(OUTPUTS.markdown, markdownText, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify({
    status: 'PASS_RECEIPTS_FROZEN',
    freezeReference: artifacts.manifest.payload.freezeReference,
    manifestPayloadSha256: artifacts.manifest.canonicalPayloadSha256,
    executionReceipt: artifacts.manifest.payload.executionReceipt,
    bindingReceipt: artifacts.manifest.payload.bindingReceipt,
    detachedStatusCommit: DETACHED_STATUS_COMMIT,
    targetBranchOid: FINAL_RELEASE_COMMIT,
    branchRefUpdated: false,
    readinessClaimed: false
  })}\n`);
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  DETACHED_STATUS_COMMIT,
  DETACHED_STATUS_TREE,
  EXPECTED,
  FINAL_RELEASE_COMMIT,
  OUTPUTS,
  PACKET_COMMIT,
  buildFreezeArtifacts,
  main,
  parseArgs,
  receiptIdentity,
  renderMarkdown
};
