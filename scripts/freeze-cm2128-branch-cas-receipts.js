#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const execution = require('../src/core/Cm2126ExactBranchCasExecution');
const constants = require('../src/core/Cm2126ExactBranchCasConstants');
const {
  Cm2126ExactBranchCasClaimRegistry,
  SUCCESS_STATE,
  claimFileName
} = require('../src/core/Cm2126ExactBranchCasClaimRegistry');
const {
  evaluateExecutionReceipt
} = require('../src/core/Cm2126ExactBranchCasReceiptContract');
const {
  assertSafeGitEnvironment
} = require('../src/core/Cm2122FullPlanStatusSyncExecution');
const {
  sha256Canonical
} = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  gitBlobOid,
  sameJson,
  serializeArtifact
} = require('../src/core/Cm2117ExactFullPlanApplicationDecision');
const {
  gitText,
  resolveCommitTree,
  resolveDiffPaths,
  resolveParentCommit
} = require('./cm2115-r2-git');
const {
  resolverOptions
} = require('./generate-cm2116-exact-full-plan-application-gate');

const CONTENT_COMMIT = 'c4ff57c645a04f484f55a16efdd62bd40b4dc576';
const PACKET_COMMIT = '448d2a7193a5d1087d1da4c870103cae6ee9de14';
const FINAL_RELEASE_COMMIT = '043f31df0cfee4e11ed1afa0de86d496da5bfb05';
const FINAL_RELEASE_TREE = 'c66480bd2ccd24885e77eef98c5d3e1012748300';
const IMPLEMENTATION_DIFF_PATHS = Object.freeze([
  'scripts/freeze-cm2128-branch-cas-receipts.js',
  'scripts/review-cm2129-branch-cas-receipts.js',
  'tests/cm2128-cm2129-branch-cas-receipts.test.js'
].sort());
const IMPLEMENTATION_DIFF_ENTRIES = Object.freeze(
  IMPLEMENTATION_DIFF_PATHS.map(sourcePath => ({ status: 'A', path: sourcePath }))
);
const OUTPUTS = Object.freeze({
  claim: 'docs/near-model-memory-plan-pack/cm2128_branch_cas_claim_receipt.json',
  execution: 'docs/near-model-memory-plan-pack/cm2128_branch_cas_execution_receipt.json',
  manifest: 'docs/near-model-memory-plan-pack/cm2128_branch_cas_receipt_freeze_manifest.json',
  markdown: 'docs/near-model-memory-plan-pack/cm2128_branch_cas_receipt_freeze_manifest.md'
});
const EXPECTED = Object.freeze({
  claim: Object.freeze({
    bytes: 1645,
    sha256: '0ef4ef2bffdf7216f63578e3c793c562dfc59f43c36e654f60902d61bd1b813e'
  }),
  execution: Object.freeze({
    bytes: 25430,
    sha256: '907a2bead5b71d138b9dd521f99b1fe996aed30351f003abf11ab6dd0ff30c5a',
    canonicalPayloadSha256: '0ecb12e9bc141ae51180cba57e2c30066979e0a1e92d70a786a24e9d3a1af641'
  })
});
const FREEZE_VERIFICATION = Object.freeze({
  contentGitIntakeAccepted: true,
  packetGitIntakeAccepted: true,
  finalReleaseGitIntakeAccepted: true,
  claimMachineBindingAccepted: true,
  executionReceiptAccepted: true,
  durableExecutionAccepted: true,
  receiptHashMatchesClaim: true,
  exactTargetPostconditionsAccepted: true,
  lowDisclosureBoundaryAccepted: true
});
const CURRENT_BOUNDARY = Object.freeze({
  branchRefUpdated: true,
  targetWorktreeIndexSynchronized: true,
  targetWorktreeFilesSynchronized: true,
  currentBranchStatusSynchronized: true,
  fullPlanPackCompleted: true,
  additionalBranchRefUpdates: 0,
  additionalExecutionAttempts: 0,
  authorizationReplayAllowed: false,
  remoteActions: 0,
  nativeReads: 0,
  nativeWrites: 0,
  providerCalls: 0,
  realMemoryReads: 0,
  readinessClaimed: false
});

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function parseArgs(argv) {
  if (argv.length !== 0) throw new Error('cm2128_freeze_no_arguments_allowed');
}

function assertPathAbsent(entryPath) {
  try {
    fs.lstatSync(entryPath);
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  throw new Error(`cm2128_output_already_exists:${entryPath}`);
}

function assertLowDisclosure(value) {
  const stack = [value];
  while (stack.length) {
    const current = stack.pop();
    if (current && typeof current === 'object') {
      for (const [key, nestedValue] of Object.entries(current)) {
        stack.push(key, nestedValue);
      }
      continue;
    }
    if (typeof current !== 'string') continue;
    const normalizedPath = current.replace(/\\/g, '/');
    if (/^(?:file:|~)/i.test(normalizedPath) ||
        /^(?:[A-Za-z]:\/|\/)/.test(normalizedPath) ||
        /(?:^|\/)\.\.(?:\/|$)|(?:^|\/)\.git(?:\/|$)/.test(normalizedPath) ||
        /(?:^|\/)(?:\.env(?:\.[^/]*)?|data|logs|\.colameta|\.omc|\.claude|\.tmp)(?:\/|$)/.test(normalizedPath) ||
        /(?:BEGIN (?:RSA|OPENSSH|PRIVATE)|Bearer\s+[A-Za-z0-9._-]{20,}|sk-[A-Za-z0-9_-]{20,})/.test(current)) {
      throw new Error('cm2128_low_disclosure_string_boundary_failed');
    }
  }
  return true;
}

function assertCleanDetachedWorktree(gitRunner = gitText) {
  if (gitRunner(['status', '--porcelain', '--untracked-files=all']) !== '' ||
      gitRunner(['branch', '--show-current']) !== '') {
    throw new Error('cm2128_clean_detached_worktree_required');
  }
}

function readVerifiedFileSync(sourcePath, label, fileSystem = fs) {
  let descriptor;
  try {
    const pathStat = fileSystem.lstatSync(sourcePath);
    if (!pathStat.isFile() || pathStat.isSymbolicLink()) throw new Error('invalid');
    descriptor = fileSystem.openSync(
      sourcePath,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0)
    );
    const descriptorStat = fileSystem.fstatSync(descriptor);
    if (!descriptorStat.isFile() || descriptorStat.dev !== pathStat.dev || descriptorStat.ino !== pathStat.ino) {
      throw new Error('invalid');
    }
    return fileSystem.readFileSync(descriptor);
  } catch {
    throw new Error(`cm2128_${label}_source_invalid`);
  } finally {
    if (descriptor !== undefined) fileSystem.closeSync(descriptor);
  }
}

function readExactJson(sourcePath, expected, label) {
  const bytes = readVerifiedFileSync(sourcePath, label);
  const value = JSON.parse(bytes.toString('utf8'));
  if (bytes.length !== expected.bytes || sha256(bytes) !== expected.sha256) {
    throw new Error(`cm2128_${label}_identity_mismatch`);
  }
  assertLowDisclosure(value);
  return { bytes, value };
}

function receiptIdentity(outputPath, sourceFilename, artifact) {
  return {
    sourceFilename,
    outputPath,
    gitMode: '100644',
    blobOid: gitBlobOid(artifact.bytes),
    bytes: artifact.bytes.length,
    sha256: sha256(artifact.bytes),
    artifactType: artifact.value.artifactType || 'cm2126_exact_branch_cas_claim_envelope_v1',
    canonicalPayloadSha256: artifact.value.canonicalPayloadSha256 || null
  };
}

function gitIdentityWithoutContent(identity) {
  return {
    sourcePath: identity.sourcePath,
    sourceCommit: identity.sourceCommit,
    sourceTree: identity.sourceTree,
    gitMode: identity.gitMode,
    gitObjectType: identity.gitObjectType,
    blobOid: identity.blobOid,
    bytes: identity.bytes,
    sha256: identity.sha256
  };
}

function projectClaim(claim) {
  return {
    claimId: claim.claimId,
    bindingHash: claim.bindingHash,
    finalState: claim.state,
    authorizationUseCount: claim.authorizationUseCount,
    authorizationConsumed: claim.authorizationConsumed,
    authorizationReplayAllowed: claim.authorizationReplayAllowed,
    branchCasInvocationCount: claim.branchCasInvocationCount,
    branchRefCasAttempts: claim.branchRefCasAttempts,
    branchRefUpdates: claim.branchRefUpdates,
    targetIndexSyncAttempts: claim.targetIndexSyncAttempts,
    targetIndexSynchronizations: claim.targetIndexSynchronizations,
    targetFileSyncAttempts: claim.targetFileSyncAttempts,
    targetFileWriteSlotsConsumed: claim.targetFileWriteSlotsConsumed,
    targetFileSynchronizations: claim.targetFileSynchronizations,
    targetFilesMatchedCount: claim.targetFilesMatchedCount,
    verificationAttempts: claim.verificationAttempts,
    executionReceiptWriteAttempts: claim.executionReceiptWriteAttempts,
    executionReceiptWrites: claim.executionReceiptWrites,
    executionReceiptSha256: claim.executionReceiptSha256,
    terminalStateDurablyRecorded: claim.terminalStateDurablyRecorded,
    reconciliationRequired: claim.reconciliationRequired
  };
}

function projectExecutionReceipt(receipt) {
  return {
    otherRefsSnapshotBeforeSha256: receipt.payload.executionResult.otherRefsSnapshotBeforeSha256,
    otherRefsSnapshotAfterSha256: receipt.payload.executionResult.otherRefsSnapshotAfterSha256,
    otherRefUpdates: receipt.payload.executionResult.otherRefUpdates,
    prohibitedSideEffects: receipt.payload.prohibitedSideEffects,
    readiness: receipt.payload.currentBranchOutcome.readiness
  };
}

function renderMarkdown(manifest, jsonText) {
  return [
    '# CM-2128 Branch CAS Receipt Freeze Manifest',
    '',
    `Freeze reference: \`${manifest.payload.freezeReference}\``,
    `Canonical payload SHA-256: \`${manifest.canonicalPayloadSha256}\``,
    '',
    'This manifest freezes the exact low-disclosure one-shot claim envelope and',
    'Branch CAS execution receipt after the single approved local update. It does',
    'not replay the authorization, update another ref, perform a remote action,',
    'or claim production/release/deploy/cutover/readiness.',
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
  assertCleanDetachedWorktree();
  const options = resolverOptions();
  const implementationCommit = gitText(['rev-parse', 'HEAD^{commit}']);
  const implementationTree = resolveCommitTree(implementationCommit);
  const implementationParent = resolveParentCommit(implementationCommit);
  const implementationPaths = resolveDiffPaths(implementationParent, implementationCommit).sort();
  const implementationEntries = options.resolveDiffEntries(implementationParent, implementationCommit)
    .sort((left, right) => left.path.localeCompare(right.path));
  if (implementationParent !== FINAL_RELEASE_COMMIT || resolveCommitTree(implementationParent) !== FINAL_RELEASE_TREE ||
      !sameJson(implementationPaths, IMPLEMENTATION_DIFF_PATHS) ||
      !sameJson(implementationEntries, IMPLEMENTATION_DIFF_ENTRIES)) {
    throw new Error('cm2128_exact_implementation_lineage_required');
  }
  for (const outputPath of Object.values(OUTPUTS)) assertPathAbsent(outputPath);

  const implementationArtifacts = IMPLEMENTATION_DIFF_PATHS.map(sourcePath =>
    gitIdentityWithoutContent(options.resolveGitFile(implementationCommit, sourcePath))
  );
  const target = execution.deriveTargetWorktree(process.cwd());
  const packetEvidence = execution.intakeExecutionPacket({
    packetCommit: PACKET_COMMIT,
    targetWorktreeIdentity: target.publicIdentity,
    ...options
  });
  const frozenRelease = JSON.parse(options.resolveGitFile(
    FINAL_RELEASE_COMMIT,
    execution.FINAL_RELEASE_PATH
  ).content.toString('utf8'));
  const finalReleaseEvidence = execution.intakeFinalReleaseDecision({
    finalReleaseCommit: FINAL_RELEASE_COMMIT,
    packetEvidence,
    now: new Date(Date.parse(frozenRelease.payload.authorization.approvedAt) + 1),
    ...options
  });
  const contentEvidence = execution.intakeContentDecision(options);
  if (!contentEvidence.accepted || !packetEvidence.accepted || !finalReleaseEvidence.accepted) {
    throw new Error('cm2128_upstream_git_intake_rejected');
  }
  const bindingHash = execution.buildClaimBindingHash({ packetEvidence, finalReleaseEvidence });
  const release = execution.releaseBinding(packetEvidence, finalReleaseEvidence, bindingHash);
  const governanceRoot = execution.resolveFixedGovernanceRoot(process.cwd());
  const registry = new Cm2126ExactBranchCasClaimRegistry({ governanceRoot });
  const claim = await registry.read(bindingHash, release);
  const claimArtifact = readExactJson(
    path.join(governanceRoot, claimFileName()),
    EXPECTED.claim,
    'claim'
  );
  const executionArtifact = readExactJson(
    path.join(governanceRoot, execution.EXECUTION_RECEIPT_FILENAME),
    EXPECTED.execution,
    'execution_receipt'
  );
  if (!sameJson(claimArtifact.value, claim) || claim.state !== SUCCESS_STATE ||
      claim.authorizationUseCount !== 1 || claim.authorizationConsumed !== true ||
      claim.authorizationReplayAllowed !== false || claim.branchRefUpdates !== 1 ||
      claim.targetIndexSynchronizations !== 1 || claim.targetFileSynchronizations !== 9 ||
      claim.executionReceiptWrites !== 1 || claim.reconciliationRequired !== false ||
      claim.executionReceiptSha256 !== EXPECTED.execution.sha256 ||
      executionArtifact.value.canonicalPayloadSha256 !== EXPECTED.execution.canonicalPayloadSha256) {
    throw new Error('cm2128_claim_or_receipt_boundary_rejected');
  }
  const runtimeResult = {
    targetWorktreeIdentitySha256: executionArtifact.value.payload.exactTarget.targetWorktreeIdentitySha256,
    ...executionArtifact.value.payload.executionResult
  };
  const preReceiptClaim = {
    ...claim,
    state: 'EXECUTION_RECEIPT_WRITE_CONSUMED',
    executionReceiptWrites: null,
    executionReceiptSha256: null,
    terminalStateDurablyRecorded: false,
    reconciliationRequired: true
  };
  const receiptEvaluation = evaluateExecutionReceipt(executionArtifact.value, {
    packetEvidence,
    finalReleaseEvidence,
    claimEnvelope: preReceiptClaim,
    bindingHash,
    runtimeResult
  });
  const durable = await execution.evaluateDurableBranchCas({
    contentDecisionCommit: CONTENT_COMMIT,
    packetCommit: PACKET_COMMIT,
    finalReleaseCommit: FINAL_RELEASE_COMMIT
  });
  const after = execution.targetSnapshot(
    process.cwd(),
    target,
    packetEvidence.packet.payload.exactCasBoundary.targetBindings,
    'after'
  );
  if (!receiptEvaluation.accepted || !durable.accepted || after.ref !== constants.NEW_COMMIT ||
      after.head !== constants.NEW_COMMIT || after.symbolicRef !== constants.TARGET_REF ||
      after.indexTree !== constants.NEW_TREE || !after.indexPolicyMatched || !after.indexLockAbsent ||
      after.matchedFiles !== 9 || !after.clean ||
      executionArtifact.value.payload.executionResult.otherRefUpdates !== 0 ||
      Object.values(executionArtifact.value.payload.prohibitedSideEffects).some(value => value !== 0) ||
      Object.values(executionArtifact.value.payload.currentBranchOutcome.readiness).some(value => value !== false)) {
    throw new Error('cm2128_durable_execution_replay_rejected');
  }

  const payload = {
    freezeReference: 'CM-2128-BRANCH-CAS-RECEIPT-FREEZE-907A2BEA-0EF4EF2B',
    freezeImplementationCommit: implementationCommit,
    freezeImplementationTree: implementationTree,
    freezeImplementationParent: implementationParent,
    freezeImplementationDiffPaths: implementationPaths,
    freezeImplementationDiffEntries: implementationEntries,
    freezeImplementationArtifacts: implementationArtifacts,
    contentDecisionCommit: CONTENT_COMMIT,
    executionPacketCommit: PACKET_COMMIT,
    finalReleaseCommit: FINAL_RELEASE_COMMIT,
    targetRef: constants.TARGET_REF,
    targetCommit: constants.NEW_COMMIT,
    targetTree: constants.NEW_TREE,
    bindingHash,
    claimReceipt: receiptIdentity(OUTPUTS.claim, claimFileName(), claimArtifact),
    executionReceipt: receiptIdentity(
      OUTPUTS.execution,
      execution.EXECUTION_RECEIPT_FILENAME,
      executionArtifact
    ),
    claimProjection: projectClaim(claim),
    executionProjection: projectExecutionReceipt(executionArtifact.value),
    verification: FREEZE_VERIFICATION,
    currentBoundary: CURRENT_BOUNDARY
  };
  const manifest = {
    schemaVersion: 1,
    taskId: 'CM-2128',
    artifactType: 'cm2128_branch_cas_receipt_freeze_manifest_v1',
    canonicalPayloadSha256: sha256Canonical(payload),
    payload
  };
  assertLowDisclosure(manifest);
  return { claimArtifact, executionArtifact, manifest };
}

async function main(argv = process.argv.slice(2)) {
  parseArgs(argv);
  const artifacts = await buildFreezeArtifacts();
  const manifestText = serializeArtifact(artifacts.manifest);
  const markdownText = renderMarkdown(artifacts.manifest, manifestText);
  fs.writeFileSync(OUTPUTS.claim, artifacts.claimArtifact.bytes, { flag: 'wx' });
  fs.writeFileSync(OUTPUTS.execution, artifacts.executionArtifact.bytes, { flag: 'wx' });
  fs.writeFileSync(OUTPUTS.manifest, manifestText, { flag: 'wx' });
  fs.writeFileSync(OUTPUTS.markdown, markdownText, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify({
    status: 'PASS_BRANCH_CAS_RECEIPTS_FROZEN',
    freezeReference: artifacts.manifest.payload.freezeReference,
    manifestPayloadSha256: artifacts.manifest.canonicalPayloadSha256,
    claimReceipt: artifacts.manifest.payload.claimReceipt,
    executionReceipt: artifacts.manifest.payload.executionReceipt,
    targetCommit: constants.NEW_COMMIT,
    authorizationConsumed: true,
    authorizationReplayAllowed: false,
    additionalBranchRefUpdates: 0,
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
  CONTENT_COMMIT,
  CURRENT_BOUNDARY,
  EXPECTED,
  FINAL_RELEASE_COMMIT,
  FINAL_RELEASE_TREE,
  FREEZE_VERIFICATION,
  IMPLEMENTATION_DIFF_ENTRIES,
  IMPLEMENTATION_DIFF_PATHS,
  OUTPUTS,
  PACKET_COMMIT,
  assertCleanDetachedWorktree,
  assertLowDisclosure,
  buildFreezeArtifacts,
  gitIdentityWithoutContent,
  main,
  parseArgs,
  projectClaim,
  projectExecutionReceipt,
  readExactJson,
  readVerifiedFileSync,
  receiptIdentity,
  renderMarkdown,
  sha256
};
