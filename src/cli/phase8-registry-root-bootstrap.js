#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const DECISION_PATH = 'docs/near-model-memory-plan-pack/phase8_content_decision_cm2093.json';
const EXPECTED_DECISION_REFERENCE = 'CM-2093-ER-20260711-CONTENT-ROOT-BOOTSTRAP-PASS-240FD4F7';
const ROOT_IDENTITY_BYTES = Buffer.from('{"registryRootInstanceId":"cm2093-phase8-governance-root-instance-001","registryRootReference":"codex-memory-phase8-governance-root","registryRootReinitializationAllowed":false,"registryRootReplacementAllowed":false}');
const ROOT_IDENTITY_SHA256 = '240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function git(args, options = {}) {
  return execFileSync('git', args, { encoding: options.encoding || 'utf8', maxBuffer: 1024 * 1024 });
}

async function bootstrapPhase8RegistryRoot(decisionSourceCommit) {
  if (!/^[a-f0-9]{40}$/.test(decisionSourceCommit || '')) throw new Error('decision_source_commit_required');
  const head = git(['rev-parse', 'HEAD']).trim();
  const clean = git(['status', '--porcelain']).trim() === '';
  if (head !== decisionSourceCommit || !clean) throw new Error('decision_checkout_binding_mismatch');

  const decisionBytes = Buffer.from(execFileSync('git', ['show', `${decisionSourceCommit}:${DECISION_PATH}`], { maxBuffer: 1024 * 1024 }));
  const decisionBlobOid = git(['rev-parse', `${decisionSourceCommit}:${DECISION_PATH}`]).trim();
  const decision = JSON.parse(decisionBytes.toString('utf8'));
  if (decision.decisionReference !== EXPECTED_DECISION_REFERENCE ||
      decision.authorizationContentApproved !== true ||
      decision.registryRootBootstrapAuthorized !== true ||
      decision.registryRootIdentitySha256 !== ROOT_IDENTITY_SHA256 ||
      decision.phase8NativeWriteAuthorized !== false ||
      decision.nativeWriteMayExecute !== false ||
      decision.finalExecutionReleaseReviewRequired !== true) {
    throw new Error('content_decision_binding_mismatch');
  }
  if (sha256(ROOT_IDENTITY_BYTES) !== ROOT_IDENTITY_SHA256 || ROOT_IDENTITY_BYTES.length !== 216) {
    throw new Error('registry_root_identity_constant_mismatch');
  }

  const gitCommonDir = path.resolve(git(['rev-parse', '--git-common-dir']).trim());
  const governanceRoot = path.join(gitCommonDir, 'codex-memory-governance', 'phase8-one-shot-authorization-registries');
  const identityPath = path.join(governanceRoot, '.phase8-registry-root-identity.json');
  await fs.mkdir(governanceRoot, { recursive: true });
  const entries = await fs.readdir(governanceRoot);
  if (entries.length !== 0) throw new Error('registry_root_not_empty_or_identity_already_exists');
  await fs.writeFile(identityPath, ROOT_IDENTITY_BYTES, { flag: 'wx' });
  const observedBytes = await fs.readFile(identityPath);
  if (observedBytes.length !== 216 || sha256(observedBytes) !== ROOT_IDENTITY_SHA256) {
    throw new Error('registry_root_identity_post_write_mismatch');
  }
  return {
    accepted: true,
    decisionReference: EXPECTED_DECISION_REFERENCE,
    decisionSourceCommit,
    decisionBlobOid,
    decisionPayloadSha256: sha256(decisionBytes),
    registryRootReference: 'codex-memory-phase8-governance-root',
    registryRootIdentityBytes: observedBytes.length,
    registryRootIdentitySha256: sha256(observedBytes),
    authorizationUseCount: 1,
    authorizationConsumed: true,
    replayAllowed: false,
    nonceClaimed: false,
    receiptCreated: false,
    nativeWritePerformed: false,
    verifyPerformed: false,
    realMemoryReadPerformed: false
  };
}

if (require.main === module) {
  const index = process.argv.indexOf('--decision-source-commit');
  bootstrapPhase8RegistryRoot(index >= 0 ? process.argv[index + 1] : null)
    .then(result => process.stdout.write(`${JSON.stringify(result)}\n`))
    .catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}

module.exports = {
  DECISION_PATH,
  EXPECTED_DECISION_REFERENCE,
  ROOT_IDENTITY_BYTES,
  ROOT_IDENTITY_SHA256,
  bootstrapPhase8RegistryRoot
};
