'use strict';

const {
  IDENTITY_CANONICAL_BYTES,
  IDENTITY_CANONICAL_SHA256,
  IDENTITY_FILENAME,
  STORE_IDENTITY,
  STORE_ROOT_BINDING,
  STORE_ROOT_BINDING_CANONICAL_BYTES,
  STORE_ROOT_BINDING_CANONICAL_SHA256,
  STORE_ROOT_DERIVATION,
  sha256Canonical
} = require('./Cm2102IdentityBoundRollbackLifecycleFoundation');
const {
  GOVERNANCE_ROOT_IDENTITY,
  GOVERNANCE_ROOT_IDENTITY_SHA256
} = require('./Cm2103IdentityBoundStoreGovernance');
const { REGISTRY_IDENTITY } = require('./Cm2103IdentityBoundStoreBootstrapRegistry');
const {
  NONTERMINAL_REENTRY,
  TERMINAL_REENTRY_OUTCOMES
} = require('./Cm2103IdentityBoundStoreBootstrapState');

const R2_REVIEW_DECISION = Object.freeze({
  reference: 'CM-2103-R1-ER-20260711-CHANGES-REQUIRED-DURABLE-REENTRY-INCOMPLETE-175ECE43',
  sourceCommit: 'a0191b2be4eb7ef44e5919e9af89d3d31c373c93',
  sourceTree: '01016e0fe7eb332056657200ce44ed8047c941a1',
  path: 'docs/near-model-memory-plan-pack/phase8_bootstrap_executor_review_decision_cm2103_r2.json',
  blobOid: 'df4fc6d519be7208c68752f71eb67fc376e114f8',
  bytes: 4393,
  sha256: '4dfe57dcee82c8a1ac34c7717590cf5e1ef57aabf6804f316ef6871a15daddce',
  payloadSha256: 'dd8c65de44e38f5245e1cfe9b575baa208f6d077c7c9bca5a5f79e3ae2bf6d4d'
});

const FOUNDATION_DECISION = Object.freeze({
  reference: 'CM-2102-ER-20260711-FOUNDATION-PASS-NO-EXECUTION-D6CE7C74',
  sourceCommit: '9f73db8c6d1b7cba1a24d262880c7d37b953d2a0',
  sourceTree: '7a4a96dc3b150dc27e6b99fab2ed6f633fb02583',
  path: 'docs/near-model-memory-plan-pack/phase8_identity_bound_foundation_review_decision_cm2102.json',
  blobOid: 'ea628021d499fcc883a7489a8f93a6284fdb2164',
  bytes: 4250,
  sha256: '9dfd43e3ad9dea0c072a181bf8ae7fd48b4e1c49e171936518972abd22d7a0dc',
  payloadSha256: 'b1642dd9ca418ea260ec6cb204793a0a3f1eda16f411a361b4f57f3c0ee872c0'
});

const FOUNDATION_PACKET = Object.freeze({
  sourceCommit: '0c80561ae6ce2145becf438624ffdd21d1a62726',
  sourceTree: 'a9c8dd787af840ad8e849fd7d3f9189614e997ff',
  path: 'docs/near-model-memory-plan-pack/phase8_identity_bound_rollback_lifecycle_foundation_cm2102.json',
  blobOid: '929f7d39de0c01c2af5ec03c1000bfe00d8e311c',
  bytes: 5460,
  sha256: 'd6ce7c743a6a0969e4468daf7577a8681b128eefc788b3412fbf4124bea72a70',
  payloadSha256: '1739ce4bcbe870a6e41f845f8b0f30b943ceb17b671c857e9049161f13b47638'
});

const BOOTSTRAP_REQUEST = Object.freeze({
  sourceCommit: '0c80561ae6ce2145becf438624ffdd21d1a62726',
  path: 'docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_authorization_request_cm2102.json',
  blobOid: 'a75b15ae7519b608338160b8ba52ede3e9ff832c',
  bytes: 7096,
  sha256: '2318692aec334acd75b54d9bdac71ada9a2c2d3d3255b76cf97a5095421927ad',
  payloadSha256: '60d153e913cf1b9f1873c6e5ac98e9dfa1cb35e142eebc701dfca13ac23784da'
});

const EXPECTED_FUTURE_DECISION_REFERENCE =
  'CM-2103-R2-ER-20260711-IDENTITY-BOUND-STORE-BOOTSTRAP-0A7CEB6C-017307C9';
const FUTURE_DECISION_PATH =
  'docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_decision_cm2103_r2.json';
const EXECUTION_PACKET_PATH =
  'docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_execution_packet_cm2103_r2.json';

const IMPLEMENTATION_ARTIFACT_PATHS = Object.freeze({
  decisionIntake: 'src/core/Cm2103IdentityBoundStoreBootstrapDecisionIntake.js',
  stateMachine: 'src/core/Cm2103IdentityBoundStoreBootstrapState.js',
  governanceVerifier: 'src/core/Cm2103IdentityBoundStoreGovernance.js',
  authorizationRegistry: 'src/core/Cm2103IdentityBoundStoreBootstrapRegistry.js',
  bootstrapEngine: 'src/core/Cm2103IdentityBoundStoreBootstrapEngine.js',
  executionPacketContract: 'src/core/Cm2103IdentityBoundStoreBootstrapExecutionPacketContract.js',
  receiptContract: 'src/core/Cm2103IdentityBoundStoreBootstrapReceiptContract.js',
  frozenExecutor: 'src/cli/cm2103-identity-bound-store-bootstrap.js'
});

const STATE_SEQUENCE = Object.freeze([
  'UNCLAIMED', 'CLAIMED', 'CLAIM_REGISTRY_AMBIGUOUS',
  'STORE_DIRECTORY_CREATE_CONSUMED', 'STORE_DIRECTORY_CREATED',
  'IDENTITY_WRITE_CONSUMED', 'IDENTITY_CREATED', 'IDENTITY_READBACK_CONSUMED',
  'CONSUMED_SUCCESS', 'CONSUMED_PARTIAL_BOOTSTRAP', 'CONSUMED_AMBIGUOUS'
]);

const RECEIPT_VARIANTS = Object.freeze([
  'CLAIM_REGISTRY_AMBIGUOUS',
  'CONSUMED_SUCCESS',
  'CONSUMED_PARTIAL_BOOTSTRAP',
  'CONSUMED_AMBIGUOUS'
]);

const REENTRY_OUTCOME_STAGES = Object.freeze([
  ...Object.values(NONTERMINAL_REENTRY).map(value => value.outcomeStage),
  ...Object.values(TERMINAL_REENTRY_OUTCOMES),
  'reentry_existing_claim_unreadable_or_corrupt'
]);

const FAULT_INJECTION_CASES = Object.freeze([
  'existing_store_unclaimed_stop',
  'claim_write_before_create',
  'claim_write_acknowledgement_lost',
  'claim_terminal_state_persistence_failure',
  'mkdir_acknowledgement_lost',
  'identity_write_acknowledgement_lost',
  'identity_readback_failure',
  'directory_state_persistence_failure',
  'identity_state_persistence_failure',
  'success_state_persistence_failure',
  'terminal_state_replay_reconstructed'
]);

const DURABLE_REENTRY_CASES = Object.freeze([
  'claim_envelope_persistence_unknown',
  'new_process_reentry_after_claimed',
  'all_nonterminal_claim_receipt_projections',
  'corrupt_claim_low_disclosure_ambiguous_receipt',
  'unreadable_claim_low_disclosure_ambiguous_receipt',
  'persisted_claim_registry_ambiguous_receipt_reconstruction',
  'persisted_success_receipt_reconstruction',
  'reentry_zero_target_store_effects',
  'governance_filesystem_effect_presence_tristate'
]);

const PACKET_KEYS = Object.freeze([
  'schemaVersion', 'taskId', 'packetType', 'packetPurpose',
  'r2ReviewDecisionReference', 'r2ReviewDecisionSourceCommit', 'r2ReviewDecisionSourceTree',
  'r2ReviewDecisionPath', 'r2ReviewDecisionBlobOid', 'r2ReviewDecisionBytes',
  'r2ReviewDecisionSha256', 'r2ReviewDecisionPayloadSha256',
  'foundationDecisionReference', 'foundationDecisionSourceCommit', 'foundationDecisionSourceTree',
  'foundationDecisionPath', 'foundationDecisionBlobOid', 'foundationDecisionBytes',
  'foundationDecisionSha256', 'foundationDecisionPayloadSha256',
  'foundationPacketSourceCommit', 'foundationPacketSourceTree', 'foundationPacketPath',
  'foundationPacketBlobOid', 'foundationPacketBytes', 'foundationPacketSha256',
  'foundationPacketPayloadSha256', 'bootstrapRequestSourceCommit', 'bootstrapRequestPath',
  'bootstrapRequestBlobOid', 'bootstrapRequestBytes', 'bootstrapRequestSha256',
  'bootstrapRequestPayloadSha256', 'implementationCommit', 'implementationTree',
  'implementationArtifacts', 'expectedFutureDecisionReference', 'futureDecisionPath',
  'frozenExecutorInputs', 'callerStorePathAllowed', 'environmentStorePathOverrideAllowed',
  'callerIdentityBytesAllowed', 'callerStoreReferenceOverrideAllowed', 'callerLifecycleOverrideAllowed',
  'callerWriteCallbackAllowed', 'callerReconciliationCallbackAllowed', 'action',
  'lifecycleReference', 'storeReference', 'storeInstanceId', 'storeRole', 'syntheticOnly',
  'identityFilename', 'identityBytes', 'identitySha256', 'storeRootDerivation', 'storeRootBinding',
  'storeRootBindingCanonicalBytes', 'storeRootBindingSha256', 'governanceRootIdentity',
  'governanceRootIdentitySha256', 'authorizationRegistryIdentity', 'authorizationRegistryIdentitySha256',
  'claimStorageModel', 'singleClaimEnvelopeAtomicCreateRequired',
  'actionRegistryDirectoryCreatedByClaim', 'actionRegistryIdentityWrittenByClaim',
  'nonceMarkerWrites', 'receiptMarkerWrites', 'separateClaimRecordWrites',
  'successPartialAmbiguousReceiptUnionImplemented', 'receiptVariants', 'tristateEffectFields',
  'durableClaimReentryImplemented', 'terminalReceiptReconstructionImplemented',
  'nonterminalClaimProjectionImplemented', 'corruptEnvelopeLowDisclosureProjectionImplemented',
  'governanceFilesystemEffectsTristateImplemented', 'governanceFilesystemEffectFields',
  'reentryTerminalStatePersistenceAllowed', 'reentryMayReplayBootstrap',
  'reentryMayCreateStoreEffects', 'reentryOutcomeStages',
  'maxStoreFilesystemAccessesDuringReentry', 'maxStoreFilesystemWritesDuringReentry',
  'filesystemFaultInjectionTestPath', 'filesystemFaultInjectionTestBlobOid',
  'filesystemFaultInjectionTestBytes', 'filesystemFaultInjectionTestSha256',
  'filesystemFaultInjectionCases', 'durableReentryTestPath', 'durableReentryTestBlobOid',
  'durableReentryTestBytes', 'durableReentryTestSha256', 'durableReentryCases',
  'nonce', 'receiptId', 'requestedExpiresAt', 'authorizationUseCount', 'authorizationReplayAllowed',
  'stateSequence', 'maxStoreDirectoryCreates', 'maxIdentityWrites', 'maxIdentityReadbackVerifications',
  'maxDirectoryEnumerations', 'maxRecordContentReads', 'maxNativeReads', 'maxNativeWrites',
  'maxRecordMemoryCalls', 'maxTombstoneMemoryCalls', 'maxVerifyOperations', 'maxRetries',
  'maxClaimEnvelopeCreates', 'governanceRegistryDirectoryCreates', 'governanceRegistryIdentityWrites',
  'authorizationMarkerWrites', 'parentDirectoryCreationAllowed', 'identityOverwriteAllowed',
  'identityReplacementAllowed', 'identityReinitializationAllowed', 'identityDeletionAllowed',
  'automaticRetryAllowed', 'automaticCleanupAllowed', 'existingStoreDirectoryOutcome',
  'partialBootstrapOutcome', 'ambiguousBootstrapOutcome', 'futureDecisionPresentAtFreeze',
  'bootstrapExecutionAuthorizedAtFreeze', 'storeDirectoryCreatedAtFreeze', 'storeIdentityCreatedAtFreeze',
  'emptyStorePreflightAuthorizedAtFreeze', 'emptyStorePreflightExecutedAtFreeze',
  'recordMemoryAuthorizedAtFreeze', 'tombstoneMemoryAuthorizedAtFreeze', 'verifyAuthorizedAtFreeze',
  'nonceClaimedAtFreeze', 'receiptCreatedAtFreeze', 'nativeReadsAtFreeze', 'nativeWritesAtFreeze',
  'governanceFilesystemEffectsAtFreeze', 'rollbackOrCompensationOperationsAtFreeze',
  'rollbackDrillPassed', 'failureRecoveryProofPassed', 'phase8Completed', 'fullPlanPackCompleted',
  'readinessClaimed', 'readyForImplementationReview', 'readyForBootstrapAuthorizationReview',
  'executionBlockersAtFreeze', 'packetPayloadSha256'
]);

function exactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function hash(value, length) {
  return typeof value === 'string' && new RegExp(`^[a-f0-9]{${length}}$`).test(value);
}

function exactObject(value, expected) {
  return exactKeys(value, Object.keys(expected)) &&
    Object.keys(expected).every(key => JSON.stringify(value[key]) === JSON.stringify(expected[key]));
}

function evaluateCm2103BootstrapExecutionPacket(packet) {
  const blockers = [];
  if (!exactKeys(packet, PACKET_KEYS)) return {
    accepted: false, blockers: ['packet.keys'], packetPrepared: false, executionAuthorized: false,
    nativeActionsAuthorized: 0, storeDirectoryCreated: false, storeIdentityCreated: false
  };
  const { packetPayloadSha256, ...payload } = packet;
  if (sha256Canonical(payload) !== packetPayloadSha256) blockers.push('packet.packetPayloadSha256');
  const exact = {
    schemaVersion: 3,
    taskId: 'CM-2103-R2',
    packetType: 'identity_bound_synthetic_store_bootstrap_execution_packet_r2_non_executing',
    packetPurpose: 'independent_review_of_durable_claim_reentry_and_persistence_unknown_receipt_repair_without_execution',
    r2ReviewDecisionReference: R2_REVIEW_DECISION.reference,
    r2ReviewDecisionSourceCommit: R2_REVIEW_DECISION.sourceCommit,
    r2ReviewDecisionSourceTree: R2_REVIEW_DECISION.sourceTree,
    r2ReviewDecisionPath: R2_REVIEW_DECISION.path,
    r2ReviewDecisionBlobOid: R2_REVIEW_DECISION.blobOid,
    r2ReviewDecisionBytes: R2_REVIEW_DECISION.bytes,
    r2ReviewDecisionSha256: R2_REVIEW_DECISION.sha256,
    r2ReviewDecisionPayloadSha256: R2_REVIEW_DECISION.payloadSha256,
    foundationDecisionReference: FOUNDATION_DECISION.reference,
    foundationDecisionSourceCommit: FOUNDATION_DECISION.sourceCommit,
    foundationDecisionSourceTree: FOUNDATION_DECISION.sourceTree,
    foundationDecisionPath: FOUNDATION_DECISION.path,
    foundationDecisionBlobOid: FOUNDATION_DECISION.blobOid,
    foundationDecisionBytes: FOUNDATION_DECISION.bytes,
    foundationDecisionSha256: FOUNDATION_DECISION.sha256,
    foundationDecisionPayloadSha256: FOUNDATION_DECISION.payloadSha256,
    foundationPacketSourceCommit: FOUNDATION_PACKET.sourceCommit,
    foundationPacketSourceTree: FOUNDATION_PACKET.sourceTree,
    foundationPacketPath: FOUNDATION_PACKET.path,
    foundationPacketBlobOid: FOUNDATION_PACKET.blobOid,
    foundationPacketBytes: FOUNDATION_PACKET.bytes,
    foundationPacketSha256: FOUNDATION_PACKET.sha256,
    foundationPacketPayloadSha256: FOUNDATION_PACKET.payloadSha256,
    bootstrapRequestSourceCommit: BOOTSTRAP_REQUEST.sourceCommit,
    bootstrapRequestPath: BOOTSTRAP_REQUEST.path,
    bootstrapRequestBlobOid: BOOTSTRAP_REQUEST.blobOid,
    bootstrapRequestBytes: BOOTSTRAP_REQUEST.bytes,
    bootstrapRequestSha256: BOOTSTRAP_REQUEST.sha256,
    bootstrapRequestPayloadSha256: BOOTSTRAP_REQUEST.payloadSha256,
    expectedFutureDecisionReference: EXPECTED_FUTURE_DECISION_REFERENCE,
    futureDecisionPath: FUTURE_DECISION_PATH,
    callerStorePathAllowed: false,
    environmentStorePathOverrideAllowed: false,
    callerIdentityBytesAllowed: false,
    callerStoreReferenceOverrideAllowed: false,
    callerLifecycleOverrideAllowed: false,
    callerWriteCallbackAllowed: false,
    callerReconciliationCallbackAllowed: false,
    action: 'initialize_identity_bound_synthetic_store',
    lifecycleReference: STORE_IDENTITY.lifecycleReference,
    storeReference: STORE_IDENTITY.storeReference,
    storeInstanceId: STORE_IDENTITY.storeInstanceId,
    storeRole: STORE_IDENTITY.storeRole,
    syntheticOnly: true,
    identityFilename: IDENTITY_FILENAME,
    identityBytes: IDENTITY_CANONICAL_BYTES,
    identitySha256: IDENTITY_CANONICAL_SHA256,
    storeRootBindingCanonicalBytes: STORE_ROOT_BINDING_CANONICAL_BYTES,
    storeRootBindingSha256: STORE_ROOT_BINDING_CANONICAL_SHA256,
    governanceRootIdentitySha256: GOVERNANCE_ROOT_IDENTITY_SHA256,
    authorizationRegistryIdentitySha256: sha256Canonical(REGISTRY_IDENTITY),
    claimStorageModel: 'single_atomic_claim_envelope_in_existing_governance_root',
    singleClaimEnvelopeAtomicCreateRequired: true,
    actionRegistryDirectoryCreatedByClaim: false,
    actionRegistryIdentityWrittenByClaim: false,
    nonceMarkerWrites: 0,
    receiptMarkerWrites: 0,
    separateClaimRecordWrites: 0,
    successPartialAmbiguousReceiptUnionImplemented: true,
    durableClaimReentryImplemented: true,
    terminalReceiptReconstructionImplemented: true,
    nonterminalClaimProjectionImplemented: true,
    corruptEnvelopeLowDisclosureProjectionImplemented: true,
    governanceFilesystemEffectsTristateImplemented: true,
    reentryTerminalStatePersistenceAllowed: false,
    reentryMayReplayBootstrap: false,
    reentryMayCreateStoreEffects: false,
    maxStoreFilesystemAccessesDuringReentry: 0,
    maxStoreFilesystemWritesDuringReentry: 0,
    filesystemFaultInjectionTestPath: 'tests/cm2103-bootstrap-filesystem-fault-injection.test.js',
    filesystemFaultInjectionTestBlobOid: '2ba16a716ea48ee2d0482529930c09505dc200ce',
    filesystemFaultInjectionTestBytes: 16897,
    filesystemFaultInjectionTestSha256: '21057926a93056137619e9d47ccb29c7a5eec1e28e5c2d7342ec36292c941e91',
    durableReentryTestPath: 'tests/cm2103-bootstrap-durable-reentry.test.js',
    durableReentryTestBlobOid: '46d00af10bdca40f26f236e690945001edd39707',
    durableReentryTestBytes: 18998,
    durableReentryTestSha256: 'a08cbac7a040c2155271cea3327995e4e54c60fcf7b4880f96e553e7b7f8776d',
    nonce: 'cm2102-identity-bound-store-bootstrap-001',
    receiptId: 'cm2102-identity-bound-store-bootstrap-receipt-001',
    requestedExpiresAt: '2026-07-15T18:00:00+08:00',
    authorizationUseCount: 1,
    authorizationReplayAllowed: false,
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
    maxClaimEnvelopeCreates: 1,
    governanceRegistryDirectoryCreates: 0,
    governanceRegistryIdentityWrites: 0,
    authorizationMarkerWrites: 0,
    parentDirectoryCreationAllowed: false,
    identityOverwriteAllowed: false,
    identityReplacementAllowed: false,
    identityReinitializationAllowed: false,
    identityDeletionAllowed: false,
    automaticRetryAllowed: false,
    automaticCleanupAllowed: false,
    existingStoreDirectoryOutcome: 'stop_without_read_delete_replace_or_reconcile',
    partialBootstrapOutcome: 'stop_without_retry_cleanup_and_require_independent_reconciliation',
    ambiguousBootstrapOutcome: 'stop_without_retry_cleanup_and_require_independent_reconciliation',
    futureDecisionPresentAtFreeze: false,
    bootstrapExecutionAuthorizedAtFreeze: false,
    storeDirectoryCreatedAtFreeze: false,
    storeIdentityCreatedAtFreeze: false,
    emptyStorePreflightAuthorizedAtFreeze: false,
    emptyStorePreflightExecutedAtFreeze: false,
    recordMemoryAuthorizedAtFreeze: false,
    tombstoneMemoryAuthorizedAtFreeze: false,
    verifyAuthorizedAtFreeze: false,
    nonceClaimedAtFreeze: false,
    receiptCreatedAtFreeze: false,
    nativeReadsAtFreeze: 0,
    nativeWritesAtFreeze: 0,
    governanceFilesystemEffectsAtFreeze: 0,
    rollbackOrCompensationOperationsAtFreeze: 0,
    rollbackDrillPassed: false,
    failureRecoveryProofPassed: false,
    phase8Completed: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false,
    readyForImplementationReview: true,
    readyForBootstrapAuthorizationReview: false
  };
  for (const [field, expected] of Object.entries(exact)) {
    if (packet[field] !== expected) blockers.push(`packet.${field}`);
  }
  if (!hash(packet.implementationCommit, 40) || !hash(packet.implementationTree, 40)) {
    blockers.push('packet.implementationBinding');
  }
  if (!exactKeys(packet.implementationArtifacts, Object.keys(IMPLEMENTATION_ARTIFACT_PATHS))) {
    blockers.push('packet.implementationArtifacts.keys');
  }
  for (const [name, expectedPath] of Object.entries(IMPLEMENTATION_ARTIFACT_PATHS)) {
    const artifact = packet.implementationArtifacts?.[name];
    if (!exactKeys(artifact, ['path', 'blobOid']) || artifact.path !== expectedPath || !hash(artifact.blobOid, 40)) {
      blockers.push(`packet.implementationArtifacts.${name}`);
    }
  }
  if (JSON.stringify(packet.frozenExecutorInputs) !==
      JSON.stringify(['execution_packet_commit', 'future_exact_bootstrap_decision_commit'])) {
    blockers.push('packet.frozenExecutorInputs');
  }
  if (!exactObject(packet.storeRootDerivation, STORE_ROOT_DERIVATION)) blockers.push('packet.storeRootDerivation');
  if (!exactObject(packet.storeRootBinding, STORE_ROOT_BINDING)) blockers.push('packet.storeRootBinding');
  if (!exactObject(packet.governanceRootIdentity, GOVERNANCE_ROOT_IDENTITY)) {
    blockers.push('packet.governanceRootIdentity');
  }
  if (!exactObject(packet.authorizationRegistryIdentity, REGISTRY_IDENTITY)) {
    blockers.push('packet.authorizationRegistryIdentity');
  }
  if (JSON.stringify(packet.stateSequence) !== JSON.stringify(STATE_SEQUENCE)) blockers.push('packet.stateSequence');
  if (JSON.stringify(packet.receiptVariants) !== JSON.stringify(RECEIPT_VARIANTS)) {
    blockers.push('packet.receiptVariants');
  }
  if (JSON.stringify(packet.tristateEffectFields) !== JSON.stringify([
    'storeDirectoryCreated', 'identityWriteAttempted', 'identityCreated',
    'identityBytes', 'identitySha256', 'identityReadbackMatched'
  ])) blockers.push('packet.tristateEffectFields');
  if (JSON.stringify(packet.governanceFilesystemEffectFields) !== JSON.stringify([
    'governanceFilesystemEffectAttempted', 'governanceFilesystemEffectsPresent'
  ])) blockers.push('packet.governanceFilesystemEffectFields');
  if (JSON.stringify(packet.reentryOutcomeStages) !== JSON.stringify(REENTRY_OUTCOME_STAGES)) {
    blockers.push('packet.reentryOutcomeStages');
  }
  if (JSON.stringify(packet.filesystemFaultInjectionCases) !== JSON.stringify(FAULT_INJECTION_CASES)) {
    blockers.push('packet.filesystemFaultInjectionCases');
  }
  if (JSON.stringify(packet.durableReentryCases) !== JSON.stringify(DURABLE_REENTRY_CASES)) {
    blockers.push('packet.durableReentryCases');
  }
  if (JSON.stringify(packet.executionBlockersAtFreeze) !== JSON.stringify([
    'future_exact_bootstrap_decision_absent', 'bootstrap_execution_not_authorized',
    'store_directory_creation_not_authorized', 'store_identity_creation_not_authorized'
  ])) blockers.push('packet.executionBlockersAtFreeze');
  return {
    accepted: blockers.length === 0,
    blockers,
    packetPrepared: blockers.length === 0,
    executionAuthorized: false,
    nativeActionsAuthorized: 0,
    storeDirectoryCreated: false,
    storeIdentityCreated: false
  };
}

module.exports = {
  BOOTSTRAP_REQUEST,
  DURABLE_REENTRY_CASES,
  EXECUTION_PACKET_PATH,
  EXPECTED_FUTURE_DECISION_REFERENCE,
  FAULT_INJECTION_CASES,
  FOUNDATION_DECISION,
  FOUNDATION_PACKET,
  FUTURE_DECISION_PATH,
  IMPLEMENTATION_ARTIFACT_PATHS,
  PACKET_KEYS,
  R2_REVIEW_DECISION,
  RECEIPT_VARIANTS,
  REENTRY_OUTCOME_STAGES,
  STATE_SEQUENCE,
  evaluateCm2103BootstrapExecutionPacket
};
