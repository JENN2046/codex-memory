'use strict';

const {
  sha256Canonical
} = require('./Cm2102IdentityBoundRollbackLifecycleFoundation');
const {
  expectedFinalReleaseDecision
} = require('./Cm2104IdentityBoundStoreBootstrapFinalExecutionReleaseDecisionIntake');
const {
  AUTHORIZATION_GATE_PACKET_PATH,
  FINAL_EXECUTION_RELEASE_DECISION_PATH,
  evaluateCm2104BootstrapAuthorizationGatePacket
} = require('./Cm2104IdentityBoundStoreBootstrapAuthorizationGatePacketContract');

const APPLICATION_PATH =
  'docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_final_execution_release_application_cm2104.json';

const CONTENT_DECISION_GIT_IDENTITY = Object.freeze({
  reference: 'CM-2104-ER-IDENTITY-BOUND-STORE-BOOTSTRAP-CONTENT-0A7CEB6C-017307C9',
  commit: 'a70870a090d739f79eb31c7d1be3b7ac979fb32a',
  tree: '241ec97972e0e16c741dd0d48baa66349716b41f',
  path: 'docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_authorization_content_decision_cm2104.json',
  blobOid: '86915428a69719093d426996deb56078dc6a5a5e',
  bytes: 4176,
  sha256: '4baa0e84cf127ca99e6eec0111480a7e262ab368c9f04adc0ee5448cee384493'
});

const GATE_PACKET_GIT_IDENTITY = Object.freeze({
  commit: '67eaab147cb856180a7ddd0491c5e5cc2f01324f',
  tree: '5ad4fb736034172bfb96ce8c34a492e509b9acfa',
  path: AUTHORIZATION_GATE_PACKET_PATH,
  blobOid: 'c5a2c6e4eb6c0911895c44b41c07244fe96d61e9',
  bytes: 7843,
  sha256: '0ad7e1cb4ff30cc993c9625fcefe0328d9c78d9a4227ffb6c9409b5faa4c0f8e',
  payloadSha256: 'e57a98e9151583029843ff3ce93ca60ad45ebbfcd91e9c7fce7e0362969359da'
});

const APPLICATION_KEYS = Object.freeze([
  'schemaVersion', 'taskId', 'applicationType', 'applicationReference',
  'gatePacketGitIdentity', 'authorizationContentDecisionGitIdentity',
  'requestedFinalReleaseDecisionReference', 'finalReleaseDecisionPath',
  'requestedFinalReleaseDecisionStaticFields',
  'requestedFinalReleaseDecisionStaticFieldsSha256', 'requestedExpiresAt',
  'requestedApprovedAtPolicy', 'authorizationContentDecisionIntakeAccepted',
  'authorizationContentDecisionExecutionAuthorized',
  'finalReleaseDecisionRawBytesFrozenByThisApplication',
  'finalReleaseDecisionIssuedByThisApplication',
  'finalReleaseDecisionFilePresentAtApplication', 'executorRunByThisApplication',
  'requiresSeparateFinalReleaseDecisionByteFreezeAfterApproval',
  'currentAuthority', 'applicationEffects', 'completionBoundaries',
  'applicationReadyForIndependentFinalReleaseReview',
  'applicationReadyForBootstrapExecution', 'applicationPayloadSha256'
]);

function exactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function canonicalEqual(left, right) {
  try {
    return sha256Canonical(left) === sha256Canonical(right);
  } catch {
    return false;
  }
}

function finalReleaseDecisionBindingFromPacket(packet) {
  return {
    expectedFinalReleaseDecisionReference: packet.expectedFinalExecutionReleaseDecisionReference,
    authorizationContentDecisionReference: CONTENT_DECISION_GIT_IDENTITY.reference,
    authorizationContentDecisionSourceCommit: CONTENT_DECISION_GIT_IDENTITY.commit,
    authorizationContentDecisionBlobOid: CONTENT_DECISION_GIT_IDENTITY.blobOid,
    authorizationContentDecisionSha256: CONTENT_DECISION_GIT_IDENTITY.sha256,
    executionPacketCommit: GATE_PACKET_GIT_IDENTITY.commit,
    executionPacketBlobOid: GATE_PACKET_GIT_IDENTITY.blobOid,
    executionPacketSha256: GATE_PACKET_GIT_IDENTITY.sha256,
    implementationCommit: packet.gateImplementationCommit,
    implementationTree: packet.gateImplementationTree,
    lifecycleReference: packet.lifecycleReference,
    storeReference: packet.storeReference,
    storeInstanceId: packet.storeInstanceId,
    storeRole: packet.storeRole,
    storeRootBindingSha256: packet.storeRootBindingSha256,
    governanceRootIdentityReference: packet.governanceRootIdentityReference,
    governanceRootIdentitySha256: packet.governanceRootIdentitySha256,
    identityFilename: packet.identityFilename,
    identityBytes: packet.identityBytes,
    identitySha256: packet.identitySha256,
    authorizationRegistryReference: packet.authorizationRegistryReference,
    nonce: packet.nonce,
    receiptId: packet.receiptId,
    expectedExpiresAt: packet.requestedExpiresAt
  };
}

function createCm2104BootstrapFinalExecutionReleaseApplication(gatePacket) {
  const packetResult = evaluateCm2104BootstrapAuthorizationGatePacket(gatePacket);
  if (!packetResult.accepted || packetResult.executionAuthorized !== false) {
    throw new Error('cm2104_final_release_application_gate_packet_rejected');
  }
  const binding = finalReleaseDecisionBindingFromPacket(gatePacket);
  const staticFields = expectedFinalReleaseDecision(binding);
  const application = {
    schemaVersion: 1,
    taskId: 'CM-2104-B',
    applicationType: 'exact_bootstrap_final_execution_release_only_no_execution',
    applicationReference: 'CM-2104-B-AR-20260712-FINAL-RELEASE-A70870A0',
    gatePacketGitIdentity: GATE_PACKET_GIT_IDENTITY,
    authorizationContentDecisionGitIdentity: CONTENT_DECISION_GIT_IDENTITY,
    requestedFinalReleaseDecisionReference: gatePacket.expectedFinalExecutionReleaseDecisionReference,
    finalReleaseDecisionPath: FINAL_EXECUTION_RELEASE_DECISION_PATH,
    requestedFinalReleaseDecisionStaticFields: staticFields,
    requestedFinalReleaseDecisionStaticFieldsSha256: sha256Canonical(staticFields),
    requestedExpiresAt: gatePacket.requestedExpiresAt,
    requestedApprovedAtPolicy: 'assigned_by_repository_self_review_before_expiry_and_frozen_in_exact_decision_bytes',
    authorizationContentDecisionIntakeAccepted: true,
    authorizationContentDecisionExecutionAuthorized: false,
    finalReleaseDecisionRawBytesFrozenByThisApplication: false,
    finalReleaseDecisionIssuedByThisApplication: false,
    finalReleaseDecisionFilePresentAtApplication: false,
    executorRunByThisApplication: false,
    requiresSeparateFinalReleaseDecisionByteFreezeAfterApproval: true,
    currentAuthority: {
      authorizationContentApproved: true,
      executionReleaseAuthorized: false,
      bootstrapExecutionAuthorized: false,
      storeDirectoryCreationAuthorized: false,
      storeIdentityCreationAuthorized: false,
      identityReadbackVerificationAuthorized: false,
      emptyStorePreflightAuthorized: false,
      recordMemoryAuthorized: false,
      tombstoneMemoryAuthorized: false,
      verifyAuthorized: false,
      nativeMemoryAuthorized: false
    },
    applicationEffects: {
      executorRuns: 0,
      claimEnvelopeCreates: 0,
      storeDirectoryCreates: 0,
      identityWrites: 0,
      identityReadbackVerifications: 0,
      directoryEnumerations: 0,
      recordContentReads: 0,
      nativeReads: 0,
      nativeWrites: 0,
      recordMemoryCalls: 0,
      tombstoneMemoryCalls: 0,
      verifyOperations: 0,
      retries: 0,
      cleanupOperations: 0,
      rollbackOrCompensationOperations: 0,
      remoteActions: 0
    },
    completionBoundaries: {
      rollbackDrillPassed: false,
      failureRecoveryProofPassed: false,
      phase8Completed: false,
      fullPlanPackCompleted: false,
      readinessClaimed: false
    },
    applicationReadyForIndependentFinalReleaseReview: true,
    applicationReadyForBootstrapExecution: false
  };
  return {
    ...application,
    applicationPayloadSha256: sha256Canonical(application)
  };
}

function evaluateCm2104BootstrapFinalExecutionReleaseApplication({ application, gatePacket } = {}) {
  const blockers = [];
  if (!application || !gatePacket) {
    return failure(['missing_input']);
  }
  let expected;
  try {
    expected = createCm2104BootstrapFinalExecutionReleaseApplication(gatePacket);
  } catch {
    return failure(['gate_packet_rejected']);
  }
  if (!exactKeys(application, APPLICATION_KEYS)) blockers.push('application.keys');
  if (sha256Canonical(Object.fromEntries(
    Object.entries(application).filter(([key]) => key !== 'applicationPayloadSha256')
  )) !== application.applicationPayloadSha256) blockers.push('application.applicationPayloadSha256');
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (!canonicalEqual(application[field], expectedValue)) blockers.push(`application.${field}`);
  }
  return blockers.length ? failure([...new Set(blockers)]) : {
    accepted: true,
    blockers: [],
    applicationPrepared: true,
    authorizationContentApproved: true,
    finalReleaseDecisionIssued: false,
    executionAuthorized: false,
    executorRun: false,
    filesystemEffects: 0,
    nativeActions: 0
  };
}

function failure(blockers) {
  return {
    accepted: false,
    blockers,
    applicationPrepared: false,
    authorizationContentApproved: false,
    finalReleaseDecisionIssued: false,
    executionAuthorized: false,
    executorRun: false,
    filesystemEffects: 0,
    nativeActions: 0
  };
}

module.exports = {
  APPLICATION_KEYS,
  APPLICATION_PATH,
  CONTENT_DECISION_GIT_IDENTITY,
  GATE_PACKET_GIT_IDENTITY,
  createCm2104BootstrapFinalExecutionReleaseApplication,
  evaluateCm2104BootstrapFinalExecutionReleaseApplication,
  finalReleaseDecisionBindingFromPacket
};
