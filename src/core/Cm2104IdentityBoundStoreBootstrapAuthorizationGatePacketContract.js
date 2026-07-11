'use strict';

const {
  IDENTITY_CANONICAL_BYTES,
  IDENTITY_CANONICAL_SHA256,
  IDENTITY_FILENAME,
  STORE_IDENTITY,
  STORE_ROOT_BINDING_CANONICAL_SHA256,
  sha256Canonical
} = require('./Cm2102IdentityBoundRollbackLifecycleFoundation');
const {
  BOOTSTRAP_REQUEST,
  FOUNDATION_DECISION,
  FOUNDATION_PACKET,
  EXECUTION_PACKET_PATH: R2_EXECUTION_PACKET_PATH
} = require('./Cm2103IdentityBoundStoreBootstrapExecutionPacketContract');
const {
  GOVERNANCE_ROOT_IDENTITY,
  GOVERNANCE_ROOT_IDENTITY_SHA256
} = require('./Cm2103IdentityBoundStoreGovernance');
const { REGISTRY_IDENTITY } = require('./Cm2103IdentityBoundStoreBootstrapRegistry');

const R2_PASS_REVIEW_DECISION = Object.freeze({
  reference: 'CM-2103-R2-ER-20260712-IMPLEMENTATION-PASS-NO-EXECUTION-F4BA5627',
  sourceCommit: '29d6afea40dd7dbb13e8e237967fda80d5d0020d',
  sourceTree: '9626f3bb1cbbf560aa63e8cb203ee37c7d4b3ae7',
  path: 'docs/near-model-memory-plan-pack/phase8_bootstrap_executor_review_decision_cm2103_r3.json',
  blobOid: '03efdbfdb1d8844ff488136a0b79e886d6d0396c',
  bytes: 3398,
  sha256: '3df35ee2eaa41fad83530624a2d6f7dff7f10e67669231f88ff0a1d06c93fbc5',
  payloadSha256: '51bddc45b56c23ecae9a4fdde8bcf7cdab6c8b4da5aa7fe0785f6ce1394a24ee'
});

const R2_IMPLEMENTATION = Object.freeze({
  commit: '808fac45c0b21b1ba6cc97513b2692cced403d54',
  tree: '32f336c3c4776c964de227ac8911a233b01407a0'
});

const R2_EXECUTION_PACKET = Object.freeze({
  commit: 'c0286d7341ee46ee94198c761462bf27336cdec0',
  tree: '794438793c4c5000e87e35a611fbb29fbae6fb85',
  path: R2_EXECUTION_PACKET_PATH,
  blobOid: '3231b4b037793a05547e7f0a19c428fe5f0c284e',
  bytes: 14476,
  sha256: 'f4ba5627e8ef651685f11ec6be5a4e81bca15e8844fa9c600e9868c84b4c8ebc',
  payloadSha256: '5da91016365599346dad93cac7ed16a2012730dcf613d3349e728188ce72d0b1'
});

const EXPECTED_AUTHORIZATION_CONTENT_DECISION_REFERENCE =
  'CM-2104-ER-IDENTITY-BOUND-STORE-BOOTSTRAP-CONTENT-0A7CEB6C-017307C9';
const EXPECTED_FINAL_EXECUTION_RELEASE_DECISION_REFERENCE =
  'CM-2104-ER-IDENTITY-BOUND-STORE-BOOTSTRAP-FINAL-RELEASE-0A7CEB6C-017307C9';
const AUTHORIZATION_CONTENT_DECISION_PATH =
  'docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_authorization_content_decision_cm2104.json';
const FINAL_EXECUTION_RELEASE_DECISION_PATH =
  'docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_final_execution_release_decision_cm2104.json';
const AUTHORIZATION_GATE_PACKET_PATH =
  'docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_authorization_gate_packet_cm2104.json';

const GATE_IMPLEMENTATION_ARTIFACT_PATHS = Object.freeze({
  authorizationContentDecisionIntake:
    'src/core/Cm2104IdentityBoundStoreBootstrapAuthorizationContentDecisionIntake.js',
  finalExecutionReleaseDecisionIntake:
    'src/core/Cm2104IdentityBoundStoreBootstrapFinalExecutionReleaseDecisionIntake.js',
  authorizationGatePacketContract:
    'src/core/Cm2104IdentityBoundStoreBootstrapAuthorizationGatePacketContract.js',
  frozenExecutor: 'src/cli/cm2103-identity-bound-store-bootstrap.js',
  authorizationIntakeTests: 'tests/cm2104-bootstrap-two-stage-authorization-intake.test.js',
  executorHardStopTests: 'tests/cm2103-bootstrap-executor-hard-stop.test.js'
});

const PACKET_KEYS = Object.freeze([
  'schemaVersion', 'taskId', 'packetType', 'packetPurpose',
  'r2PassReviewDecisionReference', 'r2PassReviewDecisionSourceCommit',
  'r2PassReviewDecisionSourceTree', 'r2PassReviewDecisionPath',
  'r2PassReviewDecisionBlobOid', 'r2PassReviewDecisionBytes',
  'r2PassReviewDecisionSha256', 'r2PassReviewDecisionPayloadSha256',
  'r2ImplementationCommit', 'r2ImplementationTree',
  'r2ExecutionPacketCommit', 'r2ExecutionPacketTree', 'r2ExecutionPacketPath',
  'r2ExecutionPacketBlobOid', 'r2ExecutionPacketBytes', 'r2ExecutionPacketSha256',
  'r2ExecutionPacketPayloadSha256', 'foundationDecisionReference',
  'foundationDecisionSourceCommit', 'foundationDecisionBlobOid', 'foundationDecisionSha256',
  'foundationPacketCommit', 'foundationPacketBlobOid', 'foundationPacketSha256',
  'bootstrapRequestCommit', 'bootstrapRequestBlobOid', 'bootstrapRequestSha256',
  'gateImplementationCommit', 'gateImplementationTree', 'gateImplementationArtifacts',
  'expectedAuthorizationContentDecisionReference', 'authorizationContentDecisionPath',
  'expectedFinalExecutionReleaseDecisionReference', 'finalExecutionReleaseDecisionPath',
  'frozenExecutorInputs', 'authorizationContentDecisionAloneExecutable',
  'independentFinalExecutionReleaseRequired', 'finalReleaseMustBindContentGitIdentity',
  'callerStorePathAllowed', 'environmentStorePathOverrideAllowed', 'callerIdentityBytesAllowed',
  'action', 'lifecycleReference', 'storeReference', 'storeInstanceId', 'storeRole',
  'syntheticOnly', 'identityFilename', 'identityBytes', 'identitySha256',
  'storeRootBindingSha256', 'governanceRootIdentityReference',
  'governanceRootIdentitySha256', 'authorizationRegistryReference',
  'nonce', 'receiptId', 'requestedExpiresAt', 'authorizationUseCount',
  'authorizationReplayAllowed', 'maxClaimEnvelopeCreates', 'maxStoreDirectoryCreates',
  'maxIdentityWrites', 'maxIdentityReadbackVerifications', 'maxDirectoryEnumerations',
  'maxRecordContentReads', 'maxNativeReads', 'maxNativeWrites', 'maxRecordMemoryCalls',
  'maxTombstoneMemoryCalls', 'maxVerifyOperations', 'maxRetries',
  'parentDirectoryCreationAllowed', 'identityOverwriteAllowed',
  'identityReplacementAllowed', 'identityReinitializationAllowed',
  'identityDeletionAllowed', 'automaticRetryAllowed', 'automaticCleanupAllowed',
  'authorizationContentDecisionPresentAtFreeze', 'finalExecutionReleaseDecisionPresentAtFreeze',
  'bootstrapExecutionAuthorizedAtFreeze', 'storeDirectoryCreatedAtFreeze',
  'storeIdentityCreatedAtFreeze', 'emptyStorePreflightAuthorizedAtFreeze',
  'recordMemoryAuthorizedAtFreeze', 'tombstoneMemoryAuthorizedAtFreeze',
  'verifyAuthorizedAtFreeze', 'nonceClaimedAtFreeze', 'receiptCreatedAtFreeze',
  'nativeReadsAtFreeze', 'nativeWritesAtFreeze', 'rollbackOrCompensationOperationsAtFreeze',
  'rollbackDrillPassed', 'failureRecoveryProofPassed', 'phase8Completed',
  'fullPlanPackCompleted', 'readinessClaimed', 'readyForIndependentImplementationReview',
  'readyForExactBootstrapAuthorizationApplication', 'executionBlockersAtFreeze',
  'packetPayloadSha256'
]);

function exactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function isHash(value, length) {
  return typeof value === 'string' && new RegExp(`^[a-f0-9]{${length}}$`).test(value);
}

function evaluateCm2104BootstrapAuthorizationGatePacket(packet) {
  const blockers = [];
  if (!exactKeys(packet, PACKET_KEYS)) {
    return { accepted: false, blockers: ['packet.keys'], executionAuthorized: false };
  }
  const { packetPayloadSha256, ...payload } = packet;
  if (sha256Canonical(payload) !== packetPayloadSha256) blockers.push('packet.packetPayloadSha256');
  const exact = {
    schemaVersion: 1,
    taskId: 'CM-2104-PRE',
    packetType: 'identity_bound_store_bootstrap_two_stage_authorization_gate_non_executing',
    packetPurpose: 'independent_review_of_content_decision_and_final_execution_release_machine_separation',
    r2PassReviewDecisionReference: R2_PASS_REVIEW_DECISION.reference,
    r2PassReviewDecisionSourceCommit: R2_PASS_REVIEW_DECISION.sourceCommit,
    r2PassReviewDecisionSourceTree: R2_PASS_REVIEW_DECISION.sourceTree,
    r2PassReviewDecisionPath: R2_PASS_REVIEW_DECISION.path,
    r2PassReviewDecisionBlobOid: R2_PASS_REVIEW_DECISION.blobOid,
    r2PassReviewDecisionBytes: R2_PASS_REVIEW_DECISION.bytes,
    r2PassReviewDecisionSha256: R2_PASS_REVIEW_DECISION.sha256,
    r2PassReviewDecisionPayloadSha256: R2_PASS_REVIEW_DECISION.payloadSha256,
    r2ImplementationCommit: R2_IMPLEMENTATION.commit,
    r2ImplementationTree: R2_IMPLEMENTATION.tree,
    r2ExecutionPacketCommit: R2_EXECUTION_PACKET.commit,
    r2ExecutionPacketTree: R2_EXECUTION_PACKET.tree,
    r2ExecutionPacketPath: R2_EXECUTION_PACKET.path,
    r2ExecutionPacketBlobOid: R2_EXECUTION_PACKET.blobOid,
    r2ExecutionPacketBytes: R2_EXECUTION_PACKET.bytes,
    r2ExecutionPacketSha256: R2_EXECUTION_PACKET.sha256,
    r2ExecutionPacketPayloadSha256: R2_EXECUTION_PACKET.payloadSha256,
    foundationDecisionReference: FOUNDATION_DECISION.reference,
    foundationDecisionSourceCommit: FOUNDATION_DECISION.sourceCommit,
    foundationDecisionBlobOid: FOUNDATION_DECISION.blobOid,
    foundationDecisionSha256: FOUNDATION_DECISION.sha256,
    foundationPacketCommit: FOUNDATION_PACKET.sourceCommit,
    foundationPacketBlobOid: FOUNDATION_PACKET.blobOid,
    foundationPacketSha256: FOUNDATION_PACKET.sha256,
    bootstrapRequestCommit: BOOTSTRAP_REQUEST.sourceCommit,
    bootstrapRequestBlobOid: BOOTSTRAP_REQUEST.blobOid,
    bootstrapRequestSha256: BOOTSTRAP_REQUEST.sha256,
    expectedAuthorizationContentDecisionReference: EXPECTED_AUTHORIZATION_CONTENT_DECISION_REFERENCE,
    authorizationContentDecisionPath: AUTHORIZATION_CONTENT_DECISION_PATH,
    expectedFinalExecutionReleaseDecisionReference: EXPECTED_FINAL_EXECUTION_RELEASE_DECISION_REFERENCE,
    finalExecutionReleaseDecisionPath: FINAL_EXECUTION_RELEASE_DECISION_PATH,
    authorizationContentDecisionAloneExecutable: false,
    independentFinalExecutionReleaseRequired: true,
    finalReleaseMustBindContentGitIdentity: true,
    callerStorePathAllowed: false,
    environmentStorePathOverrideAllowed: false,
    callerIdentityBytesAllowed: false,
    action: 'initialize_identity_bound_synthetic_store',
    lifecycleReference: STORE_IDENTITY.lifecycleReference,
    storeReference: STORE_IDENTITY.storeReference,
    storeInstanceId: STORE_IDENTITY.storeInstanceId,
    storeRole: STORE_IDENTITY.storeRole,
    syntheticOnly: true,
    identityFilename: IDENTITY_FILENAME,
    identityBytes: IDENTITY_CANONICAL_BYTES,
    identitySha256: IDENTITY_CANONICAL_SHA256,
    storeRootBindingSha256: STORE_ROOT_BINDING_CANONICAL_SHA256,
    governanceRootIdentityReference: GOVERNANCE_ROOT_IDENTITY.registryRootReference,
    governanceRootIdentitySha256: GOVERNANCE_ROOT_IDENTITY_SHA256,
    authorizationRegistryReference: REGISTRY_IDENTITY.authorizationRegistryReference,
    nonce: 'cm2102-identity-bound-store-bootstrap-001',
    receiptId: 'cm2102-identity-bound-store-bootstrap-receipt-001',
    requestedExpiresAt: '2026-07-15T18:00:00+08:00',
    authorizationUseCount: 1,
    authorizationReplayAllowed: false,
    maxClaimEnvelopeCreates: 1,
    maxStoreDirectoryCreates: 1,
    maxIdentityWrites: 1,
    maxIdentityReadbackVerifications: 1,
    maxDirectoryEnumerations: 0,
    maxRecordContentReads: 0,
    maxNativeReads: 0,
    maxNativeWrites: 0,
    maxRecordMemoryCalls: 0,
    maxTombstoneMemoryCalls: 0,
    maxVerifyOperations: 0,
    maxRetries: 0,
    parentDirectoryCreationAllowed: false,
    identityOverwriteAllowed: false,
    identityReplacementAllowed: false,
    identityReinitializationAllowed: false,
    identityDeletionAllowed: false,
    automaticRetryAllowed: false,
    automaticCleanupAllowed: false,
    authorizationContentDecisionPresentAtFreeze: false,
    finalExecutionReleaseDecisionPresentAtFreeze: false,
    bootstrapExecutionAuthorizedAtFreeze: false,
    storeDirectoryCreatedAtFreeze: false,
    storeIdentityCreatedAtFreeze: false,
    emptyStorePreflightAuthorizedAtFreeze: false,
    recordMemoryAuthorizedAtFreeze: false,
    tombstoneMemoryAuthorizedAtFreeze: false,
    verifyAuthorizedAtFreeze: false,
    nonceClaimedAtFreeze: false,
    receiptCreatedAtFreeze: false,
    nativeReadsAtFreeze: 0,
    nativeWritesAtFreeze: 0,
    rollbackOrCompensationOperationsAtFreeze: 0,
    rollbackDrillPassed: false,
    failureRecoveryProofPassed: false,
    phase8Completed: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false,
    readyForIndependentImplementationReview: true,
    readyForExactBootstrapAuthorizationApplication: false
  };
  for (const [field, expected] of Object.entries(exact)) {
    if (packet[field] !== expected) blockers.push(`packet.${field}`);
  }
  if (!isHash(packet.gateImplementationCommit, 40) || !isHash(packet.gateImplementationTree, 40)) {
    blockers.push('packet.gateImplementationBinding');
  }
  if (!exactKeys(packet.gateImplementationArtifacts, Object.keys(GATE_IMPLEMENTATION_ARTIFACT_PATHS))) {
    blockers.push('packet.gateImplementationArtifacts.keys');
  }
  for (const [name, expectedPath] of Object.entries(GATE_IMPLEMENTATION_ARTIFACT_PATHS)) {
    const artifact = packet.gateImplementationArtifacts?.[name];
    if (!exactKeys(artifact, ['path', 'blobOid']) || artifact.path !== expectedPath || !isHash(artifact.blobOid, 40)) {
      blockers.push(`packet.gateImplementationArtifacts.${name}`);
    }
  }
  if (JSON.stringify(packet.frozenExecutorInputs) !== JSON.stringify([
    'authorization_gate_packet_commit',
    'authorization_content_decision_commit',
    'final_execution_release_decision_commit'
  ])) blockers.push('packet.frozenExecutorInputs');
  if (JSON.stringify(packet.executionBlockersAtFreeze) !== JSON.stringify([
    'authorization_content_decision_absent',
    'final_execution_release_decision_absent',
    'bootstrap_execution_not_authorized',
    'store_directory_creation_not_authorized',
    'store_identity_creation_not_authorized'
  ])) blockers.push('packet.executionBlockersAtFreeze');
  return {
    accepted: blockers.length === 0,
    blockers,
    packetPrepared: blockers.length === 0,
    executionAuthorized: false,
    storeDirectoryCreated: false,
    storeIdentityCreated: false,
    nativeActionsAuthorized: 0
  };
}

module.exports = {
  AUTHORIZATION_CONTENT_DECISION_PATH,
  AUTHORIZATION_GATE_PACKET_PATH,
  EXPECTED_AUTHORIZATION_CONTENT_DECISION_REFERENCE,
  EXPECTED_FINAL_EXECUTION_RELEASE_DECISION_REFERENCE,
  FINAL_EXECUTION_RELEASE_DECISION_PATH,
  GATE_IMPLEMENTATION_ARTIFACT_PATHS,
  PACKET_KEYS,
  R2_EXECUTION_PACKET,
  R2_IMPLEMENTATION,
  R2_PASS_REVIEW_DECISION,
  evaluateCm2104BootstrapAuthorizationGatePacket
};
