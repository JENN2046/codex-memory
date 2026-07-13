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
  commit: 'e2000e4d823cdbbf53152a27aa0122131fb34eb9',
  tree: 'e1bc6f9a799d70aeffaec29006b18dde3c0fabfc',
  path: 'docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_authorization_content_decision_cm2104.json',
  blobOid: 'b460ad94ed6b66c7c7e38ca2732ee907aea6c8bf',
  bytes: 4176,
  sha256: '2414b28a3474984f81fd50769c07da2461d5f5d9ac1801f2e601f9ff56ccfbb3'
});

const GATE_PACKET_GIT_IDENTITY = Object.freeze({
  commit: '9ba0800a6b4b401df0b72dac024bc6668602414b',
  tree: '742dd2747e4c1a5ea087b1204620c41e34762e7d',
  path: AUTHORIZATION_GATE_PACKET_PATH,
  blobOid: 'b0fa9da564b2628c33ca758b1e34f5879e0c5538',
  bytes: 7843,
  sha256: 'f15ac74db5d34e806ae5fb90f70c76edec3ec07a9e3301326803ad8bbdf9d3e4',
  payloadSha256: '2f699b5db2d2b651ec2a541fbe55dd2d988c515b8b95170ea06cdc78900b7684'
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
  if (!packetResult.accepted || packetResult.executionAuthorized !== false ||
      gatePacket?.packetPayloadSha256 !== GATE_PACKET_GIT_IDENTITY.payloadSha256) {
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
