#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  buildRuntimeIdentity,
  buildStoreIdentity,
  canonicalBytes,
  executeCm2113OwnerRuntimeBootstrap
} = require('../core/Cm2113VcpToolBoxOwnerRuntimeBootstrap');
const { sha256 } = require('../core/VcpToolBoxDailyNoteOwnerRuntimeAdapter');

const BOOTSTRAP_DECISION_PATH = 'docs/near-model-memory-plan-pack/phase8_vcptoolbox_owner_runtime_bootstrap_decision_cm2113.json';
const BOOTSTRAP_RECEIPT_FILENAME = 'cm2113-vcptoolbox-owner-runtime-bootstrap-receipt.json';

function git(args, options = {}) {
  return execFileSync('git', args, {
    cwd: options.cwd || process.cwd(),
    encoding: options.encoding || 'utf8',
    maxBuffer: 2 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function gitBytes(commit, file, cwd = process.cwd()) {
  return Buffer.from(git(['show', `${commit}:${file}`], { cwd, encoding: 'buffer' }));
}

function gitIdentity(commit, file, cwd = process.cwd()) {
  const bytes = gitBytes(commit, file, cwd);
  return {
    sourceCommit: commit,
    blobOid: git(['rev-parse', `${commit}:${file}`], { cwd }).trim(),
    bytes: bytes.length,
    sha256: sha256(bytes),
    rawBytes: bytes
  };
}

function exactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

function decisionAccepted(decision, now = new Date()) {
  const keys = [
    'action', 'approvedAt', 'authorizationReplayAllowed', 'authorizationUseCount',
    'bootstrapAuthorized', 'decisionReference', 'expiresAt', 'governanceRootIdentitySha256',
    'implementation', 'lifecycleReference', 'nativeMemoryAuthorized', 'nonClaims',
    'ownerRuntime', 'preloadSha256', 'runtimeIdentitySha256', 'schemaVersion',
    'storeIdentitySha256', 'storeInstanceId', 'storeReference', 'taskId'
  ];
  const nonClaimKeys = [
    'nativeWritePerformed', 'phase8Completed', 'readinessClaimed', 'recordMemoryCalled'
  ];
  const implementationKeys = ['commit', 'tree'];
  const ownerRuntimeKeys = [
    'owner', 'component', 'communication', 'runtimeSourceCommit', 'runtimeSourceTree',
    'pluginBlobOid', 'manifestBlobOid', 'pluginSha256', 'manifestSha256',
    'dependencyLockBlobOid', 'dependencyLockSha256', 'dotenvVersion',
    'dotenvPackageSha256', 'dotenvMainSha256'
  ];
  const nowMs = new Date(now).getTime();
  const approvedAt = Date.parse(decision?.approvedAt || '');
  const expiresAt = Date.parse(decision?.expiresAt || '');
  return exactKeys(decision, keys) &&
    exactKeys(decision.implementation, implementationKeys) &&
    exactKeys(decision.ownerRuntime, ownerRuntimeKeys) &&
    exactKeys(decision.nonClaims, nonClaimKeys) &&
    decision.schemaVersion === 1 && decision.taskId === 'CM-2113' &&
    decision.action === 'initialize_vcptoolbox_owner_runtime_and_synthetic_store' &&
    decision.bootstrapAuthorized === true && decision.nativeMemoryAuthorized === false &&
    decision.authorizationUseCount === 1 && decision.authorizationReplayAllowed === false &&
    Number.isFinite(nowMs) && Number.isFinite(approvedAt) && Number.isFinite(expiresAt) &&
    approvedAt <= nowMs && nowMs < expiresAt && approvedAt < expiresAt &&
    decision.nonClaims?.nativeWritePerformed === false &&
    decision.nonClaims?.recordMemoryCalled === false &&
    decision.nonClaims?.phase8Completed === false &&
    decision.nonClaims?.readinessClaimed === false;
}

async function runCm2113OwnerRuntimeBootstrap(decisionCommit) {
  if (!/^[a-f0-9]{40}$/.test(decisionCommit || '')) throw new Error('cm2113_bootstrap_decision_commit_required');
  const decisionIdentity = gitIdentity(decisionCommit, BOOTSTRAP_DECISION_PATH);
  const decision = JSON.parse(decisionIdentity.rawBytes.toString('utf8'));
  if (!decisionAccepted(decision)) throw new Error('cm2113_bootstrap_decision_rejected');
  const head = git(['rev-parse', 'HEAD']).trim();
  const tree = git(['show', '-s', '--format=%T', 'HEAD']).trim();
  const clean = git(['status', '--porcelain']).trim() === '';
  if (head !== decision.implementation.commit || tree !== decision.implementation.tree || !clean) {
    throw new Error('cm2113_bootstrap_runtime_checkout_mismatch');
  }
  const common = path.resolve(git(['rev-parse', '--git-common-dir']).trim());
  const governanceRoot = path.join(common, 'codex-memory-governance');
  const authorizationRegistryRoot = path.join(governanceRoot, 'phase8-one-shot-authorization-registries');
  const governanceIdentityPath = path.join(authorizationRegistryRoot, '.phase8-registry-root-identity.json');
  const governanceIdentityStat = await fs.lstat(governanceIdentityPath);
  if (!governanceIdentityStat.isFile() || governanceIdentityStat.isSymbolicLink()) {
    throw new Error('cm2113_bootstrap_governance_identity_invalid');
  }
  const governanceRootIdentityBytes = await fs.readFile(governanceIdentityPath);
  if (sha256(governanceRootIdentityBytes) !== decision.governanceRootIdentitySha256) {
    throw new Error('cm2113_bootstrap_governance_identity_mismatch');
  }
  const vcpRepo = path.resolve(process.cwd(), '../../runtime/VCPToolBox');
  const owner = decision.ownerRuntime;
  if (
    git(['rev-parse', 'HEAD'], { cwd: vcpRepo }).trim() !== owner.runtimeSourceCommit ||
    git(['show', '-s', '--format=%T', 'HEAD'], { cwd: vcpRepo }).trim() !== owner.runtimeSourceTree
  ) throw new Error('cm2113_bootstrap_vcptoolbox_source_mismatch');
  const pluginBytes = gitBytes('HEAD', 'Plugin/DailyNote/dailynote.js', vcpRepo);
  const manifestBytes = gitBytes('HEAD', 'Plugin/DailyNote/plugin-manifest.json', vcpRepo);
  const lockBytes = gitBytes('HEAD', 'package-lock.json', vcpRepo);
  for (const [file, bytes, blobOid, expectedSha] of [
    ['Plugin/DailyNote/dailynote.js', pluginBytes, owner.pluginBlobOid, owner.pluginSha256],
    ['Plugin/DailyNote/plugin-manifest.json', manifestBytes, owner.manifestBlobOid, owner.manifestSha256],
    ['package-lock.json', lockBytes, owner.dependencyLockBlobOid, owner.dependencyLockSha256]
  ]) {
    if (git(['rev-parse', `HEAD:${file}`], { cwd: vcpRepo }).trim() !== blobOid || sha256(bytes) !== expectedSha) {
      throw new Error('cm2113_bootstrap_vcptoolbox_object_mismatch');
    }
  }
  const dotenvPackageBytes = await fs.readFile(path.join(vcpRepo, 'node_modules', 'dotenv', 'package.json'));
  const dotenvMainBytes = await fs.readFile(path.join(vcpRepo, 'node_modules', 'dotenv', 'lib', 'main.js'));
  if (
    sha256(dotenvPackageBytes) !== owner.dotenvPackageSha256 ||
    sha256(dotenvMainBytes) !== owner.dotenvMainSha256
  ) throw new Error('cm2113_bootstrap_dependency_mismatch');
  const preloadBytes = await fs.readFile(path.join(process.cwd(), 'src/runtime/cm2113-frozen-clock-preload.js'));
  if (sha256(preloadBytes) !== decision.preloadSha256) throw new Error('cm2113_bootstrap_preload_mismatch');
  const binding = {
    ...owner,
    preloadSha256: decision.preloadSha256,
    lifecycleReference: decision.lifecycleReference,
    storeReference: decision.storeReference,
    storeInstanceId: decision.storeInstanceId
  };
  if (
    sha256(canonicalBytes(buildRuntimeIdentity(binding))) !== decision.runtimeIdentitySha256 ||
    sha256(canonicalBytes(buildStoreIdentity(binding))) !== decision.storeIdentitySha256
  ) throw new Error('cm2113_bootstrap_identity_binding_mismatch');
  const receipt = await executeCm2113OwnerRuntimeBootstrap({
    governanceRoot,
    authorizationRegistryRoot,
    governanceRootIdentityBytes,
    ownerSource: { pluginBytes, manifestBytes },
    preloadBytes,
    binding,
    expected: {
      governanceRootIdentitySha256: decision.governanceRootIdentitySha256,
      runtimeIdentitySha256: decision.runtimeIdentitySha256,
      storeIdentitySha256: decision.storeIdentitySha256
    },
    authorization: { authorized: true, useCount: 1, replayAllowed: false }
  });
  const fullReceipt = {
    ...receipt,
    bootstrapDecisionGitIdentity: {
      sourceCommit: decisionIdentity.sourceCommit,
      blobOid: decisionIdentity.blobOid,
      bytes: decisionIdentity.bytes,
      sha256: decisionIdentity.sha256
    }
  };
  const receiptPath = path.join(governanceRoot, 'cm2113-vcptoolbox-owner-native-proof', BOOTSTRAP_RECEIPT_FILENAME);
  await fs.writeFile(receiptPath, JSON.stringify(fullReceipt), { flag: 'wx' });
  return fullReceipt;
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (require.main === module) {
  runCm2113OwnerRuntimeBootstrap(arg('--decision-commit'))
    .then(receipt => process.stdout.write(`${JSON.stringify(receipt)}\n`))
    .catch(error => {
      process.stderr.write(`${String(error?.message || '').startsWith('cm2113_') ? error.message : 'cm2113_bootstrap_failed'}\n`);
      process.exitCode = 1;
    });
}

module.exports = {
  BOOTSTRAP_DECISION_PATH,
  BOOTSTRAP_RECEIPT_FILENAME,
  decisionAccepted,
  runCm2113OwnerRuntimeBootstrap
};
