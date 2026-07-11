'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createCm2104BootstrapAuthorizationContentApplication,
  evaluateCm2104BootstrapAuthorizationContentApplication,
  loadFrozenGatePacket
} = require('../src/core/Cm2104BootstrapAuthorizationContentApplicationContract');

const gatePacket = loadFrozenGatePacket();

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
