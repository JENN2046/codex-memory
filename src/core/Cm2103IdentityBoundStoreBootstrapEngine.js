'use strict';

const defaultFs = require('node:fs/promises');
const path = require('node:path');
const {
  IDENTITY_CANONICAL_BYTES,
  IDENTITY_CANONICAL_SHA256,
  IDENTITY_FILENAME,
  expectedIdentityBytes,
  sha256
} = require('./Cm2102IdentityBoundRollbackLifecycleFoundation');

function result({ accepted = false, state, outcomeStage, claim = null, receiptRequired = false, authorizationConsumed = true }) {
  return {
    accepted,
    state,
    outcomeStage,
    claim,
    receiptRequired,
    authorizationConsumed,
    authorizationReplayAllowed: false,
    automaticRetryPerformed: false,
    automaticCleanupPerformed: false,
    emptyStorePreflightExecuted: false,
    nativeActions: 0,
    rawPathDisclosed: false
  };
}

function syntheticTerminalFromPersistenceFailure(error, state, effects = {}) {
  const current = error?.currentClaim || {};
  return {
    ...current,
    ...effects,
    state,
    claimStateWriteAttempts: Number.isInteger(current.claimStateWriteAttempts)
      ? current.claimStateWriteAttempts + 1
      : null,
    claimStateWrites: Number.isInteger(current.claimStateWrites) ? current.claimStateWrites : null,
    terminalStateDurablyRecorded: false,
    authorizationConsumed: true,
    authorizationReplayAllowed: false,
    automaticRetryAllowed: false,
    automaticCleanupAllowed: false
  };
}

async function persistTerminalOrSynthesize({
  registry,
  claimId,
  event,
  effects,
  fallbackState,
  priorStatePersistenceFailure = false
}) {
  try {
    return await registry.transition(claimId, event, effects, {
      priorFailedStateWriteAttempts: priorStatePersistenceFailure ? 1 : 0
    });
  } catch (error) {
    const synthetic = syntheticTerminalFromPersistenceFailure(error, fallbackState, effects);
    if (priorStatePersistenceFailure && Number.isInteger(synthetic.claimStateWriteAttempts)) {
      synthetic.claimStateWriteAttempts += 1;
    }
    return synthetic;
  }
}

async function observeStoreAbsent(filesystem, storeRoot) {
  try {
    await filesystem.lstat(storeRoot);
    return false;
  } catch (error) {
    if (error.code === 'ENOENT') return true;
    throw error;
  }
}

async function executeCm2103BootstrapFilesystem({
  registry,
  storeRoot,
  nonce,
  receiptId,
  bindingHash,
  filesystem = defaultFs,
  identityFilename = IDENTITY_FILENAME,
  identityBytes = expectedIdentityBytes()
} = {}) {
  if (!registry || typeof storeRoot !== 'string' || storeRoot.trim() === '' ||
      typeof nonce !== 'string' || typeof receiptId !== 'string' ||
      !/^[a-f0-9]{64}$/.test(bindingHash || '')) {
    throw new Error('cm2103_bootstrap_engine_configuration_invalid');
  }
  if (identityFilename !== IDENTITY_FILENAME || !Buffer.isBuffer(identityBytes) ||
      identityBytes.length !== IDENTITY_CANONICAL_BYTES ||
      sha256(identityBytes) !== IDENTITY_CANONICAL_SHA256) {
    throw new Error('cm2103_bootstrap_engine_identity_binding_mismatch');
  }

  const unused = await registry.preflightUnused({ nonce, receiptId });
  if (!unused.accepted) {
    const existing = await registry.inspectExistingClaimForReconciliation({ nonce, receiptId, bindingHash });
    return result({
      accepted: existing.accepted === true,
      state: existing.state,
      outcomeStage: existing.outcomeStage || existing.claim?.outcomeStage || 'reentry_existing_claim_unreadable_or_corrupt',
      claim: existing.claim,
      authorizationConsumed: true,
      receiptRequired: true
    });
  }
  const storeAbsent = await observeStoreAbsent(filesystem, storeRoot);
  if (!storeAbsent) return result({
    state: 'UNCLAIMED',
    outcomeStage: 'existing_store_directory_stop',
    authorizationConsumed: false,
    receiptRequired: false
  });

  const claimResult = await registry.claim({ nonce, receiptId, bindingHash });
  if (!claimResult.accepted) {
    if (claimResult.claim && claimResult.state === 'CLAIM_REGISTRY_AMBIGUOUS') return result({
      state: claimResult.state,
      outcomeStage: claimResult.reasonCode === 'cm2103_claim_envelope_acknowledgement_ambiguous'
        ? 'claim_envelope_persisted_but_acknowledgement_ambiguous'
        : claimResult.reasonCode === 'cm2103_claim_envelope_terminal_persistence_ambiguous'
          ? 'claim_envelope_terminal_state_persistence_failed'
          : 'claim_envelope_persistence_unknown',
      claim: claimResult.claim,
      receiptRequired: true,
      authorizationConsumed: true
    });
    return result({
      state: claimResult.state,
      outcomeStage: claimResult.reasonCode || 'claim_not_created',
      claim: claimResult.claim,
      receiptRequired: false,
      authorizationConsumed: claimResult.authorizationConsumed === true
    });
  }
  let claim = claimResult.claim;

  try {
    claim = await registry.transition(claim.claimId, 'CONSUME_DIRECTORY_CREATE', {
      directoryCreateAttempts: 1,
      directoryCreates: null,
      storeDirectoryCreated: null
    });
  } catch (error) {
    const terminal = await persistTerminalOrSynthesize({
      registry,
      claimId: claim.claimId,
      event: 'CLAIM_AMBIGUOUS',
      effects: {},
      fallbackState: 'CLAIM_REGISTRY_AMBIGUOUS',
      priorStatePersistenceFailure: true
    });
    return result({
      state: terminal.state,
      outcomeStage: 'directory_attempt_state_persistence_failed',
      claim: terminal,
      receiptRequired: true
    });
  }

  try {
    await filesystem.mkdir(storeRoot);
  } catch {
    claim = await persistTerminalOrSynthesize({
      registry,
      claimId: claim.claimId,
      event: 'DIRECTORY_CREATE_AMBIGUOUS',
      effects: {
        directoryCreateAttempts: 1,
        directoryCreates: null,
        storeDirectoryCreated: null
      },
      fallbackState: 'CONSUMED_AMBIGUOUS'
    });
    return result({
      state: claim.state,
      outcomeStage: 'directory_create_acknowledgement_ambiguous',
      claim,
      receiptRequired: true
    });
  }

  try {
    claim = await registry.transition(claim.claimId, 'DIRECTORY_CREATED', {
      directoryCreateAttempts: 1,
      directoryCreates: 1,
      storeDirectoryCreated: true
    });
  } catch (error) {
    claim = await persistTerminalOrSynthesize({
      registry,
      claimId: claim.claimId,
      event: 'DIRECTORY_CREATE_AMBIGUOUS',
      effects: {
        directoryCreateAttempts: 1,
        directoryCreates: 1,
        storeDirectoryCreated: true
      },
      fallbackState: 'CONSUMED_AMBIGUOUS',
      priorStatePersistenceFailure: true
    });
    return result({
      state: claim.state,
      outcomeStage: 'directory_state_persistence_failed',
      claim,
      receiptRequired: true
    });
  }

  try {
    claim = await registry.transition(claim.claimId, 'CONSUME_IDENTITY_WRITE', {
      identityWriteAttempts: 1,
      identityWrites: null,
      identityWriteAttempted: true,
      identityCreated: null,
      identityBytes: null,
      identitySha256: null
    });
  } catch (error) {
    claim = await persistTerminalOrSynthesize({
      registry,
      claimId: claim.claimId,
      event: 'PARTIAL',
      effects: {
        identityWriteAttempts: 0,
        identityWrites: 0,
        identityWriteAttempted: false,
        identityCreated: false,
        identityBytes: 0,
        identitySha256: null
      },
      fallbackState: 'CONSUMED_PARTIAL_BOOTSTRAP',
      priorStatePersistenceFailure: true
    });
    return result({
      state: claim.state,
      outcomeStage: 'identity_attempt_state_persistence_failed',
      claim,
      receiptRequired: true
    });
  }

  const identityPath = path.join(storeRoot, identityFilename);
  try {
    await filesystem.writeFile(identityPath, identityBytes, { flag: 'wx' });
  } catch {
    claim = await persistTerminalOrSynthesize({
      registry,
      claimId: claim.claimId,
      event: 'PARTIAL',
      effects: {
        identityWriteAttempts: 1,
        identityWrites: null,
        identityWriteAttempted: true,
        identityCreated: null,
        identityBytes: null,
        identitySha256: null
      },
      fallbackState: 'CONSUMED_PARTIAL_BOOTSTRAP'
    });
    return result({
      state: claim.state,
      outcomeStage: 'identity_write_acknowledgement_ambiguous',
      claim,
      receiptRequired: true
    });
  }

  try {
    claim = await registry.transition(claim.claimId, 'IDENTITY_CREATED', {
      identityWriteAttempts: 1,
      identityWrites: 1,
      identityWriteAttempted: true,
      identityCreated: true,
      identityBytes: IDENTITY_CANONICAL_BYTES,
      identitySha256: IDENTITY_CANONICAL_SHA256
    });
  } catch (error) {
    claim = await persistTerminalOrSynthesize({
      registry,
      claimId: claim.claimId,
      event: 'AMBIGUOUS',
      effects: {
        identityWriteAttempts: 1,
        identityWrites: 1,
        identityWriteAttempted: true,
        identityCreated: true,
        identityBytes: IDENTITY_CANONICAL_BYTES,
        identitySha256: IDENTITY_CANONICAL_SHA256
      },
      fallbackState: 'CONSUMED_AMBIGUOUS',
      priorStatePersistenceFailure: true
    });
    return result({
      state: claim.state,
      outcomeStage: 'identity_state_persistence_failed',
      claim,
      receiptRequired: true
    });
  }

  try {
    claim = await registry.transition(claim.claimId, 'CONSUME_READBACK', {
      identityReadbackAttempts: 1,
      identityReadbackVerifications: 0,
      identityReadbackMatched: null
    });
  } catch (error) {
    claim = await persistTerminalOrSynthesize({
      registry,
      claimId: claim.claimId,
      event: 'AMBIGUOUS',
      effects: {
        identityReadbackAttempts: 0,
        identityReadbackVerifications: 0,
        identityReadbackMatched: false
      },
      fallbackState: 'CONSUMED_AMBIGUOUS',
      priorStatePersistenceFailure: true
    });
    return result({
      state: claim.state,
      outcomeStage: 'readback_attempt_state_persistence_failed',
      claim,
      receiptRequired: true
    });
  }

  let observed;
  try {
    observed = await filesystem.readFile(identityPath);
  } catch {
    claim = await persistTerminalOrSynthesize({
      registry,
      claimId: claim.claimId,
      event: 'AMBIGUOUS',
      effects: {
        identityReadbackAttempts: 1,
        identityReadbackVerifications: 0,
        identityReadbackMatched: null
      },
      fallbackState: 'CONSUMED_AMBIGUOUS'
    });
    return result({
      state: claim.state,
      outcomeStage: 'identity_readback_failed',
      claim,
      receiptRequired: true
    });
  }

  if (!observed.equals(identityBytes)) {
    claim = await persistTerminalOrSynthesize({
      registry,
      claimId: claim.claimId,
      event: 'PARTIAL',
      effects: {
        identityReadbackAttempts: 1,
        identityReadbackVerifications: 1,
        identityReadbackMatched: false,
        identityBytes: null,
        identitySha256: null
      },
      fallbackState: 'CONSUMED_PARTIAL_BOOTSTRAP'
    });
    return result({
      state: claim.state,
      outcomeStage: 'identity_readback_mismatch',
      claim,
      receiptRequired: true
    });
  }

  try {
    claim = await registry.transition(claim.claimId, 'READBACK_VERIFIED', {
      identityReadbackAttempts: 1,
      identityReadbackVerifications: 1,
      identityReadbackMatched: true
    });
  } catch (error) {
    claim = await persistTerminalOrSynthesize({
      registry,
      claimId: claim.claimId,
      event: 'AMBIGUOUS',
      effects: {
        identityReadbackAttempts: 1,
        identityReadbackVerifications: 1,
        identityReadbackMatched: true
      },
      fallbackState: 'CONSUMED_AMBIGUOUS',
      priorStatePersistenceFailure: true
    });
    return result({
      state: claim.state,
      outcomeStage: 'success_state_persistence_failed',
      claim,
      receiptRequired: true
    });
  }

  return result({
    accepted: true,
    state: claim.state,
    outcomeStage: 'identity_bound_store_bootstrap_completed',
    claim,
    receiptRequired: true
  });
}

module.exports = {
  executeCm2103BootstrapFilesystem,
  observeStoreAbsent,
  persistTerminalOrSynthesize,
  syntheticTerminalFromPersistenceFailure
};
