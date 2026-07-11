'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  AUTHORIZATION_GATE_PACKET_PATH
} = require('../src/core/Cm2104IdentityBoundStoreBootstrapAuthorizationGatePacketContract');
const {
  APPLICATION_PATH,
  createCm2104BootstrapFinalExecutionReleaseApplication,
  evaluateCm2104BootstrapFinalExecutionReleaseApplication
} = require('../src/core/Cm2104BootstrapFinalExecutionReleaseApplicationContract');

const repoRoot = path.resolve(__dirname, '..');
const packet = JSON.parse(fs.readFileSync(path.join(repoRoot, AUTHORIZATION_GATE_PACKET_PATH), 'utf8'));
const application = JSON.parse(fs.readFileSync(path.join(repoRoot, APPLICATION_PATH), 'utf8'));

test('CM-2104-B prepares the exact final release decision without issuing or executing it', () => {
  assert.deepEqual(application, createCm2104BootstrapFinalExecutionReleaseApplication(packet));
  const result = evaluateCm2104BootstrapFinalExecutionReleaseApplication({ application, gatePacket: packet });
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.authorizationContentApproved, true);
  assert.equal(result.finalReleaseDecisionIssued, false);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.executorRun, false);
  assert.equal(result.filesystemEffects, 0);
  assert.equal(result.nativeActions, 0);
});

test('CM-2104-B application fails closed on release, authority, effect, expiry, or hash drift', () => {
  const cases = [
    value => { value.finalReleaseDecisionIssuedByThisApplication = true; },
    value => { value.currentAuthority.bootstrapExecutionAuthorized = true; },
    value => { value.applicationEffects.claimEnvelopeCreates = 1; },
    value => { value.requestedExpiresAt = '2026-07-12T02:00:00+08:00'; },
    value => { value.requestedFinalReleaseDecisionStaticFields.maxNativeWrites = 1; },
    value => { value.applicationPayloadSha256 = '0'.repeat(64); }
  ];
  for (const mutate of cases) {
    const drifted = structuredClone(application);
    mutate(drifted);
    const result = evaluateCm2104BootstrapFinalExecutionReleaseApplication({
      application: drifted,
      gatePacket: packet
    });
    assert.equal(result.accepted, false);
    assert.equal(result.executionAuthorized, false);
    assert.equal(result.executorRun, false);
  }
});
