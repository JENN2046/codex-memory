'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const {
  STORE_ROOT_BINDING_CANONICAL_SHA256,
  STORE_ROOT_DERIVATION,
  sha256Canonical
} = require('./Cm2102IdentityBoundRollbackLifecycleFoundation');

const GOVERNANCE_ROOT_IDENTITY = Object.freeze({
  registryRootInstanceId: 'cm2093-phase8-governance-root-instance-001',
  registryRootReference: 'codex-memory-phase8-governance-root',
  registryRootReinitializationAllowed: false,
  registryRootReplacementAllowed: false
});
const GOVERNANCE_ROOT_IDENTITY_BYTES = Buffer.from(JSON.stringify(GOVERNANCE_ROOT_IDENTITY), 'utf8');
const GOVERNANCE_ROOT_IDENTITY_SHA256 = '240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0';
const AUTHORIZATION_REGISTRY_ROOT_DIRECTORY = 'phase8-one-shot-authorization-registries';
const VERIFIED_INTERNAL_PATHS = new WeakMap();

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function deriveCm2103GovernancePaths(gitCommonDir) {
  if (typeof gitCommonDir !== 'string' || gitCommonDir.trim() === '') {
    throw new Error('cm2103_git_common_dir_required');
  }
  const resolvedGitCommonDir = path.resolve(gitCommonDir);
  const governanceParent = path.join(resolvedGitCommonDir, STORE_ROOT_DERIVATION.governanceParentSubdir);
  return Object.freeze({
    gitCommonDir: resolvedGitCommonDir,
    governanceParent,
    authorizationRegistryRoot: path.join(governanceParent, AUTHORIZATION_REGISTRY_ROOT_DIRECTORY),
    governanceRootIdentityPath: path.join(
      governanceParent,
      AUTHORIZATION_REGISTRY_ROOT_DIRECTORY,
      '.phase8-registry-root-identity.json'
    ),
    storeRoot: path.join(governanceParent, STORE_ROOT_DERIVATION.storeDirectoryName)
  });
}

async function requireDirectoryNotSymlink(target, errorCode) {
  const stat = await fs.lstat(target).catch(error => {
    if (error.code === 'ENOENT') throw new Error(errorCode);
    throw error;
  });
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(errorCode);
}

async function verifyCm2103GovernanceRoot(gitCommonDir) {
  const internalPaths = deriveCm2103GovernancePaths(gitCommonDir);
  await requireDirectoryNotSymlink(internalPaths.governanceParent, 'cm2103_governance_parent_invalid');
  await requireDirectoryNotSymlink(internalPaths.authorizationRegistryRoot, 'cm2103_authorization_registry_root_invalid');
  const identityStat = await fs.lstat(internalPaths.governanceRootIdentityPath).catch(error => {
    if (error.code === 'ENOENT') throw new Error('cm2103_governance_root_identity_missing');
    throw error;
  });
  if (!identityStat.isFile() || identityStat.isSymbolicLink()) {
    throw new Error('cm2103_governance_root_identity_invalid');
  }
  const observed = await fs.readFile(internalPaths.governanceRootIdentityPath);
  if (!observed.equals(GOVERNANCE_ROOT_IDENTITY_BYTES) ||
      observed.length !== 216 ||
      sha256(observed) !== GOVERNANCE_ROOT_IDENTITY_SHA256 ||
      sha256Canonical(GOVERNANCE_ROOT_IDENTITY) !== GOVERNANCE_ROOT_IDENTITY_SHA256) {
    throw new Error('cm2103_governance_root_identity_mismatch');
  }
  const verification = Object.freeze({
    accepted: true,
    governanceRootIdentityReference: GOVERNANCE_ROOT_IDENTITY.registryRootReference,
    governanceRootIdentityBytes: observed.length,
    governanceRootIdentitySha256: sha256(observed),
    storeRootBindingSha256: STORE_ROOT_BINDING_CANONICAL_SHA256,
    rawPathDisclosed: false
  });
  VERIFIED_INTERNAL_PATHS.set(verification, internalPaths);
  return verification;
}

function getVerifiedCm2103GovernanceInternalPaths(verification) {
  return VERIFIED_INTERNAL_PATHS.get(verification) || null;
}

async function observeCm2103StoreDirectoryAbsent(storeRoot) {
  try {
    await fs.lstat(storeRoot);
    return { absent: false, outcome: 'STOP_EXISTING_STORE_DIRECTORY', rawPathDisclosed: false };
  } catch (error) {
    if (error.code === 'ENOENT') return { absent: true, outcome: 'ABSENT', rawPathDisclosed: false };
    throw error;
  }
}

module.exports = {
  AUTHORIZATION_REGISTRY_ROOT_DIRECTORY,
  GOVERNANCE_ROOT_IDENTITY,
  GOVERNANCE_ROOT_IDENTITY_BYTES,
  GOVERNANCE_ROOT_IDENTITY_SHA256,
  deriveCm2103GovernancePaths,
  getVerifiedCm2103GovernanceInternalPaths,
  observeCm2103StoreDirectoryAbsent,
  verifyCm2103GovernanceRoot
};
