'use strict';

const crypto = require('node:crypto');
const defaultFs = require('node:fs/promises');
const path = require('node:path');
const {
  GOVERNANCE_ROOT_IDENTITY_BYTES,
  GOVERNANCE_ROOT_IDENTITY_SHA256
} = require('./Cm2103IdentityBoundStoreGovernance');
const {
  TERMINAL_STATES,
  summarizeCm2103BootstrapState,
  transitionCm2103BootstrapState
} = require('./Cm2103IdentityBoundStoreBootstrapState');
const { canonicalize } = require('./Cm2102IdentityBoundRollbackLifecycleFoundation');

const REGISTRY_IDENTITY = Object.freeze({
  authorizationRegistryReference: 'cm2103-identity-bound-store-bootstrap-registry-001',
  claimStorageModel: 'single_atomic_claim_envelope_in_existing_governance_root',
  lifecycleReference: 'phase8-identity-bound-rollback-lifecycle-001',
  registryDirectoryCreatedByClaim: false,
  registryIdentityWrittenByClaim: false,
  registryStorageRole: 'durable-local-governance-state',
  schemaVersion: 2,
  storeRootBindingSha256: '0a7ceb6cf658d517de2a3eb30ee09195dbeb9d46800f42ac87edf7f7cb11dd94'
});

const REGISTRY_IDENTITY_BYTES = Buffer.from(JSON.stringify(canonicalize(REGISTRY_IDENTITY)), 'utf8');

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function safeKey(value) {
  return sha256(String(value || ''));
}

function claimIdentity({ nonce, receiptId }) {
  const nonceHash = safeKey(nonce);
  const receiptIdHash = safeKey(receiptId);
  const claimId = sha256(JSON.stringify(canonicalize({ nonceHash, receiptIdHash })));
  return { claimId, nonceHash, receiptIdHash };
}

function baseClaimEnvelope({ nonce, receiptId, bindingHash }) {
  const identity = claimIdentity({ nonce, receiptId });
  return {
    schemaVersion: 2,
    claimId: identity.claimId,
    authorizationRegistryReference: REGISTRY_IDENTITY.authorizationRegistryReference,
    nonceHash: identity.nonceHash,
    receiptIdHash: identity.receiptIdHash,
    bindingHash,
    state: 'CLAIMED',
    directoryCreateAttempts: 0,
    directoryCreates: 0,
    storeDirectoryCreated: false,
    identityWriteAttempts: 0,
    identityWrites: 0,
    identityWriteAttempted: false,
    identityCreated: false,
    identityBytes: 0,
    identitySha256: null,
    identityReadbackAttempts: 0,
    identityReadbackVerifications: 0,
    identityReadbackMatched: false,
    governanceRegistryDirectoryCreates: 0,
    governanceRegistryIdentityWrites: 0,
    authorizationMarkerWrites: 0,
    claimEnvelopeCreateAttempts: 1,
    claimEnvelopeCreates: 1,
    claimStateWriteAttempts: 1,
    claimStateWrites: 1,
    terminalStateDurablyRecorded: false,
    authorizationUseCount: 1,
    authorizationConsumed: true,
    authorizationReplayAllowed: false,
    automaticRetryAllowed: false,
    automaticCleanupAllowed: false
  };
}

function exactEnvelopeBinding(value, expected) {
  return value?.schemaVersion === 2 &&
    value?.claimId === expected.claimId &&
    value?.authorizationRegistryReference === REGISTRY_IDENTITY.authorizationRegistryReference &&
    value?.nonceHash === expected.nonceHash &&
    value?.receiptIdHash === expected.receiptIdHash &&
    value?.bindingHash === expected.bindingHash &&
    value?.authorizationUseCount === 1 &&
    value?.authorizationReplayAllowed === false &&
    value?.automaticRetryAllowed === false &&
    value?.automaticCleanupAllowed === false;
}

function syntheticClaimRegistryAmbiguous(expected, overrides = {}) {
  return {
    ...expected,
    state: 'CLAIM_REGISTRY_AMBIGUOUS',
    claimEnvelopeCreates: null,
    claimStateWrites: null,
    terminalStateDurablyRecorded: false,
    ...overrides
  };
}

class Cm2103IdentityBoundStoreBootstrapRegistry {
  constructor({ authorizationRegistryRoot, filesystem = defaultFs }) {
    if (typeof authorizationRegistryRoot !== 'string' || authorizationRegistryRoot.trim() === '') {
      throw new Error('cm2103_authorization_registry_root_required');
    }
    this.authorizationRegistryRoot = authorizationRegistryRoot;
    this.fs = filesystem;
  }

  envelopePath({ nonce, receiptId } = {}) {
    const identity = claimIdentity({ nonce, receiptId });
    return {
      ...identity,
      claimPath: path.join(this.authorizationRegistryRoot, `.cm2103-bootstrap-claim-${identity.claimId}.json`)
    };
  }

  claimPathFromId(claimId) {
    return path.join(this.authorizationRegistryRoot, `.cm2103-bootstrap-claim-${claimId}.json`);
  }

  async verifyGovernanceRootIdentity() {
    const identityPath = path.join(this.authorizationRegistryRoot, '.phase8-registry-root-identity.json');
    const observed = await this.fs.readFile(identityPath).catch(error => {
      if (error.code === 'ENOENT') throw new Error('cm2103_governance_root_identity_missing');
      throw error;
    });
    if (!observed.equals(GOVERNANCE_ROOT_IDENTITY_BYTES) || sha256(observed) !== GOVERNANCE_ROOT_IDENTITY_SHA256) {
      throw new Error('cm2103_governance_root_identity_mismatch');
    }
    return { accepted: true };
  }

  async preflightUnused({ nonce, receiptId }) {
    await this.verifyGovernanceRootIdentity();
    const target = this.envelopePath({ nonce, receiptId });
    try {
      await this.fs.access(target.claimPath);
      return { accepted: false, unused: false, claimId: target.claimId };
    } catch (error) {
      if (error.code === 'ENOENT') return { accepted: true, unused: true, claimId: target.claimId };
      throw error;
    }
  }

  async recoverClaimCreateError({ expected, claimPath }) {
    let observed;
    try {
      observed = JSON.parse(await this.fs.readFile(claimPath, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return {
        accepted: false,
        state: 'UNCLAIMED',
        authorizationConsumed: false,
        reasonCode: 'cm2103_claim_envelope_not_created',
        claim: null,
        claimEnvelopeCreateAttempts: 1,
        claimEnvelopeCreates: 0
      };
      return {
        accepted: false,
        state: 'CLAIM_REGISTRY_AMBIGUOUS',
        authorizationConsumed: true,
        reasonCode: 'cm2103_claim_envelope_persistence_unknown',
        claim: syntheticClaimRegistryAmbiguous(expected)
      };
    }
    if (!exactEnvelopeBinding(observed, expected)) return {
      accepted: false,
      state: 'CLAIM_REGISTRY_AMBIGUOUS',
      authorizationConsumed: true,
      reasonCode: 'cm2103_claim_envelope_binding_ambiguous',
      claim: syntheticClaimRegistryAmbiguous(expected)
    };
    if (TERMINAL_STATES.includes(observed.state)) return {
      accepted: false,
      state: observed.state,
      authorizationConsumed: true,
      reasonCode: 'cm2103_claim_envelope_already_terminal',
      claim: observed
    };
    try {
      const terminal = await this.transition(observed.claimId, 'CLAIM_AMBIGUOUS');
      return {
        accepted: false,
        state: terminal.state,
        authorizationConsumed: true,
        reasonCode: 'cm2103_claim_envelope_acknowledgement_ambiguous',
        claim: terminal
      };
    } catch (transitionError) {
      return {
        accepted: false,
        state: 'CLAIM_REGISTRY_AMBIGUOUS',
        authorizationConsumed: true,
        reasonCode: 'cm2103_claim_envelope_terminal_persistence_ambiguous',
        claim: syntheticClaimRegistryAmbiguous(observed, {
          claimEnvelopeCreates: 1,
          claimStateWriteAttempts: observed.claimStateWriteAttempts + 1,
          claimStateWrites: observed.claimStateWrites,
          terminalStateDurablyRecorded: false
        })
      };
    }
  }

  async claim({ nonce, receiptId, bindingHash }) {
    await this.verifyGovernanceRootIdentity();
    const target = this.envelopePath({ nonce, receiptId });
    const expected = baseClaimEnvelope({ nonce, receiptId, bindingHash });
    try {
      await this.fs.writeFile(target.claimPath, JSON.stringify(expected), { flag: 'wx' });
      return { accepted: true, state: 'CLAIMED', authorizationConsumed: true, claim: expected };
    } catch (error) {
      if (error.code === 'EEXIST') {
        const existing = await this.readClaim(target.claimId).catch(() => null);
        return {
          accepted: false,
          state: existing?.state || 'CLAIM_REGISTRY_AMBIGUOUS',
          authorizationConsumed: true,
          reasonCode: 'cm2103_bootstrap_authorization_already_claimed',
          claim: existing || syntheticClaimRegistryAmbiguous(expected)
        };
      }
      return this.recoverClaimCreateError({ expected, claimPath: target.claimPath });
    }
  }

  async readClaim(claimId) {
    const raw = await this.fs.readFile(this.claimPathFromId(claimId), 'utf8');
    return JSON.parse(raw);
  }

  async transition(claimId, event, effects = {}, { priorFailedStateWriteAttempts = 0 } = {}) {
    const allowedEffectKeys = new Set([
      'directoryCreateAttempts',
      'directoryCreates',
      'storeDirectoryCreated',
      'identityWriteAttempts',
      'identityWrites',
      'identityWriteAttempted',
      'identityCreated',
      'identityBytes',
      'identitySha256',
      'identityReadbackAttempts',
      'identityReadbackVerifications',
      'identityReadbackMatched'
    ]);
    if (Object.keys(effects).some(key => !allowedEffectKeys.has(key))) {
      throw new Error('cm2103_bootstrap_transition_effect_not_allowed');
    }
    if (!Number.isInteger(priorFailedStateWriteAttempts) || priorFailedStateWriteAttempts < 0 || priorFailedStateWriteAttempts > 1) {
      throw new Error('cm2103_prior_failed_state_write_attempts_invalid');
    }
    const current = await this.readClaim(claimId);
    const nextState = transitionCm2103BootstrapState(current.state, event);
    const next = {
      ...current,
      ...effects,
      state: nextState,
      claimStateWriteAttempts: current.claimStateWriteAttempts + priorFailedStateWriteAttempts + 1,
      claimStateWrites: current.claimStateWrites + 1,
      terminalStateDurablyRecorded: TERMINAL_STATES.includes(nextState)
    };
    const bounded = [
      next.directoryCreateAttempts,
      next.directoryCreates,
      next.identityWriteAttempts,
      next.identityWrites,
      next.identityReadbackAttempts,
      next.identityReadbackVerifications
    ];
    if (bounded.some(value => value !== null && (!Number.isInteger(value) || value < 0 || value > 1))) {
      throw new Error('cm2103_bootstrap_effect_limit_exceeded');
    }
    for (const field of ['storeDirectoryCreated', 'identityWriteAttempted', 'identityCreated', 'identityReadbackMatched']) {
      if (![true, false, null].includes(next[field])) throw new Error('cm2103_bootstrap_tristate_effect_invalid');
    }
    if (![0, 633, null].includes(next.identityBytes)) throw new Error('cm2103_bootstrap_identity_bytes_invalid');
    if (!(next.identitySha256 === null || /^[a-f0-9]{64}$/.test(next.identitySha256))) {
      throw new Error('cm2103_bootstrap_identity_sha256_invalid');
    }
    const claimPath = this.claimPathFromId(claimId);
    const tempPath = path.join(
      this.authorizationRegistryRoot,
      `.cm2103-bootstrap-claim-${claimId}-${safeKey(`${current.state}:${event}:${nextState}`)}.tmp`
    );
    try {
      await this.fs.writeFile(tempPath, JSON.stringify(next), { flag: 'wx' });
      await this.fs.rename(tempPath, claimPath);
    } catch (error) {
      const wrapped = new Error('cm2103_bootstrap_claim_state_persistence_failed');
      wrapped.currentClaim = current;
      wrapped.attemptedClaim = next;
      wrapped.causeCode = error.code || 'unknown';
      throw wrapped;
    }
    return { ...next, summary: summarizeCm2103BootstrapState(nextState) };
  }
}

module.exports = {
  Cm2103IdentityBoundStoreBootstrapRegistry,
  REGISTRY_IDENTITY,
  REGISTRY_IDENTITY_BYTES,
  baseClaimEnvelope,
  claimIdentity,
  exactEnvelopeBinding,
  safeKey,
  sha256,
  syntheticClaimRegistryAmbiguous
};
