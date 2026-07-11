'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  sha256Canonical
} = require('./Cm2102IdentityBoundRollbackLifecycleFoundation');
const {
  expectedContentDecision
} = require('./Cm2104IdentityBoundStoreBootstrapAuthorizationContentDecisionIntake');
const {
  AUTHORIZATION_CONTENT_DECISION_PATH,
  AUTHORIZATION_GATE_PACKET_PATH,
  FINAL_EXECUTION_RELEASE_DECISION_PATH,
  evaluateCm2104BootstrapAuthorizationGatePacket
} = require('./Cm2104IdentityBoundStoreBootstrapAuthorizationGatePacketContract');

const APPLICATION_PATH =
  'docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_authorization_content_application_cm2104_a.json';

const EXTERNAL_REVIEW_REFERENCE = Object.freeze({
  classification: 'reference_only_repository_reality_controls',
  decisionReference: 'CM-2104-PRE-ER-20260712-TWO-STAGE-GATE-PASS-NO-AUTHORITY-0AD7E1CB',
  sourceCommit: '63cc7bc92a9f45a0001ce73e818e993bb5391654',
  sourceTree: '6fa8a20d07cc3ca17fc825087d734bdf4054014d',
  path: 'docs/near-model-memory-plan-pack/phase8_bootstrap_authorization_gate_external_review_reference_cm2104_pre.json',
  blobOid: 'cc9675399a6ed2060cc28fe610b5d304bea408e4',
  bytes: 2641,
  sha256: '0ed006cb9ac3a3e7c0c7ccb89b0fd118b4176415052d859ad04b23ac4b125ec2',
  payloadSha256: '8e329f2dc979e46fc71469b8cbfe5a936a5ed013c3d3f0ce615a82e7a96fdbf5'
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
  'externalReviewReference', 'gatePacketGitIdentity', 'gateImplementation',
  'requestedContentDecisionReference', 'expectedFinalReleaseDecisionReference',
  'contentDecisionPath', 'finalExecutionReleaseDecisionPath',
  'requestedContentDecisionStaticFields', 'requestedContentDecisionStaticFieldsSha256',
  'requestedExpiresAt', 'requestedApprovedAtPolicy',
  'contentDecisionRawBytesFrozenByThisApplication', 'contentDecisionIssuedByThisApplication',
  'contentDecisionFilePresentAtApplication', 'finalExecutionReleaseDecisionPresentAtApplication',
  'finalExecutionReleaseIssuedByThisApplication', 'executorRunByThisApplication',
  'requiresIndependentContentApplicationReview',
  'requiresSeparateContentDecisionByteFreezeAfterApproval',
  'requiresSeparateFinalExecutionReleaseApplicationAndReview',
  'currentAuthority', 'applicationEffects', 'completionBoundaries',
  'applicationReadyForIndependentContentReview',
  'applicationReadyForFinalExecutionReleaseReview', 'applicationReadyForBootstrapExecution',
  'applicationPayloadSha256'
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

function contentDecisionBindingFromPacket(packet) {
  return {
    expectedContentDecisionReference: packet.expectedAuthorizationContentDecisionReference,
    expectedFinalReleaseDecisionReference: packet.expectedFinalExecutionReleaseDecisionReference,
    foundationDecisionReference: packet.foundationDecisionReference,
    foundationDecisionSourceCommit: packet.foundationDecisionSourceCommit,
    foundationDecisionBlobOid: packet.foundationDecisionBlobOid,
    foundationDecisionSha256: packet.foundationDecisionSha256,
    foundationPacketCommit: packet.foundationPacketCommit,
    foundationPacketBlobOid: packet.foundationPacketBlobOid,
    foundationPacketSha256: packet.foundationPacketSha256,
    bootstrapRequestCommit: packet.bootstrapRequestCommit,
    bootstrapRequestBlobOid: packet.bootstrapRequestBlobOid,
    bootstrapRequestSha256: packet.bootstrapRequestSha256,
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

function createCm2104BootstrapAuthorizationContentApplication(gatePacket) {
  const packetResult = evaluateCm2104BootstrapAuthorizationGatePacket(gatePacket);
  if (!packetResult.accepted || packetResult.executionAuthorized !== false) {
    throw new Error('cm2104_content_application_gate_packet_rejected');
  }
  const expectedBinding = contentDecisionBindingFromPacket(gatePacket);
  const staticFields = expectedContentDecision(expectedBinding);
  const application = {
    schemaVersion: 1,
    taskId: 'CM-2104-A',
    applicationType: 'exact_bootstrap_authorization_content_only_no_execution',
    applicationReference: 'CM-2104-A-AR-20260712-CONTENT-ONLY-0AD7E1CB',
    externalReviewReference: EXTERNAL_REVIEW_REFERENCE,
    gatePacketGitIdentity: GATE_PACKET_GIT_IDENTITY,
    gateImplementation: {
      commit: gatePacket.gateImplementationCommit,
      tree: gatePacket.gateImplementationTree
    },
    requestedContentDecisionReference: gatePacket.expectedAuthorizationContentDecisionReference,
    expectedFinalReleaseDecisionReference: gatePacket.expectedFinalExecutionReleaseDecisionReference,
    contentDecisionPath: AUTHORIZATION_CONTENT_DECISION_PATH,
    finalExecutionReleaseDecisionPath: FINAL_EXECUTION_RELEASE_DECISION_PATH,
    requestedContentDecisionStaticFields: staticFields,
    requestedContentDecisionStaticFieldsSha256: sha256Canonical(staticFields),
    requestedExpiresAt: gatePacket.requestedExpiresAt,
    requestedApprovedAtPolicy: 'assigned_by_independent_reviewer_before_expiry_and_frozen_in_exact_decision_bytes',
    contentDecisionRawBytesFrozenByThisApplication: false,
    contentDecisionIssuedByThisApplication: false,
    contentDecisionFilePresentAtApplication: false,
    finalExecutionReleaseDecisionPresentAtApplication: false,
    finalExecutionReleaseIssuedByThisApplication: false,
    executorRunByThisApplication: false,
    requiresIndependentContentApplicationReview: true,
    requiresSeparateContentDecisionByteFreezeAfterApproval: true,
    requiresSeparateFinalExecutionReleaseApplicationAndReview: true,
    currentAuthority: {
      authorizationContentApproved: false,
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
    applicationReadyForIndependentContentReview: true,
    applicationReadyForFinalExecutionReleaseReview: false,
    applicationReadyForBootstrapExecution: false
  };
  return {
    ...application,
    applicationPayloadSha256: sha256Canonical(application)
  };
}

function evaluateCm2104BootstrapAuthorizationContentApplication({ application, gatePacket } = {}) {
  const blockers = [];
  if (!application || !gatePacket) {
    return { accepted: false, blockers: ['missing_input'], applicationPrepared: false };
  }
  let expected;
  try { expected = createCm2104BootstrapAuthorizationContentApplication(gatePacket); } catch {
    return { accepted: false, blockers: ['gate_packet_rejected'], applicationPrepared: false };
  }
  if (!exactKeys(application, APPLICATION_KEYS)) blockers.push('application.keys');
  if (sha256Canonical(Object.fromEntries(
    Object.entries(application).filter(([key]) => key !== 'applicationPayloadSha256')
  )) !== application.applicationPayloadSha256) blockers.push('application.applicationPayloadSha256');
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (!canonicalEqual(application[field], expectedValue)) blockers.push(`application.${field}`);
  }
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    applicationPrepared: blockers.length === 0,
    contentDecisionIssued: false,
    finalExecutionReleaseIssued: false,
    executionAuthorized: false,
    executorRun: false,
    filesystemEffects: 0,
    nativeActions: 0
  };
}

function loadFrozenGatePacket(repoRoot = path.resolve(__dirname, '..', '..')) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, AUTHORIZATION_GATE_PACKET_PATH), 'utf8'));
}

module.exports = {
  APPLICATION_KEYS,
  APPLICATION_PATH,
  EXTERNAL_REVIEW_REFERENCE,
  GATE_PACKET_GIT_IDENTITY,
  contentDecisionBindingFromPacket,
  createCm2104BootstrapAuthorizationContentApplication,
  evaluateCm2104BootstrapAuthorizationContentApplication,
  loadFrozenGatePacket
};
