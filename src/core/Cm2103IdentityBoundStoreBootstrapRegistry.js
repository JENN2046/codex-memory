'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const {
  GOVERNANCE_ROOT_IDENTITY_BYTES,
  GOVERNANCE_ROOT_IDENTITY_SHA256
} = require('./Cm2103IdentityBoundStoreGovernance');
const {
  summarizeCm2103BootstrapState,
  transitionCm2103BootstrapState
} = require('./Cm2103IdentityBoundStoreBootstrapState');
const { canonicalize } = require('./Cm2102IdentityBoundRollbackLifecycleFoundation');

const REGISTRY_IDENTITY = Object.freeze({
  authorizationRegistryReference: 'cm2103-identity-bound-store-bootstrap-registry-001',
  lifecycleReference: 'phase8-identity-bound-rollback-lifecycle-001',
  registryDeletionAllowed: false,
  registryReinitializationAllowed: false,
  registryStorageRole: 'durable-local-governance-state',
  schemaVersion: 1,
  storeRootBindingSha256: '0a7ceb6cf658d517de2a3eb30ee09195dbeb9d46800f42ac87edf7f7cb11dd94'
});

const REGISTRY_IDENTITY_BYTES = Buffer.from(JSON.stringify(canonicalize(REGISTRY_IDENTITY)), 'utf8');

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function safeKey(value) {
  return sha256(String(value || ''));
}

class Cm2103IdentityBoundStoreBootstrapRegistry {
  constructor({ authorizationRegistryRoot }) {
    if (typeof authorizationRegistryRoot !== 'string' || authorizationRegistryRoot.trim() === '') {
      throw new Error('cm2103_authorization_registry_root_required');
    }
    this.authorizationRegistryRoot = authorizationRegistryRoot;
    this.directory = path.join(
      authorizationRegistryRoot,
      safeKey(REGISTRY_IDENTITY.authorizationRegistryReference)
    );
  }

  markerPaths({ nonce, receiptId, bindingHash }) {
    const claimId = sha256(JSON.stringify(canonicalize({ bindingHash, nonce, receiptId })));
    return {
      claimId,
      noncePath: path.join(this.directory, `nonce-${safeKey(nonce)}.json`),
      receiptPath: path.join(this.directory, `receipt-${safeKey(receiptId)}.json`),
      claimPath: path.join(this.directory, `claim-${claimId}.json`)
    };
  }

  async verifyGovernanceRootIdentity() {
    const identityPath = path.join(this.authorizationRegistryRoot, '.phase8-registry-root-identity.json');
    const observed = await fs.readFile(identityPath).catch(error => {
      if (error.code === 'ENOENT') throw new Error('cm2103_governance_root_identity_missing');
      throw error;
    });
    if (!observed.equals(GOVERNANCE_ROOT_IDENTITY_BYTES) || sha256(observed) !== GOVERNANCE_ROOT_IDENTITY_SHA256) {
      throw new Error('cm2103_governance_root_identity_mismatch');
    }
  }

  async verifyRegistryIdentity() {
    const stat = await fs.lstat(this.directory).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (!stat) return { exists: false };
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('cm2103_bootstrap_registry_invalid');
    const identityPath = path.join(this.directory, '.registry-identity.json');
    const observed = await fs.readFile(identityPath).catch(error => {
      if (error.code === 'ENOENT') throw new Error('cm2103_bootstrap_registry_identity_missing');
      throw error;
    });
    if (!observed.equals(REGISTRY_IDENTITY_BYTES)) throw new Error('cm2103_bootstrap_registry_identity_mismatch');
    return { exists: true };
  }

  async preflightUnused({ nonce, receiptId, bindingHash }) {
    await this.verifyGovernanceRootIdentity();
    const identity = await this.verifyRegistryIdentity();
    if (!identity.exists) return { accepted: true, unused: true };
    const markers = this.markerPaths({ nonce, receiptId, bindingHash });
    const observed = await Promise.all(
      [markers.noncePath, markers.receiptPath, markers.claimPath].map(async file => {
        try {
          await fs.access(file);
          return true;
        } catch (error) {
          if (error.code === 'ENOENT') return false;
          throw error;
        }
      })
    );
    return { accepted: observed.every(value => value === false), unused: observed.every(value => value === false) };
  }

  async claim({ nonce, receiptId, bindingHash }) {
    await this.verifyGovernanceRootIdentity();
    const lockPath = path.join(this.authorizationRegistryRoot, '.cm2103-bootstrap-claim.lock');
    let lock;
    try {
      lock = await fs.open(lockPath, 'wx');
    } catch (error) {
      if (error.code === 'EEXIST') throw new Error('cm2103_bootstrap_registry_busy');
      throw error;
    }
    try {
      let identity = await this.verifyRegistryIdentity();
      if (!identity.exists) {
        try {
          await fs.mkdir(this.directory);
          await fs.writeFile(path.join(this.directory, '.registry-identity.json'), REGISTRY_IDENTITY_BYTES, { flag: 'wx' });
        } catch (error) {
          throw new Error(`cm2103_bootstrap_registry_initialization_ambiguous:${error.code || 'unknown'}`);
        }
        identity = await this.verifyRegistryIdentity();
      }
      if (!identity.exists) throw new Error('cm2103_bootstrap_registry_identity_missing');
      const unused = await this.preflightUnused({ nonce, receiptId, bindingHash });
      if (!unused.accepted) throw new Error('cm2103_bootstrap_authorization_already_claimed');

      const markers = this.markerPaths({ nonce, receiptId, bindingHash });
      const record = {
        schemaVersion: 1,
        claimId: markers.claimId,
        nonceHash: safeKey(nonce),
        receiptIdHash: safeKey(receiptId),
        bindingHash,
        state: 'CLAIMED',
        directoryCreateAttempts: 0,
        directoryCreates: 0,
        identityWriteAttempts: 0,
        identityWrites: 0,
        identityReadbackVerifications: 0,
        authorizationUseCount: 1,
        authorizationReplayAllowed: false,
        automaticRetryAllowed: false,
        automaticCleanupAllowed: false
      };
      try {
        await fs.writeFile(markers.noncePath, JSON.stringify({ claimId: markers.claimId }), { flag: 'wx' });
        await fs.writeFile(markers.receiptPath, JSON.stringify({ claimId: markers.claimId }), { flag: 'wx' });
        await fs.writeFile(markers.claimPath, JSON.stringify(record), { flag: 'wx' });
      } catch (error) {
        throw new Error(`cm2103_bootstrap_claim_ambiguous:${error.code || 'unknown'}`);
      }
      return record;
    } finally {
      await lock.close();
      await fs.unlink(lockPath).catch(() => {});
    }
  }

  async readClaim(claimId) {
    const raw = await fs.readFile(path.join(this.directory, `claim-${claimId}.json`), 'utf8');
    return JSON.parse(raw);
  }

  async transition(claimId, event, effects = {}) {
    const allowedEffectKeys = [
      'directoryCreateAttempts',
      'directoryCreates',
      'identityWriteAttempts',
      'identityWrites',
      'identityReadbackVerifications'
    ];
    if (Object.keys(effects).some(key => !allowedEffectKeys.includes(key))) {
      throw new Error('cm2103_bootstrap_transition_effect_not_allowed');
    }
    const lockPath = path.join(this.directory, `.state-${claimId}.lock`);
    let lock;
    try {
      lock = await fs.open(lockPath, 'wx');
    } catch (error) {
      if (error.code === 'EEXIST') throw new Error('cm2103_bootstrap_state_busy');
      throw error;
    }
    try {
      const current = await this.readClaim(claimId);
      const nextState = transitionCm2103BootstrapState(current.state, event);
      const next = { ...current, ...effects, state: nextState };
      if (next.directoryCreateAttempts > 1 || next.directoryCreates > 1 ||
          next.identityWriteAttempts > 1 || next.identityWrites > 1 ||
          next.identityReadbackVerifications > 1) {
        throw new Error('cm2103_bootstrap_effect_limit_exceeded');
      }
      const claimPath = path.join(this.directory, `claim-${claimId}.json`);
      const tempPath = path.join(this.directory, `.claim-${claimId}-${safeKey(`${event}:${nextState}`)}.tmp`);
      await fs.writeFile(tempPath, JSON.stringify(next), { flag: 'wx' });
      await fs.rename(tempPath, claimPath);
      return { ...next, summary: summarizeCm2103BootstrapState(nextState) };
    } finally {
      await lock.close();
      await fs.unlink(lockPath).catch(() => {});
    }
  }
}

module.exports = {
  Cm2103IdentityBoundStoreBootstrapRegistry,
  REGISTRY_IDENTITY,
  REGISTRY_IDENTITY_BYTES,
  safeKey,
  sha256
};
