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
    sourceCommit: 'e2000e4d823cdbbf53152a27aa0122131fb34eb9',
    sourceTree: 'e1bc6f9a799d70aeffaec29006b18dde3c0fabfc',
    path: 'docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_authorization_content_decision_cm2104.json',
    blobOid: 'b460ad94ed6b66c7c7e38ca2732ee907aea6c8bf',
    bytes: 4176,
    sha256: '2414b28a3474984f81fd50769c07da2461d5f5d9ac1801f2e601f9ff56ccfbb3',
    approvedAt: '2026-07-12T03:00:57+08:00',
    expiresAt: '2026-07-15T18:00:00+08:00'
  },
  intake: {
    accepted: true,
    decisionIdentityMachineBound: true,
    authorizationContentApproved: true,
    finalExecutionReleaseRequired: true,
    executionAuthorized: false
  },
  gate: {
    packetCommit: '9ba0800a6b4b401df0b72dac024bc6668602414b',
    packetBlobOid: 'b0fa9da564b2628c33ca758b1e34f5879e0c5538',
    packetSha256: 'f15ac74db5d34e806ae5fb90f70c76edec3ec07a9e3301326803ad8bbdf9d3e4',
    packetPayloadSha256: '2f699b5db2d2b651ec2a541fbe55dd2d988c515b8b95170ea06cdc78900b7684',
    implementationCommit: '2fdf97f1854964c88d244b731cc0b45f3102de92',
    implementationTree: 'a4e74f74871b663683bd6e26cbba9a21e3443dc4',
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
