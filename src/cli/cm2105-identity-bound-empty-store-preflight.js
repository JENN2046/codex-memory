#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const defaultFs = require('node:fs/promises');
const path = require('node:path');
const {
  IDENTITY_CANONICAL_BYTES,
  IDENTITY_CANONICAL_SHA256,
  IDENTITY_FILENAME,
  STORE_IDENTITY,
  STORE_ROOT_BINDING_CANONICAL_SHA256,
  expectedIdentityBytes
} = require('../core/Cm2102IdentityBoundRollbackLifecycleFoundation');
const {
  evaluateCm2102EmptyStorePreflightReceiptShape
} = require('../core/Cm2102IdentityBoundEmptyStorePreflightContract');
const {
  evaluateCm2103BootstrapReceipt
} = require('../core/Cm2103IdentityBoundStoreBootstrapReceiptContract');
const {
  verifyCm2103GovernanceRoot
} = require('../core/Cm2103IdentityBoundStoreGovernance');
const {
  evaluateCm2105PreflightDecisionIntake,
  isMachineBoundCm2105PreflightDecision
} = require('../core/Cm2105IdentityBoundEmptyStorePreflightDecisionIntake');

const PREFLIGHT_DECISION_PATH =
  'docs/near-model-memory-plan-pack/phase8_identity_bound_empty_store_preflight_decision_cm2105.json';
const BOOTSTRAP_RECEIPT_PATH =
  'docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_execution_receipt_cm2104.json';

const BOOTSTRAP_RECEIPT_BINDING = Object.freeze({
  authorizationContentDecisionReference: 'CM-2104-ER-IDENTITY-BOUND-STORE-BOOTSTRAP-CONTENT-0A7CEB6C-017307C9',
  authorizationContentDecisionSourceCommit: 'e2000e4d823cdbbf53152a27aa0122131fb34eb9',
  authorizationContentDecisionBlobOid: 'b460ad94ed6b66c7c7e38ca2732ee907aea6c8bf',
  authorizationContentDecisionSha256: '2414b28a3474984f81fd50769c07da2461d5f5d9ac1801f2e601f9ff56ccfbb3',
  finalExecutionReleaseDecisionReference: 'CM-2104-ER-IDENTITY-BOUND-STORE-BOOTSTRAP-FINAL-RELEASE-0A7CEB6C-017307C9',
  finalExecutionReleaseDecisionSourceCommit: 'd691fe25cc14cb42f778c0d993a6d7f2582a9068',
  finalExecutionReleaseDecisionBlobOid: 'ed92d720b34124853d8329580a1d1102ea56be19',
  finalExecutionReleaseDecisionSha256: '6121eb25d34954cd15137788ab3e1775824c2695dd3e91a0a59e6d9c9a0b5ad2',
  executionPacketCommit: '9ba0800a6b4b401df0b72dac024bc6668602414b',
  executionPacketBlobOid: 'b0fa9da564b2628c33ca758b1e34f5879e0c5538',
  executionPacketSha256: 'f15ac74db5d34e806ae5fb90f70c76edec3ec07a9e3301326803ad8bbdf9d3e4',
  foundationDecisionReference: 'CM-2102-ER-20260711-FOUNDATION-PASS-NO-EXECUTION-D6CE7C74',
  foundationDecisionSourceCommit: '9f73db8c6d1b7cba1a24d262880c7d37b953d2a0',
  foundationDecisionBlobOid: 'ea628021d499fcc883a7489a8f93a6284fdb2164',
  foundationDecisionSha256: '9dfd43e3ad9dea0c072a181bf8ae7fd48b4e1c49e171936518972abd22d7a0dc',
  bootstrapRequestCommit: '0c80561ae6ce2145becf438624ffdd21d1a62726',
  bootstrapRequestBlobOid: 'a75b15ae7519b608338160b8ba52ede3e9ff832c',
  bootstrapRequestSha256: '2318692aec334acd75b54d9bdac71ada9a2c2d3d3255b76cf97a5095421927ad',
  implementationCommit: '2fdf97f1854964c88d244b731cc0b45f3102de92',
  implementationTree: 'a4e74f74871b663683bd6e26cbba9a21e3443dc4',
  bindingHash: '3fee174a66462f651a751a23b4ce2069293d20aaf0458303d66d843b651ea8aa',
  nonce: 'cm2102-identity-bound-store-bootstrap-001',
  receiptId: 'cm2102-identity-bound-store-bootstrap-receipt-001'
});

function git(args, options = {}) {
  return execFileSync('git', args, {
    encoding: options.buffer ? undefined : 'utf8',
    maxBuffer: 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hash40(value) {
  return typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
}

async function collectCm2105EmptyStorePreflight({
  storeRoot,
  decisionIdentity,
  filesystem = defaultFs
} = {}) {
  if (typeof storeRoot !== 'string' || !decisionIdentity) {
    throw new Error('cm2105_preflight_collector_configuration_invalid');
  }
  const storeStat = await filesystem.lstat(storeRoot);
  if (!storeStat.isDirectory() || storeStat.isSymbolicLink()) {
    throw new Error('cm2105_preflight_store_root_invalid');
  }
  const identityPath = path.join(storeRoot, IDENTITY_FILENAME);
  const identityStat = await filesystem.lstat(identityPath);
  if (!identityStat.isFile() || identityStat.isSymbolicLink()) {
    throw new Error('cm2105_preflight_identity_file_invalid');
  }
  const identity = await filesystem.readFile(identityPath);
  if (!identity.equals(expectedIdentityBytes()) || identity.length !== IDENTITY_CANONICAL_BYTES ||
      sha256(identity) !== IDENTITY_CANONICAL_SHA256) {
    throw new Error('cm2105_preflight_identity_binding_mismatch');
  }
  const entries = await filesystem.readdir(storeRoot, { withFileTypes: true });
  const identityEntries = entries.filter(entry => entry.name === IDENTITY_FILENAME &&
    entry.isFile() && !entry.isSymbolicLink());
  const markdownEntries = entries.filter(entry => entry.name.toLowerCase().endsWith('.md'));
  const unexpectedEntries = entries.filter(entry => entry.name !== IDENTITY_FILENAME);
  if (identityEntries.length !== 1 || markdownEntries.length !== 0 || unexpectedEntries.length !== 0) {
    throw new Error('cm2105_preflight_store_not_empty');
  }
  const expectedBinding = {
    preflightDecisionReference: decisionIdentity.decision.decisionReference,
    preflightDecisionCommit: decisionIdentity.commit,
    preflightDecisionBlobOid: decisionIdentity.blobOid,
    preflightDecisionSha256: decisionIdentity.sha256,
    bootstrapDecisionReference: decisionIdentity.decision.bootstrapDecisionReference,
    bootstrapDecisionCommit: decisionIdentity.decision.bootstrapDecisionCommit,
    bootstrapDecisionBlobOid: decisionIdentity.decision.bootstrapDecisionBlobOid,
    bootstrapDecisionSha256: decisionIdentity.decision.bootstrapDecisionSha256,
    bootstrapReceiptReviewReference: decisionIdentity.decision.bootstrapReceiptReviewReference,
    bootstrapReceiptCommit: decisionIdentity.decision.bootstrapReceiptCommit,
    bootstrapReceiptSha256: decisionIdentity.decision.bootstrapReceiptSha256,
    storeRootBindingSha256: decisionIdentity.decision.storeRootBindingSha256
  };
  const receipt = {
    schemaVersion: 1,
    taskId: 'CM-2102',
    receiptType: 'identity_bound_synthetic_store_empty_preflight_receipt',
    result: 'accepted',
    stage: 'pre_record_write',
    lifecycleReference: STORE_IDENTITY.lifecycleReference,
    storeReference: STORE_IDENTITY.storeReference,
    storeInstanceId: STORE_IDENTITY.storeInstanceId,
    storeRole: STORE_IDENTITY.storeRole,
    storeRootBindingSha256: STORE_ROOT_BINDING_CANONICAL_SHA256,
    identityFilename: IDENTITY_FILENAME,
    identityBytes: identity.length,
    identitySha256: sha256(identity),
    preflightDecisionReference: expectedBinding.preflightDecisionReference,
    preflightDecisionCommit: expectedBinding.preflightDecisionCommit,
    preflightDecisionBlobOid: expectedBinding.preflightDecisionBlobOid,
    preflightDecisionSha256: expectedBinding.preflightDecisionSha256,
    preflightAuthorizationUseCount: 1,
    preflightAuthorizationConsumed: true,
    preflightAuthorizationReplayAllowed: false,
    bootstrapDecisionReference: expectedBinding.bootstrapDecisionReference,
    bootstrapDecisionCommit: expectedBinding.bootstrapDecisionCommit,
    bootstrapDecisionBlobOid: expectedBinding.bootstrapDecisionBlobOid,
    bootstrapDecisionSha256: expectedBinding.bootstrapDecisionSha256,
    bootstrapReceiptReviewReference: expectedBinding.bootstrapReceiptReviewReference,
    bootstrapReceiptCommit: expectedBinding.bootstrapReceiptCommit,
    bootstrapReceiptSha256: expectedBinding.bootstrapReceiptSha256,
    bootstrapReceiptReviewPassed: true,
    storeIdentityMatched: true,
    syntheticStoreEmpty: true,
    observedMarkdownCount: markdownEntries.length,
    unexpectedEntries: unexpectedEntries.length,
    identityReadOperations: 1,
    directoryEnumerationOperations: 1,
    recordContentReadOperations: 0,
    nativeReadDelegationMode: 'off',
    nativeReadCalls: 0,
    nativeWritePerformed: false,
    recordMemoryCalls: 0,
    tombstoneMemoryCalls: 0,
    verifyOperations: 0,
    realMemoryRead: false,
    realMemoryModified: false,
    providerCalled: false,
    embeddingProviderCalled: false,
    localFallbackUsed: false,
    rawMemoryReturned: false,
    rawAuditReturned: false,
    rawPathDisclosed: false,
    readinessClaimed: false,
    rollbackDrillPassed: false,
    phase8Completed: false
  };
  const shape = evaluateCm2102EmptyStorePreflightReceiptShape({ receipt, expectedBinding });
  if (!shape.shapeAccepted) {
    throw new Error(`cm2105_preflight_receipt_shape_rejected:${shape.blockers.join(',')}`);
  }
  return { accepted: true, receipt, nativeActions: 0, rawPathDisclosed: false };
}

async function runFrozenCm2105Preflight(preflightDecisionCommit) {
  if (!hash40(preflightDecisionCommit)) {
    throw new Error('cm2105_preflight_decision_commit_required');
  }
  const head = git(['rev-parse', 'HEAD']).trim();
  const tree = git(['rev-parse', 'HEAD^{tree}']).trim();
  const clean = git(['status', '--porcelain']).trim() === '';
  let attached = false;
  try { git(['symbolic-ref', '-q', 'HEAD']); attached = true; } catch {}
  if (!clean || attached) throw new Error('cm2105_preflight_runtime_checkout_invalid');

  const decisionBytes = git(['show', `${preflightDecisionCommit}:${PREFLIGHT_DECISION_PATH}`], { buffer: true });
  const decisionBlobOid = git(['rev-parse', `${preflightDecisionCommit}:${PREFLIGHT_DECISION_PATH}`]).trim();
  const intake = evaluateCm2105PreflightDecisionIntake({
    decisionBytes,
    observedBinding: {
      decisionSourceCommit: preflightDecisionCommit,
      decisionBlobOid,
      decisionSha256: sha256(decisionBytes)
    },
    expectedBinding: {
      implementationCommit: head,
      implementationTree: tree,
      expectedExpiresAt: '2026-07-15T18:00:00+08:00'
    },
    now: new Date()
  });
  if (!intake.accepted || !isMachineBoundCm2105PreflightDecision(intake.decision)) {
    throw new Error(`cm2105_preflight_decision_intake_rejected:${intake.blockers.join(',')}`);
  }
  if (intake.decision.implementationCommit !== head || intake.decision.implementationTree !== tree) {
    throw new Error('cm2105_preflight_runtime_binding_mismatch');
  }

  const bootstrapReceiptBytes = git([
    'show', `${intake.decision.bootstrapReceiptCommit}:${BOOTSTRAP_RECEIPT_PATH}`
  ], { buffer: true });
  const bootstrapReceiptBlobOid = git([
    'rev-parse', `${intake.decision.bootstrapReceiptCommit}:${BOOTSTRAP_RECEIPT_PATH}`
  ]).trim();
  if (bootstrapReceiptBlobOid !== intake.decision.bootstrapReceiptBlobOid ||
      sha256(bootstrapReceiptBytes) !== intake.decision.bootstrapReceiptSha256) {
    throw new Error('cm2105_bootstrap_receipt_git_binding_mismatch');
  }
  const bootstrapReceipt = JSON.parse(bootstrapReceiptBytes.toString('utf8'));
  const bootstrapReview = evaluateCm2103BootstrapReceipt({
    receipt: bootstrapReceipt,
    expectedBinding: BOOTSTRAP_RECEIPT_BINDING
  });
  if (!bootstrapReview.acceptedAsBootstrapEvidence) {
    throw new Error(`cm2105_bootstrap_receipt_review_rejected:${bootstrapReview.blockers.join(',')}`);
  }

  const gitCommonDir = git(['rev-parse', '--git-common-dir']).trim();
  const governance = await verifyCm2103GovernanceRoot(gitCommonDir);
  return collectCm2105EmptyStorePreflight({
    storeRoot: governance.internalPaths.storeRoot,
    decisionIdentity: {
      decision: intake.decision,
      commit: preflightDecisionCommit,
      blobOid: decisionBlobOid,
      sha256: sha256(decisionBytes)
    }
  });
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (require.main === module) {
  runFrozenCm2105Preflight(argumentValue('--preflight-decision-commit'))
    .then(result => process.stdout.write(`${JSON.stringify(result)}\n`))
    .catch(error => {
      const message = String(error?.message || '');
      process.stderr.write(`${message.startsWith('cm2105_') ? message : 'cm2105_preflight_failed'}\n`);
      process.exitCode = 1;
    });
}

module.exports = {
  BOOTSTRAP_RECEIPT_BINDING,
  BOOTSTRAP_RECEIPT_PATH,
  PREFLIGHT_DECISION_PATH,
  collectCm2105EmptyStorePreflight,
  runFrozenCm2105Preflight
};
