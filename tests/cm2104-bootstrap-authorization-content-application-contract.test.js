'use strict';

const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  GATE_PACKET_GIT_IDENTITY,
  createCm2104BootstrapAuthorizationContentApplication,
  evaluateCm2104BootstrapAuthorizationContentApplication,
  loadFrozenGatePacket
} = require('../src/core/Cm2104BootstrapAuthorizationContentApplicationContract');

const gatePacket = loadFrozenGatePacket();
const staleGatePacket = JSON.parse(execFileSync('git', [
  'show', '67eaab147cb856180a7ddd0491c5e5cc2f01324f:docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_authorization_gate_packet_cm2104.json'
], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8' }));
const repoRoot = path.resolve(__dirname, '..');

test('CM-2104-A current packet identity resolves to the exact reissued Git object', () => {
  const bytes = execFileSync('git', ['show', `${GATE_PACKET_GIT_IDENTITY.commit}:${GATE_PACKET_GIT_IDENTITY.path}`], { cwd: repoRoot });
  assert.equal(execFileSync('git', ['show', '-s', '--format=%T', GATE_PACKET_GIT_IDENTITY.commit], { cwd: repoRoot, encoding: 'utf8' }).trim(), GATE_PACKET_GIT_IDENTITY.tree);
  assert.equal(execFileSync('git', ['rev-parse', `${GATE_PACKET_GIT_IDENTITY.commit}:${GATE_PACKET_GIT_IDENTITY.path}`], { cwd: repoRoot, encoding: 'utf8' }).trim(), GATE_PACKET_GIT_IDENTITY.blobOid);
  assert.equal(bytes.length, GATE_PACKET_GIT_IDENTITY.bytes);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), GATE_PACKET_GIT_IDENTITY.sha256);
});

test('CM-2104-A prepares exact authorization content without issuing a decision or execution authority', () => {
  const application = createCm2104BootstrapAuthorizationContentApplication(gatePacket);
  const result = evaluateCm2104BootstrapAuthorizationContentApplication({ application, gatePacket });
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.applicationPrepared, true);
  assert.equal(result.contentDecisionIssued, false);
  assert.equal(result.finalExecutionReleaseIssued, false);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.executorRun, false);
  assert.equal(result.filesystemEffects, 0);
  assert.equal(result.nativeActions, 0);
  assert.equal(application.requestedContentDecisionStaticFields.authorizationContentApproved, true);
  assert.equal(application.requestedContentDecisionStaticFields.bootstrapExecutionAuthorized, false);
  assert.equal(application.currentAuthority.authorizationContentApproved, false);
});

test('CM-2104-A accepts the reissued packet and rejects the stale packet', () => {
  const application = createCm2104BootstrapAuthorizationContentApplication(gatePacket);
  assert.equal(application.gatePacketGitIdentity.commit, '9ba0800a6b4b401df0b72dac024bc6668602414b');
  assert.equal(evaluateCm2104BootstrapAuthorizationContentApplication({ application, gatePacket }).accepted, true);
  assert.throws(
    () => createCm2104BootstrapAuthorizationContentApplication(staleGatePacket),
    /cm2104_content_application_gate_packet_rejected/
  );
  assert.equal(evaluateCm2104BootstrapAuthorizationContentApplication({ application, gatePacket: staleGatePacket }).accepted, false);
});

test('CM-2104-A fails closed on content, gate, authority, effect, final-release, or hash drift', () => {
  const base = createCm2104BootstrapAuthorizationContentApplication(gatePacket);
  const cases = [
    value => ({ ...value, contentDecisionIssuedByThisApplication: true }),
    value => ({ ...value, contentDecisionFilePresentAtApplication: true }),
    value => ({ ...value, finalExecutionReleaseDecisionPresentAtApplication: true }),
    value => ({ ...value, applicationReadyForFinalExecutionReleaseReview: true }),
    value => ({ ...value, applicationReadyForBootstrapExecution: true }),
    value => ({ ...value, executorRunByThisApplication: true }),
    value => ({
      ...value,
      currentAuthority: { ...value.currentAuthority, bootstrapExecutionAuthorized: true }
    }),
    value => ({
      ...value,
      applicationEffects: { ...value.applicationEffects, storeDirectoryCreates: 1 }
    }),
    value => ({
      ...value,
      requestedContentDecisionStaticFields: {
        ...value.requestedContentDecisionStaticFields,
        bootstrapExecutionAuthorized: true
      }
    }),
    value => ({
      ...value,
      gatePacketGitIdentity: { ...value.gatePacketGitIdentity, sha256: '0'.repeat(64) }
    }),
    value => ({ ...value, applicationPayloadSha256: '0'.repeat(64) }),
    value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'requestedExpiresAt')),
    value => ({ ...value, unexpected: true })
  ];
  for (const mutate of cases) {
    const result = evaluateCm2104BootstrapAuthorizationContentApplication({
      application: mutate(base),
      gatePacket
    });
    assert.equal(result.accepted, false);
    assert.equal(result.executionAuthorized, false);
    assert.equal(result.executorRun, false);
  }
});
