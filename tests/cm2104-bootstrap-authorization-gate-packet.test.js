'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  AUTHORIZATION_CONTENT_DECISION_PATH,
  AUTHORIZATION_GATE_PACKET_PATH,
  FINAL_EXECUTION_RELEASE_DECISION_PATH,
  evaluateCm2104BootstrapAuthorizationGatePacket
} = require('../src/core/Cm2104IdentityBoundStoreBootstrapAuthorizationGatePacketContract');

const packet = JSON.parse(fs.readFileSync(path.join(__dirname, '..', AUTHORIZATION_GATE_PACKET_PATH), 'utf8'));

test('CM-2104-PRE packet freezes a non-executing two-stage bootstrap authorization gate', () => {
  const result = evaluateCm2104BootstrapAuthorizationGatePacket(packet);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.storeDirectoryCreated, false);
  assert.equal(result.storeIdentityCreated, false);
  assert.equal(result.nativeActionsAuthorized, 0);
  assert.equal(packet.authorizationContentDecisionAloneExecutable, false);
  assert.equal(packet.independentFinalExecutionReleaseRequired, true);
  assert.equal(packet.finalReleaseMustBindContentGitIdentity, true);
  assert.equal(fs.existsSync(path.join(__dirname, '..', AUTHORIZATION_CONTENT_DECISION_PATH)), false);
  assert.equal(fs.existsSync(path.join(__dirname, '..', FINAL_EXECUTION_RELEASE_DECISION_PATH)), false);
});

test('CM-2104-PRE packet rejects authority, release separation, artifact, counter, or hash drift', () => {
  const cases = [
    value => ({ ...value, authorizationContentDecisionAloneExecutable: true }),
    value => ({ ...value, independentFinalExecutionReleaseRequired: false }),
    value => ({ ...value, finalReleaseMustBindContentGitIdentity: false }),
    value => ({ ...value, authorizationContentDecisionPresentAtFreeze: true }),
    value => ({ ...value, finalExecutionReleaseDecisionPresentAtFreeze: true }),
    value => ({ ...value, bootstrapExecutionAuthorizedAtFreeze: true }),
    value => ({ ...value, readyForExactBootstrapAuthorizationApplication: true }),
    value => ({ ...value, maxNativeWrites: 1 }),
    value => ({ ...value, maxRetries: 1 }),
    value => ({ ...value, packetPayloadSha256: '0'.repeat(64) }),
    value => ({
      ...value,
      gateImplementationArtifacts: {
        ...value.gateImplementationArtifacts,
        frozenExecutor: {
          ...value.gateImplementationArtifacts.frozenExecutor,
          path: 'src/cli/not-the-frozen-executor.js'
        }
      }
    }),
    value => ({
      ...value,
      executionBlockersAtFreeze: value.executionBlockersAtFreeze.slice(1)
    })
  ];
  for (const mutate of cases) {
    const result = evaluateCm2104BootstrapAuthorizationGatePacket(mutate(packet));
    assert.equal(result.accepted, false);
    assert.equal(result.executionAuthorized, false);
  }
});
