#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  BINDING_RECEIPT_FILENAME,
  CONTENT_DECISION_FREEZE,
  EXECUTION_RECEIPT_FILENAME,
  evaluateDurableApplicationBinding
} = require('../src/core/Cm2118FullPlanApplicationExecution');
const {
  sha256Canonical
} = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');

const TASK_ID = 'CM-2120';
const PACKET_COMMIT = '02a78ef88d28ea6b71c11f9c7bdceb83323d38a0';
const FINAL_RELEASE_COMMIT = 'dd78a679bd2a2f86dd2865144465eda7cbbf6087';
const APPLICATION_COMMIT = '41097b0fb1118a47f3d16873a12a5e0fcc75a94b';
const APPLICATION_TREE = 'fecb13c4f55d634197feab94d1dec5f56575521a';
const BINDING_HASH = 'f0596fe77d1e1d9737bdbab8d2d1c5d20f9c9eae9fecb29597454520f5c8d635';

const RECEIPTS = Object.freeze([
  Object.freeze({
    sourceFilename: EXECUTION_RECEIPT_FILENAME,
    outputPath: 'docs/near-model-memory-plan-pack/cm2120_full_plan_application_execution_receipt.json',
    markdownPath: 'docs/near-model-memory-plan-pack/cm2120_full_plan_application_execution_receipt.md',
    artifactType: 'cm2118_full_plan_application_execution_receipt_v1',
    bytes: 7986,
    rawSha256: 'c6bca575cc7fce687b2452ec75d25cb6271bfd66214addd2390d1813bbca83fe',
    payloadSha256: '9e4761ace00edddfee62e2fd9663760bc2236110b807febc6a41a1b975f3ebef'
  }),
  Object.freeze({
    sourceFilename: BINDING_RECEIPT_FILENAME,
    outputPath: 'docs/near-model-memory-plan-pack/cm2120_full_plan_application_binding_receipt.json',
    markdownPath: 'docs/near-model-memory-plan-pack/cm2120_full_plan_application_binding_receipt.md',
    artifactType: 'cm2118_full_plan_application_commit_binding_receipt_v1',
    bytes: 7546,
    rawSha256: 'd5e610229545a1da55100bfb6e949d84bd8ffc59e207c5a9736281a3d9911fbb',
    payloadSha256: '1da21b7437e8accdb62a7d3f00320da74774e6f293ff4c384976b2d91cdc7fc6'
  })
]);

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function gitText(args, options = {}) {
  return execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options
  }).trim();
}

function parseArgs(argv) {
  if (argv.length !== 0) throw new Error('cm2120_receipt_freeze_no_arguments_allowed');
  return {};
}

function assertRepositoryBoundary() {
  if (path.resolve(gitText(['rev-parse', '--show-toplevel'])) !== path.resolve(process.cwd())) {
    throw new Error('cm2120_repository_root_required');
  }
  if (gitText(['status', '--porcelain']) !== '') throw new Error('cm2120_clean_worktree_required');
  execFileSync('git', ['merge-base', '--is-ancestor', FINAL_RELEASE_COMMIT, 'HEAD'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'ignore', 'pipe']
  });
  if (gitText(['rev-parse', `${APPLICATION_COMMIT}^{tree}`]) !== APPLICATION_TREE ||
      gitText(['rev-parse', `${APPLICATION_COMMIT}^`]) !== CONTENT_DECISION_FREEZE.commit) {
    throw new Error('cm2120_application_identity_mismatch');
  }
}

function resolveGovernanceRoot() {
  const commonDir = path.resolve(process.cwd(), gitText(['rev-parse', '--git-common-dir']));
  return path.join(commonDir, 'codex-memory-governance', 'phase8-one-shot-authorization-registries');
}

function readExactReceipt(root, expected) {
  const sourcePath = path.join(root, expected.sourceFilename);
  const stat = fs.lstatSync(sourcePath);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`cm2120_receipt_not_regular:${expected.sourceFilename}`);
  const bytes = fs.readFileSync(sourcePath);
  if (bytes.length !== expected.bytes || sha256(bytes) !== expected.rawSha256) {
    throw new Error(`cm2120_receipt_raw_identity_mismatch:${expected.sourceFilename}`);
  }
  let receipt;
  try { receipt = JSON.parse(bytes.toString('utf8')); } catch {
    throw new Error(`cm2120_receipt_json_invalid:${expected.sourceFilename}`);
  }
  if (receipt.artifactType !== expected.artifactType ||
      receipt.canonicalPayloadSha256 !== expected.payloadSha256 ||
      sha256Canonical(receipt.payload || {}) !== expected.payloadSha256 ||
      receipt.payload?.application?.commit !== APPLICATION_COMMIT ||
      receipt.payload?.application?.tree !== APPLICATION_TREE) {
    throw new Error(`cm2120_receipt_payload_identity_mismatch:${expected.sourceFilename}`);
  }
  const registry = receipt.payload?.registry || {};
  if (registry.bindingHash !== BINDING_HASH || registry.authorizationUseCount !== 1 ||
      registry.authorizationConsumed !== true || registry.authorizationReplayAllowed !== false ||
      registry.patchInvocationCount !== 1) {
    throw new Error(`cm2120_receipt_one_shot_boundary_mismatch:${expected.sourceFilename}`);
  }
  const state = receipt.payload?.candidateState || receipt.payload?.appliedState || {};
  if (state.statusSyncPerformed !== false ||
      Object.values(state.readiness || {}).some(value => value !== false)) {
    throw new Error(`cm2120_receipt_nonclaim_boundary_mismatch:${expected.sourceFilename}`);
  }
  const sideEffects = receipt.payload?.sideEffects || {};
  for (const field of ['nativeReads', 'nativeWrites', 'providerCalls', 'realMemoryReads', 'remoteActions', 'readinessClaims']) {
    if (sideEffects[field] !== 0) throw new Error(`cm2120_receipt_side_effect_boundary_mismatch:${field}`);
  }
  return { bytes, receipt };
}

function renderMarkdown(expected, bytes) {
  return [
    `# ${TASK_ID} Frozen ${expected.artifactType}`,
    '',
    `Raw bytes: \`${expected.bytes}\``,
    `Raw SHA-256: \`${expected.rawSha256}\``,
    `Canonical payload SHA-256: \`${expected.payloadSha256}\``,
    '',
    'This is a low-disclosure, byte-exact repository mirror of the governed',
    'receipt. It does not authorize status synchronization, native memory,',
    'provider, remote, release, deployment, cutover, or readiness actions.',
    '',
    '## Exact JSON mirror',
    '',
    '```json',
    bytes.toString('utf8').trimEnd(),
    '```',
    ''
  ].join('\n');
}

async function main(argv = process.argv.slice(2)) {
  parseArgs(argv);
  assertRepositoryBoundary();
  const durable = await evaluateDurableApplicationBinding({
    authorizationContentDecisionCommit: CONTENT_DECISION_FREEZE.commit,
    packetCommit: PACKET_COMMIT,
    finalReleaseCommit: FINAL_RELEASE_COMMIT
  });
  if (!durable.accepted || durable.applicationCommit !== APPLICATION_COMMIT ||
      durable.applicationTree !== APPLICATION_TREE || durable.fullPlanPackCompleted !== true ||
      durable.readinessClaimed !== false || durable.statusSyncAuthorized !== false) {
    throw new Error(`cm2120_durable_application_binding_rejected:${(durable.blockers || []).join(',')}`);
  }

  const governanceRoot = resolveGovernanceRoot();
  const frozen = RECEIPTS.map(expected => ({ expected, ...readExactReceipt(governanceRoot, expected) }));
  for (const { expected, bytes } of frozen) {
    if (fs.existsSync(expected.outputPath) || fs.existsSync(expected.markdownPath)) {
      throw new Error(`cm2120_freeze_target_exists:${expected.outputPath}`);
    }
  }
  for (const { expected, bytes } of frozen) {
    fs.writeFileSync(expected.outputPath, bytes, { flag: 'wx' });
    fs.writeFileSync(expected.markdownPath, renderMarkdown(expected, bytes), { flag: 'wx' });
  }
  process.stdout.write(`${JSON.stringify({
    status: 'PASS_RECEIPTS_FROZEN_AWAITING_COMMIT_REVIEW',
    applicationCommit: APPLICATION_COMMIT,
    applicationTree: APPLICATION_TREE,
    receipts: RECEIPTS.map(({ outputPath, bytes, rawSha256, payloadSha256 }) => ({
      outputPath, bytes, rawSha256, payloadSha256
    })),
    fullPlanPackCompletedEvidenceAccepted: true,
    statusSyncPerformed: false,
    readinessClaimed: false,
    nativeReads: 0,
    nativeWrites: 0,
    providerCalls: 0,
    realMemoryReads: 0,
    remoteActions: 0
  })}\n`);
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  APPLICATION_COMMIT,
  APPLICATION_TREE,
  BINDING_HASH,
  FINAL_RELEASE_COMMIT,
  PACKET_COMMIT,
  RECEIPTS,
  main,
  parseArgs,
  readExactReceipt,
  renderMarkdown
};
