'use strict';

const {
  sha256Canonical
} = require('./Cm2102IdentityBoundRollbackLifecycleFoundation');

const RECEIPT_PATH =
  'docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_authorization_content_decision_receipt_cm2104.json';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

const EXPECTED_RECEIPT_PAYLOAD = deepFreeze({
  decision: {
    reference: 'CM-2104-ER-IDENTITY-BOUND-STORE-BOOTSTRAP-CONTENT-0A7CEB6C-017307C9',
    sourceCommit: 'a70870a090d739f79eb31c7d1be3b7ac979fb32a',
    sourceTree: '241ec97972e0e16c741dd0d48baa66349716b41f',
    path: 'docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_authorization_content_decision_cm2104.json',
    blobOid: '86915428a69719093d426996deb56078dc6a5a5e',
    bytes: 4176,
    sha256: '4baa0e84cf127ca99e6eec0111480a7e262ab368c9f04adc0ee5448cee384493',
    approvedAt: '2026-07-12T02:21:45+08:00',
    expiresAt: '2026-07-15T18:00:00+08:00'
  },
  intake: {
    accepted: true,
    decisionIdentityMachineBound: true,
    authorizationContentApproved: true,
    finalExecutionReleaseRequired: true,
    executionAuthorized: false
  },
  application: {
    reference: 'CM-2104-A-AR-20260712-CONTENT-ONLY-0AD7E1CB',
    sourceCommit: '3477c567642e47e12bfed30711b182f18d49b074',
    sourceTree: '7764f067b0b61cfee54c00329c9f91db1495f8b1',
    path: 'docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_authorization_content_application_cm2104_a.json',
    blobOid: '5753fa4483b936c64ae4f752032a5d543bf93969',
    bytes: 8546,
    sha256: '015b1a0c049d7f841399e9874faafd681a573259f005f64a7854de51b535fa9b',
    payloadSha256: '07b8ce5d2c7d4d21eca4980cd701148e40f4e00aeb3b3fffb3001df525c9e21d'
  },
  applicationReviewRequest: {
    sourceCommit: '8af4adaeccaeedfebe7d953cf625f4e1aa22fe28',
    sourceTree: '204aaca92c81b48be16d04a20b4f0d74f24d7b03',
    path: 'docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_authorization_content_review_request_cm2104_a.json',
    blobOid: '974edce81892097aa7dead3e00019a9f87a0ef2e',
    bytes: 4039,
    sha256: 'ddeec6020e95a2d0f7a38a5036ef21f7cd83a951095328ae008a0d3a7210eefa',
    payloadSha256: '0d5fa0f384ce1e0d9371f9f6d5b23efe605062e877e2c257b19703b04357a8ab'
  },
  gate: {
    packetCommit: '67eaab147cb856180a7ddd0491c5e5cc2f01324f',
    packetBlobOid: 'c5a2c6e4eb6c0911895c44b41c07244fe96d61e9',
    packetSha256: '0ad7e1cb4ff30cc993c9625fcefe0328d9c78d9a4227ffb6c9409b5faa4c0f8e',
    packetPayloadSha256: 'e57a98e9151583029843ff3ce93ca60ad45ebbfcd91e9c7fce7e0362969359da',
    implementationCommit: '53e5524937c030cab1ecf48a3d9d5006af34dca6',
    implementationTree: '94cbbb695e3e2a4e75367ec0165bba5285a4a502',
    contentApprovalSeparatedFromExecutionRelease: true
  },
  reviewBasis: {
    mode: 'repository_self_decision',
    externalReviewClassification: 'reference_only_repository_reality_controls',
    repositoryRealityControls: true,
    preFreezeIntakeAccepted: true,
    postFreezeGitObjectIntakeAccepted: true
  },
  currentAuthority: {
    authorizationContentApproved: true,
    finalExecutionReleaseDecisionPresent: false,
    finalExecutionReleaseIssued: false,
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
  executionEffects: {
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
  repositoryGovernanceEffects: {
    decisionJsonFrozen: true,
    decisionMarkdownFrozen: true,
    decisionCommitCreated: true
  },
  completionBoundaries: {
    rollbackDrillPassed: false,
    failureRecoveryProofPassed: false,
    phase8Completed: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  },
  nextGate: 'separate_exact_final_execution_release_application'
});

function canonicalEqual(left, right) {
  try {
    return sha256Canonical(left) === sha256Canonical(right);
  } catch {
    return false;
  }
}

function evaluateCm2104BootstrapAuthorizationContentDecisionReceipt(receipt = {}) {
  const blockers = [];
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    return failure(['receipt.invalid']);
  }
  const expectedKeys = ['schemaVersion', 'taskId', 'receiptType', 'receiptPayload', 'receiptPayloadSha256'];
  if (JSON.stringify(Object.keys(receipt).sort()) !== JSON.stringify(expectedKeys.sort())) {
    blockers.push('receipt.keys');
  }
  if (receipt.schemaVersion !== 1) blockers.push('receipt.schemaVersion');
  if (receipt.taskId !== 'CM-2104') blockers.push('receipt.taskId');
  if (receipt.receiptType !== 'exact_bootstrap_authorization_content_decision_freeze_receipt_no_execution') {
    blockers.push('receipt.receiptType');
  }
  if (!canonicalEqual(receipt.receiptPayload, EXPECTED_RECEIPT_PAYLOAD)) {
    blockers.push('receipt.receiptPayload');
  }
  if (receipt.receiptPayloadSha256 !== sha256Canonical(receipt.receiptPayload)) {
    blockers.push('receipt.receiptPayloadSha256');
  }
  return blockers.length ? failure(blockers) : {
    accepted: true,
    blockers: [],
    authorizationContentApproved: true,
    contentDecisionFrozen: true,
    finalExecutionReleaseIssued: false,
    executionAuthorized: false,
    executorRun: false,
    executionEffects: 0,
    phase8Completed: false,
    nextGate: EXPECTED_RECEIPT_PAYLOAD.nextGate
  };
}

function failure(blockers) {
  return {
    accepted: false,
    blockers,
    authorizationContentApproved: false,
    contentDecisionFrozen: false,
    finalExecutionReleaseIssued: false,
    executionAuthorized: false,
    executorRun: false,
    executionEffects: 0,
    phase8Completed: false
  };
}

module.exports = {
  EXPECTED_RECEIPT_PAYLOAD,
  RECEIPT_PATH,
  evaluateCm2104BootstrapAuthorizationContentDecisionReceipt
};
