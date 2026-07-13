'use strict';

const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  AUTHORIZATION_GATE_PACKET_PATH
} = require('../src/core/Cm2104IdentityBoundStoreBootstrapAuthorizationGatePacketContract');
const {
  APPLICATION_PATH,
  CONTENT_DECISION_GIT_IDENTITY,
  GATE_PACKET_GIT_IDENTITY,
  createCm2104BootstrapFinalExecutionReleaseApplication,
  evaluateCm2104BootstrapFinalExecutionReleaseApplication
} = require('../src/core/Cm2104BootstrapFinalExecutionReleaseApplicationContract');

const repoRoot = path.resolve(__dirname, '..');
const packet = JSON.parse(execFileSync('git', [
  'show', `${GATE_PACKET_GIT_IDENTITY.commit}:${AUTHORIZATION_GATE_PACKET_PATH}`
], { cwd: repoRoot, encoding: 'utf8' }));
const stalePacket = JSON.parse(execFileSync('git', [
  'show', `67eaab147cb856180a7ddd0491c5e5cc2f01324f:${AUTHORIZATION_GATE_PACKET_PATH}`
], { cwd: repoRoot, encoding: 'utf8' }));
const application = JSON.parse(fs.readFileSync(path.join(repoRoot, APPLICATION_PATH), 'utf8'));

test('CM-2104-B current content decision identity resolves to the exact reissued Git object', () => {
  const bytes = execFileSync('git', ['show', `${CONTENT_DECISION_GIT_IDENTITY.commit}:${CONTENT_DECISION_GIT_IDENTITY.path}`], { cwd: repoRoot });
  assert.equal(execFileSync('git', ['show', '-s', '--format=%T', CONTENT_DECISION_GIT_IDENTITY.commit], { cwd: repoRoot, encoding: 'utf8' }).trim(), CONTENT_DECISION_GIT_IDENTITY.tree);
  assert.equal(execFileSync('git', ['rev-parse', `${CONTENT_DECISION_GIT_IDENTITY.commit}:${CONTENT_DECISION_GIT_IDENTITY.path}`], { cwd: repoRoot, encoding: 'utf8' }).trim(), CONTENT_DECISION_GIT_IDENTITY.blobOid);
  assert.equal(bytes.length, CONTENT_DECISION_GIT_IDENTITY.bytes);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), CONTENT_DECISION_GIT_IDENTITY.sha256);
});

test('CM-2104-B prepares the reissued final release binding without issuing or executing it', () => {
  const currentApplication = createCm2104BootstrapFinalExecutionReleaseApplication(packet);
  const result = evaluateCm2104BootstrapFinalExecutionReleaseApplication({ application: currentApplication, gatePacket: packet });
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.authorizationContentApproved, true);
  assert.equal(result.finalReleaseDecisionIssued, false);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.executorRun, false);
  assert.equal(result.filesystemEffects, 0);
  assert.equal(result.nativeActions, 0);
  assert.equal(currentApplication.gatePacketGitIdentity.commit, GATE_PACKET_GIT_IDENTITY.commit);
  assert.equal(currentApplication.authorizationContentDecisionGitIdentity.commit, CONTENT_DECISION_GIT_IDENTITY.commit);
  assert.equal(evaluateCm2104BootstrapFinalExecutionReleaseApplication({ application, gatePacket: packet }).accepted, false);
  assert.throws(
    () => createCm2104BootstrapFinalExecutionReleaseApplication(stalePacket),
    /cm2104_final_release_application_gate_packet_rejected/
  );
});

test('CM-2104-B application fails closed on release, authority, effect, expiry, or hash drift', () => {
  const application = createCm2104BootstrapFinalExecutionReleaseApplication(packet);
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
