'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { verifyCm2103GovernanceRoot } = require('../core/Cm2103IdentityBoundStoreGovernance');
const {
  CASE_IDS,
  buildCm2097CaseManifest,
  validateCm2097CaseManifest
} = require('../core/Cm2097IsolatedFailureRecoveryHarness');
const {
  HARNESS_ROOT_DIRECTORY,
  evaluateFailureRecoveryReceipt,
  executeIsolatedFailureRecoveryHarness
} = require('../core/Cm2109IsolatedFailureRecoveryExecution');

const PACKET_PATH = 'docs/near-model-memory-plan-pack/phase8_failure_recovery_execution_packet_cm2109.json';
const DECISION_PATH = 'docs/near-model-memory-plan-pack/phase8_failure_recovery_execution_decision_cm2109.json';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function git(args, options = {}) {
  return execFileSync('git', args, { cwd: options.cwd || process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function exactGitBytes(commit, filePath) {
  return Buffer.from(execFileSync('git', ['show', `${commit}:${filePath}`], { cwd: process.cwd(), encoding: 'buffer', stdio: ['ignore', 'pipe', 'pipe'] }));
}

function exactGitBlobOid(commit, filePath) {
  return git(['rev-parse', `${commit}:${filePath}`]).trim();
}

function validatePacket(packet = {}, observed = {}) {
  const blockers = [];
  if (packet.schemaVersion !== 1 || packet.taskId !== 'CM-2109' || packet.packetType !== 'isolated_three_case_failure_recovery_execution_packet') blockers.push('packet.identity');
  if (packet.packetDoesNotAuthorizeExecution !== true || packet.executionAuthorizedAtPacketFreeze !== false) blockers.push('packet.authority');
  if (packet.implementationCommit !== observed.runtimeCommit || packet.implementationTree !== observed.runtimeTree) blockers.push('packet.runtime');
  if (packet.expectedDecisionReference !== 'CM-2109-SELF-ISOLATED-FAILURE-RECOVERY-EXECUTION') blockers.push('packet.expectedDecisionReference');
  if (packet.harnessRootDirectory !== HARNESS_ROOT_DIRECTORY || packet.callerPathOverrideAllowed !== false || packet.environmentPathOverrideAllowed !== false) blockers.push('packet.harnessRoot');
  if (!Array.isArray(packet.caseManifests) || packet.caseManifests.length !== 3) blockers.push('packet.caseManifests');
  for (let index = 0; index < CASE_IDS.length; index += 1) {
    const binding = packet.caseManifests?.[index];
    if (binding?.caseId !== CASE_IDS[index] || binding?.blobOid !== observed.manifestBindings?.[index]?.blobOid || binding?.bytes !== observed.manifestBindings?.[index]?.bytes || binding?.sha256 !== observed.manifestBindings?.[index]?.sha256) blockers.push(`packet.caseManifests.${CASE_IDS[index]}`);
  }
  const exactCounts = { maxHarnessRuns: 1, maxClaimCount: 2, maxNativeWriteCalls: 1, maxDurableWrites: 1, maxRetryCount: 0, maxRollbackCount: 0, maxCompensationCount: 0 };
  for (const [field, expected] of Object.entries(exactCounts)) if (packet[field] !== expected) blockers.push(`packet.${field}`);
  for (const field of ['usesCm2094LiveAuthorization', 'usesCm2094Nonce', 'usesCm2094RegistryClaim', 'modifiesCm2094Record', 'productionProviderAllowed', 'realMemoryAllowed', 'localFallbackAllowed', 'defaultMcpExpansionAllowed', 'readinessClaimAllowed']) if (packet[field] !== false) blockers.push(`packet.${field}`);
  for (const field of ['failureRecoveryProofPassedAtPacketFreeze', 'phase8CompletedAtPacketFreeze']) if (packet[field] !== false) blockers.push(`packet.${field}`);
  return { accepted: blockers.length === 0, blockers };
}

function validateDecision(decision = {}, binding = {}) {
  const blockers = [];
  if (decision.schemaVersion !== 1 || decision.taskId !== 'CM-2109' || decision.decisionReference !== 'CM-2109-SELF-ISOLATED-FAILURE-RECOVERY-EXECUTION') blockers.push('decision.identity');
  if (decision.failureRecoveryExecutionAuthorized !== true || decision.authorizationUseCount !== 1 || decision.authorizationReplayAllowed !== false) blockers.push('decision.authority');
  for (const [field, expected] of Object.entries(binding)) if (decision[field] !== expected) blockers.push(`decision.${field}`);
  const expiry = Date.parse(decision.expiresAt || '');
  if (!Number.isFinite(expiry) || Date.now() >= expiry) blockers.push('decision.expiresAt');
  for (const field of ['productionProviderAuthorized', 'realMemoryAuthorized', 'cm2094AuthorizationReuseAuthorized', 'retryAuthorized', 'rollbackAuthorized', 'compensationAuthorized', 'defaultMcpExpansionAuthorized', 'readinessClaimAuthorized']) if (decision[field] !== false) blockers.push(`decision.${field}`);
  for (const field of ['failureRecoveryProofPassedByDecisionAlone', 'phase8CompletedByDecisionAlone']) if (decision[field] !== false) blockers.push(`decision.${field}`);
  return { accepted: blockers.length === 0, blockers };
}

async function runFrozenCm2109(packetCommit, decisionCommit) {
  if (!/^[a-f0-9]{40}$/.test(packetCommit || '')) throw new Error('cm2109_execution_packet_commit_required');
  if (!/^[a-f0-9]{40}$/.test(decisionCommit || '')) throw new Error('cm2109_execution_decision_commit_required');
  if (git(['status', '--porcelain']).trim() !== '') throw new Error('cm2109_clean_checkout_required');
  try {
    git(['symbolic-ref', '-q', '--short', 'HEAD']);
    throw new Error('cm2109_detached_checkout_required');
  } catch (error) {
    if (error.message === 'cm2109_detached_checkout_required') throw error;
  }
  const runtimeCommit = git(['rev-parse', 'HEAD']).trim();
  const runtimeTree = git(['rev-parse', 'HEAD^{tree}']).trim();
  const packetBytes = exactGitBytes(packetCommit, PACKET_PATH);
  const packetBlobOid = exactGitBlobOid(packetCommit, PACKET_PATH);
  const packet = JSON.parse(packetBytes.toString('utf8'));
  const manifestPaths = [
    'docs/near-model-memory-plan-pack/phase8_failure_case_pre_claim_cm2097.json',
    'docs/near-model-memory-plan-pack/phase8_failure_case_pre_commit_cm2097.json',
    'docs/near-model-memory-plan-pack/phase8_failure_case_ambiguous_post_commit_cm2097.json'
  ];
  const manifests = manifestPaths.map(filePath => JSON.parse(exactGitBytes(packet.manifestSourceCommit, filePath).toString('utf8')));
  const manifestBindings = manifestPaths.map(filePath => {
    const bytes = exactGitBytes(packet.manifestSourceCommit, filePath);
    return { blobOid: exactGitBlobOid(packet.manifestSourceCommit, filePath), bytes: bytes.length, sha256: sha256(bytes) };
  });
  for (const manifest of manifests) {
    const result = validateCm2097CaseManifest(manifest);
    if (!result.accepted) throw new Error('cm2109_case_manifest_intake_rejected');
  }
  const packetResult = validatePacket(packet, { runtimeCommit, runtimeTree, manifestBindings });
  if (!packetResult.accepted) throw new Error(`cm2109_packet_rejected:${packetResult.blockers.join(',')}`);
  const decisionBytes = exactGitBytes(decisionCommit, DECISION_PATH);
  const decisionBlobOid = exactGitBlobOid(decisionCommit, DECISION_PATH);
  const decision = JSON.parse(decisionBytes.toString('utf8'));
  const decisionBinding = {
    implementationCommit: runtimeCommit,
    implementationTree: runtimeTree,
    executionPacketCommit: packetCommit,
    executionPacketBlobOid: packetBlobOid,
    executionPacketSha256: sha256(packetBytes)
  };
  const decisionResult = validateDecision(decision, decisionBinding);
  if (!decisionResult.accepted) throw new Error(`cm2109_decision_rejected:${decisionResult.blockers.join(',')}`);
  const gitCommonDir = git(['rev-parse', '--git-common-dir']).trim();
  const governance = await verifyCm2103GovernanceRoot(gitCommonDir);
  const harnessRoot = path.join(governance.internalPaths.governanceParent, HARNESS_ROOT_DIRECTORY);
  const executionBinding = {
    implementationCommit: runtimeCommit,
    implementationTree: runtimeTree,
    executionPacketCommit: packetCommit,
    executionPacketBlobOid: packetBlobOid,
    executionPacketSha256: sha256(packetBytes),
    decisionReference: decision.decisionReference,
    decisionCommit,
    decisionBlobOid,
    decisionSha256: sha256(decisionBytes),
    governanceRootIdentitySha256: governance.governanceRootIdentitySha256
  };
  const receipt = await executeIsolatedFailureRecoveryHarness({ harnessRoot, executionBinding, manifests });
  const evaluated = evaluateFailureRecoveryReceipt(receipt, executionBinding);
  if (!evaluated.accepted) throw new Error(`cm2109_receipt_rejected:${evaluated.blockers.join(',')}`);
  return receipt;
}

function parseArgs(argv) {
  const value = key => {
    const index = argv.indexOf(key);
    return index === -1 ? null : argv[index + 1];
  };
  return { packetCommit: value('--execution-packet-commit'), decisionCommit: value('--decision-commit') };
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  runFrozenCm2109(args.packetCommit, args.decisionCommit)
    .then(result => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch(error => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    });
}

module.exports = { DECISION_PATH, PACKET_PATH, runFrozenCm2109, validateDecision, validatePacket };
