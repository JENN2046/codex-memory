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

test('CM-2103 frozen execution packet matches the reviewed non-executing implementation', () => {
  const result = evaluateCm2103BootstrapExecutionPacket(packet);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.packetPrepared, true);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.nativeActionsAuthorized, 0);
  assert.equal(result.storeDirectoryCreated, false);
  assert.equal(result.storeIdentityCreated, false);
});

test('CM-2103 packet fails closed on input, path, authority, side effect, retry, or overclaim drift', () => {
  const cases = [
    value => ({ ...value, unexpectedCapability: true }),
    value => ({ ...value, frozenExecutorInputs: ['caller_store_path'] }),
    value => ({ ...value, callerStorePathAllowed: true }),
    value => ({ ...value, environmentStorePathOverrideAllowed: true }),
    value => ({ ...value, futureDecisionPresentAtFreeze: true }),
    value => ({ ...value, bootstrapExecutionAuthorizedAtFreeze: true }),
    value => ({ ...value, nonceClaimedAtFreeze: true }),
    value => ({ ...value, nativeWritesAtFreeze: 1 }),
    value => ({ ...value, maxRetries: 1 }),
    value => ({ ...value, identityOverwriteAllowed: true }),
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
