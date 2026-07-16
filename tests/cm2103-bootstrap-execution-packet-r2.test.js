'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  EXECUTION_PACKET_PATH,
  evaluateCm2103BootstrapExecutionPacket
} = require('../src/core/Cm2103IdentityBoundStoreBootstrapExecutionPacketContract');

const packet = JSON.parse(fs.readFileSync(path.join(__dirname, '..', EXECUTION_PACKET_PATH), 'utf8'));

test('CM-2103 R2 packet binds durable re-entry and persistence-unknown repair without execution', () => {
  const result = evaluateCm2103BootstrapExecutionPacket(packet);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.packetPrepared, true);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.nativeActionsAuthorized, 0);
  assert.equal(packet.claimStorageModel, 'single_atomic_claim_envelope_in_existing_governance_root');
  assert.equal(packet.durableClaimReentryImplemented, true);
  assert.equal(packet.terminalReceiptReconstructionImplemented, true);
  assert.equal(packet.nonterminalClaimProjectionImplemented, true);
  assert.equal(packet.corruptEnvelopeLowDisclosureProjectionImplemented, true);
  assert.equal(packet.governanceFilesystemEffectsTristateImplemented, true);
  assert.equal(packet.reentryMayReplayBootstrap, false);
  assert.equal(packet.reentryMayCreateStoreEffects, false);
  assert.equal(packet.maxStoreFilesystemAccessesDuringReentry, 0);
  assert.equal(packet.maxStoreFilesystemWritesDuringReentry, 0);
  assert.equal(packet.governanceFilesystemEffectsAtFreeze, 0);
});

test('CM-2103 R2 packet fails closed on re-entry, authority, evidence, counter, retry, or overclaim drift', () => {
  const cases = [
    value => ({ ...value, unexpectedCapability: true }),
    value => ({ ...value, durableClaimReentryImplemented: false }),
    value => ({ ...value, terminalReceiptReconstructionImplemented: false }),
    value => ({ ...value, nonterminalClaimProjectionImplemented: false }),
    value => ({ ...value, corruptEnvelopeLowDisclosureProjectionImplemented: false }),
    value => ({ ...value, governanceFilesystemEffectsTristateImplemented: false }),
    value => ({ ...value, governanceFilesystemEffectFields: ['governanceFilesystemEffectsPresent'] }),
    value => ({ ...value, reentryTerminalStatePersistenceAllowed: true }),
    value => ({ ...value, reentryMayReplayBootstrap: true }),
    value => ({ ...value, reentryMayCreateStoreEffects: true }),
    value => ({ ...value, maxStoreFilesystemAccessesDuringReentry: 1 }),
    value => ({ ...value, durableReentryTestSha256: '0'.repeat(64) }),
    value => ({ ...value, callerStorePathAllowed: true }),
    value => ({ ...value, futureDecisionPresentAtFreeze: true }),
    value => ({ ...value, bootstrapExecutionAuthorizedAtFreeze: true }),
    value => ({ ...value, nonceClaimedAtFreeze: true }),
    value => ({ ...value, governanceFilesystemEffectsAtFreeze: 1 }),
    value => ({ ...value, nativeWritesAtFreeze: 1 }),
    value => ({ ...value, maxRetries: 1 }),
    value => ({ ...value, phase8Completed: true }),
    value => ({ ...value, packetPayloadSha256: '0'.repeat(64) })
  ];
  for (const mutate of cases) {
    const result = evaluateCm2103BootstrapExecutionPacket(mutate(packet));
    assert.equal(result.accepted, false);
    assert.equal(result.executionAuthorized, false);
    assert.equal(result.storeDirectoryCreated, false);
  }
});
